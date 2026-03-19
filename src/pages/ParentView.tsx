import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Rocket, Sun, Star, Shield, Headphones, Mic } from "lucide-react";

const PHASE_LABELS: Record<number, { label: string; type: "listening_only" | "listening_and_mic" }> = {
  1: { label: "שלב אינטנסיבי", type: "listening_only" },
  2: { label: "שלב קונסולידציה", type: "listening_and_mic" },
  3: { label: "שלב אינטנסיבי", type: "listening_and_mic" },
  4: { label: "שלב קונסולידציה", type: "listening_and_mic" },
  5: { label: "שלב אינטנסיבי", type: "listening_and_mic" },
  6: { label: "שלב קונסולידציה", type: "listening_and_mic" },
};

const ICON_MAP: Record<string, { emoji: string; Icon: typeof Rocket }> = {
  rocket: { emoji: "🚀", Icon: Rocket },
  sun: { emoji: "☀️", Icon: Sun },
  star: { emoji: "⭐", Icon: Star },
  shield: { emoji: "🛡️", Icon: Shield },
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

interface ChildProfile {
  id: string;
  first_name: string;
  last_name: string;
  current_phase: number;
  start_date: string;
  icon: string;
  passive_duration: number;
}

interface ChildCardState {
  todayLogged: boolean;
  phaseDayNumber: number;
  weekDays: { label: string; status: string }[];
  listeningDone: boolean;
  micDone: boolean;
  micMinutes: number | "";
  submitting: boolean;
}

const ParentView = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [cardStates, setCardStates] = useState<Record<string, ChildCardState>>({});
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: children, error } = await supabase
        .from("children")
        .select("id, first_name, last_name, current_phase, start_date, icon, passive_duration")
        .or(`parent_id.eq.${user.id},user_id.eq.${user.id},parent_email.eq.${user.email}`);

      if (error) { setLoading(false); return; }
      if (!children?.length) {
        setNoProfile(true);
        setLoading(false);
        return;
      }

      setProfiles(children as ChildProfile[]);

      // Fetch all sessions for all children
      const childIds = children.map((c) => c.id);
      const { data: allSessions } = await supabase
        .from("sessions")
        .select("child_id, date, passive_completed, is_archived")
        .in("child_id", childIds);

      // Build week dates
      const dayLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳"];
      const now = new Date();
      const dayOfWeek = now.getDay();
      const sundayOffset = dayOfWeek === 6 ? 1 : -dayOfWeek;
      const sunday = new Date(now);
      sunday.setDate(now.getDate() + sundayOffset);
      const weekDates = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        return d.toISOString().split("T")[0];
      });

      const states: Record<string, ChildCardState> = {};

      for (const child of children) {
        const sessions = allSessions?.filter((s) => s.child_id === child.id) ?? [];
        const todaySession = sessions.find((s) => s.date === today);
        const unarchivedPassive = sessions.filter((s) => s.passive_completed && !s.is_archived);

        const sessionMap = new Map(
          sessions.filter((s) => weekDates.includes(s.date)).map((s) => [s.date, s.passive_completed])
        );

        const weekDays = weekDates.map((date, i) => {
          const isPast = date < today;
          const wasLogged = sessionMap.get(date);
          let status = "none";
          if (wasLogged) status = "logged";
          else if (isPast) status = "missed";
          return { label: dayLabels[i], status };
        });

        states[child.id] = {
          todayLogged: !!todaySession,
          phaseDayNumber: Math.min(unarchivedPassive.length + 1, 14),
          weekDays,
          listeningDone: false,
          micDone: false,
          micMinutes: "",
          submitting: false,
        };
      }

      setCardStates(states);
    } catch {
      toast({ title: "שגיאה בטעינת נתונים", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [today, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateCardState = (childId: string, updates: Partial<ChildCardState>) => {
    setCardStates((prev) => ({
      ...prev,
      [childId]: { ...prev[childId], ...updates },
    }));
  };

  const handleSubmit = async (child: ChildProfile) => {
    const state = cardStates[child.id];
    if (!state || state.submitting) return;

    updateCardState(child.id, { submitting: true });

    try {
      const requiresMic = PHASE_LABELS[child.current_phase]?.type === "listening_and_mic";

      const { error } = await supabase.from("sessions").insert({
        child_id: child.id,
        date: today,
        passive_completed: true,
        active_completed: requiresMic ? state.micDone : false,
        active_minutes: requiresMic && state.micDone ? (state.micMinutes || null) : null,
      });

      if (error) throw error;

      toast({ title: `נשמר בהצלחה עבור ${child.first_name}! 🎉` });
      await fetchData();
    } catch {
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      updateCardState(child.id, { submitting: false });
    }
  };

  if (loading) {
    return (
      <main className="max-w-md mx-auto min-h-svh flex items-center justify-center">
        <p className="text-muted-foreground">טוען...</p>
      </main>
    );
  }

  if (noProfile) {
    return (
      <main className="max-w-md mx-auto min-h-svh flex items-center justify-center p-5" dir="rtl">
        <div className="text-center space-y-3 bg-card p-8 rounded-xl shadow-soft">
          <span className="text-4xl">🌱</span>
          <p className="text-lg font-bold text-foreground">הפרופיל שלך עדיין לא הוגדר על ידי המטפל.</p>
          <p className="text-sm text-muted-foreground">אנא צור קשר עם הקליניקה.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-svh flex flex-col p-5" dir="rtl">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 flex-1">
        {/* Header */}
        <motion.header variants={item} className="py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">המסע שלנו</h1>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors" title="התנתק">
            <LogOut className="h-5 w-5" />
          </button>
        </motion.header>

        {/* Profile Cards */}
        {profiles.map((child) => {
          const state = cardStates[child.id];
          if (!state) return null;

          const phaseConfig = PHASE_LABELS[child.current_phase];
          const requiresMic = phaseConfig?.type === "listening_and_mic";
          const iconInfo = ICON_MAP[child.icon] || ICON_MAP.rocket;

          return (
            <motion.div
              key={child.id}
              variants={item}
              className={`bg-card rounded-xl shadow-soft overflow-hidden border-2 transition-colors ${
                state.todayLogged ? "border-accent" : "border-border"
              }`}
            >
              {/* Card header */}
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{iconInfo.emoji}</span>
                  <div>
                    <h2 className="font-bold text-lg text-foreground">המסע של {child.first_name}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1 bg-accent/10 text-accent px-2.5 py-0.5 rounded-full text-xs font-bold">
                        שלב {child.current_phase} · {phaseConfig?.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Headphones className="h-3.5 w-3.5" />
                        יום {state.phaseDayNumber} מתוך 14
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weekly progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground">התקדמות שבועית</span>
                    <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">
                      {state.weekDays.filter((d) => d.status === "logged").length}/{state.weekDays.length}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {state.weekDays.map((day) => (
                      <div key={day.label} className="flex-1 text-center space-y-1">
                        <div className={`h-8 rounded-lg ${statusColor[day.status]}`} />
                        <span className="text-[10px] text-muted-foreground">{day.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Log actions */}
                {state.todayLogged ? (
                  <div className="text-center space-y-1 py-2">
                    <span className="text-3xl">🎉</span>
                    <p className="font-bold text-foreground">כל הכבוד! סיימנו להיום.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requiresMic && (
                      <p className="text-xs text-center text-muted-foreground leading-relaxed">
                        עבודה עם המיקרופון היא הלב של התהליך. אפילו חמש דקות ביום עושות הבדל גדול.
                      </p>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => updateCardState(child.id, { listeningDone: !state.listeningDone })}
                      className={`w-full py-3 rounded-xl font-bold text-base shadow-soft transition-colors flex items-center justify-center gap-2 ${
                        state.listeningDone ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                      }`}
                    >
                      <Headphones className="h-4 w-4" />
                      האזנה פסיבית הושלמה {state.listeningDone ? "✓" : ""}
                    </motion.button>

                    {requiresMic && (
                      <>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateCardState(child.id, { micDone: !state.micDone })}
                          className={`w-full py-3 rounded-xl font-bold text-sm shadow-soft transition-colors flex items-center justify-center gap-2 ${
                            state.micDone ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <Mic className="h-4 w-4" />
                          עבודה פעילה עם המיקרופון {state.micDone ? "✓" : ""}
                        </motion.button>

                        <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl">
                          <label className="text-sm font-bold text-foreground whitespace-nowrap">כמה דקות?</label>
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={state.micMinutes}
                            onChange={(e) =>
                              updateCardState(child.id, {
                                micMinutes: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            placeholder="0"
                            className="w-20 text-center bg-background border border-border rounded-lg py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>
                      </>
                    )}

                    {state.listeningDone && (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSubmit(child)}
                        disabled={state.submitting}
                        className="w-full py-3 rounded-xl font-bold text-base bg-accent text-accent-foreground shadow-soft disabled:opacity-50"
                      >
                        {state.submitting ? "שומר..." : "שמור ✓"}
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
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
