import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Progress } from "@/components/ui/progress";
import { useFirmBranding } from "@/contexts/FirmBrandingContext";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Users, CheckCircle, Clock, Loader2 } from "lucide-react";

export default function FirmCourses() {
  const { branding } = useFirmBranding();
  const { profile } = useAuth();
  const firmId = profile?.firm_id;

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["firm-course-enrollments", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(title, duration_minutes, description, thumbnail_url)")
        .eq("firm_id", firmId);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  const { data: employees } = useQuery({
    queryKey: ["firm-employees-count", firmId],
    queryFn: async () => {
      if (!firmId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("firm_id", firmId);
      if (error) throw error;
      return data;
    },
    enabled: !!firmId,
  });

  // Group enrollments by course
  const courseMap = new Map<string, { title: string; total: number; completed: number; active: number; duration: number }>();
  enrollments?.forEach((e) => {
    const courseId = e.course_id;
    const title = (e as any).courses?.title || "Bilinmeyen";
    const duration = (e as any).courses?.duration_minutes || 0;
    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, { title, total: 0, completed: 0, active: 0, duration });
    }
    const entry = courseMap.get(courseId)!;
    entry.total++;
    if (e.status === "completed") entry.completed++;
    if (e.status === "active") entry.active++;
  });

  const courses = Array.from(courseMap.entries()).map(([id, data]) => ({ id, ...data }));

  return (
    <DashboardLayout userRole="company">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eğitimler</h1>
          <p className="text-muted-foreground">
            {branding?.name || "Firma"} eğitim durumu
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : courses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const pct = course.total > 0 ? Math.round((course.completed / course.total) * 100) : 0;
              return (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-5 w-5 shrink-0" style={{ color: branding?.primary_color }} />
                      <span className="truncate">{course.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration} dakika</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tamamlama</span>
                        <span className="font-semibold">%{pct}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="default" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        {course.total} kayıt
                      </Badge>
                      <Badge variant="success" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {course.completed} tamamlandı
                      </Badge>
                      {course.active > 0 && (
                        <Badge variant="info" className="text-xs">
                          {course.active} devam
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Henüz eğitim kaydı bulunamadı</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
