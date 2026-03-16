import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PHASE_LABELS: Record<number, { label: string; type: "listening_only" | "listening_and_mic" }> = {
  1: { label: "שלב אינטנסיבי", type: "listening_only" },
  2: { label: "שלב קונסולידציה", type: "listening_and_mic" },
  3: { label: "שלב אינטנסיבי", type: "listening_and_mic" },
  4: { label: "שלב קונסולידציה", type: "listening_and_mic" },
  5: { label: "שלב אינטנסיבי", type: "listening_and_mic" },
  6: { label: "שלב קונסולידציה", type: "listening_and_mic" },
};

const statusColor: Record<string, string> = {
  logged: "bg-status-logged",
  missed: "bg-status-missed",
  none: "bg-status-none",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

interface ChildData {
  id: string;
  first_name: string;
  current_phase: number;
  start_date: string;
}

const ParentView = () => {
  const { toast } = useToast();
  const [child, setChild] = useState<ChildData | null>(null);
  const [todayLogged, setTodayLogged] = useState(false);
  const [weekDays, setWeekDays] = useState<{ label: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [listeningDone, setListeningDone] = useState(false);
  const [micDone, setMicDone] = useState(false);
  const [micMinutes, setMicMinutes] = useState<number | "">("");

  const today = new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get child for this parent
      const { data: children, error: childErr } = await supabase
        .from("children")
        .select("id, first_name, current_phase, start_date")
        .eq("parent_id", user.id)
        .limit(1);

      if (childErr || !children?.length) { setLoading(false); return; }

      const c = children[0];
      setChild(c);

      // Check if today is already logged
      const { data: todaySession } = await supabase
        .from("sessions")
        .select("id")
        .eq("child_id", c.id)
        .eq("date", today)
        .limit(1);

      setTodayLogged(!!todaySession?.length);

      // Build week view — get sessions for the last 5 days
      const dayLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳"];
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const sundayOffset = dayOfWeek === 6 ? 1 : -dayOfWeek; // If Sat, next Sun; else back to Sun
      const sunday = new Date(now);
      sunday.setDate(now.getDate() + sundayOffset);

      const weekDates = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        return d.toISOString().split("T")[0];
      });

      const { data: weekSessions } = await supabase
        .from("sessions")
        .select("date, passive_completed")
        .eq("child_id", c.id)
        .in("date", weekDates);

      const sessionMap = new Map(weekSessions?.map((s) => [s.date, s.passive_completed]) ?? []);

      const days = weekDates.map((date, i) => {
        const isPast = date < today;
        const isToday = date === today;
        const wasLogged = sessionMap.get(date);

        let status = "none";
        if (wasLogged) status = "logged";
        else if (isPast || (isToday && todaySession?.length)) status = isPast ? "missed" : "logged";

        return { label: dayLabels[i], status };
      });

      setWeekDays(days);
    } catch {
      toast({ title: "שגיאה בטעינת נתונים", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [today, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!child || submitting) return;
    setSubmitting(true);

    try {
      const requiresMic = PHASE_LABELS[child.current_phase]?.type === "listening_and_mic";

      const { error } = await supabase.from("sessions").insert({
        child_id: child.id,
        date: today,
        passive_completed: true,
        active_completed: requiresMic ? micDone : false,
        active_minutes: requiresMic && micDone ? (micMinutes || null) : null,
      });

      if (error) throw error;

      setTodayLogged(true);
      // Refresh child data (phase may have advanced)
      await fetchData();

      toast({ title: "נשמר בהצלחה! 🎉" });
    } catch {
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Compute derived values
  const phaseConfig = child ? PHASE_LABELS[child.current_phase] : null;
  const requiresMic = phaseConfig?.type === "listening_and_mic";
  const dayNumber = child ? Math.max(1, Math.floor((new Date().getTime() - new Date(child.start_date).getTime()) / 86400000) + 1) : 0;

  if (loading) {
    return (
      <main className="max-w-md mx-auto min-h-svh flex items-center justify-center">
        <p className="text-muted-foreground">טוען...</p>
      </main>
    );
  }

  if (!child) {
    return (
      <main className="max-w-md mx-auto min-h-svh flex items-center justify-center p-5">
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-foreground">אין ילד משויך לחשבון זה</p>
          <p className="text-sm text-muted-foreground">פנה/י למטפל/ת להוספת ילדך למערכת</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-svh flex flex-col p-5">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 flex-1"
      >
        {/* Header */}
        <motion.header variants={item} className="py-4 space-y-3">
          <h1 className="text-2xl font-bold text-primary">
            {child.first_name} · מסע טומטיס · יום {dayNumber}
          </h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
              שלב {child.current_phase} מתוך 6 · {phaseConfig?.label}
            </span>
          </div>
        </motion.header>

        {/* Progress Card */}
        <motion.div variants={item} className="bg-card p-6 rounded-xl shadow-soft">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">התקדמות שבועית</h2>
            <span className="text-xs bg-accent/10 text-accent px-3 py-1 rounded-full font-bold">
              {weekDays.filter((d) => d.status === "logged").length}/{weekDays.length} ימים
            </span>
          </div>
          <div className="flex gap-2">
            {weekDays.map((day) => (
              <div key={day.label} className="flex-1 text-center space-y-1">
                <div className={`h-10 rounded-lg ${statusColor[day.status]}`} />
                <span className="text-xs text-muted-foreground">{day.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Logging Actions or Success */}
        <motion.div variants={item} className="space-y-3">
          {todayLogged ? (
            <div className="bg-card p-6 rounded-xl shadow-soft text-center space-y-2">
              <span className="text-4xl">🎉</span>
              <p className="font-bold text-lg text-foreground">כל הכבוד! סיימנו להיום.</p>
              <p className="text-muted-foreground">נתראה מחר</p>
            </div>
          ) : (
            <>
              {requiresMic && (
                <p className="text-sm text-center text-muted-foreground leading-relaxed px-2">
                  עבודה עם המיקרופון היא הלב של התהליך. אפילו חמש דקות ביום עושות הבדל גדול.
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setListeningDone(!listeningDone)}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-soft transition-colors ${
                  listeningDone ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                האזנה הושלמה {listeningDone ? "✓" : ""}
              </motion.button>

              {requiresMic && (
                <>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => setMicDone(!micDone)}
                    className={`w-full py-4 rounded-xl font-bold text-base shadow-soft transition-colors ${
                      micDone ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    עבודה פעילה עם המיקרופון הושלמה {micDone ? "✓" : ""}
                  </motion.button>

                  <div className="flex items-center gap-3 bg-card p-3 rounded-xl shadow-soft">
                    <label htmlFor="mic-minutes" className="text-sm font-bold text-foreground whitespace-nowrap">
                      כמה דקות?
                    </label>
                    <input
                      id="mic-minutes"
                      type="number"
                      min={0}
                      max={120}
                      value={micMinutes}
                      onChange={(e) => setMicMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0"
                      className="w-20 text-center bg-background border border-border rounded-lg py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </>
              )}

              {/* Submit button — only shows after listening is marked */}
              {listeningDone && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-accent text-accent-foreground shadow-soft disabled:opacity-50"
                >
                  {submitting ? "שומר..." : "שמור ✓"}
                </motion.button>
              )}
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Bottom Nav */}
      <nav className="flex justify-around py-4 mt-auto border-t border-border">
        <button className="flex flex-col items-center gap-1 text-primary">
          <span className="text-xl">🏠</span>
          <span className="text-xs font-bold">בית</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground">
          <span className="text-xl">📊</span>
          <span className="text-xs">היסטוריה</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground">
          <span className="text-xl">⚙️</span>
          <span className="text-xs">הגדרות</span>
        </button>
      </nav>
    </main>
  );
};

export default ParentView;
