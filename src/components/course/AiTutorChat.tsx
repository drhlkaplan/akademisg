import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { LessonItem } from "./LessonSidebar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiTutorChatProps {
  lesson: LessonItem | null;
  courseTitle: string;
  category?: string;
  dangerClass?: string;
}

const SUGGESTED_QUESTIONS = [
  "Bu dersin önemli noktaları nelerdir?",
  "Sınav için nelere dikkat etmeliyim?",
  "Bu konuyla ilgili yasal mevzuat nedir?",
  "Pratik örnekler verebilir misin?",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

export function AiTutorChat({ lesson, courseTitle, category, dangerClass }: AiTutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: {
            course_title: courseTitle,
            lesson_title: lesson?.title || "",
            category: category || "İSG",
            danger_class: dangerClass,
            lesson_type: lesson?.type || "",
          },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Bilinmeyen hata" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      if (!resp.body) throw new Error("Yanıt akışı alınamadı");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Add empty assistant message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages(prev =>
                prev.map((m, i) =>
                  i === prev.length - 1 && m.role === "assistant"
                    ? { ...m, content: currentContent }
                    : m
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages(prev =>
                prev.map((m, i) =>
                  i === prev.length - 1 && m.role === "assistant"
                    ? { ...m, content: currentContent }
                    : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      toast({
        title: "AI Tutor Hatası",
        description: err.message || "Yanıt alınamadı.",
        variant: "destructive",
      });
      // Remove empty assistant message if error
      if (!assistantContent) {
        setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || _.role !== "assistant"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, courseTitle, lesson, category, dangerClass, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-[400px]">
      {/* Chat messages */}
      <ScrollArea className="flex-1 px-1" ref={scrollRef as any}>
        <div className="space-y-3 py-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-accent" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">AI Tutor</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lesson ? `"${lesson.title}" dersi hakkında sorular sorun` : "Bir ders seçip soru sorun"}
                </p>
              </div>
              {/* Suggested questions */}
              <div className="flex flex-wrap gap-2 justify-center mt-2 px-4">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="prose prose-sm max-w-none text-foreground [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm"
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/^### (.*$)/gm, '<h3 class="font-semibold mt-2 mb-1">$1</h3>')
                          .replace(/^## (.*$)/gm, '<h2 class="font-semibold mt-3 mb-1">$1</h2>')
                          .replace(/^# (.*$)/gm, '<h1 class="font-bold mt-3 mb-1">$1</h1>')
                          .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
                          .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
                          .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-background rounded text-xs">$1</code>')
                          .replace(/\n/g, "<br>")
                      }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.role === "assistant" && !msg.content && isLoading && (
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border pt-3 mt-auto">
        <div className="flex items-end gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive"
              title="Sohbeti temizle"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sorunuzu yazın..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent min-h-[36px] max-h-[100px]"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="h-9 w-9 flex-shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
