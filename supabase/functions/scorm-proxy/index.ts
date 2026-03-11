import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getContentTypeByPath(path: string, upstreamContentType?: string | null): string {
  const extension = path.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8",
    js: "application/javascript; charset=utf-8", mjs: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8", json: "application/json; charset=utf-8",
    xml: "application/xml; charset=utf-8", svg: "image/svg+xml",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
    ico: "image/x-icon", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf",
    eot: "application/vnd.ms-fontobject", mp4: "video/mp4", webm: "video/webm",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", pdf: "application/pdf",
    txt: "text/plain; charset=utf-8", swf: "application/x-shockwave-flash",
  };
  if (mimeMap[extension]) return mimeMap[extension];
  if (upstreamContentType && upstreamContentType !== "application/octet-stream") return upstreamContentType;
  return "application/octet-stream";
}

function buildScormApiScript(parentOrigin: string, initialData: Record<string, string>): string {
  return `<script>
(function() {
  var _initialized = false, _finished = false, _lastError = '0';
  var _parentOrigin = ${JSON.stringify(parentOrigin)};
  var cmiData = {
    'cmi.core.lesson_status': ${JSON.stringify(initialData.lesson_status || 'not attempted')},
    'cmi.core.lesson_location': ${JSON.stringify(initialData.lesson_location || '')},
    'cmi.suspend_data': ${JSON.stringify(initialData.suspend_data || '')},
    'cmi.core.score.raw': ${JSON.stringify(initialData.score_raw || '')},
    'cmi.core.score.min': ${JSON.stringify(initialData.score_min || '0')},
    'cmi.core.score.max': ${JSON.stringify(initialData.score_max || '100')},
    'cmi.core.total_time': ${JSON.stringify(initialData.total_time || '0000:00:00')},
    'cmi.core.session_time': '0000:00:00',
    'cmi.core.student_id': '', 'cmi.core.student_name': '',
    'cmi.core.credit': 'credit',
    'cmi.core.entry': ${JSON.stringify(initialData.lesson_status && initialData.lesson_status !== 'not attempted' ? 'resume' : 'ab-initio')},
    'cmi.core.exit': '', 'cmi.core.lesson_mode': 'normal',
    'cmi.launch_data': '', 'cmi.comments': '', 'cmi.comments_from_lms': ''
  };
  function sendToParent(method) {
    try {
      window.parent.postMessage({ type: 'scorm_api_event', method: method, data: {
        lesson_status: cmiData['cmi.core.lesson_status'],
        lesson_location: cmiData['cmi.core.lesson_location'],
        suspend_data: cmiData['cmi.suspend_data'],
        score_raw: cmiData['cmi.core.score.raw'],
        total_time: cmiData['cmi.core.total_time'],
        session_time: cmiData['cmi.core.session_time'],
        exit: cmiData['cmi.core.exit']
      }}, _parentOrigin);
    } catch(e) {}
  }
  var API = {
    LMSInitialize: function() { _initialized = true; _finished = false; _lastError = '0'; sendToParent('LMSInitialize'); return 'true'; },
    LMSFinish: function() { if (!_initialized) { _lastError = '301'; return 'false'; } _finished = true; _initialized = false; _lastError = '0'; sendToParent('LMSFinish'); return 'true'; },
    LMSGetValue: function(el) { if (!_initialized) { _lastError = '301'; return ''; } _lastError = '0'; if (el in cmiData) return cmiData[el]; if (el.match(/_count$/)) return '0'; return ''; },
    LMSSetValue: function(el, val) { if (!_initialized) { _lastError = '301'; return 'false'; } _lastError = '0'; cmiData[el] = val; return 'true'; },
    LMSCommit: function() { if (!_initialized) { _lastError = '301'; return 'false'; } _lastError = '0'; sendToParent('LMSCommit'); return 'true'; },
    LMSGetLastError: function() { return _lastError; },
    LMSGetErrorString: function(c) { return {'0':'No Error','101':'General Exception','301':'Not initialized','401':'Not implemented'}[c]||'Unknown'; },
    LMSGetDiagnostic: function(c) { return c||''; }
  };
  window.API = API;
  window.API_1484_11 = API;
})();
<\/script>`;
}

