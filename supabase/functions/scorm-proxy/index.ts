import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Stateless session token (HMAC-SHA256) ───────────────────────────────────

interface SessionTokenPayload {
  userId: string;
  courseId: string;
  folderPath: string;
  exp: number;
}

async function createSessionToken(
  payload: SessionTokenPayload,
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
): Promise<SessionTokenPayload | null> {
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

// ─── Learner info helper ─────────────────────────────────────────────────────

async function getLearnerInfo(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ id: string; name: string }> {
  try {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("first_name, last_name, tc_identity")
      .eq("user_id", userId)
      .maybeSingle();
    if (profile) {
      return {
        id: profile.tc_identity || userId,
        name: `${profile.last_name || ""}, ${profile.first_name || ""}`.trim(),
      };
    }
  } catch { /* fallback */ }
  return { id: userId, name: "" };
}

// ─── Manifest parser ─────────────────────────────────────────────────────────

interface ParsedSco {
  identifier: string;
  title: string;
  launchPath: string;
  parameters?: string;
  orderIndex: number;
  scormType: string;
  masteryScore?: number;
  maxTimeAllowed?: string;
  timeLimitAction?: string;
  dataFromLms?: string;
  completionThreshold?: number;
  scaledPassingScore?: number;
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
    const itemRegex = /<item\s+([^>]*)>([\s\S]*?)<\/item>/gi;
    while ((match = itemRegex.exec(xmlContent)) !== null) {
      const attrs = match[1];
      const itemContent = match[2];
      const titleMatch = itemContent.match(/<title>([^<]*)<\/title>/i);
      const itemTitle = titleMatch ? titleMatch[1].trim() : "";
      const identifier = getAttr(attrs, "identifier") || `item_${scos.length}`;
      const identifierref = getAttr(attrs, "identifierref");
      const parameters = getAttr(attrs, "parameters");

      if (identifierref && resourceMap.has(identifierref)) {
        const resource = resourceMap.get(identifierref)!;
        if (resource.href) {
          const sco: ParsedSco = {
            identifier,
            title: itemTitle || identifier,
            launchPath: resource.href,
            parameters: parameters || undefined,
            orderIndex: scos.length,
            scormType: resource.type === "asset" ? "asset" : "sco",
          };

          const msMatch = itemContent.match(/<adlcp:masteryscore[^>]*>([^<]*)<\/adlcp:masteryscore>/i);
          if (msMatch) { const val = parseFloat(msMatch[1].trim()); if (!isNaN(val)) sco.masteryScore = val; }
          const mtaMatch = itemContent.match(/<adlcp:maxtimeallowed[^>]*>([^<]*)<\/adlcp:maxtimeallowed>/i);
          if (mtaMatch) sco.maxTimeAllowed = mtaMatch[1].trim();
          const tlaMatch = itemContent.match(/<adlcp:timelimitaction[^>]*>([^<]*)<\/adlcp:timelimitaction>/i);
          if (tlaMatch) sco.timeLimitAction = tlaMatch[1].trim();
          const dflMatch = itemContent.match(/<adlcp:datafromlms[^>]*>([^<]*)<\/adlcp:datafromlms>/i);
          if (dflMatch) sco.dataFromLms = dflMatch[1].trim();
          const ctMatch = itemContent.match(/<adlcp:completionThreshold[^>]*minProgressMeasure\s*=\s*["']([^"']*)["']/i);
          if (ctMatch) { const val = parseFloat(ctMatch[1]); if (!isNaN(val)) sco.completionThreshold = val; }
          const spsMatch = itemContent.match(/<imsss:minNormalizedMeasure[^>]*>([^<]*)<\/imsss:minNormalizedMeasure>/i);
          if (spsMatch) { const val = parseFloat(spsMatch[1].trim()); if (!isNaN(val)) sco.scaledPassingScore = val; }

          scos.push(sco);
        }
      }
    }

    if (scos.length === 0) {
      let idx = 0;
      for (const [id, res] of resourceMap) {
        if (res.href && (res.href.endsWith(".html") || res.href.endsWith(".htm"))) {
          scos.push({ identifier: id, title: id, launchPath: res.href, orderIndex: idx++, scormType: res.type === "asset" ? "asset" : "sco" });
        }
      }
    }

    return { version, defaultOrganization: defaultOrg, scos, title };
  } catch {
    return null;
  }
}

