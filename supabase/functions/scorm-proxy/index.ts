import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Stateless session token (HMAC-SHA256) ───────────────────────────────────

async function createSessionToken(
  payload: { userId: string; courseId: string; folderPath: string; exp: number },
  secret: string,
): Promise<string> {
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = btoa(payloadStr);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payloadB64}.${sigB64}`;
}

async function verifySessionToken(
  token: string,
  secret: string,
): Promise<{ userId: string; courseId: string; folderPath: string; exp: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payloadB64));
    if (!valid) return null;
    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function authenticateRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

// ─── Enrollment verification ─────────────────────────────────────────────────

async function verifyAccess(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  courseId: string,
): Promise<boolean> {
  const { data: enrollment } = await adminClient
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .in("status", ["active", "pending", "completed"])
    .limit(1)
    .maybeSingle();
  if (enrollment) return true;
  const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: userId });
  return !!isAdmin;
}

// ─── Manifest parser ─────────────────────────────────────────────────────────

interface ParsedSco {
  identifier: string;
  title: string;
  launchPath: string;
  parameters?: string;
  orderIndex: number;
  scormType: string;
}

interface ParsedManifest {
  version: string;
  defaultOrganization: string;
  scos: ParsedSco[];
  title: string;
}

function parseManifestXml(xmlContent: string): ParsedManifest | null {
  try {
    const version = detectScormVersion(xmlContent);
    const title = extractTag(xmlContent, "organization", "title") || "Untitled";
    const defaultOrg = extractAttr(xmlContent, "organizations", "default") || "";

    const resourceMap = new Map<string, { href: string; type: string }>();
    const resourceRegex = /<resource\s+([^>]*)\/?>(?:[\s\S]*?<\/resource>)?/gi;
    let match;
    while ((match = resourceRegex.exec(xmlContent)) !== null) {
      const attrs = match[1];
      const id = getAttr(attrs, "identifier");
      const href = getAttr(attrs, "href");
      const type = getAttr(attrs, "adlcp:scormtype") || getAttr(attrs, "adlcp:scormType") || getAttr(attrs, "scormType") || "sco";
      if (id) resourceMap.set(id, { href: href || "", type });
    }

    const scos: ParsedSco[] = [];
    const itemRegex = /<item\s+([^>]*)>[\s\S]*?<title>([^<]*)<\/title>/gi;
    while ((match = itemRegex.exec(xmlContent)) !== null) {
      const attrs = match[1];
      const itemTitle = match[2].trim();
      const identifier = getAttr(attrs, "identifier") || `item_${scos.length}`;
      const identifierref = getAttr(attrs, "identifierref");
      const parameters = getAttr(attrs, "parameters");

      if (identifierref && resourceMap.has(identifierref)) {
        const resource = resourceMap.get(identifierref)!;
        if (resource.href) {
          scos.push({
            identifier,
            title: itemTitle,
            launchPath: resource.href,
            parameters: parameters || undefined,
            orderIndex: scos.length,
            scormType: resource.type === "asset" ? "asset" : "sco",
          });
        }
      }
    }

    if (scos.length === 0) {
      let idx = 0;
      for (const [id, res] of resourceMap) {
        if (res.href && (res.href.endsWith(".html") || res.href.endsWith(".htm"))) {
          scos.push({
            identifier: id,
            title: id,
            launchPath: res.href,
            orderIndex: idx++,
            scormType: res.type === "asset" ? "asset" : "sco",
          });
        }
      }
    }

    return { version, defaultOrganization: defaultOrg, scos, title };
  } catch {
    return null;
  }
}

function detectScormVersion(xml: string): string {
  if (xml.includes("2004")) return "2004";
  if (xml.includes("CAM 1.3")) return "2004";
  if (xml.includes("adlseq") || xml.includes("imsss")) return "2004";
  return "1.2";
}

function getAttr(attrStr: string, name: string): string {
  const regex = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  const match = attrStr.match(regex);
  return match ? match[1] : "";
}

function extractTag(xml: string, parent: string, child: string): string {
  const regex = new RegExp(`<${parent}[^>]*>[\\s\\S]*?<${child}>([^<]*)<\\/${child}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}\\s+[^>]*${attr}\\s*=\\s*["']([^"']*)["']`, "i");
  const match = xml.match(regex);
  return match ? match[1] : "";
}

// ─── Token extraction helpers ────────────────────────────────────────────────

function extractPathToken(pathname: string): { token: string; subPath: string } | null {
  const tMarker = "/_t_/";
  const tIndex = pathname.indexOf(tMarker);
  if (tIndex === -1) return null;

  const afterMarker = pathname.slice(tIndex + tMarker.length);
  const firstSlash = afterMarker.indexOf("/");
  if (firstSlash === -1) return null;

  const encodedToken = afterMarker.substring(0, firstSlash);
  const subPath = afterMarker.substring(firstSlash + 1);

  return {
    token: decodeURIComponent(encodedToken),
    subPath: decodeURIComponent(subPath).replace(/^\/?(?:___\/)+/, ""),
  };
}

function extractQueryToken(reqUrl: URL): { token: string; subPath: string } | null {
  const token = reqUrl.searchParams.get("t");
  if (!token) return null;

  const marker = "/scorm-proxy/";
  const markerIndex = reqUrl.pathname.indexOf(marker);
  let subPath = "";
  if (markerIndex !== -1) {
    subPath = decodeURIComponent(reqUrl.pathname.slice(markerIndex + marker.length));
    subPath = subPath.replace(/^\/?(?:___\/)+/, "");
  }

  return { token, subPath };
}

// ─── Serve token extraction ──────────────────────────────────────────────────

function extractServeInfo(pathname: string): { token: string; entryPath: string } | null {
  const serveMarker = "/_serve_/";
  const idx = pathname.indexOf(serveMarker);
  if (idx === -1) return null;

  const afterMarker = pathname.slice(idx + serveMarker.length);
  const firstSlash = afterMarker.indexOf("/");
  if (firstSlash === -1) return null;

  const encodedToken = afterMarker.substring(0, firstSlash);
  const entryPath = afterMarker.substring(firstSlash + 1);

  return {
    token: decodeURIComponent(encodedToken),
    entryPath: decodeURIComponent(entryPath),
  };
}

// ─── SCORM API script builder (server-side) ──────────────────────────────────

interface ScormInitData {
  lesson_status?: string;
  lesson_location?: string;
  suspend_data?: string;
  score_raw?: string;
  total_time?: string;
}

function buildScorm12Script(d: ScormInitData): string {
  return `<script>
