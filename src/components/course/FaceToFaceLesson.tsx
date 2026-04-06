import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  QrCode,
  KeyRound,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface FaceToFaceLessonProps {
  lessonId: string;
  enrollmentId: string;
  onComplete: () => void;
}

interface SessionInfo {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  status: string;
  qr_token: string | null;
  attendance_code: string | null;
}

interface AttendanceInfo {
  id: string;
  status: string;
  check_in_time: string | null;
  end_of_session_ack: boolean | null;
}

const completionQuestion = {
  text: "Bu yüz yüze eğitim oturumunda işlenen konuları anladınız mı ve eğitimi tamamlamak istiyor musunuz?",
  options: [
    { value: "A", label: "Evet, konuları anladım ve eğitimi tamamlamak istiyorum" },
    { value: "B", label: "Evet, eğitimi tamamlamak istiyorum" },
    { value: "C", label: "Hayır, tekrar katılmak istiyorum" },
  ],
};

export function FaceToFaceLesson({ lessonId, enrollmentId, onComplete }: FaceToFaceLessonProps) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Find session linked to this lesson
      const { data: sessions } = await supabase
        .from("face_to_face_sessions")
        .select("id, session_date, start_time, end_time, location, status, qr_token, attendance_code")
        .eq("lesson_id", lessonId)
        .in("status", ["scheduled", "in_progress", "completed"])
        .order("session_date", { ascending: true })
        .limit(1);

      if (sessions && sessions.length > 0) {
        setSession(sessions[0]);
        setSessionEnded(sessions[0].status === "completed");

        // Check existing attendance
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: att } = await supabase
            .from("face_to_face_attendance")
            .select("id, status, check_in_time, end_of_session_ack")
            .eq("session_id", sessions[0].id)
            .eq("user_id", user.id)
            .limit(1);

          if (att && att.length > 0) {
            setAttendance(att[0]);
            // Show completion question if attended and session ended but not yet acknowledged
            if (
              att[0].status !== "absent" &&
              !att[0].end_of_session_ack &&
              sessions[0].status === "completed"
            ) {
              setShowQuestion(true);
            }
          }
        }
      }
    } catch (err) {
      console.error("F2F lesson data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchData();
    // Poll every 15 seconds to detect session status changes
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Detect when session transitions to completed
  useEffect(() => {
    if (session?.status === "completed" && attendance && !attendance.end_of_session_ack && attendance.status !== "absent") {
      setShowQuestion(true);
      setSessionEnded(true);
    }
  }, [session?.status, attendance]);

  const handleAttend = async (method: "qr" | "code", token?: string) => {
    if (joining) return;
    setJoining(true);
    try {
      const body: Record<string, string> = { method };
      if (method === "qr" && token) {
        body.qr_token = token;
      } else if (method === "code") {
        if (!manualCode.trim()) {
          toast({ title: "Hata", description: "Lütfen ders kodunu girin", variant: "destructive" });
          setJoining(false);
          return;
        }
        body.attendance_code = manualCode.trim();
      }

      const { data, error } = await supabase.functions.invoke("attend-session", { body });

      if (error) {
        toast({ title: "Hata", description: "Katılım kaydedilemedi", variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Hata", description: data.error, variant: "destructive" });
      } else {
        toast({
          title: data?.already_joined ? "Bilgi" : "Başarılı",
          description: data?.message || "Katılım kaydedildi",
        });
        await fetchData();
      }
    } catch (err) {
      toast({ title: "Hata", description: "Bir hata oluştu", variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !attendance) return;
    setSubmittingAnswer(true);
    try {
      // Update attendance with end_of_session_ack
      const { error: updateErr } = await supabase
        .from("face_to_face_attendance")
        .update({
          end_of_session_ack: true,
          check_out_time: new Date().toISOString(),
        })
        .eq("id", attendance.id);

      if (updateErr) {
        console.error("Ack update error:", updateErr);
        // Fallback: try via RPC if RLS blocks direct update
      }

      // Record lesson progress as completed
      await supabase.rpc("record_lesson_progress", {
        _enrollment_id: enrollmentId,
        _lesson_id: lessonId,
        _lesson_status: "completed",
      });

      toast({ title: "✅ Ders Tamamlandı", description: "Yüz yüze eğitim dersi başarıyla tamamlandı" });
      setShowQuestion(false);
      setAttendance((prev) => prev ? { ...prev, end_of_session_ack: true } : prev);
      onComplete();
    } catch (err) {
      console.error("Submit answer error:", err);
      toast({ title: "Hata", description: "İşlem sırasında hata oluştu", variant: "destructive" });
    } finally {
      setSubmittingAnswer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Users className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Yüz Yüze Oturum Bulunamadı</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Bu ders için henüz bir yüz yüze eğitim oturumu planlanmamıştır.
        </p>
      </div>
    );
  }

  // Already completed
  if (attendance?.end_of_session_ack) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Ders Tamamlandı</h3>
          <p className="text-muted-foreground">
            Yüz yüze eğitim oturumuna katılımınız ve ders tamamlamanız kaydedilmiştir.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {attendance.check_in_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Giriş: {new Date(attendance.check_in_time).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Completion question
  if (showQuestion && attendance) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Eğitim Tamamlama Sorusu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-foreground font-medium">{completionQuestion.text}</p>
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
              {completionQuestion.options.map((opt) => (
                <div key={opt.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
                  <Label htmlFor={opt.value} className="cursor-pointer font-normal leading-snug">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              className="w-full"
              disabled={!selectedAnswer || submittingAnswer}
              onClick={handleSubmitAnswer}
            >
              {submittingAnswer && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dersi Tamamla
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already attending, waiting for session end
  if (attendance && attendance.status !== "absent") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Katılımınız Kaydedildi</h3>
          <Badge variant={attendance.status === "late" ? "secondary" : "default"}>
            {attendance.status === "late" ? "Geç Katılım" : "Katıldı"}
          </Badge>
          <p className="text-muted-foreground text-sm mt-2">
            Eğitim oturumu devam ediyor. Oturum sonlandığında tamamlama sorusu gösterilecektir.
          </p>
        </div>
        <SessionInfoCard session={session} />
      </div>
    );
  }

  // Join via QR or Code
  const previewUrl = `${window.location.origin}/attend?qr=${session.qr_token}`;

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Yüz Yüze Eğitime Katılın</h3>
          <p className="text-muted-foreground text-sm">
            QR kodu okutarak veya ders kodunu girerek eğitime katılabilirsiniz.
          </p>
        </div>

        <SessionInfoCard session={session} />

        {/* QR Code */}
        {session.qr_token && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <QrCode className="h-4 w-4" />
                QR Kod ile Katılım
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <QRCodeSVG value={previewUrl} size={180} />
              </div>
              <Button
                variant="default"
                className="w-full"
                disabled={joining}
                onClick={() => handleAttend("qr", session.qr_token!)}
              >
                {joining ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                QR ile Katıl
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Manual Code */}
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <KeyRound className="h-4 w-4" />
              Ders Kodu ile Katılım
            </div>
            {session.attendance_code && (
              <div className="text-center">
                <span className="text-2xl font-mono font-bold tracking-widest text-primary">
                  {session.attendance_code}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Kodu girin..."
                maxLength={6}
                className="font-mono text-center tracking-widest text-lg"
              />
              <Button
                disabled={joining || !manualCode.trim()}
                onClick={() => handleAttend("code")}
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Katıl"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {session.status === "scheduled" && (
          <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Katılım, oturum başlangıcından en erken 15 dakika önce açılır.
          </div>
        )}
      </div>
    </div>
  );
}

function SessionInfoCard({ session }: { session: SessionInfo }) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3 px-4 space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{session.session_date}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {session.start_time?.toString().slice(0, 5)} - {session.end_time?.toString().slice(0, 5)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{session.location}</span>
        </div>
      </CardContent>
    </Card>
  );
}
