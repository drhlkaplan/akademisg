import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, BookOpen, Clock, Award, CheckCircle, XCircle,
  Play, FileQuestion, Loader2, Calendar, TrendingUp, Timer,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type DangerClass = Database["public"]["Enums"]["danger_class"];

const dangerClassBadge: Record<DangerClass, "dangerLow" | "dangerMedium" | "dangerHigh"> = {
  low: "dangerLow", medium: "dangerMedium", high: "dangerHigh",
};
const dangerClassLabel: Record<DangerClass, string> = {
  low: "Az Tehlikeli", medium: "Tehlikeli", high: "Çok Tehlikeli",
};

const statusLabels: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "default" }> = {
  completed: { label: "Tamamlandı", variant: "success" },
  active: { label: "Devam Ediyor", variant: "warning" },
  pending: { label: "Beklemede", variant: "default" },
  failed: { label: "Başarısız", variant: "destructive" },
  expired: { label: "Süresi Doldu", variant: "destructive" },
};

export default function CourseHistory() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonProgress, setLessonProgress] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [certificate, setCertificate] = useState<any>(null);

  useEffect(() => {
    if (user && enrollmentId) fetchData();
  }, [user, enrollmentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enrollRes, lessonsRes, progressRes, examRes, certRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("*, course:courses(id, title, duration_minutes, description, category:course_categories(danger_class, name))")
          .eq("id", enrollmentId!)
          .eq("user_id", user!.id)
          .single(),
        supabase
          .from("lessons")
          .select("id, title, type, sort_order, duration_minutes")
          .eq("course_id", (await supabase.from("enrollments").select("course_id").eq("id", enrollmentId!).single()).data?.course_id || "")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("lesson_progress")
          .select("lesson_id, lesson_status, score_raw, total_time, updated_at")
          .eq("enrollment_id", enrollmentId!),
        supabase
          .from("exam_results")
          .select("id, exam_id, score, total_questions, correct_answers, status, completed_at, attempt_number, exam:exams(title)")
          .eq("enrollment_id", enrollmentId!)
          .eq("user_id", user!.id)
          .order("completed_at", { ascending: false }),
        supabase
          .from("certificates")
          .select("id, certificate_number, issue_date, expiry_date, is_valid, pdf_url")
          .eq("enrollment_id", enrollmentId!)
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      setEnrollment(enrollRes.data);
      setLessons(lessonsRes.data || []);
      setLessonProgress(progressRes.data || []);
      setExamResults(examRes.data || []);
      setCertificate(certRes.data);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="student">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!enrollment) {
    return (
      <DashboardLayout userRole="student">
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <p className="text-muted-foreground">Kayıt bulunamadı.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/courses")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Eğitimlerime Dön
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const course = enrollment.course;
  const dangerClass = course?.category?.danger_class || "low";
  const progress = enrollment.progress_percent || 0;
  const statusInfo = statusLabels[enrollment.status] || statusLabels.pending;

  const progressMap = new Map(lessonProgress.map((p: any) => [p.lesson_id, p]));
  const completedLessons = lessonProgress.filter(
    (p: any) => p.lesson_status === "completed" || p.lesson_status === "passed"
  ).length;
  const totalTime = lessonProgress.reduce((sum: number, p: any) => sum + (p.total_time || 0), 0);

  return (
    <DashboardLayout userRole="student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/courses")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{course?.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={dangerClassBadge[dangerClass as DangerClass]}>
                {dangerClassLabel[dangerClass as DangerClass]}
              </Badge>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
          </div>
          <Button variant="accent" asChild>
            <Link to={`/learn/${course?.id}`}>
              <Play className="h-4 w-4 mr-1" />
              {enrollment.status === "completed" ? "Tekrar İzle" : "Devam Et"}
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">%{progress}</p>
                <p className="text-xs text-muted-foreground">İlerleme</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedLessons}/{lessons.length}</p>
                <p className="text-xs text-muted-foreground">Ders</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{Math.round(totalTime / 60)}</p>
                <p className="text-xs text-muted-foreground">Dakika</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {enrollment.started_at ? format(new Date(enrollment.started_at), "dd MMM yyyy", { locale: tr }) : "-"}
                </p>
                <p className="text-xs text-muted-foreground">Başlangıç</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Genel İlerleme</span>
              <span className="text-sm text-muted-foreground">%{progress}</span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Lesson Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Ders Detayları
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {lessons.map((lesson: any, i: number) => {
                const lp = progressMap.get(lesson.id);
                const isCompleted = lp?.lesson_status === "completed" || lp?.lesson_status === "passed";
                const typeLabel = lesson.type === "exam" ? "Sınav" : lesson.type === "scorm" ? "SCORM" : lesson.type === "live" ? "Canlı Ders" : "İçerik";

                return (
                  <div key={lesson.id} className="flex items-center gap-3 px-6 py-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isCompleted ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">{typeLabel} • {lesson.duration_minutes} dk</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {lp?.score_raw != null && (
                        <Badge variant="default" className="text-xs">
                          <Award className="h-3 w-3 mr-1" /> {lp.score_raw}%
                        </Badge>
                      )}
                      {lp?.total_time ? (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(lp.total_time / 60)} dk
                        </span>
                      ) : null}
                      <Badge variant={isCompleted ? "success" : lp ? "warning" : "default"} className="text-xs">
                        {isCompleted ? "Tamamlandı" : lp?.lesson_status === "incomplete" ? "Devam Ediyor" : "Başlanmadı"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Exam Results */}
        {examResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileQuestion className="h-5 w-5" /> Sınav Sonuçları
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {examResults.map((result: any) => (
                  <div key={result.id} className="flex items-center gap-3 px-6 py-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      result.status === "passed" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>
                      {result.status === "passed" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{result.exam?.title || "Sınav"}</p>
                      <p className="text-xs text-muted-foreground">
                        Deneme #{result.attempt_number} • {result.completed_at ? format(new Date(result.completed_at), "dd MMM yyyy HH:mm", { locale: tr }) : "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{result.correct_answers}/{result.total_questions}</span>
                      <Badge variant={result.status === "passed" ? "success" : "destructive"} className="text-xs">
                        %{Math.round(result.score)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificate */}
        {certificate && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Sertifika #{certificate.certificate_number}</h3>
                <p className="text-sm text-muted-foreground">
                  {certificate.issue_date ? format(new Date(certificate.issue_date), "dd MMM yyyy", { locale: tr }) : ""} tarihinde düzenlendi
                  {certificate.expiry_date && ` • ${format(new Date(certificate.expiry_date), "dd MMM yyyy", { locale: tr })} tarihine kadar geçerli`}
                </p>
              </div>
              <div className="flex gap-2">
                {certificate.pdf_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={certificate.pdf_url} target="_blank" rel="noopener noreferrer">PDF İndir</a>
                  </Button>
                )}
                <Button variant="accent" size="sm" asChild>
                  <Link to={`/verify?cert=${certificate.certificate_number}`}>Doğrula</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
