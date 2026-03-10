import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import { useToast } from "@/hooks/use-toast";
import { Video, Key, Clock, Maximize2, Minimize2 } from "lucide-react";

interface LiveSessionJoinProps {
  lessonId: string;
  enrollmentId: string;
}

export function LiveSessionJoin({ lessonId, enrollmentId }: LiveSessionJoinProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [accessKey, setAccessKey] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [lessonId]);

  // Timer for tracking
  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [joined]);

  // Leave on unmount
  useEffect(() => {
    return () => {
      if (trackingId) leaveSession(trackingId);
    };
  }, [trackingId]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

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
    } catch {
      toast({ title: "Hata", description: "Oturuma katılınamadı.", variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const leaveSession = async (id: string) => {
    await supabase.rpc("leave_live_session", {
      _tracking_id: id,
      _duration_seconds: elapsed,
    });
  };

  const handleLeave = async () => {
    if (trackingId) {
      await leaveSession(trackingId);
      setJoined(false);
      setTrackingId(null);
      setElapsed(0);

      await supabase.rpc("record_lesson_progress", {
        _enrollment_id: enrollmentId,
        _lesson_id: lessonId,
        _lesson_status: "completed",
      });

      toast({ title: "Ayrıldınız", description: "Canlı oturumdan ayrıldınız." });
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById("live-session-container");
    if (!container) return;
    if (!isFullscreen) container.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
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
    return (
      <div id="live-session-container" className="flex flex-col h-full bg-background">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-foreground">Canlı Oturum</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono">{formatTime(elapsed)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title={isFullscreen ? "Küçült" : "Tam ekran"}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLeave}>
              Oturumdan Ayrıl
            </Button>
          </div>
        </div>
        {/* BBB iframe */}
        <iframe
          src={session.room_url}
          className="flex-1 w-full border-0"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          allowFullScreen
          title="Canlı Ders Oturumu"
        />
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
      </div>
    </div>
  );
}