(function() {
  var _init = false, _fin = false, _err = '0';
  var cmi = {
    'cmi.core.lesson_status': ${JSON.stringify(d.lesson_status || "not attempted")},
    'cmi.core.lesson_location': ${JSON.stringify(d.lesson_location || "")},
    'cmi.suspend_data': ${JSON.stringify(d.suspend_data || "")},
    'cmi.core.score.raw': ${JSON.stringify(d.score_raw || "")},
    'cmi.core.score.min': '0', 'cmi.core.score.max': '100',
    'cmi.core.total_time': ${JSON.stringify(d.total_time || "0000:00:00")},
    'cmi.core.session_time': '0000:00:00',
    'cmi.core.student_id': '', 'cmi.core.student_name': '',
    'cmi.core.credit': 'credit',
    'cmi.core.entry': ${JSON.stringify(d.lesson_status && d.lesson_status !== "not attempted" ? "resume" : "ab-initio")},
    'cmi.core.exit': '', 'cmi.core.lesson_mode': 'normal',
    'cmi.launch_data': '', 'cmi.comments': '', 'cmi.comments_from_lms': ''
  };
  function send(m) {
    try { window.parent.postMessage({ type: 'scorm_api_event', scormVersion: '1.2', method: m, data: {
      lesson_status: cmi['cmi.core.lesson_status'], lesson_location: cmi['cmi.core.lesson_location'],
      suspend_data: cmi['cmi.suspend_data'], score_raw: cmi['cmi.core.score.raw'],
      total_time: cmi['cmi.core.total_time'], session_time: cmi['cmi.core.session_time'],
      exit: cmi['cmi.core.exit']
    }}, '*'); } catch(e) {}
  }
  window.API = {
    LMSInitialize: function() { _init = true; _fin = false; _err = '0'; send('LMSInitialize'); return 'true'; },
    LMSFinish: function() { if (!_init) { _err = '301'; return 'false'; } _fin = true; _init = false; _err = '0'; send('LMSFinish'); return 'true'; },
    LMSGetValue: function(el) { if (!_init) { _err = '301'; return ''; } _err = '0'; if (el in cmi) return cmi[el]; if (el.match(/_count$/)) return '0'; return ''; },
    LMSSetValue: function(el, v) { if (!_init) { _err = '301'; return 'false'; } _err = '0'; cmi[el] = v; return 'true'; },
    LMSCommit: function() { if (!_init) { _err = '301'; return 'false'; } _err = '0'; send('LMSCommit'); return 'true'; },
    LMSGetLastError: function() { return _err; },
    LMSGetErrorString: function(c) { return {'0':'No Error','101':'General Exception','301':'Not initialized','401':'Not implemented'}[c]||'Unknown'; },
    LMSGetDiagnostic: function(c) { return c||''; }
  };
})();
<\/script>`;
}

function buildScorm2004Script(d: ScormInitData): string {
  const cs = (d.lesson_status === "completed" || d.lesson_status === "passed") ? "completed"
    : d.lesson_status === "incomplete" ? "incomplete" : "unknown";
  const ss = d.lesson_status === "passed" ? "passed" : d.lesson_status === "failed" ? "failed" : "unknown";
  const tp = (d.total_time || "0000:00:00").split(":");
  const isoT = tp.length === 3 ? "PT" + parseInt(tp[0]) + "H" + parseInt(tp[1]) + "M" + parseInt(tp[2]) + "S" : "PT0S";

  return `<script>
