import { motion } from "framer-motion";

const patients = [
  { name: "איתי כהן", time: "16:00 - 16:45", initial: "א", status: "logged" },
  { name: "נועה לוי", time: "17:00 - 17:45", initial: "נ", status: "none" },
  { name: "יונתן ברק", time: "18:00 - 18:45", initial: "י", status: "missed" },
  { name: "מאיה דוד", time: "19:00 - 19:45", initial: "מ", status: "none" },
];

const statusDot: Record<string, string> = {
  logged: "bg-status-logged",
  missed: "bg-status-missed",
  none: "bg-status-none",
};

const avatarBg: Record<string, string> = {
  logged: "bg-accent/20 text-accent",
  missed: "bg-destructive/10 text-destructive",
  none: "bg-primary/10 text-primary",
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

const PractitionerDashboard = () => {
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
          <h1 className="text-2xl font-bold text-primary">יומן טיפולים</h1>
          <p className="text-muted-foreground">יום שלישי, 14 במאי</p>
        </motion.header>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-3 gap-3">
          <div className="bg-card p-4 rounded-xl shadow-soft text-center">
            <p className="text-2xl font-bold text-primary">4</p>
            <p className="text-xs text-muted-foreground">פגישות היום</p>
          </div>
          <div className="bg-card p-4 rounded-xl shadow-soft text-center">
            <p className="text-2xl font-bold text-accent">2</p>
            <p className="text-xs text-muted-foreground">עדכוני הורים</p>
          </div>
          <div className="bg-card p-4 rounded-xl shadow-soft text-center">
            <p className="text-2xl font-bold text-destructive">1</p>
            <p className="text-xs text-muted-foreground">חסר עדכון</p>
          </div>
        </motion.div>

        {/* Patient List */}
        <motion.div variants={item}>
          <h2 className="font-bold text-lg mb-3">הפגישות להיום</h2>
        </motion.div>

        <div className="space-y-3">
          {patients.map((patient) => (
            <motion.div
              key={patient.name}
              variants={item}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card p-4 rounded-lg flex items-center justify-between shadow-soft cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${avatarBg[patient.status]}`}
                >
                  {patient.initial}
                </div>
                <div>
                  <p className="font-bold">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">{patient.time}</p>
                </div>
              </div>
              <div className={`h-3 w-3 rounded-full ${statusDot[patient.status]}`} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom Nav */}
      <nav className="flex justify-around py-4 mt-auto border-t border-border">
        <button className="flex flex-col items-center gap-1 text-primary">
          <span className="text-xl">📋</span>
          <span className="text-xs font-bold">יומן</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground">
          <span className="text-xl">👥</span>
          <span className="text-xs">מטופלים</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-muted-foreground">
          <span className="text-xl">⚙️</span>
          <span className="text-xs">הגדרות</span>
        </button>
      </nav>
    </main>
  );
};

export default PractitionerDashboard;
