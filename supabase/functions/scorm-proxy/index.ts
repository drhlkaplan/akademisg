const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getContentTypeByPath(path: string, upstreamContentType?: string | null): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json; charset=utf-8",
    xml: "application/xml; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    pdf: "application/pdf",
    txt: "text/plain; charset=utf-8",
  };

  const mapped = mimeMap[extension];
  if (mapped) return mapped;

  if (upstreamContentType && upstreamContentType !== "application/octet-stream") {
    return upstreamContentType;
  }

  return "application/octet-stream";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pathname } = new URL(req.url);
    const marker = "/scorm-proxy/";
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) {
      return new Response("Invalid path", { status: 400, headers: corsHeaders });
    }

    const objectPath = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    if (!objectPath) {
      return new Response("Missing object path", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      return new Response("Server misconfiguration", { status: 500, headers: corsHeaders });
    }

    const objectUrl = `${supabaseUrl}/storage/v1/object/public/scorm-packages/${objectPath}`;
    const upstream = await fetch(objectUrl, { method: "GET" });

    if (!upstream.ok) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstream.headers.get("Content-Type") ?? "text/plain; charset=utf-8",
        },
      });
    }

    const contentType = getContentTypeByPath(objectPath, upstream.headers.get("Content-Type"));
    const isTextLike =
      contentType.startsWith("text/") ||
      contentType.includes("javascript") ||
      contentType.includes("json") ||
      contentType.includes("xml") ||
      contentType.includes("svg");

    const body = isTextLike ? await upstream.text() : await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0",
        "X-Scorm-Object-Path": objectPath,
        "X-Scorm-Resolved-Content-Type": contentType,
      },
    });
  } catch (error) {
    console.error("scorm-proxy error", error);
    return new Response("Internal server error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
