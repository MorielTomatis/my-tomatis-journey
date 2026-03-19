import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Home, Map, LogOut } from "lucide-react";

import iconEarCheck from "@/assets/icon-ear-check.png";
import iconIntensive from "@/assets/icon-intensive.png";
import iconConsolidation from "@/assets/icon-consolidation.png";

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

// Stage assets & labels
const stageAssets = [
  { src: iconEarCheck, label: "בדיקת הקשבה" },
  { src: iconIntensive, label: "שלב אינטנסיבי" },
  { src: iconConsolidation, label: "שלב חיזוק והסתגלות" },
];

/**
 * Phase → Series/Stage mapping:
 * Phase 1 (Intensive)     → Series 1, Stage 1 (Intensive/Headphones)
 * Phase 2 (Consolidation) → Series 1, Stage 2 (Consolidation/Shield)
 * Phase 3 (Intensive)     → Series 2, Stage 1
 * Phase 4 (Consolidation) → Series 2, Stage 2
 * Phase 5 (Intensive)     → Series 3, Stage 1
 * Phase 6 (Consolidation) → Series 3, Stage 2
 *
 * Stage 0 = Ear Check (entry), Stage 1 = Intensive, Stage 2 = Consolidation
 */
function phaseToSeriesStage(phase: number): { series: number; stage: number } {
  const series = Math.ceil(phase / 2);
  const isIntensive = phase % 2 === 1;
  return { series, stage: isIntensive ? 1 : 2 };
}

const stageLabels = ["בדיקת הקשבה", "שלב אינטנסיבי", "שלב חיזוק והסתגלות"];

function getMotivationText(series: number, stage: number): string {
  const currentStageLabel = stageLabels[stage] || stageLabels[0];
  if (series <= 1) {
    return `אנחנו כאן 📍 התחלנו את המסע! כל הכבוד על ההתמדה ב${currentStageLabel}.`;
  }
  if (series <= 2) {
    return "אנחנו כאן 📍 עברנו כברת דרך משמעותית! אנחנו בערך באמצע.";
  }
  return "אנחנו כאן 📍 כמעט סיימנו! שומרים על המומנטום.";
}

/* ── Scenic tier SVG backgrounds (compact) ─────────────── */

const TierBackground = ({ variant }: { variant: 1 | 2 | 3 }) => {
  const gradients: Record<number, [string, string]> = {
    1: ["#e0f2fe", "#bae6fd"],
    2: ["#d1fae5", "#a7f3d0"],
    3: ["#fef3c7", "#fde68a"],
  };
  const [from, to] = gradients[variant];

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`bg-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="400" height="100" fill={`url(#bg-${variant})`} />
      {variant === 1 && (
        <>
          <ellipse cx="80" cy="95" rx="120" ry="30" fill="#7dd3fc" opacity="0.3" />
          <ellipse cx="300" cy="98" rx="140" ry="25" fill="#38bdf8" opacity="0.2" />
          <polygon points="340,70 345,50 350,70" fill="#22c55e" opacity="0.5" />
          <polygon points="60,75 65,55 70,75" fill="#22c55e" opacity="0.4" />
        </>
      )}
      {variant === 2 && (
        <>
          <ellipse cx="200" cy="96" rx="200" ry="22" fill="#86efac" opacity="0.3" />
          <polygon points="150,72 155,50 160,72" fill="#22c55e" opacity="0.5" />
          <polygon points="300,75 306,55 312,75" fill="#16a34a" opacity="0.4" />
        </>
      )}
      {variant === 3 && (
        <>
          <ellipse cx="100" cy="95" rx="150" ry="25" fill="#fcd34d" opacity="0.3" />
          <ellipse cx="320" cy="97" rx="100" ry="20" fill="#fbbf24" opacity="0.2" />
          <line x1="25" y1="75" x2="25" y2="45" stroke="#1e3a8a" strokeWidth="2" />
          <polygon points="25,45 45,55 25,65" fill="#ef4444" opacity="0.7" />
        </>
      )}
    </svg>
  );
};

/* ── Stage checkpoint with custom icon ────────────────── */

interface StageCheckpointProps {
  stageIndex: number;
  isActive: boolean;
  isPast: boolean;
}

