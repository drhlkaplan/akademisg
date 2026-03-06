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

/**
 * Extract the folder path from a full Supabase storage URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/scorm-packages/course123/1234567890"
 * → "course123/1234567890"
 */
function extractFolderPath(packageUrl: string): string | null {
  const marker = "scorm-packages/";
  const idx = packageUrl.indexOf(marker);
  if (idx === -1) return null;
  const raw = packageUrl.slice(idx + marker.length).split("?")[0].split("#")[0];
  return raw.replace(/^\/+|\/+$/g, "") || null;
}

/**
 * Build the base storage URL for a given folder path (used for HEAD checks during resolution).
 */
function buildStorageBase(folderPath: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/scorm-packages/${folderPath}`;
}

/**
 * Convert a direct storage URL to a scorm-proxy URL for correct MIME types.
 */
function toProxyUrl(storageUrl: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const marker = "scorm-packages/";
  const idx = storageUrl.indexOf(marker);
  if (idx === -1) return storageUrl;
  const objectPath = storageUrl.slice(idx + marker.length);
  // Encode each path segment individually to preserve /
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/functions/v1/scorm-proxy/${encodedPath}`;
}

/**
 * Sanitize path segments (replace special chars that were sanitized during upload).
 */
function sanitizePath(path: string): string {
  return path.replace(/&/g, "_").replace(/ /g, "_");
}

/**
 * Try to find the launchable HTML file by:
 * 1. Parsing imsmanifest.xml for the real launch resource
 * 2. Trying common Articulate Storyline entry points
 * 3. Falling back to the stored entry_point
 */
async function resolveEntryPoint(baseUrl: string, entryPoint: string): Promise<string | null> {
  const sanitizedEntry = sanitizePath(entryPoint);
  
  // Step 1: Try to parse imsmanifest.xml
  const manifestUrl = `${baseUrl}/imsmanifest.xml`;
  try {
    const manifestRes = await fetch(manifestUrl);
    if (manifestRes.ok) {
      const xml = await manifestRes.text();
      const launchFile = parseLaunchFromManifest(xml);
      if (launchFile) {
        const sanitizedLaunch = sanitizePath(launchFile);
        // Test if the file exists
        const testUrl = `${baseUrl}/${sanitizedLaunch}`;
        const testRes = await fetch(testUrl, { method: "HEAD" });
        if (testRes.ok) return testUrl;
        
        // Try without subdir
        const fileName = sanitizedLaunch.split("/").pop() || "";
        if (fileName) {
          const altUrl = `${baseUrl}/${fileName}`;
          const altRes = await fetch(altUrl, { method: "HEAD" });
          if (altRes.ok) return altUrl;
        }
      }
    }
  } catch {
    // Manifest not found or parse error, continue
  }

  // Step 2: Try common Articulate Storyline / Captivate entry points
  // These are the actual launchable files (NOT AICCComm.html which is just the comm handler)
  const dir = sanitizedEntry.includes("/") ? sanitizedEntry.slice(0, sanitizedEntry.lastIndexOf("/")) : "";
  const parentDirPath = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "";
  
  const commonEntryFiles = [
    "index_lms_html5.html",
    "index_lms.html",
    "story_html5.html",
    "story.html",
    "index.html",
    "scormcontent/index.html",
    "SCORMContent/index.html",
  ];

  // Build candidate list: try parent dirs first, then root
  const candidateDirs = [parentDirPath, dir, ""].filter((d, i, arr) => arr.indexOf(d) === i);
  
  for (const candidateDir of candidateDirs) {
    for (const file of commonEntryFiles) {
      const fullPath = candidateDir ? `${candidateDir}/${file}` : file;
      const url = `${baseUrl}/${fullPath}`;
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) return url;
      } catch {
        continue;
      }
    }
  }

  // Step 3: Try the original entry point directly
  const directUrl = `${baseUrl}/${sanitizedEntry}`;
  try {
    const res = await fetch(directUrl, { method: "HEAD" });
    if (res.ok) return directUrl;
  } catch {
    // continue
  }

  // Step 4: Try the entry point unsanitized (as stored)
  const rawUrl = `${baseUrl}/${entryPoint}`;
  try {
    const res = await fetch(rawUrl, { method: "HEAD" });
    if (res.ok) return rawUrl;
  } catch {
    // continue
  }

  return null;
}

