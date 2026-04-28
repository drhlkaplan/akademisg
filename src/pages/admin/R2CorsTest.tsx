import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type LogEntry = { time: string; level: "info" | "ok" | "err"; msg: string };

export default function R2CorsTest() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string>("");

  const log = (level: LogEntry["level"], msg: string) =>
    setLogs((p) => [...p, { time: new Date().toLocaleTimeString(), level, msg }]);

  const reset = () => {
    setLogs([]);
    setSignedUrl("");
  };

  const runTest = async () => {
    reset();
    setRunning(true);
    try {
      log("info", "1) Edge function r2-sign-upload çağrılıyor…");
      const testPath = `cors-test-${Date.now()}.txt`;
      const { data, error } = await supabase.functions.invoke("r2-sign-upload", {
        body: {
          packagePrefix: "_cors_test",
          files: [{ path: testPath, contentType: "text/plain" }],
        },
      });
      if (error) throw new Error(`Edge function error: ${error.message}`);
      if (!data?.signed?.[0]?.url) throw new Error("Signed URL alınamadı: " + JSON.stringify(data));

      const url: string = data.signed[0].url;
      setSignedUrl(url);
      log("ok", `Signed URL alındı (${url.length} chars)`);
      try {
        const u = new URL(url);
        log("info", `Host: ${u.host}`);
        log("info", `Path: ${u.pathname}`);
      } catch {}

      // 2) Manual OPTIONS preflight (browsers do this automatically; but we log explicitly)
      log("info", "2) Manuel OPTIONS preflight gönderiliyor…");
      try {
        const opt = await fetch(url, {
          method: "OPTIONS",
          headers: {
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "content-type",
            Origin: window.location.origin,
          },
        });
        log(
          opt.ok ? "ok" : "err",
          `OPTIONS status: ${opt.status} ${opt.statusText}`,
        );
        const allowOrigin = opt.headers.get("access-control-allow-origin");
        const allowMethods = opt.headers.get("access-control-allow-methods");
        const allowHeaders = opt.headers.get("access-control-allow-headers");
        log("info", `  Allow-Origin: ${allowOrigin ?? "(yok)"}`);
        log("info", `  Allow-Methods: ${allowMethods ?? "(yok)"}`);
        log("info", `  Allow-Headers: ${allowHeaders ?? "(yok)"}`);
        if (!allowOrigin) {
          log("err", "⚠ CORS header yok — R2 bucket CORS policy eksik veya origin uyuşmuyor.");
        }
      } catch (e) {
        log("err", `OPTIONS hata: ${e instanceof Error ? e.message : String(e)}`);
        log("err", "→ Bu \"failed to fetch\" CORS preflight'ın network seviyesinde reddedildiğini gösterir.");
      }

      // 3) Actual PUT
      log("info", "3) PUT isteği gönderiliyor (küçük test dosyası)…");
      const payload = new Blob([`R2 CORS test @ ${new Date().toISOString()}`], {
        type: "text/plain",
      });
      try {
        const put = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "text/plain" },
          body: payload,
        });
        log(
          put.ok ? "ok" : "err",
          `PUT status: ${put.status} ${put.statusText}`,
        );
        if (!put.ok) {
          const text = await put.text().catch(() => "");
          if (text) log("err", `Response body: ${text.slice(0, 500)}`);
        } else {
          log("ok", "✓ Upload başarılı! R2 CORS doğru yapılandırılmış.");
          if (data.publicBase) {
            const publicUrl = `${data.publicBase}/${data.signed[0].key}`;
            log("info", `Public URL (GET test edilebilir): ${publicUrl}`);
          }
        }
      } catch (e) {
        log("err", `PUT hata: ${e instanceof Error ? e.message : String(e)}`);
        log("err", "→ \"Failed to fetch\" = preflight başarısız (CORS policy eksik) VEYA host DNS/SSL hatası.");
      }
    } catch (e) {
      log("err", e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">R2 CORS Test</h1>
      <p className="text-muted-foreground mb-4">
        Cloudflare R2 bucket'ına signed PUT URL ile küçük bir test dosyası yükler ve preflight + PUT
        sonuçlarını gösterir.
      </p>

      <div className="flex gap-2 mb-4">
        <Button onClick={runTest} disabled={running}>
          {running ? "Test çalışıyor…" : "Testi Başlat"}
        </Button>
        <Button variant="outline" onClick={reset} disabled={running}>
          Temizle
        </Button>
      </div>

      <Card className="p-4 bg-black text-green-400 font-mono text-xs overflow-auto max-h-[500px]">
        {logs.length === 0 && <div className="text-muted-foreground">Log boş…</div>}
        {logs.map((l, i) => (
          <div
            key={i}
            className={
              l.level === "err"
                ? "text-red-400"
                : l.level === "ok"
                ? "text-green-400"
                : "text-blue-300"
            }
          >
            [{l.time}] {l.msg}
          </div>
        ))}
      </Card>

      {signedUrl && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer">Signed URL göster</summary>
          <pre className="bg-muted p-2 mt-2 break-all whitespace-pre-wrap">{signedUrl}</pre>
        </details>
      )}

      <Card className="p-4 mt-4 text-sm">
        <h2 className="font-semibold mb-2">Yorum kılavuzu</h2>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>OPTIONS yanıtı yoksa veya Allow-Origin header eksikse → R2 bucket CORS policy ekleyin.</li>
          <li>OPTIONS 200 ama PUT 403 → SignatureDoesNotMatch (Content-Type / signed headers uyumsuz).</li>
          <li>PUT 200 → CORS sorun değil; SCORM upload akışındaki başka sorunu araştırın.</li>
        </ul>
      </Card>
    </div>
  );
}
