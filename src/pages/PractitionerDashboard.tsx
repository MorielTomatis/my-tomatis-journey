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
import { Search, Plus, MoreVertical, Calendar as CalendarIcon, Mic, Headphones, LogOut, Rocket, Sun, Star, Shield, List } from "lucide-react";
import FamilyCreatorDialog from "@/components/FamilyCreatorDialog";
import AddMemberDialog from "@/components/AddMemberDialog";
import YearlyHeatmapModal from "@/components/YearlyHeatmapModal";
import SessionLogModal from "@/components/SessionLogModal";
import HistoryCalendarModal from "@/components/HistoryCalendarModal";
import ResourceManager from "@/components/ResourceManager";

const PHASE_NAMES: Record<number, string> = {
  1: "סדרה 1 · שלב אינטנסיבי",
  2: "סדרה 1 · שלב חיזוק והסתגלות",
  3: "סדרה 2 · שלב אינטנסיבי",
  4: "סדרה 2 · שלב חיזוק והסתגלות",
  5: "סדרה 3 · שלב אינטנסיבי",
  6: "סדרה 3 · שלב חיזוק והסתגלות",
};

const ICON_EMOJI: Record<string, string> = {
  rocket: "🚀", sun: "☀️", star: "⭐", shield: "🛡️",
};

interface ChildWithStats {
  id: string;
  first_name: string;
  last_name: string;
  current_phase: number;
  is_active: boolean;
  parent_id: string | null;
  user_id: string | null;
  parent_email: string | null;
  start_date: string;
  passive_duration: number;
  icon: string;
  profile_type: string | null;
  sessionCount: number;
  lastSessionDate: string | null;
  loggedToday: boolean;
  isListeningDone: boolean;
  isActiveWorkDone: boolean;
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("active");

