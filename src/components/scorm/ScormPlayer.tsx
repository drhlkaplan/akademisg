import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Maximize2, Minimize2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScormPlayerProps {
  packageUrl: string;
  entryPoint: string;
  enrollmentId: string;
  scormPackageId: string;
  lessonId: string;
  userId: string;
  onComplete?: () => void;
}

function extractFolderPath(packageUrl: string): string | null {
  const marker = "scorm-packages/";
  const idx = packageUrl.indexOf(marker);
  if (idx === -1) return null;
  const raw = packageUrl.slice(idx + marker.length).split("?")[0].split("#")[0];
  return raw.replace(/^\/+|\/+$/g, "") || null;
}

function buildListUrl(folderPath: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/scorm-proxy/${folderPath}?list=1`;
}

function buildProxyUrl(folderPath: string, filePath: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/scorm-proxy/${folderPath}/${filePath}`;
}

interface StorageItem {
  name: string;
  id: string | null;
  metadata: Record<string, unknown> | null;
}

const PRIORITY_FILES = [
  "index_lms_html5.html",
  "index.html",
  "index_lms.html",
  "story_html5.html",
  "story.html",
];

async function listFiles(folderPath: string): Promise<StorageItem[]> {
  try {
    const res = await fetch(buildListUrl(folderPath));
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function resolveEntryFile(folderPath: string, entryPoint: string): Promise<string | null> {
  const rootFiles = await listFiles(folderPath);
  const rootFileNames = new Set(rootFiles.map(f => f.name));

  for (const file of PRIORITY_FILES) {
    if (rootFileNames.has(file)) return file;
  }

  if (rootFileNames.has("scormcontent")) {
    const subFiles = await listFiles(`${folderPath}/scormcontent`);
    if (subFiles.some(f => f.name === "index.html")) return "scormcontent/index.html";
  }

  const sanitizedEntry = entryPoint.replace(/&/g, "_").replace(/ /g, "_");
  const entryParts = sanitizedEntry.split("/");
  if (entryParts.length > 1) {
    for (let depth = entryParts.length - 1; depth >= 1; depth--) {
      const subPath = entryParts.slice(0, depth).join("/");
      const subFiles = await listFiles(`${folderPath}/${subPath}`);
      const subFileNames = new Set(subFiles.map(f => f.name));
      for (const file of PRIORITY_FILES) {
        if (subFileNames.has(file)) return `${subPath}/${file}`;
      }
    }
  }

  const subfolders = rootFiles.filter(f => f.id === null);
  for (const folder of subfolders) {
    const subFiles = await listFiles(`${folderPath}/${folder.name}`);
    const subFileNames = new Set(subFiles.map(f => f.name));
    for (const file of PRIORITY_FILES) {
      if (subFileNames.has(file)) return `${folder.name}/${file}`;
    }
  }

  // Parse imsmanifest.xml as last resort
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (rootFileNames.has("imsmanifest.xml")) {
    const manifestUrl = `${supabaseUrl}/storage/v1/object/public/scorm-packages/${folderPath}/imsmanifest.xml`;
    try {
      const res = await fetch(manifestUrl);
      if (res.ok) {
        const xml = await res.text();
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        for (const resource of doc.querySelectorAll("resource")) {
          const href = resource.getAttribute("href");
          if (href?.endsWith(".html") && !href.toLowerCase().includes("aicccomm")) return href;
        }
      }
    } catch {}
  }

  return null;
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  return 0;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(4, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ScormPlayer({
  packageUrl, entryPoint, enrollmentId, scormPackageId, lessonId, userId, onComplete,
}: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const persistProgress = useCallback(async (data: Record<string, string>, method: string) => {
    try {
      const lessonStatus = data.lesson_status || "not attempted";
      const scoreRaw = data.score_raw ? parseFloat(data.score_raw) : null;
      const totalTimeSeconds = data.total_time ? parseTimeToSeconds(data.total_time) : null;

      await supabase.rpc("record_lesson_progress", {
        _enrollment_id: enrollmentId,
        _lesson_id: lessonId,
        _lesson_status: lessonStatus,
        _score_raw: scoreRaw,
        _lesson_location: data.lesson_location || null,
        _suspend_data: data.suspend_data || null,
        _total_time: totalTimeSeconds,
        _scorm_package_id: scormPackageId,
      });

      if (method === "LMSFinish" && (lessonStatus === "completed" || lessonStatus === "passed")) {
        onComplete?.();
      }
    } catch (err) {
      console.error("SCORM save error:", err);
    }
  }, [enrollmentId, lessonId, scormPackageId, onComplete]);

  // Listen for postMessage from SCORM content
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "scorm_api_event") return;
      const { method, data } = event.data;
      if (method === "LMSCommit") {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => persistProgress(data, method), 2000);
      } else if (method === "LMSFinish") {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        persistProgress(data, method);
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [persistProgress]);

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIframeSrc(null);

    const folderPath = extractFolderPath(packageUrl);
    if (!folderPath) {
      setError("Paket yolu çözümlenemedi.");
      setIsLoading(false);
      return;
    }

    const entryFile = await resolveEntryFile(folderPath, entryPoint);
    if (!entryFile) {
      setError("SCORM başlangıç dosyası bulunamadı. Lütfen paketi silip yeniden yükleyin.");
      setIsLoading(false);
      return;
    }

    // Fetch existing progress for SCORM API initialization
    const initialData: Record<string, string> = {};
    try {
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (progress) {
        if (progress.lesson_status) initialData.lesson_status = progress.lesson_status;
        if (progress.lesson_location) initialData.lesson_location = progress.lesson_location;
        if (progress.suspend_data && progress.suspend_data.length < 4000) initialData.suspend_data = progress.suspend_data;
        if (progress.score_raw != null) initialData.score_raw = String(progress.score_raw);
        if (progress.total_time != null) initialData.total_time = formatTime(progress.total_time);
      }
    } catch {}

    // Build scorm-proxy URL with SCORM API injection params
    const proxyUrl = buildProxyUrl(folderPath, entryFile);
    const params = new URLSearchParams();
    params.set("scorm", "1");
    params.set("origin", window.location.origin);
    for (const [key, val] of Object.entries(initialData)) {
      if (val) params.set(key, val);
    }

    const fullUrl = `${proxyUrl}?${params.toString()}`;
    console.log("SCORM Player: loading via proxy:", fullUrl);
    setIframeSrc(fullUrl);
  }, [packageUrl, entryPoint, enrollmentId, lessonId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleIframeLoad = useCallback(() => { setIsLoading(false); }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-card rounded-lg border border-border p-8">
        <AlertTriangle className="h-12 w-12 text-warning mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">İçerik Yüklenemedi</h3>
        <p className="text-muted-foreground text-center mb-4">{error}</p>
        <Button variant="outline" onClick={loadContent}><RefreshCw className="h-4 w-4 mr-2" />Tekrar Dene</Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col h-full bg-foreground/5 rounded-lg overflow-hidden border border-border shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-foreground">SCORM Eğitim</span>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">1.2</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={loadContent} className="h-8 w-8" title="Yeniden yükle">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8" title={isFullscreen ? "Küçült" : "Tam ekran"}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10 mt-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Eğitim içeriği yükleniyor...</p>
          </div>
        </div>
      )}
      {iframeSrc && (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="flex-1 w-full border-0"
          style={{ minHeight: "500px" }}
          onLoad={handleIframeLoad}
          onError={() => { setIsLoading(false); setError("Eğitim içeriği yüklenemedi."); }}
          allow="fullscreen"
          title="SCORM Eğitim İçeriği"
        />
      )}
    </div>
  );
}