(function() {
  var _init = false, _term = false, _err = '0';
  var cmi = {
    'cmi.completion_status': ${JSON.stringify(cs)},
    'cmi.success_status': ${JSON.stringify(ss)},
    'cmi.location': ${JSON.stringify(d.lesson_location || "")},
    'cmi.suspend_data': ${JSON.stringify(d.suspend_data || "")},
    'cmi.score.raw': ${JSON.stringify(d.score_raw || "")},
    'cmi.score.min': '0', 'cmi.score.max': '100',
    'cmi.score.scaled': ${JSON.stringify(d.score_raw ? (parseFloat(d.score_raw) / 100).toString() : "")},
    'cmi.total_time': ${JSON.stringify(isoT)},
    'cmi.session_time': 'PT0S',
    'cmi.learner_id': '', 'cmi.learner_name': '',
    'cmi.credit': 'credit',
    'cmi.entry': ${JSON.stringify(cs !== "unknown" ? "resume" : "ab-initio")},
    'cmi.exit': '', 'cmi.mode': 'normal', 'cmi.launch_data': '',
    'cmi.comments_from_learner._count': '0', 'cmi.comments_from_lms._count': '0',
    'cmi.interactions._count': '0', 'cmi.objectives._count': '0',
    'cmi.learner_preference.audio_level': '1', 'cmi.learner_preference.language': '',
    'cmi.learner_preference.delivery_speed': '1', 'cmi.learner_preference.audio_captioning': '0',
    'cmi.completion_threshold': '', 'cmi.scaled_passing_score': '', 'cmi.progress_measure': '',
    'adl.nav.request': '_none_'
  };
  function send(m) {
    try {
      var ls = cmi['cmi.completion_status']||'unknown', s = cmi['cmi.success_status']||'unknown';
      var ns = s==='passed'?'passed':s==='failed'?'failed':ls==='completed'?'completed':ls==='incomplete'?'incomplete':'not attempted';
      window.parent.postMessage({ type: 'scorm_api_event', method: m, scormVersion: '2004', data: {
        lesson_status: ns, lesson_location: cmi['cmi.location']||'',
        suspend_data: cmi['cmi.suspend_data']||'', score_raw: cmi['cmi.score.raw']||'',
        total_time: cmi['cmi.total_time']||'PT0S', session_time: cmi['cmi.session_time']||'PT0S',
        exit: cmi['cmi.exit']||'', completion_status: cmi['cmi.completion_status'],
        success_status: cmi['cmi.success_status'], progress_measure: cmi['cmi.progress_measure']||'',
        nav_request: cmi['adl.nav.request']||'_none_'
      }}, '*');
    } catch(e) {}
  }
  window.API_1484_11 = {
    Initialize: function() { if (_init) { _err='103'; return 'false'; } _init=true; _term=false; _err='0'; send('Initialize'); return 'true'; },
    Terminate: function() { if (!_init) { _err='112'; return 'false'; } if (_term) { _err='113'; return 'false'; } _term=true; _init=false; _err='0'; send('Terminate'); return 'true'; },
    GetValue: function(el) {
      if (!_init) { _err='122'; return ''; } _err='0';
      if (el in cmi) return cmi[el]; if (el.match(/\\._count$/)) return '0';
      var m = el.match(/^cmi\\.(interactions|objectives|comments_from_learner)\\.(\\d+)\\./);
      if (m && cmi[el] !== undefined) return cmi[el]; if (m) return '';
      _err='401'; return '';
    },
    SetValue: function(el, v) {
      if (!_init) { _err='132'; return 'false'; } _err='0'; cmi[el]=v;
      var m = el.match(/^cmi\\.(interactions|objectives|comments_from_learner)\\.(\\d+)\\./);
      if (m) { var ck='cmi.'+m[1]+'._count'; var c=parseInt(cmi[ck]||'0'); if (parseInt(m[2])>=c) cmi[ck]=String(parseInt(m[2])+1); }
      return 'true';
    },
    Commit: function() { if (!_init) { _err='142'; return 'false'; } _err='0'; send('Commit'); return 'true'; },
    GetLastError: function() { return _err; },
    GetErrorString: function(c) { return {'0':'No Error','101':'General Exception','103':'Already Initialized','112':'Termination Before Init','113':'Termination After Termination','122':'Retrieve Data Before Init','132':'Store Data Before Init','142':'Commit Before Init','401':'Undefined Data Model'}[c]||'Unknown Error'; },
    GetDiagnostic: function(c) { return c||''; }
  };
})();
<\/script>`;
}

function buildScormScript(initData: ScormInitData, version: string): string {
  if (version.startsWith("2004")) return buildScorm2004Script(initData);
  return buildScorm12Script(initData);
}

// ─── MIME type helper ────────────────────────────────────────────────────────

function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    html: "text/html", htm: "text/html",
    js: "application/javascript", mjs: "application/javascript",
    css: "text/css",
    json: "application/json",
    xml: "application/xml",
    svg: "image/svg+xml",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", ico: "image/x-icon",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
    mp3: "audio/mpeg", mp4: "video/mp4", webm: "video/webm",
    wav: "audio/wav", ogg: "audio/ogg",
    pdf: "application/pdf",
    swf: "application/x-shockwave-flash",
    dat: "application/octet-stream",
  };
  return mimeMap[ext] || "application/octet-stream";
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Server misconfiguration", { status: 500, headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 0: Serve HTML with injected SCORM API (GET /_serve_/TOKEN/path)
  // Downloads HTML from storage, injects <base>, SCORM API, returns text/html
  // ═══════════════════════════════════════════════════════════════════════════
  if (req.method === "GET") {
    const serveInfo = extractServeInfo(reqUrl.pathname);
    if (serveInfo) {
      const tokenPayload = await verifySessionToken(serveInfo.token, serviceRoleKey);
      if (!tokenPayload) {
        return new Response("<html><body><h1>Session expired</h1></body></html>", {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const storagePath = `${tokenPayload.folderPath}/${serveInfo.entryPath}`;

      // Download HTML from storage
      const { data: fileData, error: dlError } = await adminClient.storage
        .from("scorm-packages")
        .download(storagePath);

      if (dlError || !fileData) {
        return new Response("<html><body><h1>File not found</h1></body></html>", {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const rawBytes = await fileData.arrayBuffer();
      let html = new TextDecoder("utf-8").decode(rawBytes);

      // Parse query params for SCORM init data and version
      const version = reqUrl.searchParams.get("v") || "1.2";
      const initB64 = reqUrl.searchParams.get("d");
      let initData: ScormInitData = {};
      if (initB64) {
        try {
          initData = JSON.parse(atob(initB64));
        } catch { /* ignore parse errors */ }
      }

      // Build base URL for sub-resource loading via path-based token proxy
      const entryDir = serveInfo.entryPath.includes("/")
        ? serveInfo.entryPath.substring(0, serveInfo.entryPath.lastIndexOf("/") + 1)
        : "";
      const encodedToken = encodeURIComponent(serveInfo.token);
      const basePath = entryDir
        ? `${supabaseUrl}/functions/v1/scorm-proxy/_t_/${encodedToken}/${entryDir}`
        : `${supabaseUrl}/functions/v1/scorm-proxy/_t_/${encodedToken}/`;
      const baseHref = basePath.endsWith("/") ? basePath : basePath + "/";

      // Build injections
      const scormScript = buildScormScript(initData, version);
      const baseTag = `<base href="${baseHref}">`;
      const metaCharset = `<meta charset="UTF-8">`;

      // Inject into HTML
      if (html.match(/<head[^>]*>/i)) {
        html = html.replace(/<head[^>]*>/i, `$&\n${metaCharset}\n${baseTag}\n${scormScript}`);
      } else if (html.match(/<html[^>]*>/i)) {
        html = html.replace(/<html[^>]*>/i, `$&\n<head>${metaCharset}\n${baseTag}\n${scormScript}</head>`);
      } else {
        html = `<!DOCTYPE html><html><head>${metaCharset}\n${baseTag}\n${scormScript}</head><body>${html}</body></html>`;
      }

      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-cache",
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 1: Token-based redirect (GET /_t_/TOKEN/path or ?t=TOKEN)
  // ═══════════════════════════════════════════════════════════════════════════
  if (req.method === "GET") {
    const tokenInfo = extractPathToken(reqUrl.pathname) || extractQueryToken(reqUrl);

    if (tokenInfo) {
      const tokenPayload = await verifySessionToken(tokenInfo.token, serviceRoleKey);
      if (!tokenPayload) {
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const subPath = tokenInfo.subPath.replace(/^\/+/, "").replace(/\/+$/, "");
      const storagePath = subPath
        ? `${tokenPayload.folderPath}/${subPath}`
        : tokenPayload.folderPath;

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
        .from("scorm-packages")
        .createSignedUrl(storagePath, 300);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        return new Response("File not found", { status: 404, headers: corsHeaders });
      }

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: signedUrlData.signedUrl,
          "Cache-Control": "private, max-age=240",
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2: Authenticated JSON API (POST with Authorization header)
  // ═══════════════════════════════════════════════════════════════════════════
  if (req.method === "POST") {
    const userId = await authenticateRequest(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: {
      action: string;
      folderPath: string;
      filePath?: string;
      courseId: string;
      packageId?: string;
    };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const hasAccess = await verifyAccess(adminClient, userId, body.courseId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Not enrolled in this course" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: sign ──
    if (body.action === "sign") {
      const storagePath = body.filePath
        ? `${body.folderPath}/${body.filePath}`
        : body.folderPath;

      const { data, error } = await adminClient.storage
        .from("scorm-packages")
        .createSignedUrl(storagePath, 300);

      if (error || !data?.signedUrl) {
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await createSessionToken(
        {
          userId,
          courseId: body.courseId,
          folderPath: body.folderPath,
          exp: Date.now() + 5 * 60 * 1000,
        },
        serviceRoleKey,
      );

      const proxyBase = `${supabaseUrl}/functions/v1/scorm-proxy`;

      return new Response(
        JSON.stringify({
          signedUrl: data.signedUrl,
          sessionToken: token,
          baseRedirectUrl: proxyBase,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── ACTION: list ──
    if (body.action === "list") {
      const listPath = body.folderPath.replace(/\/+$/, "");
      const subPath = body.filePath ? `${listPath}/${body.filePath}` : listPath;
      const { data, error } = await adminClient.storage
        .from("scorm-packages")
        .list(subPath, { limit: 500 });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data || []), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: parse-manifest ──
    if (body.action === "parse-manifest") {
      const manifestPath = `${body.folderPath}/imsmanifest.xml`;

      let fileData: Blob | null = null;
      let actualManifestDir = "";

      // Try root first
      const { data: rootData, error: rootError } = await adminClient.storage
        .from("scorm-packages")
        .download(manifestPath);

      if (!rootError && rootData) {
        fileData = rootData;
      } else {
        // Search one level of subdirectories for imsmanifest.xml
        const { data: entries } = await adminClient.storage
          .from("scorm-packages")
          .list(body.folderPath, { limit: 100 });

        if (entries) {
          for (const entry of entries) {
            // Check if it's a folder (no metadata means folder)
            if (!entry.metadata) {
              const subManifestPath = `${body.folderPath}/${entry.name}/imsmanifest.xml`;
              const { data: subData, error: subError } = await adminClient.storage
                .from("scorm-packages")
                .download(subManifestPath);
              if (!subError && subData) {
                fileData = subData;
                actualManifestDir = entry.name;
                break;
              }
            }
          }
        }
      }

      if (!fileData) {
        return new Response(JSON.stringify({ error: "imsmanifest.xml not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const xmlContent = await fileData.text();
      const manifest = parseManifestXml(xmlContent);

      if (!manifest) {
        return new Response(JSON.stringify({ error: "Failed to parse manifest" }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prepend subdirectory to SCO paths if manifest was in a subfolder
      if (actualManifestDir) {
        for (const sco of manifest.scos) {
          sco.launchPath = `${actualManifestDir}/${sco.launchPath}`;
        }
      }

      if (body.packageId) {
        await adminClient
          .from("scorm_packages")
          .update({
            manifest_data: manifest as any,
            scorm_version: manifest.version,
            entry_point: manifest.scos.length > 0 ? manifest.scos[0].launchPath : null,
          })
          .eq("id", body.packageId);

        await adminClient
          .from("scorm_scos")
          .delete()
          .eq("package_id", body.packageId);

        if (manifest.scos.length > 0) {
          const scoRows = manifest.scos.map((sco) => ({
            package_id: body.packageId!,
            identifier: sco.identifier,
            title: sco.title,
            launch_path: sco.launchPath,
            parameters: sco.parameters || null,
            order_index: sco.orderIndex,
            scorm_type: sco.scormType,
          }));

          await adminClient.from("scorm_scos").insert(scoRows);
        }
      }

      return new Response(JSON.stringify(manifest), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
