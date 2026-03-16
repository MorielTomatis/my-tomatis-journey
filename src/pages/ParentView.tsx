import { useState } from "react";
import { motion } from "framer-motion";

const days = [
  { label: "א׳", status: "logged" },
  { label: "ב׳", status: "logged" },
  { label: "ג׳", status: "logged" },
  { label: "ד׳", status: "missed" },
  { label: "ה׳", status: "none" },
];

const statusColor: Record<string, string> = {
  logged: "bg-status-logged",
  missed: "bg-status-missed",
  none: "bg-status-none",
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

// Phase config — determines which UI to show
type PhaseType = "listening_only" | "listening_and_mic";

interface PhaseConfig {
  label: string;
  number: number;
  type: PhaseType;
}

// Current phase (will be driven by DB later)
const currentPhase: PhaseConfig = {
  label: "שלב אינטנסיבי",
  number: 1,
  type: "listening_only", // Change to "listening_and_mic" for סדרות 2 & 3
};

const ParentView = () => {
  const [listeningDone, setListeningDone] = useState(false);
  const [micDone, setMicDone] = useState(false);
  const [micMinutes, setMicMinutes] = useState<number | "">("");

  const requiresMic = currentPhase.type === "listening_and_mic";

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
          <h1 className="text-2xl font-bold text-primary">איתי · מסע טומטיס · יום 18</h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
              שלב {currentPhase.number} מתוך 6 · {currentPhase.label}
            </span>
          </div>
        </motion.header>

        {/* Progress Card */}
        <motion.div
          variants={item}
          className="bg-card p-6 rounded-xl shadow-soft"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">התקדמות שבועית</h2>
            <span className="text-xs bg-accent/10 text-accent px-3 py-1 rounded-full font-bold">
              3/5 ימים
            </span>
          </div>
          <div className="flex gap-2">
            {days.map((day) => (
              <div key={day.label} className="flex-1 text-center space-y-1">
                <div
                  className={`h-10 rounded-lg ${statusColor[day.status]}`}
                />
                <span className="text-xs text-muted-foreground">{day.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Log */}
        <motion.div variants={item} className="bg-card p-5 rounded-xl shadow-soft">
          <h3 className="font-bold mb-2">העדכון האחרון</h3>
          <p className="text-sm text-muted-foreground">
            איתי היה רגוע היום, שיחק עם חברים בגן. הרגיש קצת עצוב לפני השינה.
          </p>
          <span className="text-xs text-muted-foreground mt-2 block">אתמול, 20:30</span>
        </motion.div>

        {/* Upcoming Session */}
        <motion.div variants={item} className="bg-card p-5 rounded-xl shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold text-sm">📅</span>
            </div>
            <div>
              <p className="font-bold text-sm">הפגישה הבאה</p>
              <p className="text-sm text-muted-foreground">מחר ב-16:00 עם דנה</p>
            </div>
          </div>
        </motion.div>

        {/* Logging Actions */}
        <motion.div variants={item} className="space-y-3">
          {/* Mic encouragement text — only for mic phases */}
          {requiresMic && (
            <p className="text-sm text-center text-muted-foreground leading-relaxed px-2">
              עבודה עם המיקרופון היא הלב של התהליך. אפילו חמש דקות ביום עושות הבדל גדול.
            </p>
          )}

          {/* Listening button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setListeningDone(!listeningDone)}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-soft transition-colors ${
              listeningDone
                ? "bg-accent text-accent-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            האזנה הושלמה {listeningDone ? "✓" : ""}
          </motion.button>

          {/* Mic section — only for phases requiring mic work */}
          {requiresMic && (
            <>
              <motion.button
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setMicDone(!micDone)}
                className={`w-full py-4 rounded-xl font-bold text-base shadow-soft transition-colors ${
                  micDone
                    ? "bg-accent text-accent-foreground"
                    : "bg-primary text-primary-foreground"
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
