import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SessionLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string | null;
  childName: string;
}

const SessionLogModal = ({ open, onOpenChange, childId, childName }: SessionLogModalProps) => {
  const [data, setData] = useState<{ date: string; is_listening_done: boolean; is_active_work_done: boolean; active_minutes: number | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !childId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: sessions } = await supabase
        .from("sessions")
        .select("date, is_listening_done, is_active_work_done, active_minutes")
        .eq("child_id", childId)
        .order("date", { ascending: false });
      setData(sessions ?? []);
      setLoading(false);
    };
    fetch();
  }, [open, childId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">יומן סשנים — {childName}</DialogTitle>
          <DialogDescription className="text-right">כל הסשנים שנרשמו עבור מטופל זה</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">טוען...</p>
          ) : data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין סשנים להצגה</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-center">הקשבה</TableHead>
                  <TableHead className="text-center">עבודה אקטיבית</TableHead>
                  <TableHead className="text-center">דקות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s, i) => {
                  const [y, m, d] = s.date.split("-");
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-right font-medium">{`${d}.${m}.${y}`}</TableCell>
                      <TableCell className="text-center">{s.is_listening_done ? <span className="text-[#40C4C4] font-bold">✓</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-center">{s.is_active_work_done ? <span className="text-[#1E3A8A] font-bold">✓</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-center">{s.active_minutes != null ? s.active_minutes : <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SessionLogModal;
