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

const PROFILE_TYPES = [
  { value: "child", label: "ילד/ה 🚀", defaultIcon: "rocket" },
  { value: "adult", label: "מבוגר ☀️", defaultIcon: "sun" },
  { value: "partner", label: "בן/בת זוג 🛡️", defaultIcon: "shield" },
] as const;

const ICON_OPTIONS = [
  { value: "rocket", label: "🚀" },
  { value: "sun", label: "☀️" },
  { value: "star", label: "⭐" },
  { value: "shield", label: "🛡️" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentEmail: string;
  familyLastName: string;
  onCreated: () => void;
}

const AddMemberDialog = ({ open, onOpenChange, parentEmail, familyLastName, onCreated }: Props) => {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState(familyLastName);
  const [profileType, setProfileType] = useState("child");
  const [icon, setIcon] = useState("rocket");
  const [passiveDuration, setPassiveDuration] = useState(40);
  const [startingPhase, setStartingPhase] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setFirstName("");
    setLastName(familyLastName);
    setProfileType("child");
    setIcon("rocket");
    setPassiveDuration(40);
    setStartingPhase(1);
  };

  const handleSave = async () => {
    if (!firstName || !lastName) {
      toast({ title: "נא למלא שם פרטי ושם משפחה", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("children").insert({
        first_name: firstName,
        last_name: lastName,
        parent_email: parentEmail,
        passive_duration: passiveDuration,
        current_phase: startingPhase,
        icon,
        profile_type: profileType,
      });
      if (error) throw error;

      toast({ title: "בן משפחה נוסף בהצלחה ✓" });
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err: any) {
      toast({ title: `שגיאה: ${err?.message || "שגיאה בהוספה"}`, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>הוספת בן משפחה</DialogTitle>
          <DialogDescription>הוספת חבר חדש למשפחת {familyLastName} ({parentEmail})</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold">שם פרטי</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">שם משפחה</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold">סוג פרופיל</label>
            <div className="flex gap-2">
              {PROFILE_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => { setProfileType(pt.value); setIcon(pt.defaultIcon); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${
                    profileType === pt.value
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
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic.value}
                  type="button"
                  onClick={() => setIcon(ic.value)}
                  className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg border transition-colors ${
                    icon === ic.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-background border-border hover:border-accent/50"
                  }`}
                >
                  {ic.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold">האזנה (דקות)</label>
              <select
                value={passiveDuration}
                onChange={(e) => setPassiveDuration(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={40}>40</option>
                <option value={60}>60</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">שלב התחלתי</label>
              <select
                value={startingPhase}
                onChange={(e) => setStartingPhase(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={submitting} className="w-full">
            {submitting ? "שומר..." : "שמירת משפחה"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
