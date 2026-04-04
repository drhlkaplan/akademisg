import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Clock, MapPin, Users, CheckCircle2, XCircle } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "Planlandı", variant: "secondary" },
  in_progress: { label: "Devam Ediyor", variant: "default" },
  completed: { label: "Tamamlandı", variant: "outline" },
  cancelled: { label: "İptal", variant: "destructive" },
};

const attendanceLabels: Record<string, { label: string; color: string }> = {
  attended: { label: "Katıldı", color: "text-green-600" },
  absent: { label: "Katılmadı", color: "text-red-600" },
  late: { label: "Geç Katıldı", color: "text-yellow-600" },
  partially_attended: { label: "Kısmi", color: "text-orange-600" },
  pending: { label: "Beklemede", color: "text-muted-foreground" },
};

export default function MyFaceToFaceSessions() {
  const { user } = useAuth();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["my-f2f-sessions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's enrollments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, course_id")
        .eq("user_id", user.id)
        .in("status", ["active", "pending"]);

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map(e => e.course_id);

      // Get sessions for enrolled courses via lessons
      const { data: sessionsData } = await supabase
        .from("face_to_face_sessions")
        .select("*, courses(title), lessons(title)")
        .in("course_id", courseIds)
        .in("status", ["scheduled", "in_progress", "completed"])
        .order("session_date", { ascending: true });

      if (!sessionsData) return [];

      // Get attendance for this user
      const sessionIds = sessionsData.map(s => s.id);
      const { data: attendance } = await supabase
        .from("face_to_face_attendance")
        .select("session_id, status, trainer_verified, check_in_time")
        .eq("user_id", user.id)
        .in("session_id", sessionIds);

      const attendanceMap = new Map(attendance?.map(a => [a.session_id, a]) || []);

      return sessionsData.map(s => ({
        ...s,
        attendance: attendanceMap.get(s.id) || null,
      }));
    },
    enabled: !!user?.id,
  });

  const upcoming = sessions.filter((s: any) => s.status === "scheduled" || s.status === "in_progress");
  const past = sessions.filter((s: any) => s.status === "completed");

  return (
    <DashboardLayout userRole="student">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Yüz Yüze Derslerim</h1>
          <p className="text-muted-foreground">Planlanmış yüz yüze eğitim oturumlarınız ve katılım durumunuz</p>
        </div>

        {/* Upcoming Sessions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Yaklaşan Oturumlar</h2>
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Yaklaşan yüz yüze oturum bulunmuyor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {upcoming.map((s: any) => {
                const st = statusLabels[s.status] || statusLabels.scheduled;
                return (
                  <Card key={s.id} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{(s as any).courses?.title || "Eğitim"}</CardTitle>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      {(s as any).lessons?.title && (
                        <p className="text-sm text-muted-foreground">{(s as any).lessons?.title}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{s.session_date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{s.start_time?.toString().slice(0, 5)} - {s.end_time?.toString().slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{s.location}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        {past.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Geçmiş Oturumlar</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {past.map((s: any) => {
                const att = s.attendance;
                const attInfo = att ? (attendanceLabels[att.status] || attendanceLabels.pending) : null;
                return (
                  <Card key={s.id} className="opacity-80">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{(s as any).courses?.title || "Eğitim"}</CardTitle>
                        {attInfo ? (
                          <span className={`text-sm font-medium ${attInfo.color}`}>{attInfo.label}</span>
                        ) : (
                          <Badge variant="secondary">Kayıt yok</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />{s.session_date}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />{s.location}
                      </div>
                      {att?.trainer_verified && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" />Eğitmen onaylı
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
