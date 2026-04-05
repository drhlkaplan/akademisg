import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge-custom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, MessageSquare, HelpCircle, Sparkles, Loader2, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AiTutorChat } from "./AiTutorChat";
import type { LessonItem } from "./LessonSidebar";

interface LessonTabsProps {
  lesson: LessonItem | null;
  courseTitle: string;
  category?: string;
  dangerClass?: string;
}

export function LessonTabs({ lesson, courseTitle, category, dangerClass }: LessonTabsProps) {
  const [notes, setNotes] = useState("");
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const { toast } = useToast();

  const currentLessonId = lesson?.id || "";
  const aiSummary = aiSummaries[currentLessonId] || "";

  const handleGenerateSummary = async () => {
    if (!lesson) return;
    setIsGeneratingSummary(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-content", {
        body: {
          action: "generate_summary",
          context: {
            course_title: courseTitle,
            lesson_title: lesson.title,
            category: category || "İSG",
            danger_class: dangerClass,
            duration_minutes: lesson.duration_minutes,
          },
        },
      });

      if (error) throw error;
      setAiSummaries(prev => ({ ...prev, [lesson.id]: data.content }));
    } catch (err: any) {
      toast({
        title: "Hata",
        description: err.message || "AI özeti oluşturulamadı.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (!lesson) return null;

  return (
    <div className="bg-card">
      <Tabs defaultValue="notes" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
          <TabsTrigger
            value="notes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4 py-3 gap-2"
          >
            <FileText className="h-4 w-4" />
            Notlar
          </TabsTrigger>
          <TabsTrigger
            value="discussion"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4 py-3 gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Tartışma
          </TabsTrigger>
          <TabsTrigger
            value="ai-tutor"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4 py-3 gap-2"
          >
            <Bot className="h-4 w-4" />
            AI Tutor
            <Badge variant="warning" className="text-[10px] px-1.5 py-0">YENİ</Badge>
          </TabsTrigger>
          <TabsTrigger
            value="help"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-4 py-3 gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Yardım
          </TabsTrigger>
        </TabsList>

        <div className="p-4">
          <TabsContent value="notes" className="mt-0">
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="gap-2"
              >
                {isGeneratingSummary ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-warning" />
                )}
                <Badge variant="warning" className="text-xs">AI Özeti</Badge>
              </Button>
            </div>

            {aiSummary && (
              <ScrollArea className="mb-4 max-h-64 rounded-md border border-border">
                <div className="p-3 prose prose-sm max-w-none text-foreground">
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: aiSummary
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                        .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
                        .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
                        .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
                        .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
                        .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
                    }}
                  />
                </div>
              </ScrollArea>
            )}

            <Textarea
              placeholder="Bu ders hakkında notlarınızı yazın..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </TabsContent>

          <TabsContent value="discussion" className="mt-0">
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Tartışma alanı yakında aktif olacaktır.</p>
            </div>
          </TabsContent>

          <TabsContent value="ai-tutor" className="mt-0">
            <AiTutorChat
              lesson={lesson}
              courseTitle={courseTitle}
              category={category}
              dangerClass={dangerClass}
            />
          </TabsContent>

          <TabsContent value="help" className="mt-0">
            <div className="space-y-3 text-sm">
              <div className="border border-border rounded-lg p-3">
                <p className="font-medium text-foreground">SCORM içeriği yüklenmiyorsa</p>
                <p className="text-muted-foreground mt-1">Sayfayı yenileyin veya tarayıcı önbelleğini temizleyin.</p>
              </div>
              <div className="border border-border rounded-lg p-3">
                <p className="font-medium text-foreground">İlerleme kaydedilmiyorsa</p>
                <p className="text-muted-foreground mt-1">İnternet bağlantınızı kontrol edin. İlerleme otomatik olarak kaydedilir.</p>
              </div>
              <div className="border border-border rounded-lg p-3">
                <p className="font-medium text-foreground">Teknik destek</p>
                <p className="text-muted-foreground mt-1">Destek talebi oluşturmak için Dashboard → Yardım bölümünü ziyaret edin.</p>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
