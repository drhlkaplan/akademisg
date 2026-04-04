import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Find overdue recurrence rules
    const { data: overdueRules, error: fetchErr } = await supabase
      .from("recurrence_rules")
      .select(
        "id, user_id, course_id, hazard_class, training_type, recurrence_months, next_due_at"
      )
      .eq("status", "active")
      .lte("next_due_at", new Date().toISOString());

    if (fetchErr) throw fetchErr;

    const results = {
      checked: overdueRules?.length || 0,
      enrollments_created: 0,
      notifications_sent: 0,
      errors: [] as string[],
    };

    for (const rule of overdueRules || []) {
      try {
        // Check if user already has an active/pending enrollment for this course
        const { data: existingEnrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", rule.user_id)
          .eq("course_id", rule.course_id!)
          .in("status", ["active", "pending"])
          .is("deleted_at", null)
          .maybeSingle();

        if (existingEnrollment) {
          // Already enrolled, skip
          continue;
        }

        // Find the appropriate tekrar course for this hazard class
        let courseId = rule.course_id;

        // Try to find a 'tekrar' course for same hazard class
        const { data: tekrarCourse } = await supabase
          .from("courses")
          .select("id")
          .eq("training_type", "tekrar")
          .eq("hazard_class_new", rule.hazard_class)
          .eq("is_active", true)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();

        if (tekrarCourse) {
          courseId = tekrarCourse.id;
        }

        // Create new enrollment for recurrence
        const { error: enrollErr } = await supabase
          .from("enrollments")
          .insert({
            user_id: rule.user_id,
            course_id: courseId!,
            status: "pending",
            training_type: "tekrar",
          });

        if (enrollErr) {
          results.errors.push(
            `Enrollment error for user ${rule.user_id}: ${enrollErr.message}`
          );
          continue;
        }

        results.enrollments_created++;

        // Update the recurrence rule: set next cycle
        const nextDue = new Date(rule.next_due_at);
        nextDue.setMonth(nextDue.getMonth() + rule.recurrence_months);

        await supabase
          .from("recurrence_rules")
          .update({
            next_due_at: nextDue.toISOString(),
            notified_at: new Date().toISOString(),
          })
          .eq("id", rule.id);

        // Log activity
        await supabase.from("activity_logs").insert({
          action: "recurrence_enrollment_created",
          entity_type: "enrollment",
          entity_id: rule.id,
          details: {
            user_id: rule.user_id,
            course_id: courseId,
            hazard_class: rule.hazard_class,
            training_type: rule.training_type,
          },
        });

        results.notifications_sent++;
      } catch (err: any) {
        results.errors.push(`Rule ${rule.id}: ${err.message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
