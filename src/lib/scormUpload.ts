// Shared helpers for converting a SCORM .zip into an extracted R2-hosted package
// and creating a corresponding `scorm_packages` row.
//
// Mirrors the upload pipeline in `src/components/admin/LessonManagement.tsx`
// so we can reuse it from the Topic4 SCORM Check screen.

import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

function sanitizePathSegment(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

export function sanitizeRelativePath(path: string): string {
  return path.split("/").filter(Boolean).map(sanitizePathSegment).join("/");
}

export function detectScormEntryPoint(paths: string[]): string {
  const prioritized = [
    "story.html",
    "story_html5.html",
    "index_lms_html5.html",
    "scormcontent/index.html",
    "index_lms.html",
    "index.html",
    "launch.html",
    "start.html",
    "default.html",
  ];
  const lowerMap = new Map(paths.map((p) => [p.toLowerCase(), p]));
  for (const c of prioritized) {
    const found = lowerMap.get(c);
    if (found) return found;
  }
  return paths.find((p) => /\.html?$/i.test(p)) || "index.html";
}

export function parseManifestXml(xml: string): {
  version: string;
  title?: string;
  entryPoint?: string;
  scos: Array<{ identifier: string; title: string; launchPath: string }>;
} {
  const result = {
    version: "1.2",
    title: undefined as string | undefined,
    entryPoint: undefined as string | undefined,
    scos: [] as Array<{ identifier: string; title: string; launchPath: string }>,
  };
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const schemaVersion = doc.querySelector("metadata schemaversion")?.textContent?.trim() || "";
    const lower = xml.toLowerCase();
    if (schemaVersion.includes("2004") || lower.includes("adlcp_v1p3") || lower.includes("imscp_v1p1")) {
      result.version = "2004";
    }
    result.title =
      doc.querySelector("organization > title")?.textContent?.trim() ||
      doc.querySelector("title")?.textContent?.trim();
    const resources: Record<string, string> = {};
    doc.querySelectorAll("resource").forEach((r) => {
      const id = r.getAttribute("identifier");
      const href = r.getAttribute("href");
      if (id && href) resources[id] = href;
    });
    doc.querySelectorAll("item").forEach((item) => {
      const idRef = item.getAttribute("identifierref");
      if (!idRef || !resources[idRef]) return;
      result.scos.push({
        identifier: item.getAttribute("identifier") || idRef,
        title: item.querySelector("title")?.textContent?.trim() || "SCO",
        launchPath: resources[idRef],
      });
    });
    if (result.scos.length > 0) result.entryPoint = result.scos[0].launchPath;
  } catch (e) {
    console.warn("[manifest] parse error:", e);
  }
  return result;
}

function getContentTypeByPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "text/html", htm: "text/html",
    js: "application/javascript", mjs: "application/javascript",
    css: "text/css", json: "application/json", xml: "application/xml",
    svg: "image/svg+xml", png: "image/png",
    jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", ico: "image/x-icon",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf",
    mp4: "video/mp4", mp3: "audio/mpeg", wav: "audio/wav",
    pdf: "application/pdf", txt: "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}

export interface UploadScormResult {
  packageId: string;
  packageUrl: string;
  entryPoint: string;
}

/**
 * Extract a SCORM .zip (provided as ArrayBuffer/Blob) and upload its files to R2
 * via the `r2-proxy-upload` edge function, then create a `scorm_packages` row
 * (and `scorm_scos` entries when the manifest defines them).
 */
