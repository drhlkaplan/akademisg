/**
 * ScormControls — Netflix-style overlay controls for the SCORM player.
 * Includes top bar (status, score, timer) and bottom bar (nav, fullscreen).
 */

import {
  Maximize2,
  Minimize2,
  RefreshCw,
  SkipBack,
  SkipForward,
  Clock,
  Award,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDisplayTime } from "./ScormProgressService";

interface StatusConfig {
  label: string;
  color: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  "not attempted": { label: "Başlanmadı", color: "bg-muted text-muted-foreground" },
  incomplete: { label: "Devam Ediyor", color: "bg-warning/20 text-warning" },
  completed: { label: "Tamamlandı", color: "bg-success/20 text-success" },
  passed: { label: "Başarılı", color: "bg-success/20 text-success" },
  failed: { label: "Başarısız", color: "bg-destructive/20 text-destructive" },
  browsed: { label: "İncelendi", color: "bg-info/20 text-info" },
};

interface ScormTopBarProps {
  scormVersion?: string;
  lessonTitle?: string;
  lessonStatus: string;
  scoreRaw: string;
  sessionSeconds: number;
  visible: boolean;
}

export function ScormTopBar({
  scormVersion,
  lessonTitle,
  lessonStatus,
  scoreRaw,
  sessionSeconds,
  visible,
}: ScormTopBarProps) {
  const currentStatus = STATUS_MAP[lessonStatus] || STATUS_MAP["not attempted"];

  return (
    <div
      className={cn(
        "absolute top-0 left-0 right-0 z-20 transition-all duration-500",
        "bg-gradient-to-b from-[hsl(222,47%,6%/0.95)] via-[hsl(222,47%,6%/0.6)] to-transparent",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none",
      )}
    >
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
            <span className="text-xs font-medium text-white/90 tracking-wide uppercase">
              {scormVersion?.startsWith("2004") ? "SCORM 2004" : "SCORM 1.2"}
            </span>
          </div>
          {lessonTitle && (
            <>
              <div className="w-px h-4 bg-white/20" />
              <span className="text-sm font-medium text-white/80 truncate">
                {lessonTitle}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              currentStatus.color,
            )}
          >
            {currentStatus.label}
          </div>
          {scoreRaw && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]">
              <Award className="h-3 w-3" />
              <span className="text-xs font-semibold">{scoreRaw}%</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white/70">
            <Clock className="h-3 w-3" />
            <span className="text-xs font-medium">
              {formatDisplayTime(sessionSeconds)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScormBottomBarProps {
  lessonStatus: string;
  progressPercent?: number;
  visible: boolean;
  isFullscreen: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onReload: () => void;
  onToggleFullscreen: () => void;
  onToggleDebug?: () => void;
}

export function ScormBottomBar({
  lessonStatus,
  progressPercent,
  visible,
  isFullscreen,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onReload,
  onToggleFullscreen,
  onToggleDebug,
}: ScormBottomBarProps) {
  const computedProgress = progressPercent != null && progressPercent > 0
    ? progressPercent
    : lessonStatus === "completed" || lessonStatus === "passed"
      ? 100
      : lessonStatus === "incomplete"
        ? 50
        : 0;
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-20 transition-all duration-500",
        "bg-gradient-to-t from-[hsl(222,47%,6%/0.95)] via-[hsl(222,47%,6%/0.6)] to-transparent",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2 pointer-events-none",
      )}
    >
      {/* Progress bar */}
      <div className="px-5 pt-6">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden group cursor-pointer">
          <div
            className="h-full bg-[hsl(var(--accent))] rounded-full transition-all duration-300 group-hover:h-1.5 relative"
            style={{
              width: `${lessonStatus === "completed" || lessonStatus === "passed" ? 100 : lessonStatus === "incomplete" ? 50 : 0}%`,
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
            title="Önceki ders"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onReload}
            className="h-10 w-10 text-white hover:text-white hover:bg-white/10"
            title="Yeniden yükle"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={!hasNext}
            className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
            title="Sonraki ders"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10"
            title={isFullscreen ? "Küçült" : "Tam ekran"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
