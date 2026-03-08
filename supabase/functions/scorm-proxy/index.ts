const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getContentTypeByPath(path: string, upstreamContentType?: string | null): string {
  const extension = path.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "";
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
    eot: "application/vnd.ms-fontobject",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    txt: "text/plain; charset=utf-8",
    swf: "application/x-shockwave-flash",
    lottie: "application/json; charset=utf-8",
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
      const body = await upstream.arrayBuffer();
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstream.headers.get("Content-Type") ?? "text/plain; charset=utf-8",
        },
      });
    }

    const contentType = getContentTypeByPath(objectPath, upstream.headers.get("Content-Type"));

    // Always read as arrayBuffer to preserve binary data and avoid
    // Deno/Supabase gateway overriding Content-Type for string responses
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        // Override restrictive CSP that Supabase gateway may add
        "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; media-src * data: blob:; font-src * data:",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
        "X-Scorm-Object-Path": objectPath,
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
