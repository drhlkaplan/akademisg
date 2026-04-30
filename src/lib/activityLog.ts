/**
 * activityLog — Wraps the `log_activity` Supabase RPC.
 * Use for tracking key user actions (login, logout, scorm_launch, exam_submit, etc.)
 * Failures are silent — logging must never break user flows.
 */
import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "login"
  | "logout"
  | "scorm_launch"
  | "scorm_progress"
  | "exam_start"
  | "exam_submit"
  | "course_enroll"
  | "lesson_complete"
  | "profile_update"
  | "certificate_download";

export async function logActivity(
  action: ActivityAction | string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.rpc("log_activity", {
      _action: action,
      _entity_type: entityType ?? null,
      _entity_id: entityId ?? null,
      _details: details ? (details as any) : null,
    });
  } catch (err) {
    // Silent fail — logging is best-effort
    console.warn("[activityLog]", action, "failed:", err);
  }
}
