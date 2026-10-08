import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MODEL = "google/gemini-3.1-flash-tts-preview";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Yetkisiz" }, 401);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: u.user.id });
    if (!isAdmin) return json({ error: "Sadece yöneticiler seslendirme oluşturabilir" }, 403);

    const { table, id } = await req.json();
    if (!["questions", "question_bank"].includes(table) || !id) return json({ error: "Geçersiz istek" }, 400);
    const { data: q, error } = await admin.from(table).select("question_text, options").eq("id", id).single();
    if (error || !q) return json({ error: "Soru bulunamadı" }, 404);

    const opts: string[] = Array.isArray(q.options) ? q.options : [];
    const text = `Sakin, net ve yavaş bir Türkçe ile oku: ${q.question_text}. ` +
      opts.map((o, i) => `${LETTERS[i] || i + 1} şıkkı: ${o}.`).join(" ");

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI anahtarı yapılandırılmamış" }, 500);
    const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
        },
        stream_format: "audio",
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("tts error", r.status, t);
      return json({ error: `Seslendirme başarısız (${r.status})`, detail: t.slice(0, 300) }, r.status);
    }
    const audio = new Uint8Array(await r.arrayBuffer());
    const path = `${table}/${id}-${Date.now()}.wav`;
    const up = await admin.storage.from("question-audio").upload(path, audio, { contentType: "audio/wav", upsert: true });
    if (up.error) return json({ error: up.error.message }, 500);
    await admin.from(table).update({ audio_url: path }).eq("id", id);
    return json({ audio_url: path });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Hata" }, 500);
  }
});
