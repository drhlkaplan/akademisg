import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Sen "ISG Akademi AI Tutor" adlı bir yapay zeka eğitim asistanısın. İş Sağlığı ve Güvenliği (İSG) konusunda uzman bir eğitimcisin.

GÖREVLER:
- Öğrencilerin ders içeriği hakkındaki sorularını yanıtla
- Kavramları basit ve anlaşılır şekilde açıkla
- Pratik örnekler ve gerçek hayat senaryoları ver
- Sınava hazırlık için önemli noktaları vurgula
- Yasal mevzuat hakkında bilgi ver (6331 sayılı İSG Kanunu vb.)
- Kişiselleştirilmiş öğrenme önerileri sun

KURALLAR:
- Her zaman Türkçe yanıt ver
- Markdown formatı kullan (kalın, italik, listeler, başlıklar)
- Yanıtlar öğretici ve destekleyici olsun
- Yanlış bilgi verme, emin olmadığın konularda bunu belirt
- Kısa ve öz cevaplar ver, gerektiğinde detaylandır

MEVCUT DERS BAĞLAMI:
${context?.course_title ? `Kurs: ${context.course_title}` : ""}
${context?.lesson_title ? `Ders: ${context.lesson_title}` : ""}
${context?.category ? `Kategori: ${context.category}` : ""}
${context?.danger_class ? `Tehlike Sınıfı: ${context.danger_class}` : ""}
${context?.lesson_type ? `Ders Tipi: ${context.lesson_type}` : ""}

Öğrencinin mevcut dersine göre yanıtlarını kişiselleştir ve ilgili konulara odaklan.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-20), // Last 20 messages for context window
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Çok fazla istek gönderildi, lütfen biraz bekleyin." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI kullanım limiti doldu." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI servis hatası" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
