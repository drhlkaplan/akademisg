import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Activity, RefreshCw, Monitor, Clock, BookOpen, Globe,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface ActiveUser {
  user_id: string;
  action: string;
  entity_type: string | null;
  created_at: string;
  details: any;
  profile?: { first_name: string; last_name: string } | null;
}

export function ActiveUsersMonitor() {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchActiveUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Get recent activity (last 15 minutes) as a proxy for active users
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data: logs } = await supabase
        .from("activity_logs")
        .select("user_id, action, entity_type, created_at, details")
        .gte("created_at", fifteenMinAgo)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!logs || logs.length === 0) {
        setActiveUsers([]);
        setLoading(false);
        setLastRefresh(new Date());
        return;
      }

      // Deduplicate by user_id, keep most recent
      const userMap = new Map<string, ActiveUser>();
      logs.forEach((log) => {
        if (log.user_id && !userMap.has(log.user_id)) {
          userMap.set(log.user_id, log as ActiveUser);
        }
      });

      const uniqueUserIds = Array.from(userMap.keys());

      // Fetch profiles
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", uniqueUserIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        userMap.forEach((u, uid) => {
          u.profile = profileMap.get(uid) || null;
        });
      }

      setActiveUsers(Array.from(userMap.values()));
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Active users fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchActiveUsers]);

  // Subscribe to realtime activity_logs
  useEffect(() => {
    const channel = supabase
      .channel("active-users-monitor")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        () => {
          fetchActiveUsers();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveUsers]);

  const getActionIcon = (action: string) => {
    if (action.includes("login") || action.includes("auth")) return <Globe className="h-4 w-4" />;
    if (action.includes("course") || action.includes("lesson") || action.includes("scorm")) return <BookOpen className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getActionLabel = (action: string, entityType: string | null) => {
    const labels: Record<string, string> = {
      login: "Giriş yaptı",
      logout: "Çıkış yaptı",
      scorm_launch: "SCORM içerik izliyor",
      scorm_progress: "İçerik ilerliyor",
      exam_start: "Sınav çözüyor",
      exam_submit: "Sınav tamamladı",
      course_enroll: "Eğitime kaydoldu",
      lesson_complete: "Ders tamamladı",
    };
    return labels[action] || action;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="relative">
            <Users className="h-5 w-5" />
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
          </div>
          Anlık Aktif Kullanıcılar
          <Badge variant="default" className="ml-2">{activeUsers.length}</Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Son güncelleme: {format(lastRefresh, "HH:mm:ss")}
          </span>
          <Button variant="ghost" size="icon" onClick={fetchActiveUsers} disabled={loading} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Son 15 dakikada aktif kullanıcı yok</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {activeUsers.map((user) => (
              <div key={user.user_id} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/5 transition-colors">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  {getActionIcon(user.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : "Anonim"}
                  </p>
                  <p className="text-xs text-muted-foreground">{getActionLabel(user.action, user.entity_type)}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: tr })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
