import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Home, Map, LogOut } from "lucide-react";

/**
 * Phase → Series/Stage mapping:
 * Phase 1 (Intensive)     → Series 1, Stage: Listening (🎧)
 * Phase 2 (Consolidation) → Series 1, Stage: Evaluation (📋)
 * Phase 3 (Intensive)     → Series 2, Stage: Listening (🎧)
 * Phase 4 (Consolidation) → Series 2, Stage: Evaluation (📋)
 * Phase 5 (Intensive)     → Series 3, Stage: Listening (🎧)
 * Phase 6 (Consolidation) → Series 3, Stage: Evaluation (📋)
 *
 * Each series path: Talk (🗣️) → Listening (🎧) → Evaluation (📋)
 * Talk is the entry point before the intensive phase begins.
 */

interface ChildProfile {
  id: string;
  first_name: string;
  current_phase: number;
  icon: string;
}

const ICON_EMOJI: Record<string, string> = {
  rocket: "🚀",
  sun: "☀️",
  star: "⭐",
  shield: "🛡️",
};

function phaseToSeriesStage(phase: number): { series: number; stage: number } {
  // stage 0=talk, 1=listening, 2=evaluation
  const series = Math.ceil(phase / 2);
  const isIntensive = phase % 2 === 1;
  return { series, stage: isIntensive ? 1 : 2 };
}

function getMotivationText(series: number): string {
  if (series <= 1) {
    return "התחלנו את המסע! כל הכבוד על הצעד הראשון ועל ההתמדה בשלב ההאזנה.";
  }
  if (series <= 2) {
    return "עברנו כברת דרך משמעותית! אנחנו בערך באמצע.";
  }
  return "כמעט סיימנו! שומרים על המומנטום.";
}

/* ── Scenic tier SVG backgrounds ─────────────────────── */

const TierBackground = ({ variant }: { variant: 1 | 2 | 3 }) => {
  const gradients: Record<number, [string, string]> = {
    1: ["#e0f2fe", "#bae6fd"], // sky blue
    2: ["#d1fae5", "#a7f3d0"], // green meadow
    3: ["#fef3c7", "#fde68a"], // golden sunset
  };
  const [from, to] = gradients[variant];

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 140"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`bg-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="400" height="140" fill={`url(#bg-${variant})`} />
      {/* Rolling hills */}
      {variant === 1 && (
        <>
          <ellipse cx="80" cy="130" rx="120" ry="40" fill="#7dd3fc" opacity="0.3" />
          <ellipse cx="300" cy="135" rx="140" ry="35" fill="#38bdf8" opacity="0.2" />
          {/* Trees */}
          <polygon points="340,85 345,60 350,85" fill="#22c55e" opacity="0.6" />
          <polygon points="355,90 360,65 365,90" fill="#16a34a" opacity="0.5" />
          <polygon points="60,90 65,65 70,90" fill="#22c55e" opacity="0.5" />
          {/* Mountain */}
          <polygon points="20,100 60,40 100,100" fill="#94a3b8" opacity="0.25" />
          <polygon points="50,100 80,50 110,100" fill="#cbd5e1" opacity="0.2" />
        </>
      )}
      {variant === 2 && (
        <>
          <ellipse cx="200" cy="135" rx="200" ry="30" fill="#86efac" opacity="0.3" />
          <polygon points="150,95 155,65 160,95" fill="#22c55e" opacity="0.6" />
          <polygon points="240,90 246,58 252,90" fill="#16a34a" opacity="0.5" />
          <polygon points="30,95 36,68 42,95" fill="#22c55e" opacity="0.4" />
          {/* Mountains */}
          <polygon points="310,100 350,45 390,100" fill="#64748b" opacity="0.2" />
        </>
      )}
      {variant === 3 && (
        <>
          <ellipse cx="100" cy="130" rx="150" ry="35" fill="#fcd34d" opacity="0.3" />
          <ellipse cx="320" cy="135" rx="100" ry="25" fill="#fbbf24" opacity="0.2" />
          <polygon points="80,90 85,62 90,90" fill="#22c55e" opacity="0.5" />
          <polygon points="300,85 306,55 312,85" fill="#16a34a" opacity="0.4" />
          {/* Flag at finish */}
          <line x1="25" y1="95" x2="25" y2="55" stroke="#1e3a8a" strokeWidth="2" />
          <polygon points="25,55 50,65 25,75" fill="#ef4444" opacity="0.7" />
        </>
      )}
    </svg>
  );
};

/* ── Stage checkpoint ─────────────────────────────────── */

const stages = [
  { icon: "🗣️", label: "שיחה" },
  { icon: "🎧", label: "האזנה" },
  { icon: "📋", label: "הערכה" },
];

interface StageCheckpointProps {
  stageIndex: number;
  isActive: boolean;
  isPast: boolean;
  showPin: boolean;
}

