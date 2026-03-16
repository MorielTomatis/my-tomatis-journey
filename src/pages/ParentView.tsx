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
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

const ParentView = () => {
  return (
    <main className="max-w-md mx-auto min-h-svh flex flex-col p-5">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 flex-1"
      >
        {/* Header */}
        <motion.header variants={item} className="py-4">
          <h1 className="text-2xl font-bold text-primary">היי, מיכל 👋</h1>
          <p className="text-muted-foreground">מה שלום איתי היום?</p>
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

        {/* CTA */}
        <motion.div variants={item}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg shadow-soft"
          >
            עדכון יומי חדש ✏️
          </motion.button>
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
