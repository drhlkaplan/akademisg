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
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get user identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { exam_id, enrollment_id, answers, time_remaining } = body;

    if (!exam_id || !enrollment_id || !answers || typeof answers !== "object") {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify enrollment belongs to user and is active
    const { data: enrollment, error: enrollErr } = await adminClient
      .from("enrollments")
      .select("id, user_id, status, course_id")
      .eq("id", enrollment_id)
      .eq("user_id", user.id)
      .single();

    if (enrollErr || !enrollment) {
      return new Response(JSON.stringify({ error: "Invalid enrollment" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get exam details
    const { data: exam, error: examErr } = await adminClient
      .from("exams")
      .select("*")
      .eq("id", exam_id)
      .single();

    if (examErr || !exam) {
      return new Response(JSON.stringify({ error: "Exam not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify exam belongs to the same course as the enrollment
    if (exam.course_id !== enrollment.course_id) {
      return new Response(JSON.stringify({ error: "Exam does not belong to this enrollment" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max attempts
    const { data: previousAttempts } = await adminClient
      .from("exam_results")
      .select("id")
      .eq("exam_id", exam_id)
      .eq("user_id", user.id);

    const attemptCount = previousAttempts?.length || 0;
    if (exam.max_attempts && attemptCount >= exam.max_attempts) {
      return new Response(JSON.stringify({ error: "Maximum attempts reached" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch questions with correct_answer and options (server-side only)
    let { data: questions, error: qErr } = await adminClient
      .from("questions")
      .select("id, correct_answer, options")
      .eq("exam_id", exam_id);

    if (qErr || !questions || questions.length === 0) {
      return new Response(JSON.stringify({ error: "No questions found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If exam has question_count limit, only grade those questions that were in the submitted set
    const submittedQuestionIds = Object.keys(answers);

    // Use question_count if set
    const totalQuestions = exam.question_count && exam.question_count < questions.length
      ? exam.question_count
      : questions.length;

    // Grade: count correct answers from submitted
    // Frontend sends letter codes (A, B, C, D) for multiple_choice or "true"/"false" for true_false
    // correct_answer in DB is the actual answer text
    // Resolve letter codes to text via options array before comparing
    let correctAnswers = 0;
    for (const question of questions) {
      const userAnswer = answers[question.id];
      if (!userAnswer) continue;

      const correctValue = question.correct_answer;
      const options = question.options as string[] | null;

      // If userAnswer is a single uppercase letter (A-Z) and options exist, resolve to text
      let resolvedAnswer = userAnswer;
      if (options && Array.isArray(options) && /^[A-Z]$/.test(userAnswer)) {
        const letterIndex = userAnswer.charCodeAt(0) - 65;
        if (letterIndex >= 0 && letterIndex < options.length) {
          resolvedAnswer = options[letterIndex];
        }
      }

      if (resolvedAnswer === correctValue) {
        correctAnswers++;
      }
    }

    // Only count questions that were actually presented
    const effectiveTotal = Math.min(totalQuestions, questions.length);
    const score = Math.round((correctAnswers / effectiveTotal) * 100);
    const passed = score >= (exam.passing_score || 70);
    const status = passed ? "passed" : "failed";

    const durationMinutes = exam.duration_minutes || 60;
    const timeUsedSeconds = durationMinutes * 60 - (time_remaining || 0);

    // Insert result with service role
    const { error: insertErr } = await adminClient.from("exam_results").insert({
      exam_id,
      enrollment_id,
      user_id: user.id,
      score,
      correct_answers: correctAnswers,
      total_questions: effectiveTotal,
      answers,
      status,
      attempt_number: attemptCount + 1,
      started_at: new Date(Date.now() - timeUsedSeconds * 1000).toISOString(),
      completed_at: new Date().toISOString(),
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save result" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update enrollment if passed
    if (passed) {
      await adminClient
        .from("enrollments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", enrollment_id);
    }

    return new Response(
      JSON.stringify({
        score,
        passed,
        correctAnswers,
        totalQuestions: effectiveTotal,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("submit-exam error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
