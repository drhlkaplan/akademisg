/**
 * ScormProgressService — Handles persisting SCORM runtime data to the backend.
 * Includes lesson_progress (summary) and scorm_runtime_data (granular CMI).
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Time helpers ────────────────────────────────────────────────────────────

export function parseTimeToSeconds(timeStr: string): number {
  // ISO 8601 duration (SCORM 2004)
  const isoMatch = timeStr.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/,
  );
  if (isoMatch) {
    return (
      parseInt(isoMatch[1] || "0") * 3600 +
      parseInt(isoMatch[2] || "0") * 60 +
      Math.round(parseFloat(isoMatch[3] || "0"))
    );
  }
  // SCORM 1.2 format HHHH:MM:SS
  const parts = timeStr.split(":");
  if (parts.length === 3)
    return (
      parseInt(parts[0]) * 3600 +
      parseInt(parts[1]) * 60 +
      parseInt(parts[2])
    );
  return 0;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(4, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDisplayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m}dk`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

// ─── Progress persistence ────────────────────────────────────────────────────

export interface ScormEventData {
  lesson_status?: string;
  lesson_location?: string;
  suspend_data?: string;
  score_raw?: string;
  total_time?: string;
  session_time?: string;
  exit?: string;
  completion_status?: string;
  success_status?: string;
  progress_measure?: string;
  nav_request?: string;
}

export interface PersistOptions {
  enrollmentId: string;
  lessonId: string;
  scormPackageId: string;
  userId: string;
  courseTitle?: string;
  lessonTitle?: string;
  sessionSeconds: number;
}

/**
 * Persist SCORM progress to lesson_progress (summary) + scorm_runtime_data (granular).
 */
export async function persistScormProgress(
  data: ScormEventData,
  method: string,
  opts: PersistOptions,
): Promise<{ completed: boolean }> {
  const status = data.lesson_status || "not attempted";
  const score = data.score_raw ? parseFloat(data.score_raw) : null;
  const totalTimeSeconds = data.total_time
    ? parseTimeToSeconds(data.total_time)
    : null;

  // 1. Save summary to lesson_progress via RPC
  await supabase.rpc("record_lesson_progress", {
    _enrollment_id: opts.enrollmentId,
    _lesson_id: opts.lessonId,
    _lesson_status: status,
    _score_raw: score,
    _lesson_location: data.lesson_location || null,
    _suspend_data: data.suspend_data || null,
    _total_time: totalTimeSeconds,
    _scorm_package_id: opts.scormPackageId,
  });

  // 2. Save granular CMI data
  const cmiData: Record<string, string> = {};
  if (data.lesson_status) cmiData["cmi.lesson_status"] = data.lesson_status;
  if (data.lesson_location) cmiData["cmi.lesson_location"] = data.lesson_location;
  if (data.score_raw) cmiData["cmi.score.raw"] = data.score_raw;
  if (data.total_time) cmiData["cmi.total_time"] = data.total_time;
  if (data.session_time) cmiData["cmi.session_time"] = data.session_time;
  if (data.completion_status) cmiData["cmi.completion_status"] = data.completion_status;
  if (data.success_status) cmiData["cmi.success_status"] = data.success_status;
  if (data.progress_measure) cmiData["cmi.progress_measure"] = data.progress_measure;
  // Save suspend_data only if not too large
  if (data.suspend_data && data.suspend_data.length < 64000) {
    cmiData["cmi.suspend_data"] = data.suspend_data;
  }

  if (Object.keys(cmiData).length > 0) {
    try {
      await supabase.rpc("save_scorm_runtime_data" as any, {
        _enrollment_id: opts.enrollmentId,
        _lesson_id: opts.lessonId,
        _sco_id: null,
        _cmi_data: cmiData,
      });
    } catch {
      // Granular save is best-effort; lesson_progress is the source of truth
    }
  }

  // 3. xAPI tracking
  try {
    await supabase.from("xapi_statements").insert({
      user_id: opts.userId,
      verb:
        method === "LMSFinish" || method === "Terminate"
          ? "terminated"
          : method === "LMSCommit" || method === "Commit"
            ? "progressed"
            : "interacted",
      object_type: "scorm_lesson",
      object_id: opts.lessonId,
      result: {
        completion: status === "completed" || status === "passed",
        success: status === "passed",
        score: score != null ? { raw: score, min: 0, max: 100 } : null,
        duration: `PT${opts.sessionSeconds}S`,
      },
      context: {
        enrollment_id: opts.enrollmentId,
        course_title: opts.courseTitle || "",
        lesson_title: opts.lessonTitle || "",
        scorm_method: method,
      },
    });
  } catch {}

  const completed =
    (method === "LMSFinish" || method === "Terminate") &&
    (status === "completed" || status === "passed");

  return { completed };
}

/**
 * Load existing SCORM progress for resume functionality.
 */
export async function loadScormProgress(
  enrollmentId: string,
  lessonId: string,
): Promise<ScormEventData> {
  const initialData: ScormEventData = {};
  try {
    const { data: progress } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (progress) {
      if (progress.lesson_status) initialData.lesson_status = progress.lesson_status;
      if (progress.lesson_location) initialData.lesson_location = progress.lesson_location;
      if (progress.suspend_data && progress.suspend_data.length < 4000)
        initialData.suspend_data = progress.suspend_data;
      if (progress.score_raw != null) initialData.score_raw = String(progress.score_raw);
      if (progress.total_time != null) initialData.total_time = formatTime(progress.total_time);
    }
  } catch {}
  return initialData;
}

/**
 * Track lesson launch via xAPI.
 */
export async function trackLessonLaunch(
  userId: string,
  lessonId: string,
  enrollmentId: string,
  courseTitle?: string,
  lessonTitle?: string,
): Promise<void> {
  try {
    await supabase.from("xapi_statements").insert({
      user_id: userId,
      verb: "launched",
      object_type: "scorm_lesson",
      object_id: lessonId,
      context: {
        enrollment_id: enrollmentId,
        course_title: courseTitle || "",
        lesson_title: lessonTitle || "",
      },
    });
  } catch {}
}
