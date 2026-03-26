import { useEffect, useState, useRef } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HtmlContentViewerProps {
  contentUrl: string;
  title: string;
}

/**
 * Fetches HTML content from a URL and renders it in an iframe via blob URL.
 * This handles cases where storage serves HTML as text/plain.
 */
export function HtmlContentViewer({ contentUrl, title }: HtmlContentViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const loadContent = async () => {
    setIsLoading(true);
    setError(null);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    try {
      const res = await fetch(contentUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const arrayBuffer = await res.arrayBuffer();
      // Decode as UTF-8 explicitly
      const decoder = new TextDecoder("utf-8");
      let html = decoder.decode(arrayBuffer);

      // Ensure charset meta tag exists
      if (!html.includes("charset")) {
        html = html.replace(
          /<head[^>]*>/i,
          `$&<meta charset="UTF-8">`
        );
      }

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setBlobUrl(url);
    } catch (err: any) {
      console.error("Content load error:", err);
      setError("İçerik yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [contentUrl]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={loadContent}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}
      {blobUrl && (
        <iframe
          src={blobUrl}
          className="w-full h-full border-0 rounded-lg"
          title={title}
          onLoad={() => setIsLoading(false)}
        />
      )}
    </div>
  );
}