const StageCheckpoint = ({ stageIndex, isActive, isPast, showPin }: StageCheckpointProps) => {
  const stage = stages[stageIndex];
  return (
    <div className="relative flex flex-col items-center gap-1">
      {showPin && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute -top-10 z-10"
        >
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-soft text-sm">
              👤
            </div>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-accent" />
          </div>
        </motion.div>
      )}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-colors ${
          isActive
            ? "border-accent bg-accent/20 shadow-soft"
            : isPast
            ? "border-primary/40 bg-primary/10"
            : "border-border bg-card"
        }`}
      >
        {stage.icon}
      </div>
      <span className="text-[10px] font-bold text-muted-foreground">{stage.label}</span>
    </div>
  );
};

/* ── Tier row ─────────────────────────────────────────── */

interface TierProps {
  seriesNum: 1 | 2 | 3;
  currentSeries: number;
  currentStage: number;
}

const Tier = ({ seriesNum, currentSeries, currentStage }: TierProps) => {
  const isPastSeries = currentSeries > seriesNum;
  const isCurrentSeries = currentSeries === seriesNum;

  // RTL: stages flow right-to-left (0=rightmost, 2=leftmost)
  const stagesOrdered = [0, 1, 2];

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ minHeight: 120 }}>
      <TierBackground variant={seriesNum} />
      <div className="relative z-10 p-4">
        {/* Series label */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-primary/70 bg-card/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
            סדרה {seriesNum}
          </span>
          {seriesNum === 1 && (
            <span className="text-xs font-extrabold text-primary">התחלה ←</span>
          )}
          {seriesNum === 3 && (
            <span className="text-xs font-extrabold text-primary">→ סיום 🏁</span>
          )}
        </div>

        {/* Stages path */}
        <div className="flex items-center justify-around">
          {stagesOrdered.map((si, idx) => {
            const isPast = isPastSeries || (isCurrentSeries && currentStage > si);
            const isActive = isCurrentSeries && currentStage === si;
            const showPin = isActive;
            return (
              <div key={si} className="flex items-center">
                <StageCheckpoint
                  stageIndex={si}
                  isActive={isActive}
                  isPast={isPast}
                  showPin={showPin}
                />
                {idx < stagesOrdered.length - 1 && (
                  <div className="flex items-center mx-1">
                    <div
                      className={`w-8 border-t-2 border-dashed ${
                        isPast || (isCurrentSeries && currentStage > si)
                          ? "border-primary/40"
                          : "border-border"
                      }`}
                    />
                    <span className="text-muted-foreground text-[10px]">←</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Connector arrow to next tier */}
      {seriesNum < 3 && (
        <div className="flex justify-start pr-8 pb-1 relative z-10">
          <span className="text-muted-foreground text-lg leading-none">↓</span>
        </div>
      )}
    </div>
  );
};

/* ── Main page ────────────────────────────────────────── */

const JourneyMap = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("children")
        .select("id, first_name, current_phase, icon")
        .or(`parent_id.eq.${user.id},user_id.eq.${user.id},parent_email.eq.${user.email}`);

      if (data?.length) {
        setProfiles(data as ChildProfile[]);
        setSelectedChild(data[0] as ChildProfile);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <main className="max-w-md mx-auto min-h-svh flex items-center justify-center">
        <p className="text-muted-foreground">טוען...</p>
      </main>
    );
  }

  const child = selectedChild;
  const { series: currentSeries, stage: currentStage } = child
    ? phaseToSeriesStage(child.current_phase)
    : { series: 1, stage: 0 };

  const motivationText = getMotivationText(currentSeries);

  return (
    <main className="max-w-md mx-auto min-h-svh flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary text-primary-foreground px-5 py-4 flex items-center justify-between"
      >
        <h1 className="text-xl font-extrabold">מפת המסע שלך</h1>
        <button onClick={signOut} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </motion.header>

      {/* Profile selector (if multiple) */}
      {profiles.length > 1 && (
        <div className="flex gap-2 px-5 py-3 overflow-x-auto">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedChild(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
                selectedChild?.id === p.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-card text-foreground border border-border"
              }`}
            >
              <span>{ICON_EMOJI[p.icon] || "🚀"}</span>
              {p.first_name}
            </button>
          ))}
        </div>
      )}

      {/* Map content */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        {/* Motivation card */}
        <motion.div
          key={child?.id}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-xl p-4 shadow-soft border border-border text-center space-y-1"
        >
          <p className="text-2xl">📍</p>
          <p className="font-extrabold text-foreground text-base">אנחנו כאן</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{motivationText}</p>
        </motion.div>

        {/* 3 Tiers */}
        <div className="space-y-2">
          {([1, 2, 3] as const).map((s) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: s * 0.1 }}
            >
              <Tier seriesNum={s} currentSeries={currentSeries} currentStage={currentStage} />
            </motion.div>
          ))}
        </div>

        {/* Progress summary */}
        <div className="bg-card rounded-xl p-4 shadow-soft border border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-bold">התקדמות כוללת</span>
            <span className="font-extrabold text-primary">
              {child ? Math.round(((child.current_phase - 1) / 6) * 100) : 0}%
            </span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${child ? ((child.current_phase - 1) / 6) * 100 : 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="flex justify-around py-4 border-t border-border bg-card">
        <button
          onClick={() => navigate("/")}
          className="flex flex-col items-center gap-1 text-muted-foreground"
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">בית</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-primary">
          <Map className="h-5 w-5" />
          <span className="text-xs font-bold">מפת המסע</span>
        </button>
      </nav>
    </main>
  );
};

export default JourneyMap;
