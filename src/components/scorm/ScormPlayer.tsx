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

/** Extract storage object path from package_url */
function extractFolderPath(packageUrl: string): string | null {
  const marker = "scorm-packages/";
  const idx = packageUrl.indexOf(marker);
  if (idx === -1) return null;
  const raw = packageUrl.slice(idx + marker.length).split("?")[0].split("#")[0];
  return raw.replace(/^\/+|\/+$/g, "") || null;
}

/** Build proxy URL with padding segments */
function buildProxyBase(folderPath: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const padding = "___/___/___/___/___/___/___/___/___/___";
  return `${supabaseUrl}/functions/v1/scorm-proxy/${padding}/${folderPath}`;
}

function sanitizePath(path: string): string {
  return path.replace(/&/g, "_").replace(/ /g, "_");
}

/** Check if a file exists at the proxy URL using HEAD-like GET */
async function checkFileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET" });
    res.body?.cancel();
    return res.ok;
  } catch {
    return false;
  }
}

/** Extract subfolder prefixes from entry point path */
function getSubfolderPrefixes(entryPoint: string): string[] {
  const parts = entryPoint.split("/");
  if (parts.length <= 1) return [];
  const prefixes: string[] = [];
  for (let i = parts.length - 1; i >= 1; i--) {
    prefixes.push(parts.slice(0, i).join("/"));
  }
  return prefixes;
}

/** Resolve the actual launchable HTML file within a SCORM package */
async function resolveEntryPoint(baseUrl: string, entryPoint: string): Promise<string | null> {
  const sanitizedEntry = sanitizePath(entryPoint);
  const subfolders = getSubfolderPrefixes(sanitizedEntry);
  const searchBases = [baseUrl, ...subfolders.map(sf => `${baseUrl}/${sf}`)];

  // Priority: direct content files first
  const priorityFiles = [
    "story_html5.html",
    "index_lms_html5.html",
    "index.html",
    "scormcontent/index.html",
    "story.html",
    "index_lms.html",
  ];

  for (const file of priorityFiles) {
    for (const base of searchBases) {
      const url = `${base}/${file}`;
      if (await checkFileExists(url)) return url;
    }
  }

  // Try imsmanifest.xml
  for (const base of searchBases) {
    try {
      const manifestRes = await fetch(`${base}/imsmanifest.xml`);
      if (manifestRes.ok) {
        const xml = await manifestRes.text();
        const launchFile = parseLaunchFromManifest(xml);
        if (launchFile) {
          const launchUrl = `${base}/${sanitizePath(launchFile)}`;
          if (await checkFileExists(launchUrl)) return launchUrl;
        }
      }
    } catch {}
  }

  // Last resort
  const entryFileName = sanitizedEntry.split("/").pop()?.toLowerCase() || "";
  if (!entryFileName.includes("aicccomm")) {
    const fallbackUrl = `${baseUrl}/${sanitizedEntry}`;
    if (await checkFileExists(fallbackUrl)) return fallbackUrl;
  }

  return null;
}

function parseLaunchFromManifest(xml: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    for (const resource of doc.querySelectorAll("resource")) {
      const href = resource.getAttribute("href");
      if (href?.endsWith(".html") && !href.toLowerCase().includes("aicccomm")) return href;
    }
    for (const file of doc.querySelectorAll("resource file")) {
      const href = file.getAttribute("href");
      if (href?.endsWith(".html") && !href.toLowerCase().includes("aicccomm")) return href;
    }
  } catch {}
  return null;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(4, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
}

export const ScormPlayer = ({
  packageUrl, entryPoint, enrollmentId, scormPackageId, lessonId, userId, onComplete,
}: ScormPlayerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Persist SCORM data to database
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

  // Listen for postMessage from SCORM content iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "scorm_api_event") return;

      const { method, data } = event.data;

      if (method === "LMSCommit") {
        // Debounce commits
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
    setDebugInfo("");
    setIframeSrc("");

    const folderPath = extractFolderPath(packageUrl);
    if (!folderPath) {
      setError("Paket yolu çözümlenemedi.");
      setIsLoading(false);
      return;
    }

    const proxyBase = buildProxyBase(folderPath);
    setDebugInfo(`Proxy Base: ${proxyBase}\nEntry: ${entryPoint}`);

    const resolvedUrl = await resolveEntryPoint(proxyBase, entryPoint);
    if (!resolvedUrl) {
      setDebugInfo(prev => `${prev}\n❌ No launchable file found`);
      setError("SCORM başlangıç dosyası bulunamadı. Lütfen paketi silip yeniden yükleyin.");
      setIsLoading(false);
      return;
    }

    setDebugInfo(prev => `${prev}\nResolved: ${resolvedUrl}`);

    // Fetch existing progress to pre-populate SCORM API
    let progressParams = "";
    try {
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (progress) {
        const params = new URLSearchParams();
        if (progress.lesson_status) params.set("lesson_status", progress.lesson_status);
        if (progress.lesson_location) params.set("lesson_location", progress.lesson_location);
        if (progress.suspend_data && progress.suspend_data.length < 2000) {
          params.set("suspend_data", progress.suspend_data);
        }
        if (progress.score_raw != null) params.set("score_raw", String(progress.score_raw));
        if (progress.score_min != null) params.set("score_min", String(progress.score_min));
        if (progress.score_max != null) params.set("score_max", String(progress.score_max));
        if (progress.total_time != null) params.set("total_time", formatTime(progress.total_time));
        progressParams = params.toString();
      }
    } catch {}

    // Build the final URL with SCORM injection params
    const separator = resolvedUrl.includes("?") ? "&" : "?";
    const origin = encodeURIComponent(window.location.origin);
    let finalUrl = `${resolvedUrl}${separator}scorm=1&origin=${origin}`;
    if (progressParams) finalUrl += `&${progressParams}`;

    setIframeSrc(finalUrl);
    setDebugInfo(prev => `${prev}\n✅ Loading via iframe.src + proxy-injected API`);
  }, [packageUrl, entryPoint, enrollmentId, lessonId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

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
        {debugInfo && (
          <details className="mt-4 w-full max-w-lg">
            <summary className="text-xs text-muted-foreground cursor-pointer">Debug Bilgisi</summary>
            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto whitespace-pre-wrap break-all">{debugInfo}</pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col h-full bg-foreground/5 rounded-lg overflow-hidden border border-border shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-foreground">SCORM İçerik Oynatıcı</span>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">SCORM 1.2</span>
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
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
          title="SCORM Eğitim İçeriği"
        />
      )}
    </div>
  );
};