/**
 * Authenticate the request: extract JWT from Authorization header,
 * verify via Supabase auth, and return the user ID.
 * Returns null if unauthenticated.
 */
async function authenticateRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response("Server misconfiguration", { status: 500, headers: corsHeaders });
    }

    // --- Authentication: require a valid user session ---
    const userId = await authenticateRequest(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reqUrl = new URL(req.url);
    const { pathname } = reqUrl;
    const marker = "/scorm-proxy/";
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) {
      return new Response("Invalid path", { status: 400, headers: corsHeaders });
    }

    let objectPath = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    objectPath = objectPath.replace(/^\/?(?:___\/)+/, "");
    console.log("scorm-proxy resolved path:", objectPath);
    if (!objectPath) {
      return new Response("Missing object path", { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // --- Enrollment check: verify user is enrolled in the course that owns this SCORM package ---
    // Extract courseId from the path (first segment is typically the course ID)
    const pathSegments = objectPath.split("/");
    const courseIdCandidate = pathSegments[0];

    if (courseIdCandidate) {
      const { data: enrollment } = await adminClient
        .from("enrollments")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", courseIdCandidate)
        .in("status", ["active", "pending", "completed"])
        .limit(1)
        .maybeSingle();

      // Also check if user is admin (admins can access all content)
      const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: userId });

      if (!enrollment && !isAdmin) {
        return new Response(JSON.stringify({ error: "Not enrolled in this course" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- LIST MODE: return directory listing as JSON ---
    if (reqUrl.searchParams.get("list") === "1") {
      const listPath = objectPath.replace(/\/+$/, "");
      const { data, error } = await adminClient.storage.from("scorm-packages").list(listPath, { limit: 500 });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data || []), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
      });
    }

    // --- FILE MODE: serve file via signed URL (bucket is now private) ---
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("scorm-packages").createSignedUrl(objectPath, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return new Response("File not found", { status: 404, headers: corsHeaders });
    }

    const upstream = await fetch(signedUrlData.signedUrl, { method: "GET" });
    if (!upstream.ok) {
      const body = await upstream.arrayBuffer();
      return new Response(body, { status: upstream.status, headers: { ...corsHeaders, "Content-Type": upstream.headers.get("Content-Type") ?? "text/plain" } });
    }

    const contentType = getContentTypeByPath(objectPath, upstream.headers.get("Content-Type"));
    let body = await upstream.arrayBuffer();

    // Inject SCORM API into HTML when requested
    const shouldInjectScorm = reqUrl.searchParams.get("scorm") === "1" && contentType.includes("text/html");
    if (shouldInjectScorm) {
      const htmlText = new TextDecoder().decode(body);
      const parentOrigin = reqUrl.searchParams.get("origin") || "*";
      const initialData: Record<string, string> = {};
      for (const key of ["lesson_status", "lesson_location", "suspend_data", "score_raw", "score_min", "score_max", "total_time"]) {
        const val = reqUrl.searchParams.get(key);
        if (val) initialData[key] = val;
      }
      const scormScript = buildScormApiScript(parentOrigin, initialData);
      let modifiedHtml: string;
      if (htmlText.match(/<head[^>]*>/i)) {
        modifiedHtml = htmlText.replace(/<head[^>]*>/i, `$&\n${scormScript}`);
      } else {
        modifiedHtml = scormScript + htmlText;
      }
      body = new TextEncoder().encode(modifiedHtml).buffer;
    }

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders, "Content-Type": contentType,
        "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; media-src * data: blob:; font-src * data:",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": shouldInjectScorm ? "no-cache" : "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("scorm-proxy error", error);
    return new Response("Internal server error", { status: 500, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
  }
});
