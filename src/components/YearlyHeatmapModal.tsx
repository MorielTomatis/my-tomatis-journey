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

interface YearlyHeatmapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string | null;
  childName: string;
}

const MONTH_NAMES_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const DAY_NAMES_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const toIsraelDate = (d: Date) =>
  d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const YearlyHeatmapModal = ({
  open,
  onOpenChange,
  childId,
  childName,
}: YearlyHeatmapModalProps) => {
  const [sessions, setSessions] = useState<
    { date: string; listening: boolean; active: boolean }[]
  >([]);
  const [year, setYear] = useState(() => {
    const now = new Date();
    return Number(now.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric" }));
  });

  useEffect(() => {
    if (!open || !childId) {
      setSessions([]);
      return;
    }
    const fetchSessions = async () => {
      const { data } = await supabase
        .from("sessions")
        .select("date, is_listening_done, is_active_work_done")
        .eq("child_id", childId)
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`)
        .order("date");
      setSessions(
        (data ?? []).map((s) => ({
          date: s.date,
          listening: s.is_listening_done === true,
          active: s.is_active_work_done === true,
        }))
      );
    };
    fetchSessions();
  }, [open, childId, year]);

  const sessionMap = useMemo(() => {
    const m = new Map<string, { listening: boolean; active: boolean }>();
    sessions.forEach((s) => m.set(s.date, s));
    return m;
  }, [sessions]);

  const todayKey = toIsraelDate(new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-lg">
            {childName} — מבט שנתי
          </DialogTitle>
          <DialogDescription className="text-right">
            <div className="flex items-center justify-center gap-3 mt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setYear((y) => y - 1)}
              >
                ←
              </Button>
              <span className="font-bold text-foreground text-base">{year}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setYear((y) => y + 1)}
              >
                →
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-2">
          {Array.from({ length: 12 }, (_, monthIdx) => {
            const days = getDaysInMonth(year, monthIdx);
            // First day of month – which weekday (0=Sun)
            const firstDayOfWeek = days[0].getDay();

            return (
              <div key={monthIdx} className="space-y-1">
                <p className="text-xs font-bold text-center text-muted-foreground">
                  {MONTH_NAMES_HE[monthIdx]}
                </p>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-[2px]">
                  {DAY_NAMES_HE.map((d) => (
                    <span
                      key={d}
                      className="text-[8px] text-muted-foreground text-center leading-none"
                    >
                      {d}
                    </span>
                  ))}
                </div>
                {/* Day squares */}
                <div className="grid grid-cols-7 gap-[2px]">
                  {/* Empty cells for offset */}
                  {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} className="w-full aspect-square" />
                  ))}
                  {days.map((date) => {
                    const key = toIsraelDate(date);
                    const session = sessionMap.get(key);
                    const isToday = key === todayKey;
                    const listening = session?.listening;
                    const active = session?.active;
                    const both = listening && active;

                    let bg = "bg-muted/40"; // gray default
                    let content = null;

                    if (both) {
                      // Diagonal split: turquoise top-left, blue bottom-right
                      content = (
                        <div
                          className="w-full h-full rounded-[2px] overflow-hidden"
                          style={{
                            background:
                              "linear-gradient(135deg, #40C4C4 50%, #1E3A8A 50%)",
                          }}
                        />
                      );
                      bg = "";
                    } else if (listening) {
                      bg = "bg-[#40C4C4]";
                    } else if (active) {
                      bg = "bg-[#1E3A8A]";
                    }

                    return (
                      <div
                        key={key}
                        className={`w-full aspect-square rounded-[2px] ${bg} ${
                          isToday ? "ring-1 ring-foreground ring-offset-1" : ""
                        }`}
                        title={`${date.getDate()}/${monthIdx + 1} — ${
                          both
                            ? "הקשבה + עבודה אקטיבית"
                            : listening
                            ? "הקשבה"
                            : active
                            ? "עבודה אקטיבית"
                            : "אין נתונים"
                        }`}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-1 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="block h-3 w-3 rounded-[2px] bg-[#40C4C4]" />
            <span>הקשבה</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="block h-3 w-3 rounded-[2px] bg-[#1E3A8A]" />
            <span>עבודה אקטיבית</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="block h-3 w-3 rounded-[2px] overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #40C4C4 50%, #1E3A8A 50%)",
              }}
            />
            <span>שניהם</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="block h-3 w-3 rounded-[2px] bg-muted/40 border border-border" />
            <span>ללא נתונים</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            סגירה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default YearlyHeatmapModal;
