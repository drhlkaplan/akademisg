import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCertificateGeneration } from "@/hooks/useCertificateGeneration";
import type { Database } from "@/integrations/supabase/types";

type HazardClass = Database["public"]["Enums"]["hazard_class_enum"];

interface CompletionCheckResult {
  canComplete: boolean;
  missingRequirements: string[];
  progress: number;
}

interface CompletionEngineInput {
  enrollmentId: string;
  courseId: string;
  userId: string;
  hazardClass: HazardClass | null | undefined;
  autoCertificate: boolean;
}

/**
 * Hybrid completion engine that checks:
 * 1. All lessons completed (SCORM + content + exam)
 * 2. Topic 4 face-to-face attendance for tehlikeli/cok_tehlikeli
 * 3. Final exam passed with minimum score
 * 4. Auto-creates recurrence rules via DB function
 */
export function useCompletionEngine() {
  const { generateCertificate } = useCertificateGeneration();

  /**
   * Pre-flight check: returns whether the enrollment can be completed
   * and lists missing requirements.
   */
  const checkCompletion = useCallback(
    async (input: CompletionEngineInput): Promise<CompletionCheckResult> => {
      const { enrollmentId, courseId, hazardClass } = input;
      const missing: string[] = [];

      // 1. Check all lessons completed
      const [lessonsRes, progressRes] = await Promise.all([
        supabase
          .from("lessons")
          .select("id, topic_group, type")
          .eq("course_id", courseId)
          .eq("is_active", true),
        supabase
          .from("lesson_progress")
          .select("lesson_id, lesson_status")
          .eq("enrollment_id", enrollmentId),
      ]);

      const allLessons = lessonsRes.data || [];
      const completedIds = new Set(
        progressRes.data
          ?.filter(
            (p) =>
              p.lesson_status === "completed" || p.lesson_status === "passed"
          )
          .map((p) => p.lesson_id) || []
      );

      const incompleteLessons = allLessons.filter(
        (l) => !completedIds.has(l.id)
      );
      if (incompleteLessons.length > 0) {
        missing.push(
          `${incompleteLessons.length} ders henüz tamamlanmadı`
        );
      }

      // 2. Check Topic 4 f2f attendance for hazardous classes
      const isHazardous =
        hazardClass === "tehlikeli" || hazardClass === "cok_tehlikeli";
      if (isHazardous) {
        const topic4Lessons = allLessons.filter((l) => l.topic_group === 4);
        if (topic4Lessons.length > 0) {
          const { data: attendanceData } = await supabase
            .from("face_to_face_attendance")
            .select("session_id, status, face_to_face_sessions!inner(lesson_id)")
            .eq("enrollment_id", enrollmentId)
            .eq("status", "attended");

          const attendedLessonIds = new Set(
            attendanceData?.map(
              (a: any) => a.face_to_face_sessions?.lesson_id
            ) || []
          );

          const missingF2F = topic4Lessons.filter(
            (l) => !attendedLessonIds.has(l.id)
          );
          if (missingF2F.length > 0) {
            missing.push(
              `Konu 4 yüz yüze katılımı eksik (${missingF2F.length} ders)`
            );
          }
        }
      }

      // 3. Check final exam requirement
      const { data: rules } = await supabase
        .from("course_template_rules")
        .select("requires_final_assessment, passing_score")
        .eq("course_id", courseId)
        .limit(1)
        .maybeSingle();

      if (rules?.requires_final_assessment) {
        const { data: examResults } = await supabase
          .from("exam_results")
          .select("score")
          .eq("enrollment_id", enrollmentId)
          .order("score", { ascending: false })
          .limit(1);

        const bestScore = examResults?.[0]?.score ?? 0;
        const passingScore = rules.passing_score ?? 60;
        if (bestScore < passingScore) {
          missing.push(
            `Final sınavı geçilmedi (min %${passingScore}, mevcut %${bestScore})`
          );
        }
      }

      const totalLessons = allLessons.length || 1;
      const completedCount = completedIds.size;
      const progress = Math.round((completedCount / totalLessons) * 100);

      return {
        canComplete: missing.length === 0,
        missingRequirements: missing,
        progress,
      };
    },
    []
  );

  /**
   * Attempt to complete the enrollment. Calls the server-side
   * complete_enrollment RPC which enforces all rules.
   */
  const completeEnrollment = useCallback(
    async (input: CompletionEngineInput): Promise<boolean> => {
      const { enrollmentId, autoCertificate } = input;

      try {
        // Server-side validation handles all checks
        const { error } = await supabase.rpc("complete_enrollment", {
          _enrollment_id: enrollmentId,
        });

        if (error) {
          // Parse error message for user-friendly display
          let message = "Eğitim tamamlanamadı.";
          if (error.message.includes("Not all lessons")) {
            message = "Tüm dersler henüz tamamlanmadı.";
          } else if (error.message.includes("Topic 4 face-to-face")) {
            message =
              "Konu 4 yüz yüze katılım zorunluluğu karşılanmadı.";
          } else if (error.message.includes("Final exam not passed")) {
            message = "Final sınavı geçme puanına ulaşılmadı.";
          } else if (error.message.includes("already finalized")) {
            message = "Bu kayıt zaten tamamlanmış durumda.";
          }

          toast({
            title: "Tamamlama Başarısız",
            description: message,
            variant: "destructive",
          });
          return false;
        }

        toast({
          title: "🎉 Eğitim Tamamlandı!",
          description: "Tebrikler, eğitimi başarıyla tamamladınız.",
        });

        // Auto-generate certificate if enabled
        if (autoCertificate) {
          await generateCertificate(enrollmentId);
        }

        return true;
      } catch (err: any) {
        console.error("Completion engine error:", err);
        toast({
          title: "Hata",
          description: "Eğitim tamamlanırken bir hata oluştu.",
          variant: "destructive",
        });
        return false;
      }
    },
    [generateCertificate]
  );

  /**
   * Combined flow: check + update progress + complete if ready
   */
  const checkAndComplete = useCallback(
    async (input: CompletionEngineInput): Promise<{
      completed: boolean;
      progress: number;
    }> => {
      const check = await checkCompletion(input);

      // Update progress
      await supabase.rpc("update_enrollment_progress", {
        _enrollment_id: input.enrollmentId,
        _progress_percent: check.progress,
      });

      if (check.canComplete) {
        const completed = await completeEnrollment(input);
        return { completed, progress: completed ? 100 : check.progress };
      }

      return { completed: false, progress: check.progress };
    },
    [checkCompletion, completeEnrollment]
  );

  return {
    checkCompletion,
    completeEnrollment,
    checkAndComplete,
  };
}
