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
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
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
  // MODE 1: Token-based redirect (GET with ?t= parameter)
  // Used by <base> tag for sub-resource loading — NO auth header required
  // Returns 302 redirect to a signed storage URL
  // ═══════════════════════════════════════════════════════════════════════════
  const sessionToken = reqUrl.searchParams.get("t");
  if (sessionToken && req.method === "GET") {
    const tokenPayload = await verifySessionToken(sessionToken, serviceRoleKey);
    if (!tokenPayload) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the sub-resource path from the URL
    const marker = "/scorm-proxy/";
    const markerIndex = reqUrl.pathname.indexOf(marker);
    let subPath = "";
    if (markerIndex !== -1) {
      subPath = decodeURIComponent(reqUrl.pathname.slice(markerIndex + marker.length));
      subPath = subPath.replace(/^\/?(?:___\/)+/, "");
    }

    // Build full storage path
    const storagePath = subPath
      ? `${tokenPayload.folderPath}/${subPath}`
      : tokenPayload.folderPath;

    console.log("scorm-proxy redirect:", storagePath);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("scorm-packages")
      .createSignedUrl(storagePath, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return new Response("File not found", { status: 404, headers: corsHeaders });
    }

    // 302 redirect — no file streaming
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: signedUrlData.signedUrl,
        "Cache-Control": "private, max-age=240",
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2: Authenticated JSON API (POST with Authorization header)
  // Returns signed URL + session token for SCORM player initialization
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

    // Verify enrollment
    const hasAccess = await verifyAccess(adminClient, userId, body.courseId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Not enrolled in this course" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: sign — return signed URL for a specific file ──
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

      // Generate session token for sub-resource loading (5 min expiry)
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

    // ── ACTION: list — return directory listing ──
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
