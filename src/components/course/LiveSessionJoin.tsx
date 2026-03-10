import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import { useToast } from "@/hooks/use-toast";
import { Video, Key, Clock, ExternalLink } from "lucide-react";

interface LiveSessionJoinProps {
  lessonId: string;
  enrollmentId: string;
  minDurationMinutes?: number;
}

export function LiveSessionJoin({ lessonId, enrollmentId, minDurationMinutes = 0 }: LiveSessionJoinProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [accessKey, setAccessKey] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    fetchSession();
  }, [lessonId]);

  // Timer for tracking
  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [joined]);

  // Check if popup is closed
  useEffect(() => {
    if (!joined || !popupRef.current) return;
    const interval = setInterval(() => {
      if (popupRef.current?.closed) {
        handleLeave();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [joined]);

  // Leave on unmount
  useEffect(() => {
    return () => {
      if (trackingId) leaveSession(trackingId);
    };
  }, [trackingId]);

  const fetchSession = async () => {
    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("is_active", true)
      .maybeSingle();
    setSession(data);
  };

  const handleJoin = async () => {
    if (!session) return;
    if (accessKey !== session.room_key) {
      toast({ title: "Hatalı Anahtar", description: "Erişim anahtarı doğru değil.", variant: "destructive" });
      return;
    }

    setIsJoining(true);
    try {
      const { data: trackingIdResult, error } = await supabase.rpc("join_live_session", {
        _live_session_id: session.id,
      });

      if (error) throw error;
      setTrackingId(trackingIdResult);
      setJoined(true);

      // Open in new tab/popup
      const popup = window.open(session.room_url, "_blank", "noopener");
      popupRef.current = popup;
    } catch {
      toast({ title: "Hata", description: "Oturuma katılınamadı.", variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const leaveSession = useCallback(async (id: string) => {
    await supabase.rpc("leave_live_session", {
      _tracking_id: id,
      _duration_seconds: elapsed,
    });
  }, [elapsed]);

  const minDurationSeconds = minDurationMinutes * 60;
  const hasMeetMinDuration = minDurationMinutes <= 0 || elapsed >= minDurationSeconds;

  const handleLeave = async () => {
    if (trackingId) {
      await leaveSession(trackingId);
      setJoined(false);
      setTrackingId(null);
      popupRef.current = null;

      if (hasMeetMinDuration) {
        await supabase.rpc("record_lesson_progress", {
          _enrollment_id: enrollmentId,
          _lesson_id: lessonId,
          _lesson_status: "completed",
        });
        toast({ title: "Ayrıldınız", description: "Canlı oturum tamamlandı." });
      } else {
        const remainingMin = Math.ceil((minDurationSeconds - elapsed) / 60);
        await supabase.rpc("record_lesson_progress", {
          _enrollment_id: enrollmentId,
          _lesson_id: lessonId,
          _lesson_status: "incomplete",
        });
        toast({
          title: "Süre Yetersiz",
          description: `Dersin tamamlanması için en az ${remainingMin} dakika daha katılım gerekiyor.`,
          variant: "destructive",
        });
      }
      setElapsed(0);
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Video className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-center">
          Bu ders için aktif canlı oturum bulunmuyor.<br />
          Eğitmeniniz oturumu başlattığında buradan katılabilirsiniz.
        </p>
      </div>
    );
  }

  if (joined) {
    const progressPercent = minDurationMinutes > 0
      ? Math.min(100, Math.round((elapsed / minDurationSeconds) * 100))
      : 100;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
          <Video className="h-10 w-10 text-success" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Canlı Oturum Devam Ediyor</h3>
          <Badge variant={hasMeetMinDuration ? "success" : "warning"}>
            {hasMeetMinDuration ? "Süre Tamamlandı" : "Bağlı"}
          </Badge>
          <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-lg">{formatTime(elapsed)}</span>
          </div>
          {minDurationMinutes > 0 && (
            <div className="w-full max-w-xs mx-auto mt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum süre: {minDurationMinutes} dk</span>
                <span>%{progressPercent}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    hasMeetMinDuration ? "bg-success" : "bg-warning"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {!hasMeetMinDuration && (
                <p className="text-xs text-warning mt-1">
                  Dersin tamamlanması için en az {minDurationMinutes} dakika katılım gerekiyor.
                </p>
              )}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Canlı ders yeni sekmede açıldı. Bu sayfada süre takibi devam ediyor.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.open(session.room_url, "_blank")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Oturuma Dön
          </Button>
          <Button variant="destructive" onClick={handleLeave}>
            Oturumdan Ayrıl
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center">
        <Video className="h-10 w-10 text-accent" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Canlı Ders Oturumu</h3>
        <Badge variant="success">Aktif</Badge>
        <p className="text-sm text-muted-foreground mt-2">
          Katılmak için erişim anahtarını girin
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Erişim Anahtarı"
            className="pl-9 text-center"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          />
        </div>
        <Button className="w-full" onClick={handleJoin} disabled={isJoining || !accessKey.trim()}>
          {isJoining ? "Katılıyor..." : "Oturuma Katıl"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Ders yeni bir sekmede açılacaktır
        </p>
      </div>
    </div>
  );
}
