import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Question = Database["public"]["Tables"]["questions"]["Row"];
type Exam = Database["public"]["Tables"]["exams"]["Row"];

interface ExamWithCourse extends Exam {
  courses: { title: string } | null;
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

  // Fetch questions
  const { data: questions, isLoading: questionsLoading } = useQuery({
    queryKey: ["exam-questions-take", examId],
    queryFn: async () => {
      if (!examId) throw new Error("Exam ID required");
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", examId);
      if (error) throw error;

      // Randomize if exam setting enabled
      let questionList = data || [];
      if (exam?.randomize_questions) {
        questionList = [...questionList].sort(() => Math.random() - 0.5);
      }
      // Limit to question_count if set
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

  const submitExamMutation = useMutation({
    mutationFn: async (result: {
      score: number;
      correctAnswers: number;
      totalQuestions: number;
      answers: Record<string, string>;
    }) => {
      if (!examId || !enrollmentId || !user) throw new Error("Missing required data");

      const status = result.score >= (exam?.passing_score || 70) ? "passed" : "failed";

      const { error } = await supabase.from("exam_results").insert([
        {
          exam_id: examId,
          enrollment_id: enrollmentId,
          user_id: user.id,
          score: result.score,
          correct_answers: result.correctAnswers,
          total_questions: result.totalQuestions,
          answers: result.answers,
          status,
          attempt_number: (previousAttempts?.length || 0) + 1,
          started_at: new Date(Date.now() - ((exam?.duration_minutes || 60) * 60 - (timeRemaining || 0)) * 1000).toISOString(),
          completed_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;

      // Update enrollment status if passed
      if (status === "passed") {
        await supabase
          .from("enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enrollmentId);
      }

      return { ...result, passed: status === "passed" };
    },
    onSuccess: (data) => {
      setExamResult({
        score: data.score,
        passed: data.passed,
        correctAnswers: data.correctAnswers,
        totalQuestions: data.totalQuestions,
      });
    },
    onError: (error) => {
      toast({
        title: "Hata",
        description: "Sınav sonucu kaydedilemedi: " + error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmitExam = useCallback(() => {
    if (!questions || isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmSubmit(false);

    let correctAnswers = 0;
    questions.forEach((question) => {
      const userAnswer = answers[question.id];
      if (userAnswer && userAnswer === question.correct_answer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / questions.length) * 100);

    submitExamMutation.mutate({
      score,
      correctAnswers,
      totalQuestions: questions.length,
      answers,
    });
  }, [questions, answers, isSubmitting, submitExamMutation]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions?.[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions ? (answeredCount / questions.length) * 100 : 0;

  // Check if max attempts reached
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
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Dashboard'a Dön
                </Button>
                {!examResult.passed && !maxAttemptsReached && (
                  <Button
                    variant="accent"
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
                  {(currentQuestion.options as string[] | null)?.map((option, index) => (
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
              <CheckCircle className="h-4 w-4 mr-1" />
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