function detectScormVersion(xml: string): string {
  const normalizedXml = xml.toLowerCase();
  const manifestTag = normalizedXml.match(/<manifest\b[^>]*>/i)?.[0] || "";
  const schemaVersion = normalizedXml.match(/<schemaversion>\s*([^<]+)\s*<\/schemaversion>/i)?.[1]?.trim() || "";
  const schema = normalizedXml.match(/<schema>\s*([^<]+)\s*<\/schema>/i)?.[1]?.trim() || "";

  const hasScorm2004Markers =
    /adlcp_v1p3|adlseq_v1p3|adlnav_v1p3|imsss/.test(normalizedXml) ||
    manifestTag.includes("adlseq") || manifestTag.includes("imsss") ||
    schemaVersion.includes("2004") || schemaVersion === "cam 1.3" || schema.includes("2004");

  const hasScorm12Markers =
    /adlcp_rootv1p2|adlcp_rootv1p1/.test(normalizedXml) ||
    schemaVersion === "1.2" || schemaVersion.includes("1.2");

  if (hasScorm12Markers && !hasScorm2004Markers) return "1.2";
  if (hasScorm2004Markers) return "2004";
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

// ─── MIME type helper ────────────────────────────────────────────────────────

function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    html: "text/html", htm: "text/html",
    js: "application/javascript", mjs: "application/javascript",
    css: "text/css", json: "application/json", xml: "application/xml",
    svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp", ico: "image/x-icon",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf",
    mp3: "audio/mpeg", mp4: "video/mp4", webm: "video/webm",
    wav: "audio/wav", ogg: "audio/ogg", pdf: "application/pdf",
    swf: "application/x-shockwave-flash", dat: "application/octet-stream",
    lottie: "application/json",
  };
  return mimeMap[ext] || "application/octet-stream";
}

function isHtmlFile(filePath: string): boolean {
  const normalizedPath = filePath.split("?")[0].toLowerCase();
  return normalizedPath.endsWith(".html") || normalizedPath.endsWith(".htm");
}

// ─── Token extraction helpers ────────────────────────────────────────────────

function extractPathToken(pathname: string, marker: string): { token: string; subPath: string } | null {
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;
  const afterMarker = pathname.slice(idx + marker.length);
  const firstSlash = afterMarker.indexOf("/");
  if (firstSlash === -1) return { token: decodeURIComponent(afterMarker), subPath: "" };
  return {
    token: decodeURIComponent(afterMarker.substring(0, firstSlash)),
    subPath: decodeURIComponent(afterMarker.substring(firstSlash + 1)).replace(/^\/?(?:___\/)+/, ""),
  };
}

// ─── SCORM API script builders ───────────────────────────────────────────────

interface ScormInitData {
  lesson_status?: string;
  lesson_location?: string;
  suspend_data?: string;
  score_raw?: string;
  total_time?: string;
  student_id?: string;
  student_name?: string;
  launch_data?: string;
  mastery_score?: number;
  max_time_allowed?: string;
  time_limit_action?: string;
  completion_threshold?: number;
  scaled_passing_score?: number;
}

