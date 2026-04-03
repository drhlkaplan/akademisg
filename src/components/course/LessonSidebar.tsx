import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge-custom";
import {
  BookOpen,
  FileQuestion,
  Video,
  FileText,
  CheckCircle,
  Lock,
  Play,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";

type LessonType = Database["public"]["Enums"]["lesson_type"];
type DeliveryMethod = Database["public"]["Enums"]["lesson_delivery_method"];

export interface LessonItem {
  id: string;
  title: string;
  type: LessonType;
  sort_order: number;
  duration_minutes: number;
  is_active: boolean;
  scorm_package_id: string | null;
  exam_id: string | null;
  content_url: string | null;
  min_live_duration_minutes?: number;
  topic_group?: number | null;
  delivery_method?: DeliveryMethod | null;
}

export interface LessonProgressItem {
  lesson_id: string | null;
  lesson_status: string | null;
}

interface EnforcementInfo {
  isBlocked: boolean;
  reason: string | null;
  badgeLabel: string | null;
}

interface LessonSidebarProps {
  courseTitle: string;
  lessons: LessonItem[];
  lessonProgress: LessonProgressItem[];
  activeLessonId: string | null;
  overallProgress: number;
  onSelectLesson: (lessonId: string) => void;
  onBack: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  requireSequential?: boolean;
  enforcement?: Record<string, EnforcementInfo>;
}

const lessonTypeIcon: Record<LessonType, typeof BookOpen> = {
  scorm: BookOpen,
  exam: FileQuestion,
  live: Video,
  content: FileText,
};

const lessonTypeLabel: Record<LessonType, string> = {
  scorm: "SCORM",
  exam: "Sınav",
  live: "Canlı",
  content: "İçerik",
};

function getLessonStatus(lessonId: string, progress: LessonProgressItem[]): string {
  const p = progress.find((lp) => lp.lesson_id === lessonId);
  return p?.lesson_status || "not attempted";
}

function isLessonCompleted(status: string): boolean {
  return status === "completed" || status === "passed";
}

export function LessonSidebar({
  courseTitle,
  lessons,
  lessonProgress,
  activeLessonId,
  overallProgress,
  onSelectLesson,
  onBack,
  requireSequential = false,
  enforcement,
}: LessonSidebarProps) {
  const sortedLessons = [...lessons].sort((a, b) => a.sort_order - b.sort_order);

  const completedCount = sortedLessons.filter((l) =>
    isLessonCompleted(getLessonStatus(l.id, lessonProgress))
  ).length;

  // Build locked state: a lesson is locked if requireSequential is true
  // and the previous lesson is not completed
  const isLessonLocked = (index: number): boolean => {
    if (!requireSequential) return false;
    if (index === 0) return false; // First lesson is always accessible
    const prevLesson = sortedLessons[index - 1];
    const prevStatus = getLessonStatus(prevLesson.id, lessonProgress);
    return !isLessonCompleted(prevStatus);
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Dashboard
        </Button>
        <div>
          <h2 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
            {courseTitle}
          </h2>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {completedCount}/{sortedLessons.length} ders
            </span>
            <span className="text-xs font-medium text-foreground">%{overallProgress}</span>
          </div>
          <Progress value={overallProgress} className="h-1.5 mt-1" />
        </div>
      </div>

      {/* Lesson List */}
      <ScrollArea className="flex-1">
        <TooltipProvider delayDuration={300}>
          <div className="p-2 space-y-0.5">
            {sortedLessons.map((lesson, index) => {
              const status = getLessonStatus(lesson.id, lessonProgress);
              const completed = isLessonCompleted(status);
              const isActive = lesson.id === activeLessonId;
              const locked = isLessonLocked(index);
              const Icon = lessonTypeIcon[lesson.type];

              const button = (
                <button
                  key={lesson.id}
                  onClick={() => !locked && onSelectLesson(lesson.id)}
                  disabled={locked}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                    locked
                      ? "opacity-50 cursor-not-allowed"
                      : isActive
                      ? "bg-accent/10 border border-accent/30"
                      : "hover:bg-muted/50 border border-transparent",
                    !locked && !isActive && "border border-transparent",
                  )}
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0 mt-0.5">
                    {locked ? (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    ) : completed ? (
                      <div className="h-7 w-7 rounded-full bg-success/10 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-success" />
                      </div>
                    ) : isActive ? (
                      <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center">
                        <Play className="h-3.5 w-3.5 text-accent" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-tight line-clamp-2",
                        locked
                          ? "text-muted-foreground"
                          : isActive
                          ? "font-medium text-foreground"
                          : completed
                          ? "text-muted-foreground"
                          : "text-foreground"
                      )}
                    >
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {lessonTypeLabel[lesson.type]}
                        </span>
                      </div>
                      {lesson.duration_minutes > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          • {lesson.duration_minutes} dk
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );

              if (locked) {
                return (
                  <Tooltip key={lesson.id}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Önceki dersi tamamlamanız gerekiyor</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            })}
          </div>
        </TooltipProvider>
      </ScrollArea>
    </div>
  );
}
