/**
 * ScormPlayer — Production-grade SCORM 1.2 & 2004 player.
 * Uses proxy-served HTML approach: the edge function downloads the SCORM HTML,
 * injects <base> tag + SCORM API script, and serves it as text/html directly.
 * No srcdoc, no document.write, no Blob URLs.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  persistScormProgress,
  loadScormProgress,
  trackLessonLaunch,
  type ScormEventData,
} from "./ScormProgressService";
import { parseManifest, PRIORITY_ENTRY_FILES } from "./ScormManifestParser";
import { ScormTopBar, ScormBottomBar } from "./ScormControls";
import { ScormDebugPanel } from "./ScormDebugPanel";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const proxyUrl = `${supabaseUrl}/functions/v1/scorm-proxy`;

// ─── Utility functions ───────────────────────────────────────────────────────

function extractFolderPath(packageUrl: string): string | null {
  const marker = "scorm-packages/";
  const idx = packageUrl.indexOf(marker);
  if (idx === -1) return null;
  const raw = packageUrl.slice(idx + marker.length).split("?")[0].split("#")[0];
  return raw.replace(/^\/+|\/+$/g, "") || null;
}

function extractCourseId(folderPath: string): string {
  return folderPath.split("/")[0];
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function proxyPost(
  token: string,
  body: { action: string; folderPath: string; filePath?: string; courseId: string },
): Promise<any> {
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Entry file resolution ───────────────────────────────────────────────────

interface StorageItem {
  name: string;
  id: string | null;
}

async function listFiles(
  token: string,
  folderPath: string,
  subPath: string,
  courseId: string,
): Promise<StorageItem[]> {
  try {
    return (await proxyPost(token, {
      action: "list",
      folderPath,
      filePath: subPath || undefined,
      courseId,
    })) || [];
  } catch {
    return [];
  }
}

async function resolveEntryFile(
  token: string,
  folderPath: string,
  entryPoint: string,
  courseId: string,
): Promise<{ entryFile: string | null; detectedVersion?: string }> {
  const rootFiles = await listFiles(token, folderPath, "", courseId);
  const rootFileNames = new Set(rootFiles.map((f) => f.name));

  if (rootFileNames.has("imsmanifest.xml")) {
    try {
      const { signedUrl } = await proxyPost(token, {
        action: "sign",
        folderPath,
        filePath: "imsmanifest.xml",
        courseId,
      });
      const res = await fetch(signedUrl);
      if (res.ok) {
        const xml = await res.text();
        const manifest = parseManifest(xml);
        if (manifest && manifest.scos.length > 0) {
          return {
            entryFile: manifest.scos[0].launchPath,
            detectedVersion: manifest.version,
          };
        }
      }
    } catch { /* continue with heuristics */ }
  }

  for (const file of PRIORITY_ENTRY_FILES) {
    if (rootFileNames.has(file)) return { entryFile: file };
  }

  if (rootFileNames.has("scormcontent")) {
    const subFiles = await listFiles(token, folderPath, "scormcontent", courseId);
    if (subFiles.some((f) => f.name === "index.html"))
      return { entryFile: "scormcontent/index.html" };
  }

  const sanitizedEntry = entryPoint.replace(/&/g, "_").replace(/ /g, "_");
  const entryParts = sanitizedEntry.split("/");
  if (entryParts.length > 1) {
    for (let depth = entryParts.length - 1; depth >= 1; depth--) {
      const subPath = entryParts.slice(0, depth).join("/");
      const subFiles = await listFiles(token, folderPath, subPath, courseId);
      const subFileNames = new Set(subFiles.map((f) => f.name));
      for (const file of PRIORITY_ENTRY_FILES) {
        if (subFileNames.has(file)) return { entryFile: `${subPath}/${file}` };
      }
    }
  }

  const subfolders = rootFiles.filter((f) => f.id === null);
  for (const folder of subfolders) {
    const subFiles = await listFiles(token, folderPath, folder.name, courseId);
    const subFileNames = new Set(subFiles.map((f) => f.name));
    for (const file of PRIORITY_ENTRY_FILES) {
      if (subFileNames.has(file)) return { entryFile: `${folder.name}/${file}` };
    }
  }

  return { entryFile: null };
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const sessionStartRef = useRef<number>(Date.now());
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [lessonStatus, setLessonStatus] = useState<string>("not attempted");
  const [scoreRaw, setScoreRaw] = useState<string>("");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [effectiveVersion, setEffectiveVersion] = useState<string | undefined>(scormVersion);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const lastCmiDataRef = useRef<ScormEventData | null>(null);

  // ─── Session timer ───────────────────────────────────────────────────────

  useEffect(() => {
    sessionStartRef.current = Date.now();
    const interval = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lessonId]);

  // ─── Auto-hide controls ──────────────────────────────────────────────────

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);
  // ─── Debug toggle (Ctrl+Shift+D) ─────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setShowDebug((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // ─── Persist progress ────────────────────────────────────────────────────

  const handlePersist = useCallback(
    async (data: ScormEventData, method: string) => {
      try {
        setLessonStatus(data.lesson_status || "not attempted");
        if (data.score_raw) setScoreRaw(data.score_raw);

        const { completed } = await persistScormProgress(data, method, {
          enrollmentId,
          lessonId,
          scormPackageId,
          userId,
          courseTitle,
          lessonTitle,
          sessionSeconds,
        });

        if (completed) onComplete?.();
      } catch (err) {
        console.error("SCORM save error:", err);
      }
    },
    [enrollmentId, lessonId, scormPackageId, onComplete, userId, sessionSeconds, courseTitle, lessonTitle],
  );

  // ─── Listen for postMessage events ───────────────────────────────────────

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "scorm_api_event") return;
      const { method, data } = event.data;

      if (["LMSCommit", "Commit"].includes(method)) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => handlePersist(data, method), 2000);
      } else if (["LMSFinish", "Terminate"].includes(method)) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        handlePersist(data, method);
      } else if (["LMSInitialize", "Initialize"].includes(method)) {
        setLessonStatus(data.lesson_status || "not attempted");
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [handlePersist]);

  // ─── Load SCORM content (proxy-served HTML approach) ──────────────────────

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIframeSrc(null);

    const token = await getAuthToken();
    if (!token) {
      setError("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      setIsLoading(false);
      return;
    }

    const folderPath = extractFolderPath(packageUrl);
    if (!folderPath) {
      setError("Paket yolu çözümlenemedi.");
      setIsLoading(false);
      return;
    }

    const courseId = extractCourseId(folderPath);

    // 1. Resolve entry file
    const { entryFile, detectedVersion } = await resolveEntryFile(token, folderPath, entryPoint, courseId);
    if (!entryFile) {
      setError("SCORM başlangıç dosyası bulunamadı.");
      setIsLoading(false);
      return;
    }

    const activeVersion = scormVersion || detectedVersion || "1.2";
    setEffectiveVersion(activeVersion);

    try {
      // 2. Get session token via sign action
      const { sessionToken } = await proxyPost(token, {
        action: "sign",
        folderPath,
        filePath: entryFile,
        courseId,
      });

      // 3. Load previous progress for resume
      const initialData = await loadScormProgress(enrollmentId, lessonId);
      if (initialData.lesson_status) setLessonStatus(initialData.lesson_status);
      if (initialData.score_raw) setScoreRaw(initialData.score_raw);

      // 4. Build serve URL — proxy will download HTML, inject base + SCORM API, serve as text/html
      const initDataB64 = btoa(JSON.stringify(initialData));
      const encodedToken = encodeURIComponent(sessionToken);
      const serveUrl = `${proxyUrl}/_serve_/${encodedToken}/${entryFile}?v=${encodeURIComponent(activeVersion)}&d=${encodeURIComponent(initDataB64)}`;

      // 5. Set iframe src — browser will render it as a real HTML page
      setIframeSrc(serveUrl);

      // Track launch
      await trackLessonLaunch(userId, lessonId, enrollmentId, courseTitle, lessonTitle);
    } catch (err: any) {
      console.error("SCORM load error:", err);
      if (err.message?.includes("Unauthorized"))
        setError("Oturumunuz sona ermiş. Lütfen sayfayı yenileyip tekrar giriş yapın.");
      else if (err.message?.includes("Not enrolled"))
        setError("Bu eğitim içeriğine erişim yetkiniz yok.");
      else setError("Eğitim içeriği yüklenirken bir hata oluştu.");
      setIsLoading(false);
    }
  }, [packageUrl, entryPoint, enrollmentId, lessonId, userId, courseTitle, lessonTitle, scormVersion]);

  // Handle iframe load event
  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // ─── Fullscreen ──────────────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!isFullscreen) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, [isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[hsl(var(--primary)/0.03)] rounded-xl p-8">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">İçerik Yüklenemedi</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">{error}</p>
        <Button onClick={loadContent} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full bg-[hsl(222,47%,6%)] rounded-xl overflow-hidden"
      onMouseMove={resetControlsTimer}
      onMouseEnter={() => setShowControls(true)}
    >
      <ScormTopBar
        scormVersion={effectiveVersion}
        lessonTitle={lessonTitle}
        lessonStatus={lessonStatus}
        scoreRaw={scoreRaw}
        sessionSeconds={sessionSeconds}
        visible={showControls}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[hsl(222,47%,6%)] z-30">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--accent)/0.15)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-[hsl(var(--accent)/0.1)] animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/90">Eğitim içeriği yükleniyor</p>
              <p className="text-xs text-white/50 mt-1">Lütfen bekleyin...</p>
            </div>
          </div>
        </div>
      )}

      {/* SCORM Content iframe — served directly by proxy as text/html */}
      {iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="flex-1 w-full border-0 bg-white"
          style={{ minHeight: "500px" }}
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="SCORM Eğitim İçeriği"
          onLoad={handleIframeLoad}
        />
      )}

      <ScormBottomBar
        lessonStatus={lessonStatus}
        visible={showControls}
        isFullscreen={isFullscreen}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPrevious={onPrevious}
        onNext={onNext}
        onReload={loadContent}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
