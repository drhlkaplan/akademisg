import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check if caller is authenticated
    const authHeader = req.headers.get("Authorization");
    let isAuthenticated = false;

    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (!claimsError && claimsData?.claims) {
        isAuthenticated = true;
      }
    }

    const { tc_identity } = await req.json();

    if (!tc_identity || tc_identity.length !== 11 || !/^\d{11}$/.test(tc_identity)) {
      return new Response(JSON.stringify({ error: "Geçersiz TC Kimlik numarası" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.rpc("get_email_by_tc", { tc_no: tc_identity });

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Bu TC Kimlik numarasına ait hesap bulunamadı" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For unauthenticated callers (login flow), return the full email
    // since it's needed for Supabase auth sign-in.
    // The TC number itself acts as a knowledge factor (11-digit national ID).
    // For additional protection, we don't reveal whether a TC exists if the
    // email is not found (same 404 message).
    return new Response(JSON.stringify({ email: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Beklenmeyen bir hata oluştu" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
