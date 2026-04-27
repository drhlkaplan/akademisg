/**
 * ScormControlsV2 — minimal top/bottom bar for the player.
 */
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TopBarProps {
  lessonTitle?: string;
  courseTitle?: string;
  status: string;
  scoreRaw: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function ScormTopBar({
  lessonTitle,
  courseTitle,
  status,
  scoreRaw,
  isFullscreen,
  onToggleFullscreen,
}: TopBarProps) {
  const statusLabel: Record<string, string> = {
    "not attempted": "Başlanmadı",
    incomplete: "Devam Ediyor",
    completed: "Tamamlandı",
    passed: "Başarılı",
    failed: "Başarısız",
    browsed: "İncelendi",
  };
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-background/95 border-b">
      <div className="min-w-0 flex-1">
        {courseTitle && <div className="text-xs text-muted-foreground truncate">{courseTitle}</div>}
        <div className="text-sm font-medium text-foreground truncate">{lessonTitle || "SCORM İçerik"}</div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-muted text-muted-foreground">{statusLabel[status] || status}</span>
        {scoreRaw && <span className="px-2 py-1 rounded bg-primary/10 text-primary">Skor: {scoreRaw}</span>}
        <Button variant="ghost" size="icon" onClick={onToggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

interface BottomBarProps {
  sessionSeconds: number;
  progressPercent: number;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function ScormBottomBar({
  sessionSeconds,
  progressPercent,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: BottomBarProps) {
  const m = Math.floor(sessionSeconds / 60);
  const s = sessionSeconds % 60;
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-background/95 border-t">
      <Button variant="outline" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Önceki
      </Button>
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </span>
        <Progress value={progressPercent} className="flex-1 h-2" />
        <span className="text-xs text-muted-foreground w-10 text-right">{progressPercent}%</span>
      </div>
      <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNext}>
        Sonraki <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