/**
 * Parse imsmanifest.xml to extract the launch file from the first resource.
 */
function parseLaunchFromManifest(xml: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    
    // Try standard SCORM manifest structure
    // <resource ... href="index_lms.html"> or <resource><file href="..."/>
    const resources = doc.querySelectorAll("resource");
    for (const resource of resources) {
      const href = resource.getAttribute("href");
      if (href && href.endsWith(".html")) {
        return href;
      }
    }

    // Try file elements
    const files = doc.querySelectorAll("resource file");
    for (const file of files) {
      const href = file.getAttribute("href");
      if (href && href.endsWith(".html") && !href.toLowerCase().includes("aicccomm")) {
        return href;
      }
    }
  } catch {
    // Parse error
  }
  return null;
}

export function ScormPlayer({
  packageUrl,
  entryPoint,
  enrollmentId,
  scormPackageId,
  lessonId,
  userId,
  onComplete,
}: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { createApiObject } = useScormApi({
    enrollmentId,
    scormPackageId,
    lessonId,
    userId,
    onComplete,
  });

  // Install SCORM API on window
  useEffect(() => {
    const api = createApiObject();
    (window as any).API = api.API;
    (window as any).API_1484_11 = api.API_1484_11;
    
    return () => {
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [createApiObject]);

  // Resolve the actual launchable URL
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      setIsLoading(true);
      setError(null);
      setDebugInfo("");

      const folderPath = extractFolderPath(packageUrl);
      if (!folderPath) {
        // Fallback: just append entry point to package URL
        setResolvedUrl(`${packageUrl}/${entryPoint}`);
        return;
      }

      const baseUrl = buildStorageBase(folderPath);
      setDebugInfo(`Base: ${baseUrl}\nEntry: ${entryPoint}`);

      const url = await resolveEntryPoint(baseUrl, entryPoint);

      if (cancelled) return;

      if (url) {
        const proxyUrl = toProxyUrl(url);
        setDebugInfo(prev => `${prev}\nResolved: ${url}\nProxy: ${proxyUrl}`);
        setResolvedUrl(proxyUrl);
      } else {
        setDebugInfo(prev => `${prev}\n❌ No launchable file found`);
        setError(
          "SCORM başlangıç dosyası bulunamadı. Paket dosya yapısı desteklenmiyor olabilir. " +
          "Lütfen paketi silip yeniden yükleyin."
        );
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [packageUrl, entryPoint]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    try {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (iframeWindow) {
        // Inject SCORM API into iframe
        (iframeWindow as any).API = (window as any).API;
        (iframeWindow as any).API_1484_11 = (window as any).API_1484_11;
      }
    } catch {
      // Cross-origin: content runs on storage domain, SCORM API lookup
      // will traverse parent frames automatically
    }
  }, []);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setError("Eğitim içeriği yüklenemedi. Lütfen tekrar deneyin.");
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setResolvedUrl("");
    // Re-trigger resolution by toggling a dummy state
    const folderPath = extractFolderPath(packageUrl);
    if (folderPath) {
      const baseUrl = buildStorageBase(folderPath);
      resolveEntryPoint(baseUrl, entryPoint).then(url => {
        if (url) {
          setResolvedUrl(toProxyUrl(url));
        } else {
          setError("SCORM başlangıç dosyası bulunamadı.");
        }
      });
    }
  }, [packageUrl, entryPoint]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
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
        <Button variant="outline" onClick={handleRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tekrar Dene
        </Button>
        {debugInfo && (
          <details className="mt-4 w-full max-w-lg">
            <summary className="text-xs text-muted-foreground cursor-pointer">Debug Bilgisi</summary>
            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto whitespace-pre-wrap break-all">
              {debugInfo}
            </pre>
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
          onError={handleIframeError}
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
          title="SCORM Eğitim İçeriği"
        />
      )}
    </div>
  );
}
