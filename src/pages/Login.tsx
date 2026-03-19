import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [passwordError, setPasswordError] = useState("");
  const [gatekeeperMsg, setGatekeeperMsg] = useState("");

  // If already logged in, redirect
  if (!loading && user) {
    if (role === "practitioner") {
      navigate("/practitioner", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
    return null;
  }

  const checkEmailRegistered = async (emailToCheck: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("is_registered_client", {
      _email: emailToCheck,
    });
    if (error) {
      console.error("Gatekeeper check failed:", error);
      return false;
    }
    return data === true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setPasswordError("");
    setGatekeeperMsg("");

    if (mode === "signup" && password.length < 6) {
      setPasswordError("אנא ודאו שהסיסמה שלכם מכילה לפחות 6 תווים.");
      return;
    }

    setSubmitting(true);

    try {
      // Gatekeeper: check email exists in children table
      const isRegistered = await checkEmailRegistered(email);
      if (!isRegistered) {
        setGatekeeperMsg(
          "נראה שאתה לא רשום כמטופל אצל מוריאל. כדי להצטרף למסע, אנא שלח הודעת וואטסאפ למוריאל בטלפון: 0553185025"
        );
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;

        toast({
          title: "ההרשמה הצליחה!",
          description: "נשלח אליכם מייל לאימות. אנא בדקו את תיבת הדואר שלכם.",
        });
        return;
      }

      // Login mode
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: { user: loggedUser } } = await supabase.auth.getUser();
      if (!loggedUser) throw new Error("No user");

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", loggedUser.id)
        .limit(1);

      const userRole = roleData && roleData.length > 0 ? roleData[0].role : null;
      if (userRole === "practitioner") {
        navigate("/practitioner", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      const description =
        mode === "login" && err?.message === "Invalid login credentials"
          ? "אימייל או סיסמה שגויים"
          : err?.message === "User already registered"
            ? "כתובת האימייל כבר רשומה במערכת"
            : "אנא נסו שנית";

      toast({
        title: mode === "login" ? "שגיאה בהתחברות" : "שגיאה בהרשמה",
        description,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-svh flex items-center justify-center bg-background">
        <p className="text-muted-foreground">טוען...</p>
      </main>
    );
  }

  return (
    <main className="min-h-svh flex items-center justify-center bg-background px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-primary">
            ברוכים הבאים למסע טומטיס
          </h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login" ? "התחברו כדי להמשיך" : "צרו חשבון חדש כדי להתחיל"}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setPasswordError(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
              mode === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            התחברות
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setPasswordError(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
              mode === "signup"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            הרשמה
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card p-6 rounded-xl shadow-soft space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-bold text-foreground">
              אימייל
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-bold text-foreground">
              סיסמה
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              dir="ltr"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
              required
            />
            {passwordError && (
              <p className="text-sm text-destructive font-medium">{passwordError}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-base font-bold"
          >
            {submitting
              ? (mode === "login" ? "מתחבר..." : "נרשם...")
              : (mode === "login" ? "התחברות" : "הרשמה")}
          </Button>
        </form>
      </motion.div>
    </main>
  );
};

export default Login;
