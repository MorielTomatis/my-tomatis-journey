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

const stageAssets = [
  { src: iconEarCheck, label: "בדיקת הקשבה" },
  { src: iconIntensive, label: "שלב אינטנסיבי" },
  { src: iconConsolidation, label: "שלב של חיזוק והסתגלות" },
];

function phaseToSeriesStage(phase: number): { series: number; stage: number } {
  const series = Math.ceil(phase / 2);
  const isIntensive = phase % 2 === 1;
  return { series, stage: isIntensive ? 1 : 2 };
}

const stageLabels = ["בדיקת הקשבה", "שלב אינטנסיבי", "שלב של חיזוק והסתגלות"];

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
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`bg-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="400" height="80" fill={`url(#bg-${variant})`} />
      {variant === 1 && (
        <>
          <ellipse cx="80" cy="75" rx="120" ry="20" fill="#7dd3fc" opacity="0.3" />
          <ellipse cx="300" cy="78" rx="140" ry="18" fill="#38bdf8" opacity="0.2" />
          <polygon points="340,55 345,38 350,55" fill="#22c55e" opacity="0.5" />
          <polygon points="60,58 65,42 70,58" fill="#22c55e" opacity="0.4" />
        </>
      )}
      {variant === 2 && (
        <>
          <ellipse cx="200" cy="76" rx="200" ry="16" fill="#86efac" opacity="0.3" />
          <polygon points="150,55 155,38 160,55" fill="#22c55e" opacity="0.5" />
          <polygon points="300,58 306,42 312,58" fill="#16a34a" opacity="0.4" />
        </>
      )}
      {variant === 3 && (
        <>
          <ellipse cx="100" cy="75" rx="150" ry="18" fill="#fcd34d" opacity="0.3" />
          <ellipse cx="320" cy="77" rx="100" ry="14" fill="#fbbf24" opacity="0.2" />
          <line x1="25" y1="58" x2="25" y2="35" stroke="#1e3a8a" strokeWidth="2" />
          <polygon points="25,35 45,45 25,55" fill="#ef4444" opacity="0.7" />
        </>
      )}
    </svg>
  );
};

interface StageCheckpointProps {
  stageIndex: number;
  isActive: boolean;
  isPast: boolean;
}

const StageCheckpoint = ({ stageIndex, isActive, isPast }: StageCheckpointProps) => {
  const asset = stageAssets[stageIndex];
  return (
    <div className="relative flex flex-col items-center">
      {isActive && (
        <motion.div
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute -top-5 z-20 text-lg"
        >
          📍
        </motion.div>
      )}
      <div
        className={`bg-white/95 rounded-2xl shadow-md p-1.5 flex items-center justify-center w-[100px] h-[68px] relative z-10 transition-all ${
          isActive
            ? "shadow-lg ring-2 ring-accent/50"
            : isPast
            ? "opacity-70"
            : "opacity-50"
        }`}
      >
        <img src={asset.src} alt={asset.label} className="w-full h-full object-contain" />
      </div>
    </div>
  );
};

interface TierProps {
  seriesNum: 1 | 2 | 3;
  currentSeries: number;
  currentStage: number;
}

const Tier = ({ seriesNum, currentSeries, currentStage }: TierProps) => {
  const isPastSeries = currentSeries > seriesNum;
  const isCurrentSeries = currentSeries === seriesNum;

  return (
    <div className="relative overflow-hidden flex-1">
      <TierBackground variant={seriesNum} />
      <div className="relative z-10 px-2 py-1 h-full flex flex-col justify-between">
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

        <div className="flex items-center justify-around flex-1">
          {[0, 1, 2].map((si, idx) => {
            const isPast = isPastSeries || (isCurrentSeries && currentStage > si);
            const isActive = isCurrentSeries && currentStage === si;
            return (
              <div key={si} className="flex items-center">
                <StageCheckpoint stageIndex={si} isActive={isActive} isPast={isPast} />
                {idx < 2 && (
                  <div className="flex items-center mx-0.5">
                    <div
                      className={`w-4 border-t-2 border-dashed ${
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
        className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between shrink-0"
      >
        <h1 className="text-lg font-extrabold">מפת המסע שלך</h1>
        <button onClick={signOut} className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </motion.header>

      {/* Profile selector */}
      {profiles.length > 1 && (
        <div className="flex gap-2 px-4 py-1.5 overflow-x-auto shrink-0">
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

      {/* Compact motivation */}
      <div className="px-4 py-1.5 shrink-0">
        <p className="text-sm font-bold text-foreground leading-snug">{motivationText}</p>
      </div>

      {/* Map tiers - zero gap, continuous scenic map */}
      <div className="flex-1 flex flex-col min-h-0">
        {([1, 2, 3] as const).map((s) => (
          <Tier key={s} seriesNum={s} currentSeries={currentSeries} currentStage={currentStage} />
        ))}
      </div>

      {/* Progress bar */}
      <div className="px-4 py-1.5 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold text-muted-foreground">התקדמות כוללת</span>
          <span className="font-extrabold text-primary text-lg">{progressPercent}%</span>
        </div>
        <div className="h-3.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="flex justify-around py-2.5 border-t border-border bg-card shrink-0">
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
