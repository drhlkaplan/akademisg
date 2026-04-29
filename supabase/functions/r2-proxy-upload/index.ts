// Cloudflare R2 — server-side proxy upload (avoids browser CORS to R2)
// Admin uploads one file per request. Body = raw file bytes.
// Headers: x-r2-key (target object key), content-type
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-r2-key, x-r2-prefix",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-r2-key, x-r2-etag",
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
async function sha256Hex(data: Uint8Array | string): Promise<string> {
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
function uriEncodeKey(key: string): string {
  return "/" + key.split("/").map((s) =>
    encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
  ).join("/");
}

async function putToR2(key: string, body: Uint8Array, contentType: string): Promise<Response> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const credential = `${ACCESS_KEY}/${date}/${REGION}/${SERVICE}/aws4_request`;
  // R2 path-style: /<bucket>/<key>
  const canonicalUri = uriEncodeKey(`${BUCKET}/${key}`);
  const payloadHash = await sha256Hex(body);

  const headers: Record<string, string> = {
    "host": HOST,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const sortedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headers[k]}\n`).join("");
  const signedHeaders = sortedHeaderKeys.join(";");

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
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

  const authHeader = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`https://${HOST}${canonicalUri}`, {
    method: "PUT",
    headers: {
      "Authorization": authHeader,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    body,
  });
}

function sanitizeKey(k: string): string {
  return k.split("/").map((s) => s.replace(/[^a-zA-Z0-9._-]/g, "_")).join("/").replace(/^\/+|\/+$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const rawKey = req.headers.get("x-r2-key");
    if (!rawKey) throw new Error("Missing x-r2-key header");
    const key = sanitizeKey(rawKey);
    if (!key) throw new Error("Invalid key");

    const contentType = req.headers.get("content-type") || "application/octet-stream";
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength === 0) throw new Error("Empty body");

    const r2res = await putToR2(key, buf, contentType);
    if (!r2res.ok) {
      const text = await r2res.text().catch(() => "");
      console.error("[r2-proxy-upload] R2 PUT failed", r2res.status, text.slice(0, 500));
      return new Response(JSON.stringify({ error: `R2 PUT ${r2res.status}: ${text.slice(0, 300)}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const etag = r2res.headers.get("etag") || "";
    const publicBase = (Deno.env.get("R2_PUBLIC_URL") || "").replace(/\/+$/, "");
    const publicUrl = publicBase ? `${publicBase}/${key}` : null;

    return new Response(JSON.stringify({ ok: true, key, bucket: BUCKET, etag, publicUrl, size: buf.byteLength }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-r2-key": key, "x-r2-etag": etag },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[r2-proxy-upload]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
