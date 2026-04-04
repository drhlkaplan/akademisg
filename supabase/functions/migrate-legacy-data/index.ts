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

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();
    const results: Record<string, unknown> = {};

    if (action === "analyze") {
      // Analyze current state - count records needing migration
      const { count: coursesNoHazard } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .is("hazard_class_new", null)
        .is("deleted_at", null);

      const { count: coursesNoTrainingType } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .is("training_type", null)
        .is("deleted_at", null);

      const { count: firmsNoSector } = await supabase
        .from("firms")
        .select("*", { count: "exact", head: true })
        .is("sector_id", null)
        .is("deleted_at", null);

      const { count: firmsNoHazard } = await supabase
        .from("firms")
        .select("*", { count: "exact", head: true })
        .is("hazard_class_new", null)
        .is("deleted_at", null);

      const { count: enrollmentsNoType } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .is("training_type", null)
        .is("deleted_at", null);

      const { count: totalCourses } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      const { count: totalFirms } = await supabase
        .from("firms")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      const { count: totalEnrollments } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null);

      const { count: coursesWithRules } = await supabase
        .from("course_template_rules")
        .select("*", { count: "exact", head: true });

      results.analysis = {
        courses: {
          total: totalCourses || 0,
          missing_hazard_class: coursesNoHazard || 0,
          missing_training_type: coursesNoTrainingType || 0,
          with_template_rules: coursesWithRules || 0,
        },
        firms: {
          total: totalFirms || 0,
          missing_sector: firmsNoSector || 0,
          missing_hazard_class: firmsNoHazard || 0,
        },
        enrollments: {
          total: totalEnrollments || 0,
          missing_training_type: enrollmentsNoType || 0,
        },
      };
    } else if (action === "migrate_courses") {
      // Tag legacy courses that don't have hazard_class or training_type
      const { data: legacyCourses, error } = await supabase
        .from("courses")
        .update({ legacy_regulation: true })
        .is("hazard_class_new", null)
        .is("deleted_at", null)
        .select("id");

      results.migrated_courses = legacyCourses?.length || 0;
      if (error) results.error = error.message;
    } else if (action === "migrate_enrollments") {
      // Inherit training_type from course to enrollment where missing
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, course_id, courses!inner(training_type)")
        .is("training_type", null)
        .is("deleted_at", null)
        .limit(500);

      let updated = 0;
      if (enrollments) {
        for (const e of enrollments) {
          const courseTrainingType = (e as any).courses?.training_type;
          if (courseTrainingType) {
            await supabase
              .from("enrollments")
              .update({ training_type: courseTrainingType })
              .eq("id", e.id);
            updated++;
          }
        }
      }
      results.updated_enrollments = updated;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use: analyze, migrate_courses, migrate_enrollments" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
