import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Clock, MapPin, Calendar, QrCode, KeyRound,
  AlertTriangle, Loader2, Shield,
} from "lucide-react";

type AttendResult = {
  success: boolean;
  message: string;
  status?: string;
  already_joined?: boolean;
  session_info?: {
    location: string;
    date: string;
    start_time: string;
    end_time: string;
  };
  error?: string;
};

export default function AttendSession() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const qrToken = searchParams.get("token");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttendResult | null>(null);
  const [autoJoining, setAutoJoining] = useState(false);

  // Auto-join via QR token
  useEffect(() => {
    if (qrToken && user && !result && !autoJoining) {
      setAutoJoining(true);
      handleAttend("qr", qrToken);
    }
  }, [qrToken, user]);

  const handleAttend = async (method: "qr" | "code", token?: string) => {
    if (!user) {
      toast({ title: "Giriş yapmanız gerekiyor", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("attend-session", {
        body: {
          method,
          ...(method === "qr" ? { qr_token: token || qrToken } : { attendance_code: code }),
        },
      });

      if (error) throw error;
      setResult(data as AttendResult);

      if (data.success) {
        toast({
          title: data.already_joined ? "Zaten katıldınız" : "Katılım kaydedildi!",
          description: data.message,
        });
      } else {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Bir hata oluştu";
      toast({ title: "Hata", description: errorMsg, variant: "destructive" });
      setResult({ success: false, message: errorMsg, error: errorMsg });
    } finally {
      setLoading(false);
      setAutoJoining(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">Giriş Yapınız</h2>
            <p className="text-muted-foreground text-sm">
              Yüz yüze eğitime katılmak için önce hesabınıza giriş yapmanız gerekmektedir.
            </p>
            <Button asChild>
              <a href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}>
                Giriş Yap
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show result
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-6">
            {result.success ? (
              <>
                <div className="text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {result.already_joined ? "Zaten Katıldınız" : "Katılım Başarılı!"}
                  </h2>
                  <p className="text-muted-foreground">{result.message}</p>
                  {result.status && (
                    <Badge variant={result.status === "late" ? "secondary" : "default"}>
                      {result.status === "late" ? "Geç Katılım" : "Katıldı"}
                    </Badge>
                  )}
                </div>

                {result.session_info && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{result.session_info.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{result.session_info.start_time?.slice(0, 5)} - {result.session_info.end_time?.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{result.session_info.location}</span>
                    </div>
                  </div>
                )}

                <Button className="w-full" asChild>
                  <a href="/dashboard/face-to-face">Yüz Yüze Derslerime Dön</a>
                </Button>
              </>
            ) : (
              <>
                <div className="text-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Katılım Başarısız</h2>
                  <p className="text-muted-foreground">{result.error || result.message}</p>
                </div>
                <Button className="w-full" variant="outline" onClick={() => setResult(null)}>
                  Tekrar Dene
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // QR auto-joining state
  if (autoJoining || (qrToken && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-lg font-semibold">Katılım Kaydediliyor...</h2>
            <p className="text-muted-foreground text-sm">QR kod ile katılımınız doğrulanıyor</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Manual code entry form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>Yüz Yüze Eğitime Katıl</CardTitle>
          <CardDescription>
            Eğitmeninizden aldığınız ders kodunu girerek katılımınızı kaydedin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Ders Kodu</Label>
            <Input
              id="code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Örn: AB12CD"
              maxLength={10}
              className="text-center text-lg tracking-widest font-mono"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => handleAttend("code")}
            disabled={loading || code.length < 4}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Doğrulanıyor...</>
            ) : (
              <><QrCode className="h-4 w-4 mr-2" />Katılımı Onayla</>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Alternatif olarak eğitmeninizin gösterdiği QR kodu telefonunuzla tarayabilirsiniz
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
