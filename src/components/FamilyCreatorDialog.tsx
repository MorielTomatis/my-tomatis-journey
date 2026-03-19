import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Rocket, Sun, Star, Shield } from "lucide-react";

const ICON_OPTIONS = [
  { value: "rocket", label: "🚀", Icon: Rocket },
  { value: "sun", label: "☀️", Icon: Sun },
  { value: "star", label: "⭐", Icon: Star },
  { value: "shield", label: "🛡️", Icon: Shield },
] as const;

const PROFILE_TYPES = [
  { value: "child", label: "ילד/ה 🚀", defaultIcon: "rocket" },
  { value: "adult", label: "מבוגר ☀️", defaultIcon: "sun" },
  { value: "partner", label: "בן/בת זוג 🛡️", defaultIcon: "shield" },
] as const;

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  profile_type: string;
  icon: string;
  passive_duration: number;
  starting_phase: number;
}

const createEmptyMember = (): Member => ({
  id: crypto.randomUUID(),
  first_name: "",
  last_name: "",
  profile_type: "child",
  icon: "rocket",
  passive_duration: 40,
  starting_phase: 1,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const FamilyCreatorDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [members, setMembers] = useState<Member[]>([createEmptyMember()]);
  const [submitting, setSubmitting] = useState(false);

  const updateMember = (id: string, updates: Partial<Member>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const addMember = () => {
    setMembers((prev) => [...prev, createEmptyMember()]);
  };

  const resetForm = () => {
    setEmail("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setMembers([createEmptyMember()]);
  };

  const handleSave = async () => {
    if (!members.length) {
      toast({ title: "יש להוסיף לפחות חבר משפחה אחד", variant: "destructive" });
      return;
    }

    const invalid = members.find((m) => !m.first_name || !m.last_name);
    if (invalid) {
      toast({ title: "נא למלא שם פרטי ושם משפחה לכל חבר", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const rows = members.map((m) => ({
        first_name: m.first_name,
        last_name: m.last_name,
        parent_email: email || null,
        start_date: startDate,
        passive_duration: m.passive_duration,
        current_phase: m.starting_phase,
        icon: m.icon,
      }));

      const { error } = await supabase.from("children").insert(rows);
      if (error) throw error;

      toast({ title: `${members.length} פרופילים נוצרו בהצלחה ✓` });
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err: any) {
      toast({ title: `שגיאה: ${err?.message || "שגיאה ביצירה"}`, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>יצירת משפחה חדשה</DialogTitle>
          <DialogDescription>הזינו את האימייל המורשה והוסיפו את כל חברי המשפחה</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Shared email & date */}
          <div className="space-y-3 bg-muted/50 p-4 rounded-xl">
            <div className="space-y-1.5">
              <label className="text-sm font-bold">אימייל מורשה</label>
              <Input type="email" dir="ltr" placeholder="parent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">תאריך התחלה</label>
              <Input type="date" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>

          {/* Members list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">חברי משפחה ({members.length})</h3>
              <Button type="button" variant="outline" size="sm" onClick={addMember} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                הוסף חבר
              </Button>
            </div>

            {members.map((member, idx) => (
              <div key={member.id} className="border border-border rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">חבר {idx + 1}</span>
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMember(member.id)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold">שם פרטי</label>
                    <Input value={member.first_name} onChange={(e) => updateMember(member.id, { first_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold">שם משפחה</label>
                    <Input value={member.last_name} onChange={(e) => updateMember(member.id, { last_name: e.target.value })} />
                  </div>
                </div>

                {/* Profile type */}
                <div className="space-y-1">
                  <label className="text-xs font-bold">סוג פרופיל</label>
                  <div className="flex gap-2">
                    {PROFILE_TYPES.map((pt) => (
                      <button
                        key={pt.value}
                        type="button"
                        onClick={() => updateMember(member.id, { profile_type: pt.value, icon: pt.defaultIcon })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${
                          member.profile_type === pt.value
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-background border-border text-muted-foreground hover:border-accent/50"
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon picker */}
                <div className="space-y-1">
                  <label className="text-xs font-bold">אייקון</label>
                  <div className="flex gap-2">
                    {ICON_OPTIONS.map((ic) => (
                      <button
                        key={ic.value}
                        type="button"
                        onClick={() => updateMember(member.id, { icon: ic.value })}
                        className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg border transition-colors ${
                          member.icon === ic.value
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-background border-border hover:border-accent/50"
                        }`}
                      >
                        {ic.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration & phase */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold">האזנה (דקות)</label>
                    <select
                      value={member.passive_duration}
                      onChange={(e) => updateMember(member.id, { passive_duration: Number(e.target.value) })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value={40}>40</option>
                      <option value={60}>60</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold">שלב התחלתי</label>
                    <select
                      value={member.starting_phase}
                      onChange={(e) => updateMember(member.id, { starting_phase: Number(e.target.value) })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={submitting} className="w-full">
            {submitting ? "שומר..." : `צור ${members.length} פרופילים`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FamilyCreatorDialog;
