import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIContentGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "description" | "questions";
  context: {
    title: string;
    category?: string;
    danger_class?: string;
    duration_minutes?: number;
    exam_id?: string;
  };
  onDescriptionGenerated?: (description: string) => void;
  onQuestionsGenerated?: (questions: Array<{
    question_text: string;
    options: string[];
    correct_answer: string;
    points: number;
  }>) => void;
}

export function AIContentGenerator({
  open,
  onOpenChange,
  mode,
  context,
  onDescriptionGenerated,
  onQuestionsGenerated,
}: AIContentGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Orta");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedContent("");
    setGeneratedQuestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("ai-content", {
        body: {
          action: mode === "description" ? "generate_description" : "generate_questions",
          context: {
            ...context,
            count: questionCount,
            topic,
            difficulty,
          },
        },
      });

      if (error) throw error;

      if (mode === "description") {
        setGeneratedContent(data.content);
      } else {
        // Parse questions from JSON response
        try {
          const jsonMatch = data.content.match(/\{[\s\S]*"questions"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setGeneratedQuestions(parsed.questions || []);
          } else {
            throw new Error("JSON parse error");
          }
        } catch {
          toast({
            title: "Uyarı",
            description: "AI yanıtı ayrıştırılamadı. Lütfen tekrar deneyin.",
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message || "AI içerik üretilemedi.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseDescription = () => {
    onDescriptionGenerated?.(generatedContent);
    onOpenChange(false);
    setGeneratedContent("");
  };

  const handleUseQuestions = async () => {
    if (!context.exam_id || generatedQuestions.length === 0) return;

    try {
      const inserts = generatedQuestions.map((q) => ({
        exam_id: context.exam_id!,
        question_text: q.question_text,
        question_type: "multiple_choice" as const,
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points || 1,
      }));

      const { error } = await supabase.from("questions").insert(inserts);
      if (error) throw error;

      toast({ title: "Başarılı", description: `${generatedQuestions.length} soru eklendi.` });
      onQuestionsGenerated?.(generatedQuestions);
      onOpenChange(false);
      setGeneratedQuestions([]);
    } catch (err: any) {
      toast({
        title: "Hata",
        description: "Sorular eklenirken hata oluştu.",
        variant: "destructive",
      });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            {mode === "description" ? "AI ile Kurs Açıklaması Oluştur" : "AI ile Sınav Sorusu Üret"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium text-foreground">Kurs: {context.title}</p>
            {context.category && <p className="text-muted-foreground">Kategori: {context.category}</p>}
          </div>

          {mode === "questions" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Soru Sayısı</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                />
              </div>
              <div>
                <Label>Konu</Label>
                <Input
                  placeholder="Genel"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div>
                <Label>Zorluk</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kolay">Kolay</SelectItem>
                    <SelectItem value="Orta">Orta</SelectItem>
                    <SelectItem value="Zor">Zor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Button onClick={handleGenerate} disabled={isGenerating} variant="accent" className="w-full">
            {isGenerating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Üretiliyor...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Oluştur</>
            )}
          </Button>

          {/* Description result */}
          {mode === "description" && generatedContent && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Oluşturulan Açıklama</Label>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Textarea value={generatedContent} onChange={(e) => setGeneratedContent(e.target.value)} rows={8} />
            </div>
          )}

          {/* Questions result */}
          {mode === "questions" && generatedQuestions.length > 0 && (
            <div className="space-y-3">
              <Label>Oluşturulan Sorular ({generatedQuestions.length})</Label>
              <div className="max-h-[300px] overflow-y-auto space-y-3">
                {generatedQuestions.map((q, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 text-sm space-y-1">
                    <p className="font-medium">{i + 1}. {q.question_text}</p>
                    {q.options?.map((opt: string, j: number) => (
                      <p key={j} className={`pl-4 ${opt === q.correct_answer ? "text-success font-medium" : "text-muted-foreground"}`}>
                        {String.fromCharCode(65 + j)}) {opt}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          {mode === "description" && generatedContent && (
            <Button onClick={handleUseDescription}>Açıklamayı Kullan</Button>
          )}
          {mode === "questions" && generatedQuestions.length > 0 && (
            <Button onClick={handleUseQuestions}>Soruları Sınava Ekle</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
