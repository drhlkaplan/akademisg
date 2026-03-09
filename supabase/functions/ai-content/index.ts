import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, context } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "generate_description": {
        systemPrompt = "Sen bir iş sağlığı ve güvenliği eğitim uzmanısın. Türkçe yanıt ver.";
        userPrompt = `Aşağıdaki eğitim kursu için profesyonel bir açıklama yaz (en fazla 3 paragraf):
Kurs Adı: ${context.title}
Kategori: ${context.category || "Belirtilmemiş"}
Tehlike Sınıfı: ${context.danger_class || "Belirtilmemiş"}
Süre: ${context.duration_minutes} dakika

Açıklama, kursun amacını, hedef kitlesini ve kazanımlarını içersin.`;
        break;
      }

      case "generate_questions": {
        systemPrompt = `Sen bir iş sağlığı ve güvenliği sınav sorusu hazırlayan uzmansın. Türkçe yanıt ver. JSON formatında yanıt ver.`;
        userPrompt = `Aşağıdaki eğitim için ${context.count || 5} adet çoktan seçmeli sınav sorusu oluştur:
Kurs Adı: ${context.title}
Konu: ${context.topic || "Genel"}
Zorluk: ${context.difficulty || "Orta"}

Her soru 4 seçenek içersin. Yanıtı şu JSON formatında ver:
{
  "questions": [
    {
      "question_text": "Soru metni",
      "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
      "correct_answer": "Doğru şıkkın tam metni",
      "points": 1
    }
  ]
}`;
        break;
      }

      case "generate_summary": {
        systemPrompt = "Sen bir iş sağlığı ve güvenliği eğitim uzmanısın. Türkçe yanıt ver. Markdown formatında yanıt ver.";
        userPrompt = `Aşağıdaki SCORM eğitim dersi için kapsamlı bir AI özeti oluştur:
Kurs Adı: ${context.course_title}
Ders Adı: ${context.lesson_title}
Kategori: ${context.category || "İSG"}
Tehlike Sınıfı: ${context.danger_class || "Belirtilmemiş"}
Süre: ${context.duration_minutes} dakika

Özet şunları içersin:
1. Dersin temel konuları ve amaçları
2. Önemli kavramlar ve tanımlar
3. Yasal mevzuat bilgileri (varsa)
4. Pratik uygulamalar
5. Sınav için bilinmesi gereken kilit noktalar

Detaylı, bilgilendirici ve eğitici bir özet yaz.`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

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
          { role: "user", content: userPrompt },
        ],
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
