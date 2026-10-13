/*
 * SCORM same-origin proxy (service worker, scope /scorm-proxy/).
 *
 * Lesson packages live on the SCORM CDN, a different origin. Content loaded from there
 * cannot reach the SCORM API installed in the app window, so progress, completion and
 * resume data were never reported. This worker serves /scorm-proxy/<path> by fetching
 * <CDN>/<path>, making the lesson frame same-origin with the app.
 */
const CDN = "https://scorm.gratisakademi.com";
const PREFIX = "/scorm-proxy/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const PASS_HEADERS = ["range", "accept", "if-none-match", "if-modified-since"];

async function proxy(request) {
  const url = new URL(request.url);
  const target = CDN + "/" + url.pathname.slice(PREFIX.length) + url.search;
  const headers = {};
  for (const h of PASS_HEADERS) {
    const v = request.headers.get(h);
    if (v) headers[h] = v;
  }
  let upstream;
  try {
    upstream = await fetch(target, { mode: "cors", credentials: "omit", headers });
  } catch (e) {
    // CORS blocked (origin not allowed on CDN) — media/scripts can still use an opaque copy
    if (request.mode === "no-cors") return fetch(target, { mode: "no-cors", credentials: "omit" });
    return new Response("SCORM proxy error", { status: 502 });
  }
  // Re-wrap so the document/asset URL stays on this origin
  const outHeaders = new Headers(upstream.headers);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(PREFIX)) return;
  if (event.request.method !== "GET" && event.request.method !== "HEAD") return;
  event.respondWith(proxy(event.request));
});
