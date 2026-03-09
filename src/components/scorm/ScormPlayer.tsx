import { useEffect, useRef, useState, useCallback } from "react";
import { useScormApi } from "@/hooks/useScormApi";
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

/**
 * Extract the storage object path from a package_url.
 * package_url is typically: https://xxx.supabase.co/storage/v1/object/public/scorm-packages/COURSE_ID/TIMESTAMP
 * We need: COURSE_ID/TIMESTAMP
 */
function extractFolderPath(packageUrl: string): string | null {
  const marker = "scorm-packages/";
  const idx = packageUrl.indexOf(marker);
  if (idx === -1) return null;
  const raw = packageUrl.slice(idx + marker.length).split("?")[0].split("#")[0];
  return raw.replace(/^\/+|\/+$/g, "") || null;
}

/**
 * Build the proxy base URL for a given folder path.
 * All SCORM files are served through the scorm-proxy edge function
 * to handle private bucket access and correct MIME types.
 */
function buildProxyBase(folderPath: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/scorm-proxy/${folderPath}`;
}

function sanitizePath(path: string): string {
  return path.replace(/&/g, "_").replace(/ /g, "_");
}

const ROUTER_FILENAMES = new Set([
  "index_lms.html", "index.html", "launch.html", "story.html",
]);

/**
 * Check if a file exists at the proxy URL.
 * Uses the user's auth token for authenticated requests.
 */
async function checkFileExists(url: string, authToken?: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    const res = await fetch(url, { method: "GET", headers });
    res.body?.cancel();
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Extract possible subfolder prefixes from an entry point path.
 * e.g. "Genel_Konular/lms/AICCComm.html" → ["Genel_Konular/lms", "Genel_Konular"]
 */
function getSubfolderPrefixes(entryPoint: string): string[] {
  const parts = entryPoint.split("/");
  if (parts.length <= 1) return [];
  const prefixes: string[] = [];
  for (let i = parts.length - 1; i >= 1; i--) {
    prefixes.push(parts.slice(0, i).join("/"));
  }
  return prefixes;
}

async function resolveEntryPoint(baseUrl: string, entryPoint: string, authToken?: string): Promise<string | null> {
  const sanitizedEntry = sanitizePath(entryPoint);
  
  // Build list of base directories to search: root + any subfolder from entry point
  const subfolders = getSubfolderPrefixes(sanitizedEntry);
  const searchBases = [baseUrl, ...subfolders.map(sf => `${baseUrl}/${sf}`)];
  
  // Direct content files that are actual SCORM content (not router/redirect pages)
  const directContentFiles = [
    "story_html5.html", "index_lms_html5.html",
    "scormcontent/index.html", "SCORMContent/index.html",
  ];
  
  for (const base of searchBases) {
    for (const file of directContentFiles) {
      const url = `${base}/${file}`;
      if (await checkFileExists(url, authToken)) return url;
    }
  }

  // If the entry point is not a known router file, try it directly
  const entryFileName = sanitizedEntry.split("/").pop()?.toLowerCase() || "";
  if (!ROUTER_FILENAMES.has(entryFileName)) {
    const url = `${baseUrl}/${sanitizedEntry}`;
    if (await checkFileExists(url, authToken)) return url;
  }

  // Try parsing imsmanifest.xml for launch file - search in all bases
  for (const base of searchBases) {
    try {
      const manifestUrl = `${base}/imsmanifest.xml`;
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      const manifestRes = await fetch(manifestUrl, { headers });
      if (manifestRes.ok) {
        const xml = await manifestRes.text();
        const launchFile = parseLaunchFromManifest(xml);
        if (launchFile) {
          const sanitizedLaunch = sanitizePath(launchFile);
          const launchFileName = sanitizedLaunch.split("/").pop()?.toLowerCase() || "";
          if (ROUTER_FILENAMES.has(launchFileName)) {
            const html5Url = `${base}/${sanitizedLaunch.replace(/\.html$/i, "_html5.html")}`;
            if (await checkFileExists(html5Url, authToken)) return html5Url;
          }
          const launchUrl = `${base}/${sanitizedLaunch}`;
          if (await checkFileExists(launchUrl, authToken)) return launchUrl;
        }
      }
    } catch {}
  }

  // Fallback: try common entry points in all bases
  for (const base of searchBases) {
    for (const file of ["story.html", "index_lms.html", "index.html"]) {
      const url = `${base}/${file}`;
      if (await checkFileExists(url, authToken)) return url;
    }
  }

  // Last resort: use the entry point as-is
  const fallbackUrl = `${baseUrl}/${entryPoint}`;
  if (await checkFileExists(fallbackUrl, authToken)) return fallbackUrl;

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
  const [srcdocContent, setSrcdocContent] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { createApiObject } = useScormApi({ enrollmentId, scormPackageId, lessonId, userId, onComplete });

  // Set SCORM API on window for iframe access
  useEffect(() => {
    const api = createApiObject();
    (window as any).API = api.API;
    (window as any).API_1484_11 = api.API_1484_11;
    return () => { delete (window as any).API; delete (window as any).API_1484_11; };
  }, [createApiObject]);

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo("");
    setSrcdocContent("");

    const folderPath = extractFolderPath(packageUrl);
    if (!folderPath) {
      setError("Paket yolu çözümlenemedi.");
      setIsLoading(false);
      return;
    }

    // Build proxy-based URL (not public storage URL)
    const proxyBase = buildProxyBase(folderPath);
    setDebugInfo(`Proxy Base: ${proxyBase}\nEntry: ${entryPoint}`);

    // Get auth token for authenticated proxy requests
    let authToken: string | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    } catch {}

    const resolvedUrl = await resolveEntryPoint(proxyBase, entryPoint, authToken);
    if (!resolvedUrl) {
      setDebugInfo(prev => `${prev}\n❌ No launchable file found`);
      setError("SCORM başlangıç dosyası bulunamadı. Lütfen paketi silip yeniden yükleyin.");
      setIsLoading(false);
      return;
    }

    setDebugInfo(prev => `${prev}\nResolved: ${resolvedUrl}`);

    try {
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      
      const response = await fetch(resolvedUrl, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const htmlText = await response.text();

      // Determine base directory for relative URL resolution
      // This points to the proxy so all sub-resources (JS, CSS, images)
      // are also served through the proxy with correct MIME types
      const lastSlash = resolvedUrl.lastIndexOf("/");
      const proxyDir = resolvedUrl.substring(0, lastSlash);
      
      const baseTag = `<base href="${proxyDir}/">`;

      // SCORM API bridge: inject script that finds API from parent window
      const apiBridge = `<script>
(function() {
  function findAPI(win) {
    try {
      if (win.API) return win.API;
      if (win.API_1484_11) return win.API_1484_11;
    } catch(e) {}
    return null;
  }
  function scanForAPI(win) {
    var api = findAPI(win);
    if (api) return api;
    try {
      if (win.parent && win.parent !== win) {
        api = findAPI(win.parent);
        if (api) return api;
      }
    } catch(e) {}
    try {
      if (win.opener) {
        api = findAPI(win.opener);
        if (api) return api;
      }
    } catch(e) {}
    try {
      if (win.top && win.top !== win) {
        api = findAPI(win.top);
        if (api) return api;
      }
    } catch(e) {}
    return null;
  }
  var attempts = 0;
  var interval = setInterval(function() {
    var api = scanForAPI(window);
    if (api) {
      window.API = api;
      window.API_1484_11 = api;
      clearInterval(interval);
    } else if (++attempts > 50) {
      clearInterval(interval);
      console.warn('SCORM API not found after polling');
    }
  }, 100);
  try {
    if (window.parent && window.parent.API) {
      window.API = window.parent.API;
      window.API_1484_11 = window.parent.API_1484_11 || window.parent.API;
    }
  } catch(e) {}
})();
<\/script>`;

      let modifiedHtml: string;
      if (htmlText.match(/<head[^>]*>/i)) {
        modifiedHtml = htmlText.replace(/<head[^>]*>/i, `$&\n${baseTag}\n${apiBridge}`);
      } else {
        modifiedHtml = `${baseTag}\n${apiBridge}\n${htmlText}`;
      }

      setSrcdocContent(modifiedHtml);
      setDebugInfo(prev => `${prev}\n✅ Content loaded via srcdoc+proxy`);
    } catch (err) {
      setError(`İçerik yüklenemedi: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`);
      setIsLoading(false);
    }
  }, [packageUrl, entryPoint]);

  // Load on mount and when props change
  useEffect(() => {
    loadContent();
  }, [loadContent]);

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
      {/* Toolbar */}
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
      {srcdocContent && (
        <iframe
          ref={iframeRef}
          srcDoc={srcdocContent}
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
