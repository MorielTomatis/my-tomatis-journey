import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { he } from "date-fns/locale";

interface HistoryCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string | null;
  childName: string;
}

const toIsraelDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

const HistoryCalendarModal = ({ open, onOpenChange, childId, childName }: HistoryCalendarModalProps) => {
  const [month, setMonth] = useState(new Date());
  const [sessions, setSessions] = useState<{ date: string; is_listening_done: boolean; is_active_work_done: boolean }[]>([]);

  useEffect(() => {
    if (!open || !childId) { setSessions([]); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("date, is_listening_done, is_active_work_done")
        .eq("child_id", childId)
        .order("date");
      setSessions(
        (data ?? []).map((s) => ({
          date: s.date,
          is_listening_done: s.is_listening_done === true,
          is_active_work_done: s.is_active_work_done === true,
        }))
      );
    };
    fetch();
  }, [open, childId]);

  const historyMap = useMemo(() => {
    const m = new Map<string, { listening: boolean; active: boolean }>();
    sessions.forEach((s) => {
      m.set(s.date, { listening: s.is_listening_done, active: s.is_active_work_done });
    });
    return m;
  }, [sessions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">היסטוריה — {childName}</DialogTitle>
          <DialogDescription className="text-right">לחץ על חודשים שונים לצפייה בהיסטוריית הסשנים</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            locale={he}
            dir="rtl"
            className="pointer-events-auto"
            components={{
              DayContent: ({ date }) => {
                const key = toIsraelDate(date);
                const session = historyMap.get(key);
                return (
                  <div className="relative flex flex-col items-center gap-0.5">
                    <span>{date.getDate()}</span>
                    {session && (session.listening || session.active) && (
                      <div className="flex gap-0.5 relative z-10">
                        {session.listening && (
                          <span className="block h-2 w-2 rounded-full bg-[#40C4C4] shadow-sm" />
                        )}
                        {session.active && (
                          <span className="block h-2 w-2 rounded-full bg-[#1E3A8A] shadow-sm" />
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            }}
          />
        </div>
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pb-2">
          <div className="flex items-center gap-1.5">
            <span className="block h-2.5 w-2.5 rounded-full bg-[#40C4C4]" />
            <span>הקשבה</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="block h-2.5 w-2.5 rounded-full bg-[#1E3A8A]" />
            <span>עבודה אקטיבית</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">סגירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HistoryCalendarModal;
