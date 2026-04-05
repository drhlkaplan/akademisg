import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge-custom";
import { Progress } from "@/components/ui/progress";
import { Loader2, BookOpen, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserCoursesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "info" | "destructive" | "secondary"; icon: typeof CheckCircle }> = {
  completed: { label: "Tamamlandı", variant: "success", icon: CheckCircle },
  active: { label: "Devam Ediyor", variant: "info", icon: Clock },
  pending: { label: "Beklemede", variant: "warning", icon: Clock },
  failed: { label: "Başarısız", variant: "destructive", icon: AlertCircle },
  expired: { label: "Süresi Dolmuş", variant: "secondary", icon: AlertCircle },
};

export function UserCoursesDialog({ open, onOpenChange, userId, userName }: UserCoursesDialogProps) {
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["user-enrollments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          id, status, progress_percent, started_at, completed_at,
          course_id, courses(title, hazard_class_new, training_type, duration_minutes)
        `)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId,
  });

  // Fetch lesson progress for each enrollment
  const { data: lessonProgressMap = {} } = useQuery({
    queryKey: ["user-lesson-progress", userId],
    queryFn: async () => {
      const enrollmentIds = enrollments.map((e) => e.id);
      if (enrollmentIds.length === 0) return {};
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("enrollment_id, lesson_id, lesson_status, score_raw, total_time")
        .in("enrollment_id", enrollmentIds);
      if (error) throw error;

      const map: Record<string, typeof data> = {};
      data.forEach((lp) => {
        if (!map[lp.enrollment_id]) map[lp.enrollment_id] = [];
        map[lp.enrollment_id].push(lp);
      });
      return map;
    },
    enabled: open && enrollments.length > 0,
  });

  const hazardLabels: Record<string, string> = {
    az_tehlikeli: "Az Tehlikeli",
    tehlikeli: "Tehlikeli",
    cok_tehlikeli: "Çok Tehlikeli",
  };

  const trainingLabels: Record<string, string> = {
    temel: "Temel",
    tekrar: "Tekrar",
    ise_baslama: "İşe Başlama",
    bilgi_yenileme: "Bilgi Yenileme",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {userName} - Kurslar ve İlerleme
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Henüz kayıtlı kurs yok</p>
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {enrollments.map((enrollment) => {
                const course = enrollment.courses as any;
                const status = statusConfig[enrollment.status || "pending"] || statusConfig.pending;
                const StatusIcon = status.icon;
                const progress = enrollment.progress_percent || 0;
                const lessonProgress = lessonProgressMap[enrollment.id] || [];
                const completedLessons = lessonProgress.filter(
                  (lp) => lp.lesson_status === "completed" || lp.lesson_status === "passed"
                ).length;

                return (
                  <div key={enrollment.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-tight">
                          {course?.title || "Bilinmeyen Kurs"}
                        </h4>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {course?.hazard_class_new && (
                            <Badge variant="secondary" className="text-xs">
                              {hazardLabels[course.hazard_class_new] || course.hazard_class_new}
                            </Badge>
                          )}
                          {course?.training_type && (
                            <Badge variant="secondary" className="text-xs">
                              {trainingLabels[course.training_type] || course.training_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant={status.variant} className="text-xs shrink-0">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>İlerleme: %{progress}</span>
                        <span>{completedLessons} ders tamamlandı</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {enrollment.started_at && (
                        <span>Başlangıç: {new Date(enrollment.started_at).toLocaleDateString("tr-TR")}</span>
                      )}
                      {enrollment.completed_at && (
                        <span>Tamamlanma: {new Date(enrollment.completed_at).toLocaleDateString("tr-TR")}</span>
                      )}
                    </div>

                    {/* Lesson details */}
                    {lessonProgress.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Ders Detayları ({lessonProgress.length})
                        </summary>
                        <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
                          {lessonProgress.map((lp) => (
                            <div key={lp.lesson_id} className="flex items-center justify-between py-1">
                              <span className="text-muted-foreground truncate">
                                Ders: {lp.lesson_id?.slice(0, 8)}...
                              </span>
                              <div className="flex gap-2 items-center">
                                {lp.score_raw != null && (
                                  <span>Puan: {lp.score_raw}</span>
                                )}
                                <Badge
                                  variant={
                                    lp.lesson_status === "completed" || lp.lesson_status === "passed"
                                      ? "success"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {lp.lesson_status || "Başlanmadı"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
