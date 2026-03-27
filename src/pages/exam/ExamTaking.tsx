import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge-custom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Trophy,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Exam = Database["public"]["Tables"]["exams"]["Row"];

interface ExamWithCourse extends Exam {
  courses: { title: string } | null;
}

interface QuestionForStudent {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: string | null;
  options: any;
  points: number | null;
}

export default function ExamTaking() {
  const { examId, enrollmentId } = useParams<{ examId: string; enrollmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [examResult, setExamResult] = useState<{
    score: number;
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
  } | null>(null);
  const [autoNavigating, setAutoNavigating] = useState(false);

  // Fetch exam details
  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ["exam-details", examId],
    queryFn: async () => {
      if (!examId) throw new Error("Exam ID required");
      const { data, error } = await supabase
        .from("exams")
        .select(`*, courses (title)`)
        .eq("id", examId)
        .single();
      if (error) throw error;
      return data as ExamWithCourse;
    },
    enabled: !!examId,
  });

  // Fetch questions WITHOUT correct_answer (using the secure view)
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ["exam-questions-take", examId],
    queryFn: async () => {
      if (!examId) throw new Error("Exam ID required");
      const { data, error } = await supabase
        .from("questions_for_students" as any)
        .select("id, exam_id, question_text, question_type, options, points")
        .eq("exam_id", examId);
      if (error) throw error;

      let questionList = (data || []) as unknown as QuestionForStudent[];
      if (exam?.randomize_questions) {
        questionList = [...questionList].sort(() => Math.random() - 0.5);
      }
      if (exam?.question_count && questionList.length > exam.question_count) {
        questionList = questionList.slice(0, exam.question_count);
      }
      return questionList;
    },
    enabled: !!examId && !!exam,
  });

  // Check previous attempts
  const { data: previousAttempts } = useQuery({
    queryKey: ["exam-attempts", examId, user?.id],
    queryFn: async () => {
      if (!examId || !user) return [];
      const { data, error } = await supabase
        .from("exam_results")
        .select("*")
        .eq("exam_id", examId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!examId && !!user,
  });

  // Get course_id from enrollment for navigation (must be before any early returns)
  const { data: enrollmentCourse } = useQuery({
    queryKey: ["enrollment-course", enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return null;
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("id", enrollmentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!enrollmentId,
  });

  // Timer effect
  useEffect(() => {
    if (exam && timeRemaining === null && !examResult) {
      setTimeRemaining((exam.duration_minutes || 60) * 60);
    }
  }, [exam, timeRemaining, examResult]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || examResult) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, examResult]);

  // Server-side exam submission
  const handleSubmitExam = useCallback(async () => {
    if (!questions || !examId || !enrollmentId || isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmSubmit(false);

    try {
      const { data, error } = await supabase.functions.invoke("submit-exam", {
        body: {
          exam_id: examId,
          enrollment_id: enrollmentId,
          answers,
          time_remaining: timeRemaining,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setExamResult({
        score: data.score,
        passed: data.passed,
        correctAnswers: data.correctAnswers,
        totalQuestions: data.totalQuestions,
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: "Sınav sonucu kaydedilemedi: " + (error.message || "Bilinmeyen hata"),
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  }, [questions, examId, enrollmentId, answers, isSubmitting, timeRemaining, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions?.[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions ? (answeredCount / questions.length) * 100 : 0;

  const maxAttemptsReached =
    exam?.max_attempts && previousAttempts && previousAttempts.length >= exam.max_attempts;

  const isLoading = examLoading || questionsLoading;

  if (isLoading) {
    return (
      <DashboardLayout userRole="student">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!exam || !questions) {
    return (
      <DashboardLayout userRole="student">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Sınav Bulunamadı</h2>
            <p className="text-muted-foreground mb-4">Bu sınava erişim izniniz yok veya sınav mevcut değil.</p>
            <Button onClick={() => navigate("/dashboard")}>Dashboard'a Dön</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (maxAttemptsReached && !examResult) {
    return (
      <DashboardLayout userRole="student">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Maksimum Deneme Sayısına Ulaşıldı</h2>
            <p className="text-muted-foreground mb-4">
              Bu sınav için {exam.max_attempts} deneme hakkınızı kullandınız.
            </p>
            <Button onClick={() => navigate("/dashboard")}>Dashboard'a Dön</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }




  // Show result screen
  if (examResult) {
    const courseId = enrollmentCourse?.course_id;

    return (
      <DashboardLayout userRole="student">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              {examResult.passed ? (
                <>
                  <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                    <Trophy className="h-10 w-10 text-success" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Tebrikler! 🎉</h2>
                  <p className="text-muted-foreground mb-6">Sınavı başarıyla tamamladınız.</p>
                </>
              ) : (
                <>
                  <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                    <XCircle className="h-10 w-10 text-destructive" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Sınav Tamamlandı</h2>
                  <p className="text-muted-foreground mb-6">
                    Maalesef geçme notunu alamadınız. Tekrar deneyebilirsiniz.
                  </p>
                </>
              )}

              <div className="bg-muted rounded-lg p-6 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-foreground">%{examResult.score}</p>
                    <p className="text-sm text-muted-foreground">Puan</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {examResult.correctAnswers}/{examResult.totalQuestions}
                    </p>
                    <p className="text-sm text-muted-foreground">Doğru</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">%{exam.passing_score}</p>
                    <p className="text-sm text-muted-foreground">Geçme Notu</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                {courseId && (
                  <Button
                    variant="accent"
                    onClick={() => navigate(`/course/${courseId}/learn`)}
                  >
                    {examResult.passed ? "Sonraki Derse Devam Et" : "Eğitime Dön"}
                  </Button>
                )}
                {!examResult.passed && !maxAttemptsReached && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAnswers({});
                      setCurrentQuestionIndex(0);
                      setTimeRemaining(null);
                      setExamResult(null);
                      setIsSubmitting(false);
                    }}
                  >
                    Tekrar Dene
                  </Button>
                )}
                {!courseId && (
                  <Button variant="outline" onClick={() => navigate("/dashboard")}>
                    Dashboard'a Dön
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="student">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">{exam.title}</h1>
                <p className="text-sm text-muted-foreground">{exam.courses?.title}</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    timeRemaining && timeRemaining < 300
                      ? "destructive"
                      : timeRemaining && timeRemaining < 600
                      ? "pending"
                      : "secondary"
                  }
                  className="text-lg px-4 py-2"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}
                </Badge>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {answeredCount}/{questions.length} soru cevaplandı
                </span>
                <span className="text-muted-foreground">%{Math.round(progress)}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        {currentQuestion && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">Soru {currentQuestionIndex + 1}/{questions.length}</Badge>
                <Badge variant="secondary">{currentQuestion.points || 1} puan</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-lg font-medium text-foreground">{currentQuestion.question_text}</p>

              {currentQuestion.question_type === "multiple_choice" ? (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) =>
                    setAnswers({ ...answers, [currentQuestion.id]: value })
                  }
                  className="space-y-3"
                >
                  {(currentQuestion.options as string[] | null)?.map((option: string, index: number) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                        answers[currentQuestion.id] === String.fromCharCode(65 + index)
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <RadioGroupItem
                        value={String.fromCharCode(65 + index)}
                        id={`option-${index}`}
                      />
                      <Label
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + index)})</span>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) =>
                    setAnswers({ ...answers, [currentQuestion.id]: value })
                  }
                  className="space-y-3"
                >
                  <div
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                      answers[currentQuestion.id] === "true"
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="flex-1 cursor-pointer font-normal">
                      Doğru
                    </Label>
                  </div>
                  <div
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${
                      answers[currentQuestion.id] === "false"
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="flex-1 cursor-pointer font-normal">
                      Yanlış
                    </Label>
                  </div>
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Önceki
          </Button>

          <div className="flex gap-1 flex-wrap justify-center max-w-md">
            {questions.map((q, index) => (
              <Button
                key={q.id}
                variant={currentQuestionIndex === index ? "accent" : answers[q.id] ? "default" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => setCurrentQuestionIndex(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button variant="accent" onClick={() => setShowConfirmSubmit(true)} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Sınavı Bitir
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            >
              Sonraki
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Submit Confirmation Dialog */}
        <AlertDialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sınavı Bitir</AlertDialogTitle>
              <AlertDialogDescription>
                {answeredCount < questions.length ? (
                  <>
                    <span className="text-destructive font-medium">
                      Dikkat: {questions.length - answeredCount} soru cevaplanmadı!
                    </span>
                    <br />
                  </>
                ) : null}
                Sınavı bitirmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmitExam}>Sınavı Bitir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
