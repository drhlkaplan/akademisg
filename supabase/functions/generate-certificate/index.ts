import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client for auth check
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { enrollment_id } = await req.json();
    if (!enrollment_id) {
      return new Response(JSON.stringify({ error: "enrollment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if certificate already exists
    const { data: existing } = await adminClient
      .from("certificates")
      .select("id, certificate_number")
      .eq("enrollment_id", enrollment_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ message: "Certificate already exists", certificate: existing }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch enrollment with course & category info
    const { data: enrollment, error: enrollErr } = await adminClient
      .from("enrollments")
      .select("id, user_id, course_id, status, completed_at")
      .eq("id", enrollment_id)
      .single();

    if (enrollErr || !enrollment) {
      return new Response(JSON.stringify({ error: "Enrollment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user owns this enrollment
    if (enrollment.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (enrollment.status !== "completed") {
      return new Response(JSON.stringify({ error: "Course not completed yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch course info
    const { data: course } = await adminClient
      .from("courses")
      .select("id, title, duration_minutes, category_id")
      .eq("id", enrollment.course_id)
      .single();

    if (!course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch category for danger_class
    let dangerClass = null;
    if (course.category_id) {
      const { data: cat } = await adminClient
        .from("course_categories")
        .select("danger_class")
        .eq("id", course.category_id)
        .single();
      dangerClass = cat?.danger_class || null;
    }

    // Fetch user profile
    const { data: profile } = await adminClient
      .from("profiles")
      .select("first_name, last_name, tc_identity")
      .eq("user_id", user.id)
      .single();

    const holderName = profile
      ? `${profile.first_name} ${profile.last_name}`
      : user.email || "İsimsiz";

    // Generate unique certificate number
    const now = new Date();
    const year = now.getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const certificateNumber = `ISG-${year}-${randomPart}`;

    // Calculate expiry (1 year from now for ISG certificates)
    const expiryDate = new Date(now);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Generate QR verification URL
    const qrCode = `https://isg-guvenli-akademi.lovable.app/verify?code=${certificateNumber}`;

    // Insert certificate
    const { data: cert, error: certErr } = await adminClient
      .from("certificates")
      .insert({
        enrollment_id,
        user_id: user.id,
        course_id: course.id,
        holder_name: holderName,
        holder_tc: profile?.tc_identity || null,
        course_title: course.title,
        danger_class: dangerClass,
        duration_hours: Math.ceil(course.duration_minutes / 60),
        certificate_number: certificateNumber,
        issue_date: now.toISOString(),
        expiry_date: expiryDate.toISOString(),
        is_valid: true,
        qr_code: qrCode,
      })
      .select()
      .single();

    if (certErr) {
      console.error("Certificate insert error:", certErr);
      return new Response(JSON.stringify({ error: "Failed to create certificate" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: "Certificate generated", certificate: cert }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