export async function uploadAndCreateScormPackage(
  zipData: ArrayBuffer | Blob,
  courseId: string,
  onProgress?: (percent: number) => void,
): Promise<UploadScormResult> {
  const buf = zipData instanceof Blob ? await zipData.arrayBuffer() : zipData;
  const zip = await JSZip.loadAsync(buf);
  const folderName = `${courseId}/${Date.now()}`;

  const allEntries = Object.keys(zip.files);
  const fileNames = allEntries.filter((name) => !zip.files[name].dir);
  if (fileNames.length === 0) throw new Error("Zip dosyasında yüklenecek dosya bulunamadı.");

  // Detect single root folder wrapper
  let rootPrefix = "";
  const tops = new Set(fileNames.map((f) => f.split("/")[0]));
  if (tops.size === 1) {
    const [single] = [...tops];
    if (single && fileNames.every((f) => f.startsWith(`${single}/`))) {
      rootPrefix = `${single}/`;
    }
  }

  const normalized = fileNames
    .map((f) => (rootPrefix && f.startsWith(rootPrefix) ? f.slice(rootPrefix.length) : f))
    .filter(Boolean);
  const sanitized = normalized.map((p) => sanitizeRelativePath(p));
  const entryPoint = detectScormEntryPoint(sanitized);

  const safePrefix = folderName.replace(/[^a-zA-Z0-9/_-]/g, "_").replace(/^\/+|\/+$/g, "");
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
  const proxyUrl = `https://${projectId}.supabase.co/functions/v1/r2-proxy-upload`;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  let uploaded = 0;
  let publicBase = "";
  const total = fileNames.length;
  const CONCURRENCY = 3;
  const queue: Promise<void>[] = [];

  const uploadOne = async (relPath: string) => {
    const entry = zip.files[relPath];
    if (!entry || entry.dir) return;
    const clean = rootPrefix && relPath.startsWith(rootPrefix) ? relPath.slice(rootPrefix.length) : relPath;
    const sRel = sanitizeRelativePath(clean);
    const fullKey = `${safePrefix}/${sRel}`;
    const ct = getContentTypeByPath(clean);
    const fileBuf = await entry.async("arraybuffer");
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey,
        "Content-Type": ct,
        "x-r2-key": fullKey,
      },
      body: fileBuf,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Proxy upload başarısız (${res.status}): ${clean} ${t.slice(0, 200)}`);
    }
    try {
      const json = await res.json();
      if (!publicBase && typeof json?.publicUrl === "string" && json.key) {
        const idx = json.publicUrl.lastIndexOf("/" + json.key);
        if (idx > 0) publicBase = json.publicUrl.slice(0, idx);
      }
    } catch {
      /* ignore */
    }
    uploaded++;
    onProgress?.(Math.round((uploaded / total) * 90));
  };

  for (const rp of fileNames) {
    queue.push(uploadOne(rp));
    if (queue.length >= CONCURRENCY) {
      await Promise.all(queue);
      queue.length = 0;
    }
  }
  if (queue.length > 0) await Promise.all(queue);

  if (!publicBase) {
    throw new Error("R2_PUBLIC_URL secret tanımlı değil. Cloudflare R2 public domain'i ayarlanmalı.");
  }
  const packageUrl = `${publicBase}/${safePrefix}`;

  const { data: pkg, error: pkgError } = await supabase
    .from("scorm_packages")
    .insert({
      course_id: courseId,
      package_url: packageUrl,
      entry_point: entryPoint,
      scorm_version: "1.2",
    })
    .select()
    .single();
  if (pkgError) throw pkgError;
  onProgress?.(95);

  // Parse manifest if present
  try {
    const manifestEntry = zip.file(`${rootPrefix}imsmanifest.xml`) || zip.file("imsmanifest.xml");
    if (manifestEntry) {
      const xml = await manifestEntry.async("string");
      const parsed = parseManifestXml(xml);
      const update: Record<string, unknown> = { manifest_data: parsed };
      if (parsed.version) update.scorm_version = parsed.version;
      if (parsed.entryPoint) update.entry_point = sanitizeRelativePath(parsed.entryPoint);
      await supabase.from("scorm_packages").update(update).eq("id", pkg.id);
      if (parsed.scos.length > 0) {
        await supabase.from("scorm_scos").insert(
          parsed.scos.map((sco, idx) => ({
            package_id: pkg.id,
            identifier: sco.identifier,
            title: sco.title,
            launch_path: sanitizeRelativePath(sco.launchPath),
            order_index: idx,
            scorm_type: "sco",
          })),
        );
      }
    }
  } catch (e) {
    console.warn("[scorm-upload] manifest parse failed:", e);
  }

  onProgress?.(100);
  return { packageId: pkg.id, packageUrl, entryPoint };
}
