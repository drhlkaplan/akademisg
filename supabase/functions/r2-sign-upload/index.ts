// Cloudflare R2 — signed PUT URL generator (AWS SigV4)
// Admin verifies token, then we return time-limited PUT URL for each file path.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
const ACCESS_KEY = Deno.env.get("R2_ACCESS_KEY_ID")!;
const SECRET_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
const BUCKET = Deno.env.get("R2_BUCKET_NAME")!;
const REGION = "auto";
const SERVICE = "s3";
const HOST = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── SigV4 helpers ─────────────────────────────────────────────
const enc = new TextEncoder();
async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === "string" ? enc.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(msg));
}
async function signingKey(date: string): Promise<ArrayBuffer> {
  const kDate = await hmac(enc.encode(`AWS4${SECRET_KEY}`), date);
  const kRegion = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}
function uriEncode(s: string, encodeSlash = true): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) =>
    "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  ).replace(/%2F/g, encodeSlash ? "%2F" : "/");
}

async function presignPutUrl(key: string, contentType: string, expiresSec = 900): Promise<string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const credential = `${ACCESS_KEY}/${date}/${REGION}/${SERVICE}/aws4_request`;
  const canonicalUri = "/" + key.split("/").map((s) => uriEncode(s, false)).join("/");
  // Note: Content-Type must be SIGNED via the signed-headers list AND sent by client at upload time
  const signedHeaders = "host";
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSec),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(params[k])}`)
    .join("&");
  const canonicalHeaders = `host:${HOST}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    `${date}/${REGION}/${SERVICE}/aws4_request`,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const sigKey = await signingKey(date);
  const sigBuf = await hmac(sigKey, stringToSign);
  const signature = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `https://${HOST}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

// ── Handler ───────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify caller is admin
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Missing authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) throw new Error("Admin only");

    const body = await req.json();
    const { files, packagePrefix } = body as {
      files: Array<{ path: string; contentType: string }>;
      packagePrefix: string;
    };
    if (!Array.isArray(files) || !packagePrefix) throw new Error("Invalid payload");

    const safePrefix = packagePrefix.replace(/[^a-zA-Z0-9/_-]/g, "_").replace(/^\/+|\/+$/g, "");
    const signed = await Promise.all(files.map(async (f) => {
      const safePath = f.path.split("/").map((s) => s.replace(/[^a-zA-Z0-9._-]/g, "_")).join("/");
      const key = `${safePrefix}/${safePath}`;
      const url = await presignPutUrl(key, f.contentType || "application/octet-stream");
      return { path: f.path, key, url, contentType: f.contentType };
    }));

    return new Response(JSON.stringify({ signed, bucket: BUCKET, prefix: safePrefix }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[r2-sign-upload]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
