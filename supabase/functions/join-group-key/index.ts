import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const groupKey = (body?.groupKey || "").trim();

    if (!groupKey) {
      return new Response(JSON.stringify({ error: "groupKey gerekli" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: group, error: groupError } = await adminClient
      .from("groups")
      .select("id, name, is_active, firm_id")
      .eq("group_key", groupKey)
      .eq("is_active", true)
      .maybeSingle();

    if (groupError || !group) {
      return new Response(JSON.stringify({ error: "Geçerli bir grup bulunamadı" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await adminClient
      .from("users_to_groups")
      .select("id")
      .eq("user_id", user.id)
      .eq("group_id", group.id)
      .maybeSingle();

    if (!membership) {
      const { error: membershipError } = await adminClient.from("users_to_groups").insert({
        user_id: user.id,
        group_id: group.id,
      });

      if (membershipError) {
        return new Response(JSON.stringify({ error: membershipError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Sync user's profile firm_id from group's firm if not already set
    if (group.firm_id) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("firm_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile && !profile.firm_id) {
        await adminClient
          .from("profiles")
          .update({ firm_id: group.firm_id })
          .eq("user_id", user.id);
      }
    }

    const { data: groupCourses, error: groupCoursesError } = await adminClient
      .from("group_courses")
      .select("course_id")
      .eq("group_id", group.id);

    if (groupCoursesError) {
      return new Response(JSON.stringify({ error: groupCoursesError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const courseIds = (groupCourses || []).map((item) => item.course_id);

    if (courseIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          enrolledCount: 0,
          message: `"${group.name}" grubuna katıldınız ancak bu gruba eğitim atanmamış.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existingEnrollments } = await adminClient
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user.id)
      .in("course_id", courseIds);

    const existingCourseIds = new Set((existingEnrollments || []).map((e) => e.course_id));
    const nowIso = new Date().toISOString();

    const enrollmentsToInsert = courseIds
      .filter((courseId) => !existingCourseIds.has(courseId))
      .map((courseId) => ({
        user_id: user.id,
        course_id: courseId,
        status: "active",
        started_at: nowIso,
        progress_percent: 0,
      }));

    if (enrollmentsToInsert.length > 0) {
      const { error: enrollError } = await adminClient.from("enrollments").insert(enrollmentsToInsert);
      if (enrollError) {
        return new Response(JSON.stringify({ error: enrollError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        enrolledCount: enrollmentsToInsert.length,
        message: `"${group.name}" grubuna katıldınız. ${enrollmentsToInsert.length} eğitim eklendi.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("join-group-key error", error);
    return new Response(JSON.stringify({ error: "İşlem sırasında hata oluştu" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
