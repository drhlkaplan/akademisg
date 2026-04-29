/**
 * ScormPlayer — V2. Direct-CDN approach.
 *
 * Architecture:
 *   1. SCORM files live in `scorm-public` bucket (Supabase Storage public CDN).
 *   2. iframe.src = direct public URL. Browser receives correct MIME from CDN.
 *   3. Parent window installs `window.API` (1.2) and `window.API_1484_11` (2004).
 *   4. SCORM content walks `window.parent` and finds the API (standard SCORM behavior).
 *   5. CMI data persisted to Supabase via RPC on Commit/Terminate.
 *
 * No proxy, no wrapper iframe, no MIME issues.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  installScorm12,
  installScorm2004,
  type ScormCmiSnapshot,
  type ScormInitialData,
} from "./scormApiShim";
import {
  persistScormProgress,
  loadScormProgress,
} from "./ScormProgressServiceV2";
import { ScormTopBar, ScormBottomBar } from "./ScormControlsV2";

interface ScormPlayerProps {
  packageUrl: string;
  entryPoint: string;
  enrollmentId: string;
  scormPackageId: string;
  lessonId: string;
  userId: string;
  scormVersion?: string;
  onComplete?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  lessonTitle?: string;
  courseTitle?: string;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

function buildContentUrl(packageUrl: string, entryPoint: string): string {
  const base = packageUrl.replace(/\/+$/, "");
  const entry = entryPoint.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `${base}/${entry}`;
}

export function ScormPlayer({
  packageUrl,
  entryPoint,
  enrollmentId,
  scormPackageId,
  lessonId,
  userId,
  scormVersion,
  onComplete,
  onPrevious,
  onNext,
  lessonTitle,
  courseTitle,
  hasPrevious = false,
  hasNext = false,
}: ScormPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const lastSnapshotRef = useRef<ScormCmiSnapshot | null>(null);
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const sessionSecondsRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [status, setStatus] = useState("not attempted");
  const [scoreRaw, setScoreRaw] = useState("");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── Session timer ───────────────────────────────────────────
  useEffect(() => {
    sessionStartRef.current = Date.now();
    const i = setInterval(() => {
      const s = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      sessionSecondsRef.current = s;
      setSessionSeconds(s);
    }, 1000);
    return () => clearInterval(i);
  }, [lessonId]);

  // ─── Persist callback ────────────────────────────────────────
  const persist = useCallback(
    async (snapshot: ScormCmiSnapshot, method: string) => {
      try {
        setStatus(snapshot.lesson_status || "not attempted");
        if (snapshot.score_raw) setScoreRaw(snapshot.score_raw);
        if (snapshot.progress_measure) {
          const pm = parseFloat(snapshot.progress_measure);
          if (!isNaN(pm)) setProgressPercent(Math.round(pm * 100));
        }
        const { completed } = await persistScormProgress(snapshot, method, {
          enrollmentId,
          lessonId,
          scormPackageId,
          userId,
          sessionSeconds: sessionSecondsRef.current,
        });
        if (completed) onComplete?.();
      } catch (e) {
        console.error("[scorm] persist error:", e);
      }
    },
    [enrollmentId, lessonId, scormPackageId, userId, onComplete],
  );

  // ─── API event handler (called by shim) ──────────────────────
  const handleApiEvent = useCallback(
    (method: string, snapshot: ScormCmiSnapshot) => {
      lastSnapshotRef.current = snapshot;
      setStatus(snapshot.lesson_status || "not attempted");
      if (snapshot.score_raw) setScoreRaw(snapshot.score_raw);
      if (snapshot.progress_measure) {
        const pm = parseFloat(snapshot.progress_measure);
        if (!isNaN(pm)) setProgressPercent(Math.round(pm * 100));
      }

      if (["LMSCommit", "Commit"].includes(method)) {
        if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
        commitTimeoutRef.current = setTimeout(() => persist(snapshot, method), 1500);
      } else if (["LMSFinish", "Terminate"].includes(method)) {
        if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
        persist(snapshot, method);
      }
    },
    [persist],
  );

  // ─── Auto-save every 30s ─────────────────────────────────────
  useEffect(() => {
    const i = setInterval(() => {
      if (lastSnapshotRef.current) persist(lastSnapshotRef.current, "AutoSave");
    }, 30000);
    return () => clearInterval(i);
  }, [persist]);

  // ─── Install SCORM API on mount, load content ────────────────
  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIframeSrc(null);

    if (!packageUrl) {
      setError("SCORM paketi URL'si eksik.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Load previous progress
      const prior = await loadScormProgress(enrollmentId, lessonId);
      if (prior.lesson_status) setStatus(prior.lesson_status);
      if (prior.score_raw) setScoreRaw(prior.score_raw);

      // 2. Get learner info
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", userId)
        .maybeSingle();

      const initialData: ScormInitialData = {
        lesson_status: prior.lesson_status,
        lesson_location: prior.lesson_location,
        suspend_data: prior.suspend_data,
        score_raw: prior.score_raw,
        total_time: prior.total_time,
        student_id: userId,
        student_name: profile ? `${profile.last_name}, ${profile.first_name}` : "",
      };

      // 3. Install SCORM API on parent window (BEFORE iframe loads)
      const version = scormVersion && scormVersion.startsWith("2004") ? "2004" : "1.2";
      const uninstall =
        version === "2004"
          ? installScorm2004(initialData, handleApiEvent)
          : installScorm12(initialData, handleApiEvent);

      // 4. Build direct CDN URL and set iframe src
      const url = buildContentUrl(packageUrl, entryPoint || "index.html");
      setIframeSrc(url);

      return uninstall;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
      setError(`Eğitim içeriği yüklenemedi: ${msg}`);
      setIsLoading(false);
    }
  }, [packageUrl, entryPoint, enrollmentId, lessonId, userId, scormVersion, handleApiEvent]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    loadContent().then((u) => {
      if (typeof u === "function") cleanup = u;
    });
    return () => {
      if (cleanup) cleanup();
      if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
    };
  }, [loadContent]);

  // ─── Final flush on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (lastSnapshotRef.current) {
        persist(lastSnapshotRef.current, "Unload");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Fullscreen ──────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ─── Render ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-foreground font-medium text-center">{error}</p>
        <Button onClick={() => loadContent()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-background">
      <ScormTopBar
        lessonTitle={lessonTitle}
        courseTitle={courseTitle}
        status={status}
        scoreRaw={scoreRaw}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
      <div className="relative flex-1 min-h-0 bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {iframeSrc && (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-0"
            title={lessonTitle || "SCORM"}
            allow="autoplay; fullscreen; microphone; camera"
            onLoad={() => setIsLoading(false)}
          />
        )}
      </div>
      <ScormBottomBar
        sessionSeconds={sessionSeconds}
        progressPercent={progressPercent}
        onPrevious={onPrevious}
        onNext={onNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
      />
    </div>
  );
}
