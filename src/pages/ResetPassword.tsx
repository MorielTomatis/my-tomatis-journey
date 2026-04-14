import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // CRITICAL: Set up the auth listener FIRST, before anything else.
    // Supabase auto-processes the URL hash/code on init and fires events
    // synchronously. If we do async work first, we miss the event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[ResetPassword] auth event:", event);
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          if (session) {
            setReady(true);
          }
        }
      }
    );

    // Also check for PKCE code in query string (e.g. ?code=xxx)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          setReady(true);
        }
      });
    }

    // Check if there's already an active session (e.g. page refresh after recovery)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (password.length < 6) {
      toast({
        title: "הסיסמה חייבת להכיל לפחות 6 תווים",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({ title: "הסיסמאות אינן תואמות", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "הסיסמה עודכנה בהצלחה! 🎉" });
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast({
        title: "שגיאה בעדכון הסיסמה",
        description: err?.message || "אנא נסי שנית",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-svh flex items-center justify-center bg-background px-5"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-primary">איפוס סיסמה</h1>
          <p className="text-muted-foreground text-sm">הזינו סיסמה חדשה</p>
        </div>

        {!ready ? (
          <div className="bg-card p-6 rounded-xl shadow-soft text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-muted-foreground text-sm">
              מאמת את הקישור...
            </p>
            <p className="text-xs text-muted-foreground">
              אם הגעתם לכאן ידנית, אנא לחצו על הקישור שנשלח אליכם באימייל.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-card p-6 rounded-xl shadow-soft space-y-4"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="text-sm font-bold text-foreground"
              >
                סיסמה חדשה
              </label>
              <PasswordInput
                id="new-password"
                placeholder="••••••••"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="text-sm font-bold text-foreground"
              >
                אימות סיסמה
              </label>
              <PasswordInput
                id="confirm-password"
                placeholder="••••••••"
                dir="ltr"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-base font-bold"
            >
              {submitting ? "מעדכן..." : "עדכון סיסמה"}
            </Button>
          </form>
        )}
      </motion.div>
    </main>
  );
};

export default ResetPassword;
