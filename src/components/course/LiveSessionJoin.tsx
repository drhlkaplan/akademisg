import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { useToast } from "@/hooks/use-toast";
import { Video, Key, ExternalLink, Clock, Users } from "lucide-react";

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
      // Use SECURITY DEFINER RPC instead of direct insert
      const { data: trackingIdResult, error } = await supabase.rpc("join_live_session", {
        _live_session_id: session.id,
      });

      if (error) throw error;
      setTrackingId(trackingIdResult);
      setJoined(true);

      // Open BBB in new tab
      window.open(session.room_url, "_blank");
    } catch {
      toast({ title: "Hata", description: "Oturuma katılınamadı.", variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const leaveSession = async (id: string) => {
    // Use SECURITY DEFINER RPC instead of direct update
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

      // Mark lesson as completed via SECURITY DEFINER RPC
      await supabase.rpc("record_lesson_progress", {
        _enrollment_id: enrollmentId,
        _lesson_id: lessonId,
        _lesson_status: "completed",
      });

      toast({ title: "Ayrıldınız", description: "Canlı oturumdan ayrıldınız." });
    }
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
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
            <Video className="h-10 w-10 text-success" />
          </div>
          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-success animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Canlı Oturumda</h3>
          <p className="text-sm text-muted-foreground">BBB oturumu ayrı sekmede açık</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-lg">{formatTime(elapsed)}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <a href={session.room_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Odayı Tekrar Aç
            </a>
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
      </div>
    </div>
  );
}
