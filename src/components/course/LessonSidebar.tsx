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
import type { Database } from "@/integrations/supabase/types";

type LessonType = Database["public"]["Enums"]["lesson_type"];

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
}

export interface LessonProgressItem {
  lesson_id: string | null;
  lesson_status: string | null;
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
}: LessonSidebarProps) {
  const completedCount = lessons.filter((l) =>
    isLessonCompleted(getLessonStatus(l.id, lessonProgress))
  ).length;

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
              {completedCount}/{lessons.length} ders
            </span>
            <span className="text-xs font-medium text-foreground">%{overallProgress}</span>
          </div>
          <Progress value={overallProgress} className="h-1.5 mt-1" />
        </div>
      </div>

      {/* Lesson List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {lessons
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((lesson, index) => {
              const status = getLessonStatus(lesson.id, lessonProgress);
              const completed = isLessonCompleted(status);
              const isActive = lesson.id === activeLessonId;
              const Icon = lessonTypeIcon[lesson.type];

              return (
                <button
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                    isActive
                      ? "bg-accent/10 border border-accent/30"
                      : "hover:bg-muted/50 border border-transparent",
                  )}
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0 mt-0.5">
                    {completed ? (
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
                        isActive
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
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
