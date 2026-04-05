/**
 * ScormDebugPanel — Live CMI data viewer for debugging SCORM content.
 * Toggle with keyboard shortcut Ctrl+Shift+D.
 */

import { useState, useEffect, useCallback } from "react";
import { Bug, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScormDebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface CmiEntry {
  key: string;
  value: string;
  timestamp: number;
}

export function ScormDebugPanel({ visible, onClose }: ScormDebugPanelProps) {
  const [entries, setEntries] = useState<CmiEntry[]>([]);
  const [lastMethod, setLastMethod] = useState<string>("");
  const [lastVersion, setLastVersion] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "scorm_api_event") return;
      const { method, data, scormVersion } = event.data;
      setLastMethod(method);
      setLastVersion(scormVersion || "");

      if (data) {
        const now = Date.now();
        const newEntries: CmiEntry[] = Object.entries(data)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([key, value]) => ({
            key,
            value: String(value),
            timestamp: now,
          }));
        setEntries(newEntries);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleCopy = useCallback(() => {
    const text = entries.map((e) => `${e.key}: ${e.value}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [entries]);

  if (!visible) return null;

  return (
    <div className="absolute top-12 right-2 z-50 w-80 max-h-[60vh] bg-[hsl(222,47%,8%/0.95)] border border-white/10 rounded-lg shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white/90">SCORM Debug</span>
          {lastVersion && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
              v{lastVersion}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {lastMethod && (
        <div className="px-3 py-1.5 border-b border-white/5 bg-white/5">
          <span className="text-[10px] text-white/50">Son çağrı: </span>
          <span className="text-[10px] font-mono text-amber-400">{lastMethod}</span>
        </div>
      )}

      <div className="flex-1 overflow-auto p-2 space-y-0.5">
        {entries.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-4">
            SCORM API çağrısı bekleniyor...
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.key}
              className="flex items-start gap-2 px-2 py-1 rounded hover:bg-white/5 group"
            >
              <span className="text-[10px] font-mono text-blue-400 whitespace-nowrap flex-shrink-0">
                {entry.key}
              </span>
              <span className="text-[10px] font-mono text-white/70 break-all">
                {entry.value.length > 100 ? entry.value.slice(0, 100) + "…" : entry.value}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
