import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get auth user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkilendirme gerekli" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { method, qr_token, attendance_code } = body;

    if (!method || (method !== "qr" && method !== "code")) {
      return new Response(JSON.stringify({ error: "Geçersiz katılım yöntemi" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find session
    let sessionQuery = supabase.from("face_to_face_sessions").select("*");

    if (method === "qr" && qr_token) {
      sessionQuery = sessionQuery.eq("qr_token", qr_token);
    } else if (method === "code" && attendance_code) {
      sessionQuery = sessionQuery.eq("attendance_code", attendance_code.toUpperCase());
    } else {
      return new Response(JSON.stringify({ error: "QR token veya ders kodu gerekli" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sessions, error: sessionError } = await sessionQuery;
    if (sessionError || !sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ error: "Oturum bulunamadı" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = sessions[0];

    // Check session status
    if (session.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Bu oturum iptal edilmiştir" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.status === "completed") {
      return new Response(JSON.stringify({ error: "Bu oturum tamamlanmıştır, yeni katılım kabul edilmiyor" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Time-based validation (skip if session is already marked in_progress by admin)
    const now = new Date();
    const sessionDate = session.session_date; // "YYYY-MM-DD"
    const startTimeParts = session.start_time.split(":");
    const endTimeParts = session.end_time.split(":");

    const sessionStart = new Date(`${sessionDate}T${startTimeParts[0].padStart(2, "0")}:${startTimeParts[1].padStart(2, "0")}:00`);
    const sessionEnd = new Date(`${sessionDate}T${endTimeParts[0].padStart(2, "0")}:${endTimeParts[1].padStart(2, "0")}:00`);

    // If session is "scheduled", enforce time window; if "in_progress", admin already started it
    if (session.status === "scheduled") {
      const earlyEntry = new Date(sessionStart.getTime() - 15 * 60 * 1000);
      if (now < earlyEntry) {
        return new Response(JSON.stringify({
          error: "Oturum henüz başlamadı",
          session_start: sessionStart.toISOString(),
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (now > sessionEnd) {
        return new Response(JSON.stringify({ error: "Oturum sona ermiştir, yeni katılım kabul edilmiyor" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if user is enrolled in the course
    const courseId = session.course_id;
    if (courseId) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .in("status", ["active", "pending"])
        .limit(1)
        .single();

      if (!enrollment) {
        return new Response(JSON.stringify({ error: "Bu kursa kayıtlı değilsiniz" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check duplicate attendance
    const { data: existing } = await supabase
      .from("face_to_face_attendance")
      .select("id, status")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "Katılımınız zaten kayıtlıdır",
        already_joined: true,
        status: existing[0].status,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find enrollment for this session's course
    let enrollmentId = null;
    if (courseId) {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .in("status", ["active", "pending"])
        .limit(1)
        .single();
      enrollmentId = enr?.id || null;
    }

    // Determine if late
    const isLate = now > sessionStart;
    const attendanceStatus = isLate ? "late" : "attended";

    // Get IP and user-agent
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Insert attendance
    const { error: insertError } = await supabase
      .from("face_to_face_attendance")
      .insert({
        session_id: session.id,
        user_id: user.id,
        enrollment_id: enrollmentId,
        status: attendanceStatus,
        join_method: method,
        check_in_time: now.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent.substring(0, 500),
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Katılım kaydedilemedi" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: isLate ? "Geç katılım kaydedildi" : "Katılımınız başarıyla kaydedildi",
      status: attendanceStatus,
      session_info: {
        location: session.location,
        date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time,
      },
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("attend-session error:", err);
    return new Response(JSON.stringify({ error: "Sunucu hatası oluştu" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