  // Family Creator modal
  const [addOpen, setAddOpen] = useState(false);

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

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editChild, setEditChild] = useState<ChildWithStats | null>(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", parent_email: "", profile_type: "child", icon: "rocket" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteChild, setDeleteChild] = useState<ChildWithStats | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Add member to existing family
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberLastName, setAddMemberLastName] = useState("");

  // History modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyChild, setHistoryChild] = useState<ChildWithStats | null>(null);

  // Yearly heatmap modal
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const [heatmapChild, setHeatmapChild] = useState<ChildWithStats | null>(null);

  // Session log modal
  const [sessionLogOpen, setSessionLogOpen] = useState(false);
  const [sessionLogChild, setSessionLogChild] = useState<ChildWithStats | null>(null);

  const toIsraelDate = (d: Date) => {
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  };
  const today = toIsraelDate(new Date());

  const fetchChildren = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const { data: allChildren, error } = await supabase
        .from("children")
        .select("*")
        .order("first_name");

      if (error) throw error;
      if (!allChildren) {
        setChildren([]);
        return;
      }

      const childIds = allChildren.map((c) => c.id);
      const { data: sessions, error: sessionsError } = childIds.length
        ? await supabase
            .from("sessions")
            .select("child_id, date, passive_completed, is_listening_done, is_active_work_done, is_archived")
            .in("child_id", childIds)
            .eq("is_archived", false)
        : { data: [], error: null };

      if (sessionsError) throw sessionsError;

      const enriched: ChildWithStats[] = allChildren.map((c) => {
        const childSessions = sessions?.filter((s) => s.child_id === c.id) ?? [];
        const passiveSessions = childSessions.filter((s) => s.passive_completed);
        const lastSession = [...childSessions].sort((a, b) => b.date.localeCompare(a.date))[0];
        const loggedToday = childSessions.some((s) => s.date === today);
        const todaySession = childSessions.find((s) => s.date === today);
        const isListeningDone = todaySession?.is_listening_done === true;
        const isActiveWorkDone = todaySession?.is_active_work_done === true;

        return {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          current_phase: c.current_phase,
          is_active: c.is_active,
          parent_id: c.parent_id,
          user_id: c.user_id,
          parent_email: c.parent_email,
          start_date: c.start_date,
          passive_duration: c.passive_duration,
          icon: c.icon ?? "rocket",
          profile_type: c.profile_type ?? "child",
          sessionCount: passiveSessions.length,
          lastSessionDate: lastSession?.date ?? null,
          loggedToday,
          isListeningDone,
          isActiveWorkDone,
        };
      });

      setChildren(enriched);
    } catch (err: any) {
      const rawMessage = err?.message || err?.details || String(err);
      console.error("fetchChildren error:", err);
      setLoadError(rawMessage);
      toast({ title: rawMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [today, toast]);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  // Realtime subscription for sessions table
  useEffect(() => {
    const channel = supabase
      .channel('sessions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          console.log("Realtime session update received, refreshing...");
          fetchChildren();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchChildren]);

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

  const getCardBorderClasses = (child: ChildWithStats): string => {
    if (child.isListeningDone && child.isActiveWorkDone) {
      return "border-2 border-[#40C4C4] ring-2 ring-[#1E3A8A] ring-offset-2 ring-offset-slate-50";
    }
    if (child.isListeningDone) {
      return "border-2 border-[#40C4C4] ring-0";
    }
    if (child.isActiveWorkDone) {
      return "border-2 border-[#1E3A8A] ring-0";
    }
    return "border border-gray-200 ring-0";
  };

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
  is_listening_done: logForm.passive_completed,
  is_active_work_done: logForm.active_completed,
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

  // Edit handler
  const handleEdit = async () => {
    if (!editChild) return;
    setEditSubmitting(true);
    try {
      const { error } = await supabase
        .from("children")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          parent_email: editForm.parent_email || null,
          profile_type: editForm.profile_type,
          icon: editForm.icon,
        })
        .eq("id", editChild.id);
      if (error) throw error;
      toast({ title: "הפרופיל עודכן בהצלחה ✓" });
      setEditOpen(false);
      await fetchChildren();
    } catch {
      toast({ title: "שגיאה בעדכון", variant: "destructive" });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteChild) return;
    setDeleteSubmitting(true);
    try {
      const { error } = await supabase.from("children").delete().eq("id", deleteChild.id);
      if (error) throw error;
      toast({ title: "המטופל נמחק בהצלחה" });
      setDeleteOpen(false);
      await fetchChildren();
    } catch {
      toast({ title: "שגיאה במחיקה", variant: "destructive" });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const renderClientCard = (child: ChildWithStats, status: "logged" | "missed" | "pending") => (
    <>
      {/* Top row: name + status dot + menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
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
          <span className="text-lg shrink-0">{ICON_EMOJI[child.icon] || "🚀"}</span>
          <h3 className="font-bold text-foreground truncate min-w-0">
            {child.first_name} {child.last_name}
          </h3>
          {child.user_id && !child.parent_id && (
            <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold shrink-0">
              מבוגר אחראי
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-md hover:bg-muted transition-colors shrink-0">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={4} collisionPadding={8} avoidCollisions={true}>
            <DropdownMenuItem
              onClick={() => {
                setEditChild(child);
                setEditForm({
                  first_name: child.first_name,
                  last_name: child.last_name,
                  parent_email: child.parent_email ?? "",
                  profile_type: child.profile_type ?? "child",
                  icon: child.icon,
                });
                setEditOpen(true);
              }}
            >
              ✏️ <span className="mr-2">עריכה</span>
            </DropdownMenuItem>
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
              <CalendarIcon className="h-4 w-4 ml-2" />
              עדכון ידני
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setResetChild(child);
                setResetOpen(true);
              }}
            >
              <span className="ml-2">🔄</span>
              איפוס שלב
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSessionLogChild(child);
                setSessionLogOpen(true);
              }}
            >
              <List className="h-4 w-4 ml-2" />
              יומן סשנים
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setDeleteChild(child);
                setDeleteOpen(true);
              }}
              className="text-destructive focus:text-destructive"
            >
              🗑️ <span className="mr-2">מחיקה</span>
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
          <span>{[2, 4, 6].includes(child.current_phase) ? `האזנה ${child.sessionCount}` : `יום ${child.sessionCount} מתוך 14`}</span>
        </div>
      </div>

      {/* Last session */}
      <p className="text-xs text-muted-foreground">
        {child.lastSessionDate
          ? `האזנה אחרונה: ${new Date(child.lastSessionDate).toLocaleDateString("he-IL")}`
          : "טרם נרשמה האזנה"}
      </p>
    </>
  );

  if (loadError) {
    return (
      <main className="max-w-md mx-auto min-h-svh flex items-center justify-center px-4">
        <div className="w-full rounded-xl border border-destructive/20 bg-card p-4 text-center shadow-soft">
          <p className="font-bold text-destructive">שגיאת טעינה</p>
          <p className="mt-2 text-sm text-destructive break-words">{loadError}</p>
          <Button onClick={() => void fetchChildren()} className="mt-4 w-full">
            נסה שוב
          </Button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="max-w-md mx-auto min-h-svh flex items-center justify-center px-4">
        <p className="text-muted-foreground">טוען...</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-svh flex flex-col p-4">
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
              יצירת משפחה
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
              <TabsTrigger value="guide">ניהול מדריך</TabsTrigger>
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

        {/* Client Grid or Guide Manager */}
        {tab === "guide" ? (
          <div className="flex-1 overflow-y-auto pb-4">
            <ResourceManager />
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <motion.div variants={item} className="text-center py-16 text-muted-foreground">
              <p className="text-lg">אין מטופלים להצגה</p>
            </motion.div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4 pb-4 w-full">
              {(() => {
                // Group by parent_email
                const groups = new Map<string, ChildWithStats[]>();
                const noEmail: ChildWithStats[] = [];
                filtered.forEach((child) => {
                  const key = child.parent_email?.trim().toLowerCase();
                  if (key) {
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(child);
                  } else {
                    noEmail.push(child);
                  }
                });

                const familyFolders = Array.from(groups.entries());

                return (
                  <>
                    {familyFolders.map(([email, members]) => {
                      const familyLastName = members[0]?.last_name || "";
                      return (
                        <motion.div
                          key={email}
                          variants={item}
                          className="bg-muted/30 border border-border rounded-xl p-4 space-y-3"
                        >
                          {/* Folder Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-primary">משפחת {familyLastName}</h3>
                              <p className="text-sm text-muted-foreground" dir="ltr">{email}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary hover:bg-primary/10 gap-1.5"
                              onClick={() => {
                                setAddMemberEmail(email);
                                setAddMemberLastName(familyLastName);
                                setAddMemberOpen(true);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              הוספת בן משפחה
                            </Button>
                          </div>

                          {/* Member Cards */}
                          <div className="flex flex-col gap-3">
                            {members.map((child) => {
                              const status = getStatus(child);
                              return (
                                <div
                                  key={child.id}
                                  onClick={() => { setHeatmapChild(child); setHeatmapOpen(true); }}
                                  className={`bg-card rounded-xl p-5 shadow-soft space-y-3 relative cursor-pointer hover:shadow-md transition-shadow ${getCardBorderClasses(child)}`}
                                >
                                  {renderClientCard(child, status)}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Ungrouped (no email) */}
                    {noEmail.map((child) => {
                      const status = getStatus(child);
                      return (
                        <motion.div
                          key={child.id}
                          variants={item}
                          onClick={() => { setHeatmapChild(child); setHeatmapOpen(true); }}
                          className={`bg-card rounded-xl p-5 shadow-soft space-y-3 relative cursor-pointer hover:shadow-md transition-shadow ${getCardBorderClasses(child)}`}
                        >
                          {renderClientCard(child, status)}
                        </motion.div>
                      );
                    })}
                  </>
                );
              })()}
            </motion.div>
          )}
        </div>
        )}
      </motion.div>

      {/* ===== ADD MEMBER TO FAMILY MODAL ===== */}
      <AddMemberDialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        parentEmail={addMemberEmail}
        familyLastName={addMemberLastName}
        onCreated={fetchChildren}
      />

      {/* ===== FAMILY CREATOR MODAL ===== */}
      <FamilyCreatorDialog open={addOpen} onOpenChange={setAddOpen} onCreated={fetchChildren} />

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

      {/* ===== EDIT CLIENT MODAL ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>עריכת מטופל</DialogTitle>
            <DialogDescription>עדכון פרטי המטופל</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold">שם פרטי</label>
                <Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold">שם משפחה</label>
                <Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">אימייל מורשה</label>
              <Input type="email" dir="ltr" value={editForm.parent_email} onChange={(e) => setEditForm({ ...editForm, parent_email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">סוג פרופיל</label>
              <div className="flex gap-2">
                {[
                  { value: "child", label: "ילד 🚀", icon: "rocket" },
                  { value: "adult", label: "מבוגר ☀️", icon: "sun" },
                  { value: "partner", label: "בן/בת זוג 🛡️", icon: "shield" },
                ].map((pt) => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, profile_type: pt.value, icon: pt.icon })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${
                      editForm.profile_type === pt.value
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-background border-border text-muted-foreground hover:border-accent/50"
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">אייקון</label>
              <div className="flex gap-2">
                {[
                  { value: "rocket", label: "🚀" },
                  { value: "sun", label: "☀️" },
                  { value: "star", label: "⭐" },
                  { value: "shield", label: "🛡️" },
                ].map((ic) => (
                  <button
                    key={ic.value}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, icon: ic.value })}
                    className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg border transition-colors ${
                      editForm.icon === ic.value
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-background border-border hover:border-accent/50"
                    }`}
                  >
                    {ic.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEdit} disabled={editSubmitting} className="w-full">
              {editSubmitting ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DELETE CONFIRMATION ===== */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מטופל</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק מטופל זה?
              <br />
              <strong>לא ניתן לבטל פעולה זו.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSubmitting ? "מוחק..." : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== HISTORY CALENDAR MODAL ===== */}
      <HistoryCalendarModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        childId={historyChild?.id ?? null}
        childName={historyChild ? `${historyChild.first_name} ${historyChild.last_name}` : ""}
      />
      {/* ===== YEARLY HEATMAP MODAL ===== */}
      <YearlyHeatmapModal
        open={heatmapOpen}
        onOpenChange={setHeatmapOpen}
        childId={heatmapChild?.id ?? null}
        childName={heatmapChild ? `${heatmapChild.first_name} ${heatmapChild.last_name}` : ""}
      />

      {/* ===== SESSION LOG MODAL ===== */}
      <SessionLogModal
        open={sessionLogOpen}
        onOpenChange={setSessionLogOpen}
        childId={sessionLogChild?.id ?? null}
        childName={sessionLogChild ? `${sessionLogChild.first_name} ${sessionLogChild.last_name}` : ""}
      />
    </main>
  );
};

export default PractitionerDashboard;
