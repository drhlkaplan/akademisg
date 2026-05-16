import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-custom";
import { Button } from "@/components/ui/button";
import {
  FileQuestion,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ExamItem {
  exam_id: string;
  exam_title: string;
  enrollment_id: string;
  course_title: string;
  duration_minutes: number;
  passing_score: number;
  attempts_used: number;
  max_attempts: number | null;
  is_pre_test: boolean;
  best_score: number | null;
  passed: boolean;
}

export default function MyExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchExams();
    const ch = supabase
      .channel(`my-exams-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollments", filter: `user_id=eq.${user.id}` }, () => fetchExams())
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_results", filter: `user_id=eq.${user.id}` }, () => fetchExams())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      // Get active enrollments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, course_id, course:courses(title)")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .in("status", ["active", "completed"]);

      if (!enrollments || enrollments.length === 0) {
        setExams([]);
        return;
      }

      const courseIds = enrollments.map((e) => e.course_id);

      const { data: examsData } = await supabase
        .from("exams")
        .select("id, title, course_id, duration_minutes, passing_score, max_attempts, exam_type")
        .eq("is_active", true)
        .in("course_id", courseIds);

      const { data: resultsData } = await supabase
        .from("exam_results")
        .select("exam_id, score, status")
        .eq("user_id", user!.id);

      const attemptsByExam: Record<string, number> = {};
      const bestScoreByExam: Record<string, number> = {};
      const passedExams = new Set<string>();

      resultsData?.forEach((r) => {
        attemptsByExam[r.exam_id] = (attemptsByExam[r.exam_id] || 0) + 1;
        const current = bestScoreByExam[r.exam_id] ?? 0;
        if (r.score > current) bestScoreByExam[r.exam_id] = r.score;
        if (r.status === "passed") passedExams.add(r.exam_id);
      });

      const items: ExamItem[] = [];
      examsData?.forEach((exam) => {
        const enrollment = enrollments.find((e) => e.course_id === exam.course_id);
        if (!enrollment) return;
        const isPre = (exam as any).exam_type === "pre_test" || (exam as any).exam_type === "pre";
        items.push({
          exam_id: exam.id,
          exam_title: exam.title,
          enrollment_id: enrollment.id,
          course_title: (enrollment.course as any)?.title || "",
          duration_minutes: exam.duration_minutes || 60,
          passing_score: exam.passing_score || 70,
          attempts_used: attemptsByExam[exam.id] || 0,
          max_attempts: isPre ? null : (exam.max_attempts || 3),
          is_pre_test: isPre,
          best_score: bestScoreByExam[exam.id] ?? null,
          passed: passedExams.has(exam.id),
        });
      });

      setExams(items);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sınavlarım</h1>
          <p className="text-muted-foreground">Eğitimlerinize ait sınavlar ve sonuçlarınız</p>
        </div>

        {exams.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileQuestion className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sınav bulunamadı</h3>
              <p className="text-muted-foreground">Aktif eğitimlerinize ait sınav bulunmuyor.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {exams.map((exam) => {
              const unlimited = exam.is_pre_test || !exam.max_attempts;
              const canRetake = !exam.passed && (unlimited || exam.attempts_used < (exam.max_attempts as number));
              return (
                <Card key={exam.exam_id} className={exam.passed ? "border-success/30" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                          <FileQuestion className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{exam.exam_title}</h3>
                          <p className="text-xs text-muted-foreground">{exam.course_title}</p>
                        </div>
                      </div>
                      {exam.passed ? (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Başarılı
                        </Badge>
                      ) : !unlimited && exam.attempts_used >= (exam.max_attempts as number) ? (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Hak Bitti
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Bekliyor</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{exam.duration_minutes} dk</span>
                      </div>
                      <div>Geçme: %{exam.passing_score}</div>
                      <div>
                        Deneme: {exam.attempts_used}{unlimited ? "" : `/${exam.max_attempts}`}
                      </div>
                    </div>

                    {exam.best_score !== null && (
                      <p className="text-sm mb-3">
                        En iyi puan: <span className="font-semibold text-foreground">%{Math.round(exam.best_score)}</span>
                      </p>
                    )}

                    {canRetake && (
                      <Button variant="accent" size="sm" className="w-full" asChild>
                        <Link to={`/exam/${exam.exam_id}/${exam.enrollment_id}`}>
                          Sınava Gir
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
