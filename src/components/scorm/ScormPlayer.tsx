import { forwardRef, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useScormApi } from "@/hooks/useScormApi";
import { Loader2, Maximize2, Minimize2, AlertTriangle } from "lucide-react";
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

function extractScormFolderPath(packageUrl: string): string | null {
  const marker = "scorm-packages/";
  const markerIndex = packageUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  const rawPath = packageUrl.slice(markerIndex + marker.length).split("?")[0].split("#")[0];
  const trimmed = rawPath.replace(/^\/+|\/+$/g, "");
  return trimmed || null;
}

function normalizeLegacyScormPath(path: string): string {
  return path.replace(/&/g, "_").replace(/ /g, "_");
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.filter(Boolean)));
}

function parentDir(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx > 0 ? path.slice(0, idx) : "";
}

function buildEntryPointCandidates(entryPoint: string): string[] {
  const resolved = entryPoint.toLowerCase() === "index_lms.html" ? "index_lms_html5.html" : entryPoint;
  const normalized = normalizeLegacyScormPath(resolved);
  const dir = normalized.includes("/") ? parentDir(normalized) : "";
  const upperDir = dir ? parentDir(dir) : "";

  return uniquePaths([
    resolved,
    normalized,
    dir ? `${dir}/AICCComm.html` : "",
    dir ? `${dir}/index_lms_html5.html` : "",
    dir ? `${dir}/index_lms.html` : "",
    dir ? `${dir}/index.html` : "",
    upperDir ? `${upperDir}/AICCComm.html` : "",
    upperDir ? `${upperDir}/index_lms_html5.html` : "",
    upperDir ? `${upperDir}/index_lms.html` : "",
    upperDir ? `${upperDir}/index.html` : "",
    "index_lms_html5.html",
    "index_lms.html",
    "story_html5.html",
    "index.html",
  ]);
}

export const ScormPlayer = forwardRef<HTMLIFrameElement, ScormPlayerProps>(function ScormPlayer({
  packageUrl,
  entryPoint,
  enrollmentId,
  scormPackageId,
  lessonId,
  userId,
  onComplete,
}: ScormPlayerProps, forwardedRef) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { createApiObject } = useScormApi({
    enrollmentId,
    scormPackageId,
    lessonId,
    userId,
    onComplete,
  });

  useEffect(() => {
    const api = createApiObject();
    (window as any).API = api.API;
    (window as any).API_1484_11 = api.API_1484_11;
    return () => {
      delete (window as any).API;
      delete (window as any).API_1484_11;
    };
  }, [createApiObject]);

  const folderPath = extractScormFolderPath(packageUrl);
  const [resolvedContentUrl, setResolvedContentUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const resolveContentUrl = async () => {
      setIsLoading(true);
      setError(null);

      if (!folderPath) {
        const fallbackUrl = `${packageUrl}/${entryPoint}`;
        if (!cancelled) setResolvedContentUrl(fallbackUrl);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const candidates = buildEntryPointCandidates(entryPoint);

      for (const candidate of candidates) {
        const encodedCandidate = candidate
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");

        // Use direct storage URL (public bucket) instead of proxy
        const candidateUrl = `${supabaseUrl}/storage/v1/object/public/scorm-packages/${folderPath}/${encodedCandidate}`;

        try {
          const response = await fetch(candidateUrl, { method: "GET" });
          if (response.ok) {
            if (!cancelled) setResolvedContentUrl(candidateUrl);
            return;
          }
        } catch {
          // Try next candidate
        }
      }

      if (!cancelled) {
        setError("SCORM başlangıç dosyası bulunamadı. Lütfen paketi yeniden yükleyin.");
      }
    };

    resolveContentUrl();

    return () => {
      cancelled = true;
    };
  }, [folderPath, packageUrl, entryPoint]);

  const setIframeRef = (node: HTMLIFrameElement | null) => {
    iframeRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as MutableRefObject<HTMLIFrameElement | null>).current = node;
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    try {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (iframeWindow) {
        (iframeWindow as any).API = (window as any).API;
        (iframeWindow as any).API_1484_11 = (window as any).API_1484_11;
      }
    } catch {
      // Cross-origin iframe - API is served through proxy URL
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError("Eğitim içeriği yüklenemedi. Lütfen tekrar deneyin.");
  };

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
        <p className="text-muted-foreground text-center">{error}</p>
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

      <iframe
        ref={setIframeRef}
        src={resolvedContentUrl || undefined}
        className="flex-1 w-full border-0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        allow="fullscreen"
        title="SCORM Eğitim İçeriği"
      />
    </div>
  );
});
