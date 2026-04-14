import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleConfirm = async () => {
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      setStatus(data?.success ? "success" : data?.reason === "already_unsubscribed" ? "already" : "error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {status === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
          {status === "valid" && (
            <>
              <p className="text-lg">האם ברצונך לבטל את המנוי לקבלת הודעות?</p>
              <Button onClick={handleConfirm} variant="destructive">אישור ביטול</Button>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold">בוטל בהצלחה</p>
              <p className="text-muted-foreground">לא תקבל/י יותר הודעות מאיתנו.</p>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="text-lg">המנוי כבר בוטל.</p>
            </>
          )}
          {(status === "invalid" || status === "error") && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="text-lg">קישור לא תקין או שפג תוקפו.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
