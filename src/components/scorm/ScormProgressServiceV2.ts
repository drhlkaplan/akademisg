/**
 * ScormProgressServiceV2 — Persists CMI data via Supabase RPCs.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ScormCmiSnapshot } from "./scormApiShim";

export interface PersistContext {
  enrollmentId: string;
  lessonId: string;
  scormPackageId: string;
  userId: string;
  sessionSeconds: number;
}

function timeToSeconds(t: string): number {
  if (!t) return 0;
  // ISO 8601: PT1H30M15S
  if (t.startsWith("PT")) {
    const m = t.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
    if (m) return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + Math.floor(parseFloat(m[3] || "0"));
  }
  // SCORM 1.2: HHHH:MM:SS or HHHH:MM:SS.ss
  const p = t.split(":");
  if (p.length === 3) {
    return parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + Math.floor(parseFloat(p[2]));
  }
  return 0;
}

export async function loadScormProgress(
  enrollmentId: string,
  lessonId: string,
): Promise<{
  lesson_status?: string;
  lesson_location?: string;
  suspend_data?: string;
  score_raw?: string;
  total_time?: string;
}> {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_status, lesson_location, suspend_data, score_raw, total_time")
    .eq("enrollment_id", enrollmentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error || !data) return {};
  // total_time is stored as integer seconds → convert to SCORM 1.2 format
  let totalTimeStr = "0000:00:00";
  if (data.total_time) {
    const s = data.total_time as number;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    totalTimeStr = `${String(h).padStart(4, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return {
    lesson_status: data.lesson_status || undefined,
    lesson_location: data.lesson_location || undefined,
    suspend_data: data.suspend_data || undefined,
    score_raw: data.score_raw != null ? String(data.score_raw) : undefined,
    total_time: totalTimeStr,
  };
}

export async function persistScormProgress(
  snapshot: ScormCmiSnapshot,
  method: string,
  ctx: PersistContext,
): Promise<{ completed: boolean }> {
  const status = snapshot.lesson_status || "incomplete";
  const totalSeconds = timeToSeconds(snapshot.total_time) + ctx.sessionSeconds;

  // Save lesson_progress via RPC
  const { error: lpErr } = await supabase.rpc("record_lesson_progress", {
    _enrollment_id: ctx.enrollmentId,
    _lesson_id: ctx.lessonId,
    _lesson_status: status,
    _score_raw: snapshot.score_raw ? parseFloat(snapshot.score_raw) : null,
    _lesson_location: snapshot.lesson_location || null,
    _suspend_data: snapshot.suspend_data || null,
    _total_time: totalSeconds,
    _scorm_package_id: ctx.scormPackageId,
  });
  if (lpErr) console.error("[scorm] record_lesson_progress error:", lpErr);

  // Save raw CMI for reporting
  const cmiPayload: Record<string, string> = {
    lesson_status: status,
    score_raw: snapshot.score_raw || "",
    lesson_location: snapshot.lesson_location || "",
    total_time: snapshot.total_time || "",
    last_method: method,
  };
  if (snapshot.completion_status) cmiPayload.completion_status = snapshot.completion_status;
  if (snapshot.success_status) cmiPayload.success_status = snapshot.success_status;
  if (snapshot.progress_measure) cmiPayload.progress_measure = snapshot.progress_measure;

  const { error: rtErr } = await supabase.rpc("save_scorm_runtime_data", {
    _enrollment_id: ctx.enrollmentId,
    _lesson_id: ctx.lessonId,
    _sco_id: null,
    _cmi_data: cmiPayload,
  });
  if (rtErr) console.error("[scorm] save_scorm_runtime_data error:", rtErr);

  const completed = status === "completed" || status === "passed";
  return { completed };
}