function buildScorm12Api(d: ScormInitData): string {
  return `
  var _init = false, _fin = false, _err = '0';
  var _masteryScore = ${d.mastery_score != null ? d.mastery_score : "null"};
  var cmi = {
    'cmi.core.lesson_status': ${JSON.stringify(d.lesson_status || "not attempted")},
    'cmi.core.lesson_location': ${JSON.stringify(d.lesson_location || "")},
    'cmi.suspend_data': ${JSON.stringify(d.suspend_data || "")},
    'cmi.core.score.raw': ${JSON.stringify(d.score_raw || "")},
    'cmi.core.score.min': '0', 'cmi.core.score.max': '100',
    'cmi.core.total_time': ${JSON.stringify(d.total_time || "0000:00:00")},
    'cmi.core.session_time': '0000:00:00',
    'cmi.core.student_id': ${JSON.stringify(d.student_id || "")},
    'cmi.core.student_name': ${JSON.stringify(d.student_name || "")},
    'cmi.core.credit': 'credit',
    'cmi.core.entry': ${JSON.stringify(d.lesson_status && d.lesson_status !== "not attempted" ? "resume" : "ab-initio")},
    'cmi.core.exit': '', 'cmi.core.lesson_mode': 'normal',
    'cmi.launch_data': ${JSON.stringify(d.launch_data || "")},
    'cmi.comments': '', 'cmi.comments_from_lms': '',
    'cmi.student_data.mastery_score': ${JSON.stringify(d.mastery_score != null ? String(d.mastery_score) : "")},
    'cmi.student_data.max_time_allowed': ${JSON.stringify(d.max_time_allowed || "")},
    'cmi.student_data.time_limit_action': ${JSON.stringify(d.time_limit_action || "")}
  };
  function applyMastery() {
    if (_masteryScore !== null && cmi['cmi.core.score.raw'] !== '') {
      var s = parseFloat(cmi['cmi.core.score.raw']);
      if (!isNaN(s)) cmi['cmi.core.lesson_status'] = s >= _masteryScore ? 'passed' : 'failed';
    }
  }
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
    LMSFinish: function() { if (!_init) { _err = '301'; return 'false'; } applyMastery(); _fin = true; _init = false; _err = '0'; send('LMSFinish'); return 'true'; },
    LMSGetValue: function(el) { if (!_init) { _err = '301'; return ''; } _err = '0'; if (el in cmi) return cmi[el]; if (el.match(/_count$/)) return '0'; return ''; },
    LMSSetValue: function(el, v) { if (!_init) { _err = '301'; return 'false'; } _err = '0'; cmi[el] = v; if (el === 'cmi.core.score.raw') applyMastery(); return 'true'; },
    LMSCommit: function() { if (!_init) { _err = '301'; return 'false'; } _err = '0'; applyMastery(); send('LMSCommit'); return 'true'; },
    LMSGetLastError: function() { return _err; },
    LMSGetErrorString: function(c) { return {'0':'No Error','101':'General Exception','301':'Not initialized','401':'Not implemented'}[c]||'Unknown'; },
    LMSGetDiagnostic: function(c) { return c||''; }
  };`;
}

function buildScorm2004Api(d: ScormInitData): string {
  const cs = (d.lesson_status === "completed" || d.lesson_status === "passed") ? "completed"
    : d.lesson_status === "incomplete" ? "incomplete" : "unknown";
  const ss = d.lesson_status === "passed" ? "passed" : d.lesson_status === "failed" ? "failed" : "unknown";
  const tp = (d.total_time || "0000:00:00").split(":");
  const isoT = tp.length === 3 ? "PT" + parseInt(tp[0]) + "H" + parseInt(tp[1]) + "M" + parseInt(tp[2]) + "S" : "PT0S";

  return `
  var _init = false, _term = false, _err = '0';
  var _scaledPassingScore = ${d.scaled_passing_score != null ? d.scaled_passing_score : "null"};
  var _completionThreshold = ${d.completion_threshold != null ? d.completion_threshold : "null"};
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
    'cmi.learner_id': ${JSON.stringify(d.student_id || "")},
    'cmi.learner_name': ${JSON.stringify(d.student_name || "")},
    'cmi.credit': 'credit',
    'cmi.entry': ${JSON.stringify(cs !== "unknown" ? "resume" : "ab-initio")},
    'cmi.exit': '', 'cmi.mode': 'normal',
    'cmi.launch_data': ${JSON.stringify(d.launch_data || "")},
    'cmi.comments_from_learner._count': '0', 'cmi.comments_from_lms._count': '0',
    'cmi.interactions._count': '0', 'cmi.objectives._count': '0',
    'cmi.learner_preference.audio_level': '1', 'cmi.learner_preference.language': '',
    'cmi.learner_preference.delivery_speed': '1', 'cmi.learner_preference.audio_captioning': '0',
    'cmi.completion_threshold': ${JSON.stringify(d.completion_threshold != null ? String(d.completion_threshold) : "")},
    'cmi.scaled_passing_score': ${JSON.stringify(d.scaled_passing_score != null ? String(d.scaled_passing_score) : "")},
    'cmi.progress_measure': '',
    'adl.nav.request': '_none_'
  };
  function applyLogic() {
    if (_scaledPassingScore !== null && cmi['cmi.score.scaled'] !== '') {
      var sc = parseFloat(cmi['cmi.score.scaled']);
      if (!isNaN(sc)) cmi['cmi.success_status'] = sc >= _scaledPassingScore ? 'passed' : 'failed';
    }
    if (_completionThreshold !== null && cmi['cmi.progress_measure'] !== '') {
      var pm = parseFloat(cmi['cmi.progress_measure']);
      if (!isNaN(pm)) cmi['cmi.completion_status'] = pm >= _completionThreshold ? 'completed' : 'incomplete';
    }
  }
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
    Terminate: function() { if (!_init) { _err='112'; return 'false'; } if (_term) { _err='113'; return 'false'; } applyLogic(); _term=true; _init=false; _err='0'; send('Terminate'); return 'true'; },
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
      if (el === 'cmi.score.scaled' || el === 'cmi.score.raw' || el === 'cmi.progress_measure') {
        if (el === 'cmi.score.raw' && v !== '') { var r=parseFloat(v); if (!isNaN(r)) cmi['cmi.score.scaled']=String(r/100); }
        applyLogic();
      }
      return 'true';
    },
    Commit: function() { if (!_init) { _err='142'; return 'false'; } _err='0'; applyLogic(); send('Commit'); return 'true'; },
    GetLastError: function() { return _err; },
    GetErrorString: function(c) { return {'0':'No Error','101':'General Exception','103':'Already Initialized','112':'Termination Before Init','113':'Termination After Termination','122':'Retrieve Data Before Init','132':'Store Data Before Init','142':'Commit Before Init','401':'Undefined Data Model'}[c]||'Unknown Error'; },
    GetDiagnostic: function(c) { return c||''; }
  };`;
}

