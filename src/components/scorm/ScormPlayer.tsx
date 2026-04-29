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

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, RefreshCw, Bug } from "lucide-react";

// ─── Debug mode ──────────────────────────────────────────────
// Activate via: ?scormDebug=1  OR  localStorage.setItem('scormDebug','1')
function isScormDebugEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (new URLSearchParams(window.location.search).get("scormDebug") === "1") return true;
    if (window.localStorage?.getItem("scormDebug") === "1") return true;
  } catch { /* noop */ }
  return false;
}

interface DebugCounters {
  renders: number;
  loadEffectRuns: number;
  iframeMounts: number;
  iframeOnLoads: number;
  spinnerShows: number;
  spinnerHides: number;
  apiEvents: number;
  persistCalls: number;
  lastEvent: string;
  lastEventAt: number;
}

function dbg(...args: unknown[]) {
  if (isScormDebugEnabled()) console.log("[scorm:debug]", ...args);
}
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

  // ─── Debug counters ────────────────────────────────────────
  const debugEnabled = useMemo(() => isScormDebugEnabled(), []);
  const debugRef = useRef<DebugCounters>({
    renders: 0,
    loadEffectRuns: 0,
    iframeMounts: 0,
    iframeOnLoads: 0,
    spinnerShows: 0,
    spinnerHides: 0,
    apiEvents: 0,
    persistCalls: 0,
    lastEvent: "-",
    lastEventAt: Date.now(),
  });
  const [debugTick, setDebugTick] = useState(0);
  const bumpDebug = useCallback((patch: Partial<DebugCounters>) => {
    if (!debugEnabled) return;
    Object.assign(debugRef.current, patch, { lastEventAt: Date.now() });
    setDebugTick((t) => (t + 1) % 1_000_000);
  }, [debugEnabled]);

  // Stable refs for props/handlers used inside loadContent — avoid re-running effect
  const propsRef = useRef({ packageUrl, entryPoint, enrollmentId, scormPackageId, userId, scormVersion, onComplete });
  propsRef.current = { packageUrl, entryPoint, enrollmentId, scormPackageId, userId, scormVersion, onComplete };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [status, setStatus] = useState("not attempted");
  const [scoreRaw, setScoreRaw] = useState("");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track every render
  debugRef.current.renders += 1;

  // Track spinner show/hide transitions
  const prevLoadingRef = useRef<boolean>(isLoading);
  useEffect(() => {
    if (!debugEnabled) return;
    if (prevLoadingRef.current !== isLoading) {
      if (isLoading) {
        debugRef.current.spinnerShows += 1;
        dbg("spinner SHOW", { total: debugRef.current.spinnerShows });
      } else {
        debugRef.current.spinnerHides += 1;
        dbg("spinner HIDE", { total: debugRef.current.spinnerHides });
      }
      prevLoadingRef.current = isLoading;
      setDebugTick((t) => (t + 1) % 1_000_000);
    }
  }, [isLoading, debugEnabled]);


  // ─── Session timer (display only — never feeds back into load chain) ──
  useEffect(() => {
    sessionStartRef.current = Date.now();
    sessionSecondsRef.current = 0;
    const i = setInterval(() => {
      const s = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      sessionSecondsRef.current = s;
      setSessionSeconds(s);
    }, 1000);
    return () => clearInterval(i);
  }, [lessonId]);

  // ─── Persist (stable, reads from refs) ───────────────────────
  const persist = useCallback(async (snapshot: ScormCmiSnapshot, method: string) => {
    try {
      setStatus(snapshot.lesson_status || "not attempted");
      if (snapshot.score_raw) setScoreRaw(snapshot.score_raw);
      if (snapshot.progress_measure) {
        const pm = parseFloat(snapshot.progress_measure);
        if (!isNaN(pm)) setProgressPercent(Math.round(pm * 100));
      }
      const p = propsRef.current;
      const { completed } = await persistScormProgress(snapshot, method, {
        enrollmentId: p.enrollmentId,
        lessonId,
        scormPackageId: p.scormPackageId,
        userId: p.userId,
        sessionSeconds: sessionSecondsRef.current,
      });
      if (completed) p.onComplete?.();
      bumpDebug({ persistCalls: debugRef.current.persistCalls + 1, lastEvent: `persist:${method}` });
      dbg("persist OK", { method, total: debugRef.current.persistCalls + 1 });
    } catch (e) {
      console.error("[scorm] persist error:", e);
    }
  }, [lessonId, bumpDebug]);

  // ─── API event handler (stable) ──────────────────────────────
  const handleApiEvent = useCallback((method: string, snapshot: ScormCmiSnapshot) => {
    lastSnapshotRef.current = snapshot;
    bumpDebug({ apiEvents: debugRef.current.apiEvents + 1, lastEvent: `api:${method}` });
    dbg("api event", method);
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
  }, [persist, bumpDebug]);

  const handleApiEventRef = useRef(handleApiEvent);
  handleApiEventRef.current = handleApiEvent;

  // ─── Auto-save every 30s ─────────────────────────────────────
  useEffect(() => {
    const i = setInterval(() => {
      if (lastSnapshotRef.current) persist(lastSnapshotRef.current, "AutoSave");
    }, 30000);
    return () => clearInterval(i);
  }, [persist]);

  // ─── Load content — STABLE, only re-runs when lesson identity changes ──
  useEffect(() => {
    let cancelled = false;
    let uninstall: (() => void) | undefined;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      setIframeSrc(null);

      const p = propsRef.current;
      if (!p.packageUrl) {
        setError("SCORM paketi URL'si eksik.");
        setIsLoading(false);
        return;
      }

      try {
        const prior = await loadScormProgress(p.enrollmentId, lessonId);
        if (cancelled) return;
        if (prior.lesson_status) setStatus(prior.lesson_status);
        if (prior.score_raw) setScoreRaw(prior.score_raw);

        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", p.userId)
          .maybeSingle();
        if (cancelled) return;

        const initialData: ScormInitialData = {
          lesson_status: prior.lesson_status,
          lesson_location: prior.lesson_location,
          suspend_data: prior.suspend_data,
          score_raw: prior.score_raw,
          total_time: prior.total_time,
          student_id: p.userId,
          student_name: profile ? `${profile.last_name}, ${profile.first_name}` : "",
        };

        const version = p.scormVersion && p.scormVersion.startsWith("2004") ? "2004" : "1.2";
        const apiHandler = (m: string, s: ScormCmiSnapshot) => handleApiEventRef.current(m, s);
        uninstall =
          version === "2004"
            ? installScorm2004(initialData, apiHandler)
            : installScorm12(initialData, apiHandler);

        const url = buildContentUrl(p.packageUrl, p.entryPoint || "index.html");
        setIframeSrc(url);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
        setError(`Eğitim içeriği yüklenemedi: ${msg}`);
        setIsLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (uninstall) uninstall();
      if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
    };
    // Only re-run when lesson identity changes — NOT when timers/handlers update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, packageUrl, entryPoint]);

  const handleRetry = useCallback(() => {
    // Force reload by toggling iframeSrc
    setIframeSrc(null);
    setError(null);
    setIsLoading(true);
    const p = propsRef.current;
    if (p.packageUrl) {
      const url = buildContentUrl(p.packageUrl, p.entryPoint || "index.html");
      setTimeout(() => setIframeSrc(url), 50);
    }
  }, []);

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
        <Button onClick={handleRetry} variant="outline">
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
            key={lessonId}
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
