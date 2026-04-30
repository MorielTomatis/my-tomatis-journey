import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Video } from "lucide-react";

interface Resource {
  id: string;
  title: string;
  youtube_url: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

const CATEGORIES = [
  "שימוש באוזניות",
  "עבודה עם המיקרופון",
  "תרגילים לגוף, למוח ולנפש",
  "טיפים כלליים",
];

const ResourceManager = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", youtube_url: "", category: CATEGORIES[0], sort_order: 0 });
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    const { data } = await supabase
      .from("resources")
      .select("*")
      .order("category")
      .order("sort_order");
    setResources((data as Resource[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ title: "", youtube_url: "", category: CATEGORIES[0], sort_order: 0 });
    setFormOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditingId(r.id);
    setForm({ title: r.title, youtube_url: r.youtube_url, category: r.category, sort_order: r.sort_order });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.youtube_url.trim()) {
      toast({ title: "יש למלא כותרת וקישור", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("resources").update(form).eq("id", editingId);
        if (error) throw error;
        toast({ title: "עודכן בהצלחה ✓" });
      } else {
        const { error } = await supabase.from("resources").insert(form);
        if (error) throw error;
        toast({ title: "נוסף בהצלחה ✓" });
      }
      setFormOpen(false);
      await fetchResources();
    } catch {
      toast({ title: "שגיאה בשמירה", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    const { error } = await supabase.from("resources").update({ is_active: !current }).eq("id", id);
    if (error) {
      toast({ title: "שגיאה בעדכון", variant: "destructive" });
    } else {
      await fetchResources();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("resources").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "שגיאה במחיקה", variant: "destructive" });
    } else {
      toast({ title: "נמחק בהצלחה" });
      await fetchResources();
    }
    setDeleteOpen(false);
    setDeleteId(null);
  };

  if (loading) return <p className="text-muted-foreground text-sm py-8 text-center">טוען...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">ניהול סרטוני מדריך</h2>
        <Button onClick={openAdd} className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          הוספת סרטון
        </Button>
      </div>

      {resources.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">אין סרטונים עדיין</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div
              key={r.id}
              className={`flex items-center gap-3 bg-card rounded-xl p-4 border border-border shadow-soft ${!r.is_active ? "opacity-50" : ""}`}
            >
              <Video className="h-5 w-5 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground truncate">{r.category} · סדר: {r.sort_order}</p>
              </div>
              <Switch checked={r.is_active} onCheckedChange={() => handleToggle(r.id, r.is_active)} />
              <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setDeleteId(r.id); setDeleteOpen(true); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>{editingId ? "עריכת סרטון" : "הוספת סרטון חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto px-6 py-2 flex-1 min-h-0">
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">כותרת</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="כותרת הסרטון" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">קישור YouTube</label>
              <Input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} placeholder="https://youtu.be/..." dir="ltr" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">קטגוריה</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">סדר מיון</label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter className="p-6 pt-4 border-t border-border shrink-0">
            <Button onClick={handleSave} disabled={submitting}>
              {submitting ? "שומר..." : editingId ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת סרטון</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק סרטון זה?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResourceManager;
