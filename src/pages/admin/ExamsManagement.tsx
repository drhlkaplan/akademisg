import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AIContentGenerator } from "@/components/admin/AIContentGenerator";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge-custom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileQuestion,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
} from "lucide-react";
import { ExamUsersDialog } from "@/components/admin/ExamUsersDialog";
import type { Database } from "@/integrations/supabase/types";

type Exam = Database["public"]["Tables"]["exams"]["Row"];
type Question = Database["public"]["Tables"]["questions"]["Row"];
type QuestionType = Database["public"]["Enums"]["question_type"];

interface ExamWithCourse extends Exam {
  courses: { title: string } | null;
}

interface QuestionForm {
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: string;
  points: number;
}

const initialQuestionForm: QuestionForm = {
  question_text: "",
  question_type: "multiple_choice",
  options: ["", "", "", ""],
  correct_answer: "",
  points: 1,
};

export default function ExamsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);
  const [deleteExamId, setDeleteExamId] = useState<string | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [bankSourceExamId, setBankSourceExamId] = useState<string>("");
  const [selectedBankQuestions, setSelectedBankQuestions] = useState<Set<string>>(new Set());
  const [aiQuestionOpen, setAiQuestionOpen] = useState(false);
  const [usersDialogExam, setUsersDialogExam] = useState<{ id: string; title: string; courseId: string } | null>(null);
  const [aiExamContext, setAiExamContext] = useState<any>(null);
  
  const [examForm, setExamForm] = useState({
    title: "",
    course_id: "",
    duration_minutes: 60,
    passing_score: 70,
    max_attempts: 3,
    question_count: 20,
    randomize_questions: true,
  });
  
  const [questionForm, setQuestionForm] = useState<QuestionForm>(initialQuestionForm);

  // Fetch courses for dropdown
  const { data: courses } = useQuery({
    queryKey: ["courses-for-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Fetch exams
  const { data: exams, isLoading } = useQuery({
    queryKey: ["admin-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select(`
          *,
          courses (title)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ExamWithCourse[];
    },
  });

  // Fetch questions for expanded exam
  const { data: questions } = useQuery({
    queryKey: ["exam-questions", expandedExamId],
    queryFn: async () => {
      if (!expandedExamId) return [];
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", expandedExamId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!expandedExamId,
  });

  // Exam mutations
  const createExamMutation = useMutation({
    mutationFn: async (data: typeof examForm) => {
      const { error } = await supabase.from("exams").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      setIsExamDialogOpen(false);
      resetExamForm();
      toast({ title: "Sınav başarıyla oluşturuldu" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateExamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof examForm> }) => {
      const { error } = await supabase.from("exams").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      setIsExamDialogOpen(false);
      setEditingExam(null);
      resetExamForm();
      toast({ title: "Sınav başarıyla güncellendi" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
      setDeleteExamId(null);
      toast({ title: "Sınav silindi" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const toggleExamActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("exams").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exams"] });
    },
  });

  // Question mutations
  const createQuestionMutation = useMutation({
    mutationFn: async (data: { exam_id: string } & QuestionForm) => {
      const { exam_id, question_text, question_type, options, correct_answer, points } = data;
      const { error } = await supabase.from("questions").insert([{
        exam_id,
        question_text,
        question_type,
        options: question_type === "multiple_choice" ? options : null,
        correct_answer,
        points,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-questions", selectedExamId] });
      setIsQuestionDialogOpen(false);
      setQuestionForm(initialQuestionForm);
      toast({ title: "Soru başarıyla eklendi" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<QuestionForm> }) => {
      const { error } = await supabase.from("questions").update({
        question_text: data.question_text,
        question_type: data.question_type,
        options: data.question_type === "multiple_choice" ? data.options : null,
        correct_answer: data.correct_answer,
        points: data.points,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-questions", expandedExamId] });
      setIsQuestionDialogOpen(false);
      setEditingQuestion(null);
      setQuestionForm(initialQuestionForm);
      toast({ title: "Soru başarıyla güncellendi" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-questions", expandedExamId] });
      setDeleteQuestionId(null);
      toast({ title: "Soru silindi" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  // Question bank: fetch questions from another exam
  const { data: bankQuestions } = useQuery({
    queryKey: ["bank-questions", bankSourceExamId],
    queryFn: async () => {
      if (!bankSourceExamId) return [];
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", bankSourceExamId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!bankSourceExamId && isQuestionBankOpen,
  });

  // Import selected questions from bank to target exam
  const importQuestionsMutation = useMutation({
    mutationFn: async ({ targetExamId, questionIds }: { targetExamId: string; questionIds: string[] }) => {
      const sourceQuestions = bankQuestions?.filter(q => questionIds.includes(q.id)) || [];
      const inserts = sourceQuestions.map(q => ({
        exam_id: targetExamId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points,
      }));
      const { error } = await supabase.from("questions").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-questions", expandedExamId] });
      setIsQuestionBankOpen(false);
      setSelectedBankQuestions(new Set());
      setBankSourceExamId("");
      toast({ title: "Sorular başarıyla aktarıldı" });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenQuestionBank = (examId: string) => {
    setSelectedExamId(examId);
    setBankSourceExamId("");
    setSelectedBankQuestions(new Set());
    setIsQuestionBankOpen(true);
  };

  const resetExamForm = () => {
    setExamForm({
      title: "",
      course_id: "",
      duration_minutes: 60,
      passing_score: 70,
      max_attempts: 3,
      question_count: 20,
      randomize_questions: true,
    });
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setExamForm({
      title: exam.title,
      course_id: exam.course_id,
      duration_minutes: exam.duration_minutes || 60,
      passing_score: exam.passing_score || 70,
      max_attempts: exam.max_attempts || 3,
      question_count: exam.question_count || 20,
      randomize_questions: exam.randomize_questions ?? true,
    });
    setIsExamDialogOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    const options = question.options as string[] | null;
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type || "multiple_choice",
      options: options || ["", "", "", ""],
      correct_answer: question.correct_answer,
      points: question.points || 1,
    });
    setSelectedExamId(question.exam_id);
    setIsQuestionDialogOpen(true);
  };

  const handleAddQuestion = (examId: string) => {
    setSelectedExamId(examId);
    setEditingQuestion(null);
    setQuestionForm(initialQuestionForm);
    setIsQuestionDialogOpen(true);
  };

  const handleExamSubmit = () => {
    if (!examForm.title || !examForm.course_id) {
      toast({ title: "Lütfen zorunlu alanları doldurun", variant: "destructive" });
      return;
    }
    if (editingExam) {
      updateExamMutation.mutate({ id: editingExam.id, data: examForm });
    } else {
      createExamMutation.mutate(examForm);
    }
  };

  const handleQuestionSubmit = () => {
    if (!questionForm.question_text || !questionForm.correct_answer) {
      toast({ title: "Lütfen zorunlu alanları doldurun", variant: "destructive" });
      return;
    }
    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data: questionForm });
    } else if (selectedExamId) {
      createQuestionMutation.mutate({ exam_id: selectedExamId, ...questionForm });
    }
  };

  const filteredExams = exams?.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.courses?.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === "all" || exam.course_id === courseFilter;
    return matchesSearch && matchesCourse;
  });

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sınav Yönetimi</h1>
            <p className="text-muted-foreground">Sınavları ve soruları yönetin</p>
          </div>
          <Dialog open={isExamDialogOpen} onOpenChange={(open) => {
            setIsExamDialogOpen(open);
            if (!open) {
              setEditingExam(null);
              resetExamForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Sınav
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingExam ? "Sınav Düzenle" : "Yeni Sınav Oluştur"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Sınav Adı *</Label>
                  <Input
                    value={examForm.title}
                    onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                    placeholder="Örn: İSG Temel Eğitim Sınavı"
                  />
                </div>
                <div>
                  <Label>Kurs *</Label>
                  <Select
                    value={examForm.course_id}
                    onValueChange={(value) => setExamForm({ ...examForm, course_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kurs seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Süre (dk)</Label>
                    <Input
                      type="number"
                      value={examForm.duration_minutes}
                      onChange={(e) => setExamForm({ ...examForm, duration_minutes: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                  <div>
                    <Label>Geçme Notu (%)</Label>
                    <Input
                      type="number"
                      value={examForm.passing_score}
                      onChange={(e) => setExamForm({ ...examForm, passing_score: parseInt(e.target.value) || 70 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Maks Deneme</Label>
                    <Input
                      type="number"
                      value={examForm.max_attempts}
                      onChange={(e) => setExamForm({ ...examForm, max_attempts: parseInt(e.target.value) || 3 })}
                    />
                  </div>
                  <div>
                    <Label>Soru Sayısı</Label>
                    <Input
                      type="number"
                      value={examForm.question_count}
                      onChange={(e) => setExamForm({ ...examForm, question_count: parseInt(e.target.value) || 20 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="randomize"
                    checked={examForm.randomize_questions}
                    onChange={(e) => setExamForm({ ...examForm, randomize_questions: e.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="randomize">Soruları karıştır</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsExamDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleExamSubmit} disabled={createExamMutation.isPending || updateExamMutation.isPending}>
                    {editingExam ? "Güncelle" : "Oluştur"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sınav veya kurs ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Kurs filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kurslar</SelectItem>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Exams Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sınavlar ({filteredExams?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredExams && filteredExams.length > 0 ? (
              <div className="space-y-2">
                {filteredExams.map((exam) => (
                  <div key={exam.id} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedExamId(expandedExamId === exam.id ? null : exam.id)}
                        >
                          {expandedExamId === exam.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <h3 className="font-medium text-foreground">{exam.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {exam.courses?.title} • {exam.duration_minutes} dk • %{exam.passing_score} geçme notu
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={exam.is_active ? "success" : "secondary"}>
                          {exam.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExamActiveMutation.mutate({ id: exam.id, is_active: !exam.is_active })}
                        >
                          {exam.is_active ? (
                            <ToggleRight className="h-4 w-4 text-success" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" title="Atanan kullanıcılar"
                          onClick={() => setUsersDialogExam({ id: exam.id, title: exam.title, courseId: exam.course_id })}>
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEditExam(exam)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteExamId(exam.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Questions Panel */}
                    {expandedExamId === exam.id && (
                      <div className="border-t bg-muted/30 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <FileQuestion className="h-4 w-4" />
                            Sorular ({questions?.length || 0})
                          </h4>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAiExamContext({
                                  title: exam.courses?.title || exam.title,
                                  exam_id: exam.id,
                                });
                                setAiQuestionOpen(true);
                              }}
                            >
                              <Sparkles className="mr-1 h-3 w-3 text-warning" />
                              AI ile Soru Üret
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleOpenQuestionBank(exam.id)}>
                              <FileQuestion className="mr-1 h-3 w-3" />
                              Soru Bankasından Ekle
                            </Button>
                            <Button size="sm" onClick={() => handleAddQuestion(exam.id)}>
                              <Plus className="mr-1 h-3 w-3" />
                              Yeni Soru Ekle
                            </Button>
                          </div>
                        </div>
                        {questions && questions.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Soru</TableHead>
                                <TableHead className="w-24">Tip</TableHead>
                                <TableHead className="w-20">Puan</TableHead>
                                <TableHead className="w-24"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {questions.map((question, index) => (
                                <TableRow key={question.id}>
                                  <TableCell className="font-medium">{index + 1}</TableCell>
                                  <TableCell className="max-w-md truncate">
                                    {question.question_text}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {question.question_type === "multiple_choice" ? "Çoktan Seçmeli" : "Doğru/Yanlış"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{question.points}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" onClick={() => handleEditQuestion(question)}>
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => setDeleteQuestionId(question.id)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            Henüz soru eklenmemiş
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Sınav bulunamadı
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Dialog */}
        <Dialog open={isQuestionDialogOpen} onOpenChange={(open) => {
          setIsQuestionDialogOpen(open);
          if (!open) {
            setEditingQuestion(null);
            setQuestionForm(initialQuestionForm);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Soru Düzenle" : "Yeni Soru Ekle"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Soru Tipi</Label>
                <Select
                  value={questionForm.question_type}
                  onValueChange={(value: QuestionType) => setQuestionForm({ ...questionForm, question_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Çoktan Seçmeli</SelectItem>
                    <SelectItem value="true_false">Doğru/Yanlış</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Soru Metni *</Label>
                <Textarea
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  placeholder="Soruyu yazın..."
                  rows={3}
                />
              </div>

              {questionForm.question_type === "multiple_choice" ? (
                <div className="space-y-2">
                  <Label>Seçenekler ve Doğru Cevap *</Label>
                  <RadioGroup
                    value={questionForm.correct_answer}
                    onValueChange={(value) => setQuestionForm({ ...questionForm, correct_answer: value })}
                  >
                    {questionForm.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <RadioGroupItem value={String.fromCharCode(65 + index)} id={`option-${index}`} />
                        <span className="font-medium w-6">{String.fromCharCode(65 + index)})</span>
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...questionForm.options];
                            newOptions[index] = e.target.value;
                            setQuestionForm({ ...questionForm, options: newOptions });
                          }}
                          placeholder={`Seçenek ${String.fromCharCode(65 + index)}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ) : (
                <div>
                  <Label>Doğru Cevap *</Label>
                  <RadioGroup
                    value={questionForm.correct_answer}
                    onValueChange={(value) => setQuestionForm({ ...questionForm, correct_answer: value })}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="true" id="true" />
                      <Label htmlFor="true">Doğru</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="false" id="false" />
                      <Label htmlFor="false">Yanlış</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div>
                <Label>Puan</Label>
                <Input
                  type="number"
                  value={questionForm.points}
                  onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
                  min={1}
                  className="w-24"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
                  İptal
                </Button>
                <Button onClick={handleQuestionSubmit} disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}>
                  {editingQuestion ? "Güncelle" : "Ekle"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Exam Dialog */}
        <AlertDialog open={!!deleteExamId} onOpenChange={() => setDeleteExamId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sınavı Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu sınavı silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm sorular da silinecektir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteExamId && deleteExamMutation.mutate(deleteExamId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Question Dialog */}
        <AlertDialog open={!!deleteQuestionId} onOpenChange={() => setDeleteQuestionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Soruyu Sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu soruyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>İptal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteQuestionId && deleteQuestionMutation.mutate(deleteQuestionId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Question Bank Dialog */}
        <Dialog open={isQuestionBankOpen} onOpenChange={(open) => {
          setIsQuestionBankOpen(open);
          if (!open) {
            setBankSourceExamId("");
            setSelectedBankQuestions(new Set());
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Soru Bankasından Ekle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Kaynak Sınav Seçin</Label>
                <Select value={bankSourceExamId} onValueChange={(v) => { setBankSourceExamId(v); setSelectedBankQuestions(new Set()); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Soru alınacak sınavı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams?.filter(e => e.id !== selectedExamId).map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title} ({exam.courses?.title})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {bankQuestions && bankQuestions.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Soruları seçin ({selectedBankQuestions.size} seçili)</Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (selectedBankQuestions.size === bankQuestions.length) {
                          setSelectedBankQuestions(new Set());
                        } else {
                          setSelectedBankQuestions(new Set(bankQuestions.map(q => q.id)));
                        }
                      }}
                    >
                      {selectedBankQuestions.size === bankQuestions.length ? "Tümünü Kaldır" : "Tümünü Seç"}
                    </Button>
                  </div>
                  <div className="border rounded-lg divide-y max-h-[40vh] overflow-y-auto">
                    {bankQuestions.map((q, i) => (
                      <label key={q.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-input"
                          checked={selectedBankQuestions.has(q.id)}
                          onChange={(e) => {
                            const next = new Set(selectedBankQuestions);
                            if (e.target.checked) next.add(q.id); else next.delete(q.id);
                            setSelectedBankQuestions(next);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {q.question_type === "multiple_choice" ? "Çoktan Seçmeli" : "Doğru/Yanlış"} • {q.points} puan
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : bankSourceExamId ? (
                <p className="text-center text-muted-foreground py-4">Bu sınavda soru bulunamadı</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsQuestionBankOpen(false)}>İptal</Button>
                <Button
                  disabled={selectedBankQuestions.size === 0 || importQuestionsMutation.isPending}
                  onClick={() => {
                    if (selectedExamId) {
                      importQuestionsMutation.mutate({
                        targetExamId: selectedExamId,
                        questionIds: [...selectedBankQuestions],
                      });
                    }
                  }}
                >
                  {importQuestionsMutation.isPending ? "Aktarılıyor..." : `${selectedBankQuestions.size} Soru Aktar`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Question Generator */}
        {aiExamContext && (
          <AIContentGenerator
            open={aiQuestionOpen}
            onOpenChange={setAiQuestionOpen}
            mode="questions"
            context={aiExamContext}
            onQuestionsGenerated={() => {
              queryClient.invalidateQueries({ queryKey: ["exam-questions", expandedExamId] });
            }}
          />
        )}

        {usersDialogExam && (
          <ExamUsersDialog
            open={!!usersDialogExam}
            onOpenChange={(o) => !o && setUsersDialogExam(null)}
            examId={usersDialogExam.id}
            examTitle={usersDialogExam.title}
            courseId={usersDialogExam.courseId}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
