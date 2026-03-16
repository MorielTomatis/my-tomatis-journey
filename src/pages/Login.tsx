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

  // If already logged in, redirect
  if (!loading && user && role) {
    if (role === "practitioner") {
      navigate("/practitioner", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Fetch role for redirect
      const { data: { user: loggedUser } } = await supabase.auth.getUser();
      if (!loggedUser) throw new Error("No user");

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", loggedUser.id)
        .limit(1)
        .single();

      const userRole = roleData?.role;
      if (userRole === "practitioner") {
        navigate("/practitioner", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      toast({
        title: "שגיאה בהתחברות",
        description: err?.message === "Invalid login credentials"
          ? "אימייל או סיסמה שגויים"
          : "אנא נסה שנית",
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
            התחברו כדי להמשיך
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-card p-6 rounded-xl shadow-soft space-y-4">
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
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-base font-bold"
          >
            {submitting ? "מתחבר..." : "התחברות"}
          </Button>
        </form>
      </motion.div>
    </main>
  );
};

export default Login;
