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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user is a firm_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkilendirme gerekli" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await anonClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is firm_admin or admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id);

    const callerRoles = roles?.map((r: any) => r.role) || [];
    const isFirmAdmin = callerRoles.includes("firm_admin");
    const isAdmin = callerRoles.includes("admin") || callerRoles.includes("super_admin");

    if (!isFirmAdmin && !isAdmin) {
      return new Response(JSON.stringify({ error: "Yetkiniz yok" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's firm_id
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("firm_id")
      .eq("user_id", callerUser.id)
      .single();

    if (!callerProfile?.firm_id) {
      return new Response(JSON.stringify({ error: "Firma bilgisi bulunamadı" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firmId = callerProfile.firm_id;
    const body = await req.json();
    const { action } = body;

    // ---- ACTION: add_employee ----
    if (action === "add_employee") {
      const { email, password, first_name, last_name, tc_identity, phone } = body;

      if (!email || !password || !first_name || !last_name) {
        return new Response(JSON.stringify({ error: "Zorunlu alanlar eksik" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create the auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name, last_name, tc_identity: tc_identity || null },
      });

      if (createError) {
        const msg = createError.message.includes("already been registered")
          ? "Bu e-posta adresi zaten kayıtlı"
          : createError.message;
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile with firm_id and phone
      await adminClient
        .from("profiles")
        .update({ firm_id: firmId, phone: phone || null })
        .eq("user_id", newUser.user.id);

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: bulk_add ----
    if (action === "bulk_add") {
      const { employees } = body;
      if (!Array.isArray(employees) || employees.length === 0) {
        return new Response(JSON.stringify({ error: "Çalışan listesi boş" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: { email: string; success: boolean; error?: string }[] = [];

      for (const emp of employees) {
        try {
          const { email, password, first_name, last_name, tc_identity, phone } = emp;
          if (!email || !first_name || !last_name) {
            results.push({ email: email || "?", success: false, error: "Zorunlu alanlar eksik" });
            continue;
          }

          const pwd = password || `ISG${Math.random().toString(36).slice(2, 10)}!`;

          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password: pwd,
            email_confirm: true,
            user_metadata: { first_name, last_name, tc_identity: tc_identity || null },
          });

          if (createError) {
            results.push({
              email,
              success: false,
              error: createError.message.includes("already been registered")
                ? "Zaten kayıtlı"
                : createError.message,
            });
            continue;
          }

          await adminClient
            .from("profiles")
            .update({ firm_id: firmId, phone: phone || null })
            .eq("user_id", newUser.user.id);

          results.push({ email, success: true });
        } catch (e) {
          results.push({ email: emp.email || "?", success: false, error: String(e) });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- ACTION: assign_course ----
    if (action === "assign_course") {
      const { user_ids, course_id } = body;
      if (!course_id || !Array.isArray(user_ids) || user_ids.length === 0) {
        return new Response(JSON.stringify({ error: "Kurs veya kullanıcı seçilmedi" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify these users belong to the firm
      const { data: firmProfiles } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("firm_id", firmId)
        .in("user_id", user_ids);

      const validUserIds = firmProfiles?.map((p: any) => p.user_id) || [];

      const inserts = validUserIds.map((userId: string) => ({
        user_id: userId,
        course_id,
        firm_id: firmId,
        status: "active" as const,
        started_at: new Date().toISOString(),
      }));

      // Use upsert to avoid duplicates
      const { error: enrollError } = await adminClient
        .from("enrollments")
        .upsert(inserts, { onConflict: "user_id,course_id", ignoreDuplicates: true });

      if (enrollError) {
        // If unique constraint doesn't exist, try insert and ignore errors
        const results: { user_id: string; success: boolean; error?: string }[] = [];
        for (const ins of inserts) {
          const { error: singleErr } = await adminClient.from("enrollments").insert(ins);
          results.push({
            user_id: ins.user_id,
            success: !singleErr,
            error: singleErr?.message,
          });
        }
        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, count: validUserIds.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Geçersiz işlem" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("manage-firm-employees error:", error);
    return new Response(JSON.stringify({ error: "İşlem sırasında bir hata oluştu" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
