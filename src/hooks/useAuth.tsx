import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: "parent" | "practitioner" | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  error: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"parent" | "practitioner" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;
    return (data[0].role as "parent" | "practitioner") ?? null;
  };

  useEffect(() => {
    let isMounted = true;
    let activeRequest = 0;

    const syncAuthState = async (nextSession: Session | null) => {
      if (!isMounted) return;
      const requestId = ++activeRequest;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      try {
        if (!nextSession?.user) {
          setRole(null);
          setError(null);
          setLoading(false);
          return;
        }

        const userRole = await fetchRole(nextSession.user.id);
        if (!isMounted || requestId !== activeRequest) return;

        console.log("Auth: role resolved for", nextSession.user.email, "→", userRole);
        setRole(userRole);
        setError(null);

        if (userRole === "parent") {
          supabase.rpc("link_my_children" as any).then(({ error: linkErr }: any) => {
            if (linkErr) console.warn("link_my_children failed (non-blocking):", linkErr);
          });
        }
      } catch (err: any) {
        console.error("Auth initialization error:", err);
        if (!isMounted || requestId !== activeRequest) return;
        setRole(null);
        setError("שגיאה באימות. אנא נסה שוב.");
      } finally {
        if (isMounted && requestId === activeRequest) {
          setLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) setLoading(true);
      void syncAuthState(nextSession);
    });

    void supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => syncAuthState(initialSession))
      .catch((err: any) => {
        console.error("getSession error:", err);
        if (!isMounted) return;
        setError("שגיאה באימות. אנא נסה שוב.");
        setRole(null);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
