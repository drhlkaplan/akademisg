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

    // Check max attempts (per enrollment; final exams: 3 attempts)
    const { data: previousAttempts } = await adminClient
      .from("exam_results")
      .select("id")
      .eq("exam_id", exam_id)
      .eq("enrollment_id", enrollment_id);

    const attemptCount = previousAttempts?.length || 0;
    const isPreTestExam = exam.exam_type === "pre_test" || exam.exam_type === "pre";
    const MAX_FINAL_ATTEMPTS = 3;
    if (!isPreTestExam && attemptCount >= MAX_FINAL_ATTEMPTS) {
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
    // Ön değerlendirmede baraj yok, her zaman geçer. Final barajı 60.
    const isPreTest = isPreTestExam;
    const passed = isPreTest ? true : score >= 60;
    const status = isPreTest ? "completed" : (passed ? "passed" : "failed");

    const durationMinutes = exam.duration_minutes || 60;
    const timeUsedSeconds = durationMinutes * 60 - (time_remaining || 0);

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

    // 3. denemede de başarısızsa tüm eğitimi sıfırla
    if (!isPreTest && !passed && attemptCount + 1 >= MAX_FINAL_ATTEMPTS) {
      await adminClient.from("scorm_runtime_data").delete().eq("enrollment_id", enrollment_id);
      await adminClient.from("lesson_progress").delete().eq("enrollment_id", enrollment_id);
      await adminClient.from("exam_results").delete().eq("enrollment_id", enrollment_id);
      await adminClient.from("enrollments").update({
        progress_percent: 0, status: "active", completed_at: null,
      }).eq("id", enrollment_id);
      return new Response(JSON.stringify({
        score, passed: false, correctAnswers, totalQuestions: effectiveTotal,
        reset: true, attemptsLeft: 0,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ön değerlendirme sonucu ne olursa olsun ders tamamlanmış sayılır (sıralı kilit açılır)
    const { data: examLesson } = await adminClient
      .from("lessons")
      .select("id")
      .eq("exam_id", exam_id)
      .eq("course_id", enrollment.course_id)
      .eq("is_active", true)
      .maybeSingle();

    if (examLesson) {
      // Not: (enrollment_id, lesson_id) benzersiz indeksi kısmi (WHERE lesson_id IS NOT NULL)
      // olduğu için upsert/onConflict çalışmıyor — elle güncelle/ekle.
      const lessonStatus = isPreTest ? "completed" : (passed ? "passed" : "failed");
      const { data: existingLp } = await adminClient
        .from("lesson_progress")
        .select("id, lesson_status")
        .eq("enrollment_id", enrollment_id)
        .eq("lesson_id", examLesson.id)
        .maybeSingle();
      if (existingLp) {
        // Daha önce geçilmiş bir dersi başarısız durumuna düşürme
        const alreadyDone = existingLp.lesson_status === "passed" || existingLp.lesson_status === "completed";
        if (!(alreadyDone && lessonStatus === "failed")) {
          const { error: upErr } = await adminClient.from("lesson_progress")
            .update({ lesson_status: lessonStatus, score_raw: score, updated_at: new Date().toISOString() })
            .eq("id", existingLp.id);
          if (upErr) console.error("lesson_progress update error:", upErr);
        }
      } else {
        const { error: insErr } = await adminClient.from("lesson_progress").insert({
          enrollment_id,
          lesson_id: examLesson.id,
          lesson_status: lessonStatus,
          score_raw: score,
        });
        if (insErr) console.error("lesson_progress insert error:", insErr);
      }
    }

    // Final geçildiyse eğitimi tamamla ve otomatik sertifika üret
    let certificateIssued = false;
    if (!isPreTest && passed) {
      try {
        await adminClient.from("enrollments").update({
          status: "completed", progress_percent: 100, completed_at: new Date().toISOString(),
        }).eq("id", enrollment_id);
        const r = await fetch(`${supabaseUrl}/functions/v1/generate-certificate`, {
          method: "POST",
          headers: { Authorization: authHeader, apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
          body: JSON.stringify({ enrollment_id }),
        });
        certificateIssued = r.ok;
        if (!r.ok) console.error("cert error", await r.text());
      } catch (e) { console.error("cert exception", e); }
    }

    return new Response(
      JSON.stringify({
        score,
        passed,
        correctAnswers,
        totalQuestions: effectiveTotal,
        attemptsLeft: isPreTest ? null : Math.max(0, MAX_FINAL_ATTEMPTS - attemptCount - 1),
        certificateIssued,
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
