import { useEffect, useRef, useState, useCallback } from "react";
import { useScormApi } from "@/hooks/useScormApi";
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

function buildStorageBase(folderPath: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/scorm-packages/${folderPath}`;
}

function sanitizePath(path: string): string {
  return path.replace(/&/g, "_").replace(/ /g, "_");
}

const ROUTER_FILENAMES = new Set([
  "index_lms.html", "index.html", "launch.html", "story.html",
]);

// Use GET to check file existence (HEAD blocked by CORS on some storage configs)
async function checkFileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET" });
    res.body?.cancel();
    return res.ok;
  } catch {
    return false;
  }
}

async function resolveEntryPoint(baseUrl: string, entryPoint: string): Promise<string | null> {
  const sanitizedEntry = sanitizePath(entryPoint);
  // Priority: direct HTML5 content files (skip routers)
  const directContentFiles = [
    "story_html5.html", "index_lms_html5.html",
    "scormcontent/index.html", "SCORMContent/index.html",
  ];
  for (const file of directContentFiles) {
    const url = `${baseUrl}/${file}`;
    if (await checkFileExists(url)) return url;
  }
  // If entry point is not a router, try it directly
  const entryFileName = sanitizedEntry.split("/").pop()?.toLowerCase() || "";
  if (!ROUTER_FILENAMES.has(entryFileName)) {
    const url = `${baseUrl}/${sanitizedEntry}`;
    if (await checkFileExists(url)) return url;
  }
  // Parse manifest for launch file
  try {
    const manifestRes = await fetch(`${baseUrl}/imsmanifest.xml`);
    if (manifestRes.ok) {
      const xml = await manifestRes.text();
      const launchFile = parseLaunchFromManifest(xml);
      if (launchFile) {
        const sanitizedLaunch = sanitizePath(launchFile);
        const launchFileName = sanitizedLaunch.split("/").pop()?.toLowerCase() || "";
        if (ROUTER_FILENAMES.has(launchFileName)) {
          const html5Url = `${baseUrl}/${sanitizedLaunch.replace(/\.html$/i, "_html5.html")}`;
          if (await checkFileExists(html5Url)) return html5Url;
        }
        const launchUrl = `${baseUrl}/${sanitizedLaunch}`;
        if (await checkFileExists(launchUrl)) return launchUrl;
      }
    }
  } catch {}
  // Fallback: common files
  for (const file of ["story.html", "index_lms.html", "index.html"]) {
    const url = `${baseUrl}/${file}`;
    if (await checkFileExists(url)) return url;
  }
  const fallbackUrl = `${baseUrl}/${entryPoint}`;
  if (await checkFileExists(fallbackUrl)) return fallbackUrl;
  return null;
}

function parseLaunchFromManifest(xml: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    for (const resource of doc.querySelectorAll("resource")) {
      const href = resource.getAttribute("href");
      if (href?.endsWith(".html")) return href;
    }
    for (const file of doc.querySelectorAll("resource file")) {
      const href = file.getAttribute("href");
      if (href?.endsWith(".html") && !href.toLowerCase().includes("aicccomm")) return href;
    }
  } catch {}
  return null;
}

export const ScormPlayer = ({
  packageUrl, entryPoint, enrollmentId, scormPackageId, lessonId, userId, onComplete,
}: ScormPlayerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { createApiObject } = useScormApi({ enrollmentId, scormPackageId, lessonId, userId, onComplete });

  // Set SCORM API on window
  useEffect(() => {
    const api = createApiObject();
    (window as any).API = api.API;
    (window as any).API_1484_11 = api.API_1484_11;
    return () => { delete (window as any).API; delete (window as any).API_1484_11; };
  }, [createApiObject]);

  // Resolve entry point - use direct storage URL
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      setIsLoading(true); setError(null); setDebugInfo("");
      const folderPath = extractFolderPath(packageUrl);
      if (!folderPath) {
        setError("Paket yolu çözümlenemedi.");
        setIsLoading(false);
        return;
      }
      const baseUrl = buildStorageBase(folderPath);
      setDebugInfo(`Base: ${baseUrl}\nEntry: ${entryPoint}`);
      const url = await resolveEntryPoint(baseUrl, entryPoint);
      if (cancelled) return;
      if (url) {
        setDebugInfo(prev => `${prev}\nResolved: ${url}`);
        // Use direct storage URL - files were uploaded with correct MIME types
        setResolvedUrl(url);
      } else {
        setDebugInfo(prev => `${prev}\n❌ No launchable file found`);
        setError("SCORM başlangıç dosyası bulunamadı. Lütfen paketi silip yeniden yükleyin.");
        setIsLoading(false);
      }
    };
    resolve();
    return () => { cancelled = true; };
  }, [packageUrl, entryPoint]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    try {
      const w = iframeRef.current?.contentWindow;
      if (w) {
        (w as any).API = (window as any).API;
        (w as any).API_1484_11 = (window as any).API_1484_11;
      }
    } catch {}
  }, []);

  const handleRetry = useCallback(() => {
    setError(null); setResolvedUrl("");
    setIsLoading(true);
    const folderPath = extractFolderPath(packageUrl);
    if (folderPath) {
      const baseUrl = buildStorageBase(folderPath);
      resolveEntryPoint(baseUrl, entryPoint).then(url => {
        if (url) setResolvedUrl(url);
        else { setError("SCORM başlangıç dosyası bulunamadı."); setIsLoading(false); }
      });
    }
  }, [packageUrl, entryPoint]);

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
        <Button variant="outline" onClick={handleRetry}><RefreshCw className="h-4 w-4 mr-2" />Tekrar Dene</Button>
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
    <div ref={containerRef} className="relative flex flex-col h-full bg-foreground/5 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <span className="text-sm text-muted-foreground">SCORM İçerik Oynatıcı</span>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10 mt-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Eğitim içeriği yükleniyor...</p>
          </div>
        </div>
      )}
      {resolvedUrl && (
        <iframe
          ref={iframeRef}
          src={resolvedUrl}
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