const StageCheckpoint = ({ stageIndex, isActive, isPast }: StageCheckpointProps) => {
  const asset = stageAssets[stageIndex];
  return (
    <div className="relative flex flex-col items-center gap-0.5">
      {isActive && (
        <motion.div
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute -top-5 z-10 text-base"
        >
          📍
        </motion.div>
      )}
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-colors overflow-hidden ${
          isActive
            ? "border-accent bg-accent/20 shadow-soft ring-2 ring-accent/40"
            : isPast
            ? "border-primary/40 bg-primary/10"
            : "border-border bg-card"
        }`}
      >
        <img src={asset.src} alt={asset.label} className="w-7 h-7 object-contain" />
      </div>
      <span className="text-[9px] font-bold text-foreground leading-tight text-center max-w-[60px]">
        {asset.label}
      </span>
    </div>
  );
};

/* ── Tier row (compact) ───────────────────────────────── */

interface TierProps {
  seriesNum: 1 | 2 | 3;
  currentSeries: number;
  currentStage: number;
}

const Tier = ({ seriesNum, currentSeries, currentStage }: TierProps) => {
  const isPastSeries = currentSeries > seriesNum;
  const isCurrentSeries = currentSeries === seriesNum;

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ height: 100 }}>
      <TierBackground variant={seriesNum} />
      <div className="relative z-10 px-3 pt-1.5 pb-1 h-full flex flex-col justify-between">
        {/* Series label row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-primary/70 bg-card/60 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            סדרה {seriesNum}
          </span>
          {seriesNum === 1 && (
            <span className="text-[10px] font-extrabold text-primary">התחלה ←</span>
          )}
          {seriesNum === 3 && (
            <span className="text-[10px] font-extrabold text-primary">→ סיום 🏁</span>
          )}
        </div>

        {/* Stages path */}
        <div className="flex items-center justify-around flex-1 pt-1">
          {[0, 1, 2].map((si, idx) => {
            const isPast = isPastSeries || (isCurrentSeries && currentStage > si);
            const isActive = isCurrentSeries && currentStage === si;
            return (
              <div key={si} className="flex items-center">
                <StageCheckpoint stageIndex={si} isActive={isActive} isPast={isPast} />
                {idx < 2 && (
                  <div className="flex items-center mx-0.5">
                    <div
                      className={`w-5 border-t-2 border-dashed ${
                        isPast || (isCurrentSeries && currentStage > si)
                          ? "border-primary/40"
                          : "border-border"
                      }`}
                    />
                    <span className="text-muted-foreground text-[8px]">←</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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
    const fetchData = async () => {
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
    fetchData();
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

  const motivationText = getMotivationText(currentSeries, currentStage);
  const progressPercent = child ? Math.round(((child.current_phase - 1) / 6) * 100) : 0;

  return (
    <main className="max-w-md mx-auto h-svh flex flex-col bg-background overflow-hidden" dir="rtl">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0"
      >
        <h1 className="text-lg font-extrabold">מפת המסע שלך</h1>
        <button onClick={signOut} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </motion.header>

      {/* Profile selector (if multiple) */}
      {profiles.length > 1 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto shrink-0">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedChild(p)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
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

      {/* Compact motivation header */}
      <div className="px-4 py-2 shrink-0">
        <p className="text-sm font-bold text-foreground leading-snug">{motivationText}</p>
      </div>

      {/* Map tiers - fill remaining space */}
      <div className="flex-1 px-3 flex flex-col gap-2 min-h-0">
        {([1, 2, 3] as const).map((s) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: s * 0.08 }}
            className="flex-1"
          >
            <Tier seriesNum={s} currentSeries={currentSeries} currentStage={currentStage} />
          </motion.div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 shrink-0">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground font-bold">התקדמות כוללת</span>
          <span className="font-extrabold text-primary text-base">{progressPercent}%</span>
        </div>
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="flex justify-around py-3 border-t border-border bg-card shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex flex-col items-center gap-0.5 text-muted-foreground"
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">בית</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 text-primary">
          <Map className="h-5 w-5" />
          <span className="text-xs font-bold">מפת המסע</span>
        </button>
      </nav>
    </main>
  );
};

export default JourneyMap;
