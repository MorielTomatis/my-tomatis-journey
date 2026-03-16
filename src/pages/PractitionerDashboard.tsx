import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreVertical, Calendar, Mic, Headphones, LogOut } from "lucide-react";

const PHASE_NAMES: Record<number, string> = {
  1: "אינטנסיבי 1",
  2: "קונסולידציה 1",
  3: "אינטנסיבי 2",
  4: "קונסולידציה 2",
  5: "אינטנסיבי 3",
  6: "קונסולידציה 3",
};

interface ChildWithStats {
  id: string;
  first_name: string;
  last_name: string;
  current_phase: number;
  is_active: boolean;
  parent_id: string;
  start_date: string;
  passive_duration: number;
  sessionCount: number;
  lastSessionDate: string | null;
  loggedToday: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const PractitionerDashboard = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("active");

  // Add client modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: "",
    last_name: "",
    parent_email: "",
    start_date: new Date().toISOString().split("T")[0],
    passive_duration: 40,
    starting_phase: 1,
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Manual log modal
  const [logOpen, setLogOpen] = useState(false);
  const [logChild, setLogChild] = useState<ChildWithStats | null>(null);
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split("T")[0],
    passive_completed: true,
    active_completed: false,
    active_minutes: "" as number | "",
  });
  const [logSubmitting, setLogSubmitting] = useState(false);

  // Reset phase confirmation
  const [resetOpen, setResetOpen] = useState(false);
  const [resetChild, setResetChild] = useState<ChildWithStats | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchChildren = useCallback(async () => {
    try {
      const { data: allChildren, error } = await supabase
        .from("children")
        .select("*")
        .order("first_name");

      if (error) throw error;
      if (!allChildren) { setChildren([]); setLoading(false); return; }

      // Get all unarchived sessions for these children
      const childIds = allChildren.map((c) => c.id);
      const { data: sessions } = await supabase
        .from("sessions")
        .select("child_id, date, passive_completed, is_archived")
        .in("child_id", childIds)
        .eq("is_archived", false);

      const enriched: ChildWithStats[] = allChildren.map((c) => {
        const childSessions = sessions?.filter((s) => s.child_id === c.id) ?? [];
        const passiveSessions = childSessions.filter((s) => s.passive_completed);
        const lastSession = childSessions.sort((a, b) => b.date.localeCompare(a.date))[0];
        const loggedToday = childSessions.some((s) => s.date === today);

        return {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          current_phase: c.current_phase,
          is_active: c.is_active,
          parent_id: c.parent_id,
          start_date: c.start_date,
          passive_duration: c.passive_duration,
          sessionCount: passiveSessions.length,
          lastSessionDate: lastSession?.date ?? null,
          loggedToday,
        };
      });

      setChildren(enriched);
    } catch {
      toast({ title: "שגיאה בטעינת נתונים", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [today, toast]);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  // Filter logic
  const filtered = children.filter((c) => {
    const isActiveTab = tab === "active" ? c.is_active : !c.is_active;
    const matchesSearch =
      !search ||
      `${c.first_name} ${c.last_name}`.includes(search);
    return isActiveTab && matchesSearch;
  });

  // Status dot logic
  const getStatus = (child: ChildWithStats): "logged" | "missed" | "pending" => {
    if (child.loggedToday) return "logged";
    const hour = new Date().getHours();
    if (hour >= 20) return "missed";
    return "pending";
  };

  // Add client handler
  const handleAddClient = async () => {
    if (!addForm.first_name || !addForm.last_name || !addForm.parent_email) {
      toast({ title: "נא למלא את כל השדות", variant: "destructive" });
      return;
    }
    setAddSubmitting(true);
    try {
      // Look up parent by email using a simple approach: 
      // We need the parent's user ID. Since we can't query auth.users directly,
      // we'll store the parent_email and the practitioner will need to ensure
      // the parent has signed up. For now, we create with a placeholder approach.
      // Actually, we'll use Supabase admin to invite the user or look them up.
      // Simpler: use supabase.auth.admin is not available client-side.
      // Best approach: use an edge function. For MVP, let's require parent_id directly
      // or use the email to find them via a DB function.
      
      // For now, let's look up the user via edge function or just store.
      // Simplest MVP: call an RPC or just note that parent must exist.
      // We'll create the child referencing a lookup - but auth.users isn't queryable.
      // Let's use a pragmatic approach: the practitioner enters parent email,
      // we'll try to find them via a simple edge function approach.
      
      // For MVP: we'll just insert and let the practitioner know if it fails
      // We need the parent user ID - let's use a server function
      const { data: lookupData, error: lookupError } = await supabase.rpc("get_user_id_by_email" as any, {
        _email: addForm.parent_email,
      });

      if (lookupError || !lookupData) {
        toast({ title: "המייל לא קיים במערכת. על ההורה להירשם תחילה.", variant: "destructive" });
        setAddSubmitting(false);
        return;
      }

      const parentId = lookupData as string;

      const { error } = await supabase.from("children").insert({
        first_name: addForm.first_name,
        last_name: addForm.last_name,
        parent_id: parentId,
        start_date: addForm.start_date,
        passive_duration: addForm.passive_duration,
        current_phase: addForm.starting_phase,
      });

      if (error) throw error;

      toast({ title: "מטופל נוסף בהצלחה ✓" });
      setAddOpen(false);
      setAddForm({
        first_name: "",
        last_name: "",
        parent_email: "",
        start_date: new Date().toISOString().split("T")[0],
        passive_duration: 40,
        starting_phase: 1,
      });
      await fetchChildren();
    } catch {
      toast({ title: "שגיאה בהוספת מטופל", variant: "destructive" });
    } finally {
      setAddSubmitting(false);
    }
  };

  // Manual log handler
  const handleManualLog = async () => {
    if (!logChild) return;
    setLogSubmitting(true);
    try {
      const { error } = await supabase.from("sessions").insert({
        child_id: logChild.id,
        date: logForm.date,
        passive_completed: logForm.passive_completed,
        active_completed: logForm.active_completed,
        active_minutes: logForm.active_completed && logForm.active_minutes ? Number(logForm.active_minutes) : null,
      });
      if (error) throw error;

      toast({ title: "עדכון ידני נשמר ✓" });
      setLogOpen(false);
      await fetchChildren();
    } catch {
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      setLogSubmitting(false);
    }
  };

  // Reset phase handler
  const handleResetPhase = async () => {
    if (!resetChild) return;
    setResetSubmitting(true);
    try {
      // Archive all unarchived sessions for this child
      const { error } = await supabase
        .from("sessions")
        .update({ is_archived: true })
        .eq("child_id", resetChild.id)
        .eq("is_archived", false);

      if (error) throw error;

      toast({ title: "השלב אופס בהצלחה. ספירת הסשנים התחילה מחדש." });
      setResetOpen(false);
      await fetchChildren();
    } catch {
      toast({ title: "שגיאה באיפוס", variant: "destructive" });
    } finally {
      setResetSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto min-h-svh flex items-center justify-center">
        <p className="text-muted-foreground">טוען...</p>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto min-h-svh flex flex-col p-5">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 flex-1 flex flex-col">
        {/* Header */}
        <motion.header variants={item} className="py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">שלום, מוריאל</h1>
            <p className="text-muted-foreground text-sm">לוח בקרה · {children.filter(c => c.is_active).length} מטופלים פעילים</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              הוספת מטופל חדש
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="התנתק">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </motion.header>

        {/* Tabs + Search */}
        <motion.div variants={item} className="flex items-center gap-3">
          <Tabs value={tab} onValueChange={setTab} className="flex-1">
            <TabsList className="w-auto">
              <TabsTrigger value="active">פעילים ({children.filter(c => c.is_active).length})</TabsTrigger>
              <TabsTrigger value="completed">הושלמו ({children.filter(c => !c.is_active).length})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 w-52"
            />
          </div>
        </motion.div>

        {/* Client Grid */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <motion.div variants={item} className="text-center py-16 text-muted-foreground">
              <p className="text-lg">אין מטופלים להצגה</p>
            </motion.div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {filtered.map((child) => {
                const status = getStatus(child);
                return (
                  <motion.div
                    key={child.id}
                    variants={item}
                    className="bg-card rounded-xl p-5 shadow-soft space-y-3 relative"
                  >
                    {/* Top row: name + status dot + menu */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {tab === "active" && (
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              status === "logged"
                                ? "bg-status-logged"
                                : status === "missed"
                                ? "bg-status-missed"
                                : "bg-status-none"
                            }`}
                          />
                        )}
                        <h3 className="font-bold text-foreground">
                          {child.first_name} {child.last_name}
                        </h3>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-md hover:bg-muted transition-colors">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onClick={() => {
                              setLogChild(child);
                              setLogForm({
                                date: today,
                                passive_completed: true,
                                active_completed: false,
                                active_minutes: "",
                              });
                              setLogOpen(true);
                            }}
                          >
                            <Calendar className="h-4 w-4 ml-2" />
                            עדכון ידני
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setResetChild(child);
                              setResetOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <span className="ml-2">🔄</span>
                            איפוס שלב
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Phase info */}
                    <div className="space-y-1.5">
                      <span className="inline-block bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-bold">
                        {PHASE_NAMES[child.current_phase] ?? `שלב ${child.current_phase}`}
                      </span>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Headphones className="h-3.5 w-3.5" />
                        <span>יום {child.sessionCount} מתוך 14</span>
                      </div>
                    </div>

                    {/* Last session */}
                    <p className="text-xs text-muted-foreground">
                      {child.lastSessionDate
                        ? `סשן אחרון: ${new Date(child.lastSessionDate).toLocaleDateString("he-IL")}`
                        : "טרם נרשם סשן"}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ===== ADD CLIENT MODAL ===== */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>הוספת מטופל חדש</DialogTitle>
            <DialogDescription>הזינו את פרטי המטופל וההורה</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">שם פרטי</label>
                <Input value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">שם משפחה</label>
                <Input value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">אימייל הורה</label>
              <Input type="email" dir="ltr" value={addForm.parent_email} onChange={(e) => setAddForm({ ...addForm, parent_email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">תאריך התחלה</label>
              <Input type="date" dir="ltr" value={addForm.start_date} onChange={(e) => setAddForm({ ...addForm, start_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">משך האזנה פסיבית (דקות)</label>
                <select
                  value={addForm.passive_duration}
                  onChange={(e) => setAddForm({ ...addForm, passive_duration: Number(e.target.value) })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={40}>40</option>
                  <option value={60}>60</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">שלב התחלתי</label>
                <select
                  value={addForm.starting_phase}
                  onChange={(e) => setAddForm({ ...addForm, starting_phase: Number(e.target.value) })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddClient} disabled={addSubmitting} className="w-full">
              {addSubmitting ? "שומר..." : "הוסף מטופל"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MANUAL LOG MODAL ===== */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>עדכון ידני — {logChild?.first_name} {logChild?.last_name}</DialogTitle>
            <DialogDescription>רישום סשן ידני עבור המטופל</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-bold">תאריך</label>
              <Input type="date" dir="ltr" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={logForm.passive_completed}
                onChange={(e) => setLogForm({ ...logForm, passive_completed: e.target.checked })}
                className="h-5 w-5 rounded border-border accent-accent"
              />
              <span className="text-sm font-bold flex items-center gap-1.5">
                <Headphones className="h-4 w-4" /> האזנה פסיבית הושלמה
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={logForm.active_completed}
                onChange={(e) => setLogForm({ ...logForm, active_completed: e.target.checked })}
                className="h-5 w-5 rounded border-border accent-accent"
              />
              <span className="text-sm font-bold flex items-center gap-1.5">
                <Mic className="h-4 w-4" /> עבודה פעילה הושלמה
              </span>
            </label>
            {logForm.active_completed && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold">דקות פעילות</label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={logForm.active_minutes}
                  onChange={(e) => setLogForm({ ...logForm, active_minutes: e.target.value === "" ? "" : Number(e.target.value) })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleManualLog} disabled={logSubmitting} className="w-full">
              {logSubmitting ? "שומר..." : "שמור עדכון"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== RESET PHASE CONFIRMATION ===== */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>איפוס שלב — {resetChild?.first_name} {resetChild?.last_name}</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תארכב את כל הסשנים הקיימים בשלב הנוכחי ותתחיל את הספירה מחדש.
              <br />
              <strong>לא ניתן לבטל פעולה זו.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPhase}
              disabled={resetSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetSubmitting ? "מאפס..." : "אפס שלב"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default PractitionerDashboard;
