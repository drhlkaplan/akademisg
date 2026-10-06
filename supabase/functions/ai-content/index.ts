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

      case "generate_blog_post": {
        systemPrompt = `Sen iş sağlığı ve güvenliği alanında uzman bir blog yazarısın. Türkçe, akıcı ve SEO uyumlu yazılar üretirsin. Yanıtını SADECE geçerli JSON formatında ver, başka açıklama ekleme.`;
        userPrompt = `Aşağıdaki istem için kapsamlı bir blog yazısı oluştur:

İSTEM: ${context.prompt}
${context.category ? `KATEGORİ: ${context.category}` : ""}

Yanıtı SADECE şu JSON formatında ver (markdown kod bloğu kullanma, ham JSON):
{
  "title": "Çekici, SEO uyumlu başlık",
  "slug": "kebab-case-slug-turkce-karakter-yok",
  "excerpt": "1-2 cümlelik özet (en fazla 160 karakter)",
  "category": "Uygun kategori",
  "read_time": "X dk",
  "content": "Markdown formatında en az 600 kelimelik detaylı içerik. ## başlıklar, listeler, kalın metinler kullan. Giriş, ana bölümler ve sonuç içersin."
}`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const questionsSchema = {
      type: "json_schema",
      name: "exam_questions",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["questions"],
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["question_text", "options", "correct_answer", "points"],
              properties: {
                question_text: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "string" },
                points: { type: "integer" },
              },
            },
          },
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: systemPrompt,
        input: [{ role: "user", content: userPrompt }],
        reasoning: { effort: "low" },
        store: false,
        stream: true,
        ...(action === "generate_questions" ? { text: { format: questionsSchema } } : {}),
      }),
    });

    if (!response.ok || !response.body) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      const msg =
        response.status === 429 ? "Çok fazla istek gönderildi, lütfen biraz bekleyin." :
        response.status === 402 ? "AI kredisi yetersiz. Çalışma alanına kredi ekleyin." :
        response.status === 403 ? "AI erişimi şu anda engelli. Çalışma alanı AI ayarlarını kontrol edin." :
        "AI servis hatası";
      return new Response(JSON.stringify({ error: msg }), {
        status: [429, 402, 403].includes(response.status) ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consume the SSE stream and collect output text
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let content = "";
    let streamError = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") content += ev.delta || "";
          else if (ev.type === "response.failed" || ev.type === "error") {
            streamError = ev.response?.error?.message || ev.message || "AI yanıtı başarısız";
          }
        } catch { /* ignore partial */ }
      }
    }

    if (!content) {
      console.error("AI empty response", streamError);
      return new Response(JSON.stringify({ error: streamError || "AI boş yanıt döndü" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