// ─── Wrapper HTML builder ────────────────────────────────────────────────────
// This is the KEY change: instead of injecting SCORM API into every HTML page,
// we serve a wrapper page that CONTAINS the SCORM API and loads content in a
// child iframe. The SCORM content finds the API by walking up window.parent
// (standard SCORM API discovery). Internal redirects within the content iframe
// never lose the API because it lives in the parent wrapper frame.

function buildWrapperHtml(
  contentUrl: string,
  initData: ScormInitData,
  version: string,
): string {
  const apiCode = version.startsWith("2004")
    ? buildScorm2004Api(initData)
    : buildScorm12Api(initData);

  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SCORM Player</title>
<style>
html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#fff}
iframe{width:100%;height:100%;border:0;display:block}
</style>
<script>
(function(){
${apiCode}
})();
</script>
</head>
<body>
<iframe id="scorm-content" src="${contentUrl}" allow="fullscreen autoplay" allowfullscreen></iframe>
</body>
</html>`;
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
  // MODE 0: WRAPPER — GET /_wrapper_/TOKEN/entryFile?v=...&d=...&m=...
  // Serves a wrapper HTML page with SCORM API defined.
  // Content loads in a child iframe via /_r_/TOKEN/entryFile (same origin).
  // SCORM content discovers API by walking window.parent — standard behavior.
  // ═══════════════════════════════════════════════════════════════════════════
  if (req.method === "GET") {
    const wrapperInfo = extractPathToken(reqUrl.pathname, "/_wrapper_/");
    if (wrapperInfo && wrapperInfo.subPath) {
      console.log("[WRAPPER] Entry:", wrapperInfo.subPath);

      const tokenPayload = await verifySessionToken(wrapperInfo.token, serviceRoleKey);
      if (!tokenPayload) {
        return new Response("<html><body><h1>Session expired</h1></body></html>", {
          status: 403, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const learnerInfo = await getLearnerInfo(adminClient, tokenPayload.userId);

      // Parse init data and SCO metadata from query params
      let initData: ScormInitData = {};
      const initB64 = reqUrl.searchParams.get("d");
      if (initB64) { try { initData = JSON.parse(atob(initB64)); } catch {} }
      const scoMeta = reqUrl.searchParams.get("m");
      if (scoMeta) {
        try {
          const meta = JSON.parse(atob(scoMeta));
          if (meta.mastery_score != null) initData.mastery_score = meta.mastery_score;
          if (meta.max_time_allowed) initData.max_time_allowed = meta.max_time_allowed;
          if (meta.time_limit_action) initData.time_limit_action = meta.time_limit_action;
          if (meta.launch_data) initData.launch_data = meta.launch_data;
          if (meta.completion_threshold != null) initData.completion_threshold = meta.completion_threshold;
          if (meta.scaled_passing_score != null) initData.scaled_passing_score = meta.scaled_passing_score;
        } catch {}
      }

      initData.student_id = learnerInfo.id;
      initData.student_name = learnerInfo.name;

      const version = reqUrl.searchParams.get("v") || "1.2";

      // Build content URL — points to /_r_/ which serves raw content (no API injection)
      const encodedToken = encodeURIComponent(wrapperInfo.token);
      const contentUrl = `${supabaseUrl}/functions/v1/scorm-proxy/_r_/${encodedToken}/${wrapperInfo.subPath}`;

      const html = buildWrapperHtml(contentUrl, initData, version);
      return new Response(html, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-cache" },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 1: RAW CONTENT — GET /_r_/TOKEN/path
  // Serves HTML with <base> tag for relative URLs (NO SCORM API injection).
  // Non-HTML files redirect to signed storage URLs.
  // The SCORM content in this frame finds API via window.parent (the wrapper).
  // ═══════════════════════════════════════════════════════════════════════════
  if (req.method === "GET") {
    const rawInfo = extractPathToken(reqUrl.pathname, "/_r_/");
    if (rawInfo) {
      const tokenPayload = await verifySessionToken(rawInfo.token, serviceRoleKey);
      if (!tokenPayload) {
        return new Response("Session expired", { status: 403, headers: corsHeaders });
      }

      const subPath = rawInfo.subPath.replace(/^\/+/, "").replace(/\/+$/, "");
      if (!subPath) {
        return new Response("No file path", { status: 400, headers: corsHeaders });
      }

      const storagePath = `${tokenPayload.folderPath}/${subPath}`;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      // For HTML files: download, inject <base> tag only (NOT SCORM API), serve as text/html
      if (isHtmlFile(subPath)) {
        console.log("[RAW-HTML] Serving:", subPath);

        const { data: fileData, error: dlError } = await adminClient.storage
          .from("scorm-packages")
          .download(storagePath);

        if (dlError || !fileData) {
          console.error("[RAW-HTML] Not found:", storagePath);
          return new Response(`<html><body><h1>File not found</h1><p>${storagePath}</p></body></html>`, {
            status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
          });
        }

        let html = new TextDecoder("utf-8").decode(await fileData.arrayBuffer());

        // Inject <base> tag so relative URLs resolve through /_r_/ path
        const entryDir = subPath.includes("/") ? subPath.substring(0, subPath.lastIndexOf("/") + 1) : "";
        const encodedToken = encodeURIComponent(rawInfo.token);
        const basePath = entryDir
          ? `${supabaseUrl}/functions/v1/scorm-proxy/_r_/${encodedToken}/${entryDir}`
          : `${supabaseUrl}/functions/v1/scorm-proxy/_r_/${encodedToken}/`;
        const baseHref = basePath.endsWith("/") ? basePath : `${basePath}/`;
        const baseTag = `<base href="${baseHref}">`;

        if (html.match(/<head[^>]*>/i)) {
          html = html.replace(/<head[^>]*>/i, `$&\n<meta charset="UTF-8">\n${baseTag}`);
        } else if (html.match(/<html[^>]*>/i)) {
          html = html.replace(/<html[^>]*>/i, `$&\n<head><meta charset="UTF-8">\n${baseTag}</head>`);
        } else {
          html = `<!DOCTYPE html><html><head><meta charset="UTF-8">\n${baseTag}</head><body>${html}</body></html>`;
        }

        return new Response(html, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-cache" },
        });
      }

      // For non-HTML files: redirect to signed storage URL
      const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
        .from("scorm-packages")
        .createSignedUrl(storagePath, 600);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("[RAW] Not found:", storagePath);
        return new Response("File not found", { status: 404, headers: corsHeaders });
      }

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: signedUrlData.signedUrl, "Cache-Control": "private, max-age=300" },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY: /_serve_/ and /_t_/ paths — redirect to new /_wrapper_/ and /_r_/
  // ═══════════════════════════════════════════════════════════════════════════
  if (req.method === "GET") {
    const serveInfo = extractPathToken(reqUrl.pathname, "/_serve_/");
    if (serveInfo && serveInfo.subPath) {
      const qs = reqUrl.search || "";
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: `${supabaseUrl}/functions/v1/scorm-proxy/_wrapper_/${encodeURIComponent(serveInfo.token)}/${serveInfo.subPath}${qs}` },
      });
    }

    const tInfo = extractPathToken(reqUrl.pathname, "/_t_/");
    if (tInfo) {
      const qs = reqUrl.search || "";
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: `${supabaseUrl}/functions/v1/scorm-proxy/_r_/${encodeURIComponent(tInfo.token)}/${tInfo.subPath}${qs}` },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { action: string; folderPath: string; filePath?: string; courseId: string; packageId?: string };
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const hasAccess = await verifyAccess(adminClient, userId, body.courseId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Not enrolled in this course" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: sign ──
    if (body.action === "sign") {
      const storagePath = body.filePath ? `${body.folderPath}/${body.filePath}` : body.folderPath;
      const { data, error } = await adminClient.storage.from("scorm-packages").createSignedUrl(storagePath, 300);
      if (error || !data?.signedUrl) {
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await createSessionToken(
        { userId, courseId: body.courseId, folderPath: body.folderPath, exp: Date.now() + 10 * 60 * 1000 },
        serviceRoleKey,
      );

      return new Response(JSON.stringify({ signedUrl: data.signedUrl, sessionToken: token }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: list ──
    if (body.action === "list") {
      const listPath = body.folderPath.replace(/\/+$/, "");
      const subPath = body.filePath ? `${listPath}/${body.filePath}` : listPath;
      const { data, error } = await adminClient.storage.from("scorm-packages").list(subPath, { limit: 500 });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data || []), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: parse-manifest ──
    if (body.action === "parse-manifest") {
      const manifestPath = `${body.folderPath}/imsmanifest.xml`;
      let fileData: Blob | null = null;
      let actualManifestDir = "";

      const { data: rootData, error: rootError } = await adminClient.storage.from("scorm-packages").download(manifestPath);
      if (!rootError && rootData) {
        fileData = rootData;
      } else {
        const { data: entries } = await adminClient.storage.from("scorm-packages").list(body.folderPath, { limit: 100 });
        if (entries) {
          for (const entry of entries) {
            if (!entry.metadata) {
              const subManifestPath = `${body.folderPath}/${entry.name}/imsmanifest.xml`;
              const { data: subData, error: subError } = await adminClient.storage.from("scorm-packages").download(subManifestPath);
              if (!subError && subData) { fileData = subData; actualManifestDir = entry.name; break; }
            }
          }
        }
      }

      if (!fileData) {
        return new Response(JSON.stringify({ error: "imsmanifest.xml not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const xmlContent = await fileData.text();
      const manifest = parseManifestXml(xmlContent);
      if (!manifest) {
        return new Response(JSON.stringify({ error: "Failed to parse manifest" }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (actualManifestDir) {
        for (const sco of manifest.scos) { sco.launchPath = `${actualManifestDir}/${sco.launchPath}`; }
      }

      if (body.packageId) {
        await adminClient.from("scorm_packages").update({
          manifest_data: manifest as unknown as Record<string, unknown>,
          scorm_version: manifest.version,
          entry_point: manifest.scos.length > 0 ? manifest.scos[0].launchPath : null,
        }).eq("id", body.packageId);

        await adminClient.from("scorm_scos").delete().eq("package_id", body.packageId);
        if (manifest.scos.length > 0) {
          const scoRows = manifest.scos.map((sco) => ({
            package_id: body.packageId!, identifier: sco.identifier, title: sco.title,
            launch_path: sco.launchPath, parameters: sco.parameters || null,
            order_index: sco.orderIndex, scorm_type: sco.scormType,
          }));
          await adminClient.from("scorm_scos").insert(scoRows);
        }
      }

      return new Response(JSON.stringify(manifest), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
