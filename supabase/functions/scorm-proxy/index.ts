import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/**
 * Build a self-contained SCORM 1.2 API script that:
 * - Stores CMI data in memory (pre-populated from query params)
 * - Uses postMessage to sync data with the parent window
 * - Provides synchronous LMS* methods as required by SCORM 1.2
 */
function buildScormApiScript(parentOrigin: string, initialData: Record<string, string>): string {
  return `<script>
(function() {
  var _initialized = false;
  var _finished = false;
  var _lastError = '0';
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
    'cmi.core.student_id': '',
    'cmi.core.student_name': '',
    'cmi.core.credit': 'credit',
    'cmi.core.entry': ${JSON.stringify(initialData.lesson_status && initialData.lesson_status !== 'not attempted' ? 'resume' : 'ab-initio')},
    'cmi.core.exit': '',
    'cmi.core.lesson_mode': 'normal',
    'cmi.launch_data': '',
    'cmi.comments': '',
    'cmi.comments_from_lms': ''
  };

  function sendToParent(method) {
    try {
      window.parent.postMessage({
        type: 'scorm_api_event',
        method: method,
        data: {
          lesson_status: cmiData['cmi.core.lesson_status'],
          lesson_location: cmiData['cmi.core.lesson_location'],
          suspend_data: cmiData['cmi.suspend_data'],
          score_raw: cmiData['cmi.core.score.raw'],
          total_time: cmiData['cmi.core.total_time'],
          session_time: cmiData['cmi.core.session_time'],
          exit: cmiData['cmi.core.exit']
        }
      }, _parentOrigin);
    } catch(e) { console.warn('SCORM postMessage failed', e); }
  }

  var API = {
    LMSInitialize: function() {
      if (_initialized) { _lastError = '101'; return 'false'; }
      _initialized = true;
      _finished = false;
      _lastError = '0';
      sendToParent('LMSInitialize');
      return 'true';
    },
    LMSFinish: function() {
      if (!_initialized) { _lastError = '301'; return 'false'; }
      if (_finished) { _lastError = '101'; return 'false'; }
      _finished = true;
      _initialized = false;
      _lastError = '0';
      sendToParent('LMSFinish');
      return 'true';
    },
    LMSGetValue: function(element) {
      if (!_initialized) { _lastError = '301'; return ''; }
      _lastError = '0';
      if (element in cmiData) return cmiData[element];
      // Handle wildcard/count elements
      if (element === 'cmi.objectives._count') return '0';
      if (element === 'cmi.interactions._count') return '0';
      if (element === 'cmi.student_data.mastery_score') return '';
      if (element === 'cmi.student_data.max_time_allowed') return '';
      if (element === 'cmi.student_data.time_limit_action') return '';
      _lastError = '401';
      return '';
    },
    LMSSetValue: function(element, value) {
      if (!_initialized) { _lastError = '301'; return 'false'; }
      _lastError = '0';
      cmiData[element] = value;
      return 'true';
    },
    LMSCommit: function() {
      if (!_initialized) { _lastError = '301'; return 'false'; }
      _lastError = '0';
      sendToParent('LMSCommit');
      return 'true';
    },
    LMSGetLastError: function() { return _lastError; },
    LMSGetErrorString: function(code) {
      var errors = {
        '0': 'No Error', '101': 'General Exception',
        '201': 'Invalid argument error', '202': 'Element cannot have children',
        '203': 'Element not an array - cannot have count',
        '301': 'Not initialized', '401': 'Not implemented error',
        '402': 'Invalid set value, element is a keyword',
        '403': 'Element is read only', '404': 'Element is write only',
        '405': 'Incorrect Data Type'
      };
      return errors[code] || 'Unknown Error';
    },
    LMSGetDiagnostic: function(code) { return code || ''; }
  };

  // Set API on window for SCORM 1.2 discovery
  window.API = API;

  // Also support SCORM 2004 discovery pattern (some content checks both)
  window.API_1484_11 = API;

  // Make API discoverable from child frames
  // Articulate walks up parent chain looking for API
})();
<\/script>`;
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

    const reqUrl = new URL(req.url);
    const { pathname } = reqUrl;
    const marker = "/scorm-proxy/";
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex === -1) {
      return new Response("Invalid path", { status: 400, headers: corsHeaders });
    }

    let objectPath = decodeURIComponent(pathname.slice(markerIndex + marker.length));
    // Strip padding segments (___/) used to prevent ../ escaping above the proxy path
    objectPath = objectPath.replace(/^\/?(?:___\/)+/, "");
    console.log("scorm-proxy resolved path:", objectPath);
    if (!objectPath) {
      return new Response("Missing object path", { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // --- Fetch file using signed URL (bucket is private) ---
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("scorm-packages")
      .createSignedUrl(objectPath, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return new Response("File not found", { status: 404, headers: corsHeaders });
    }

    const upstream = await fetch(signedUrlData.signedUrl, { method: "GET" });

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
    let body = await upstream.arrayBuffer();

    // --- Inject SCORM API into HTML files when requested ---
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
      } else if (htmlText.match(/<html[^>]*>/i)) {
        modifiedHtml = htmlText.replace(/<html[^>]*>/i, `$&\n<head>${scormScript}</head>`);
      } else {
        modifiedHtml = scormScript + htmlText;
      }

      body = new TextEncoder().encode(modifiedHtml).buffer;
    }

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; media-src * data: blob:; font-src * data:",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": shouldInjectScorm ? "no-cache" : "public, max-age=3600",
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
