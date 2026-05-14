// Helper edge function to set up Google Search Console verification.
// Actions: "token" -> get meta token; "verify" -> verify; "add" -> add site to GSC; "list" -> list sites.
const GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GSC_KEY = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');
  if (!LOVABLE_API_KEY) return json({ error: 'LOVABLE_API_KEY missing' }, 500);
  if (!GSC_KEY) return json({ error: 'GOOGLE_SEARCH_CONSOLE_API_KEY missing' }, 500);

  const headers = {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': GSC_KEY,
    'Content-Type': 'application/json',
  };

  const { action, site = 'https://gratisakademi.com/' } = await req.json().catch(() => ({ action: 'list' }));

  try {
    if (action === 'list') {
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
      return json({ status: r.status, body: await r.text() });
    }
    if (action === 'token') {
      const r = await fetch(`${GATEWAY}/siteVerification/v1/token`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ site: { identifier: site, type: 'SITE' }, verificationMethod: 'META' }),
      });
      return json({ status: r.status, body: await r.text() });
    }
    if (action === 'verify') {
      const r = await fetch(`${GATEWAY}/siteVerification/v1/webResource?verificationMethod=META`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ site: { identifier: site, type: 'SITE' } }),
      });
      return json({ status: r.status, body: await r.text() });
    }
    if (action === 'add') {
      const enc = encodeURIComponent(site);
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites/${enc}`, { method: 'PUT', headers });
      return json({ status: r.status, body: await r.text() });
    }
    if (action === 'sitemap') {
      const enc = encodeURIComponent(site);
      const sm = encodeURIComponent(`${site}sitemap.xml`);
      const r = await fetch(`${GATEWAY}/webmasters/v3/sites/${enc}/sitemaps/${sm}`, { method: 'PUT', headers });
      return json({ status: r.status, body: await r.text() });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
