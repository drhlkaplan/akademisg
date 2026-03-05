import { useEffect, useRef, useState } from "react";
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
  const resolvedEntryPoint =
    entryPoint.toLowerCase() === "index_lms.html" ? "index_lms_html5.html" : entryPoint;

  const encodedEntryPoint = resolvedEntryPoint
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const contentUrl = folderPath
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scorm-proxy/${folderPath}/${encodedEntryPoint}`
    : `${packageUrl}/${resolvedEntryPoint}`;

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
        ref={iframeRef}
        src={contentUrl}
        className="flex-1 w-full border-0"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        allow="fullscreen"
        title="SCORM Eğitim İçeriği"
      />
    </div>
  );
}
