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
  // New path-based token: /scorm-proxy/_t_/ENCODED_TOKEN/rest/of/path
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
  // Legacy query-based token: ?t=TOKEN
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
  // MODE 1: Token-based redirect (GET)
  // Supports both path-based (_t_/TOKEN/path) and query-based (?t=TOKEN)
  // ═══════════════════════════════════════════════════════════════════════════
  if (req.method === "GET") {
    // Try path-based token first, then query-based (backward compat)
    const tokenInfo = extractPathToken(reqUrl.pathname) || extractQueryToken(reqUrl);

    if (tokenInfo) {
      const tokenPayload = await verifySessionToken(tokenInfo.token, serviceRoleKey);
      if (!tokenPayload) {
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build storage path: folderPath + subPath from URL
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

      const { data: fileData, error: downloadError } = await adminClient.storage
        .from("scorm-packages")
        .download(manifestPath);

      if (downloadError || !fileData) {
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
