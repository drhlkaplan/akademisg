import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ScormData {
  [key: string]: string;
}

interface UseScormApiOptions {
  enrollmentId: string;
  scormPackageId: string;
  lessonId: string;
  userId: string;
  onComplete?: () => void;
}

export function useScormApi({ enrollmentId, scormPackageId, lessonId, userId, onComplete }: UseScormApiOptions) {
  const dataRef = useRef<ScormData>({});
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Load existing progress on mount
  useEffect(() => {
    loadProgress();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [enrollmentId, lessonId]);

  const loadProgress = async () => {
    const { data } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("enrollment_id", enrollmentId)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    if (data) {
      dataRef.current = {
        "cmi.core.lesson_location": data.lesson_location || "",
        "cmi.core.lesson_status": data.lesson_status || "not attempted",
        "cmi.core.score.raw": data.score_raw?.toString() || "",
        "cmi.core.score.min": data.score_min?.toString() || "0",
        "cmi.core.score.max": data.score_max?.toString() || "100",
        "cmi.core.total_time": formatTime(data.total_time || 0),
        "cmi.suspend_data": data.suspend_data || "",
      };
    }
  };

  const saveProgress = useCallback(async () => {
    const d = dataRef.current;
    const lessonStatus = d["cmi.core.lesson_status"] || "not attempted";
    const scoreRaw = d["cmi.core.score.raw"] ? parseFloat(d["cmi.core.score.raw"]) : null;
    const totalTimeSeconds = parseTimeToSeconds(d["cmi.core.total_time"] || "0000:00:00");

    // Upsert lesson_progress with lesson_id
    await supabase
      .from("lesson_progress")
      .upsert({
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        scorm_package_id: scormPackageId,
        lesson_location: d["cmi.core.lesson_location"] || null,
        lesson_status: lessonStatus,
        score_raw: scoreRaw,
        score_min: d["cmi.core.score.min"] ? parseFloat(d["cmi.core.score.min"]) : null,
        score_max: d["cmi.core.score.max"] ? parseFloat(d["cmi.core.score.max"]) : null,
        total_time: totalTimeSeconds,
        suspend_data: d["cmi.suspend_data"] || null,
      }, { onConflict: "enrollment_id,lesson_id" })
      .select();

    if ((lessonStatus === "completed" || lessonStatus === "passed") && onComplete) {
      onComplete();
    }
  }, [enrollmentId, scormPackageId, lessonId, onComplete]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveProgress, 2000);
  }, [saveProgress]);

  // SCORM 1.2 + 2004 API objects to be injected into iframe
  const createApiObject = useCallback(() => {
    const API = {
      LMSInitialize: (_param: string) => {
        isInitialized.current = true;
        return "true";
      },
      LMSFinish: (_param: string) => {
        saveProgress();
        isInitialized.current = false;
        return "true";
      },
      LMSGetValue: (key: string) => {
        return dataRef.current[key] || "";
      },
      LMSSetValue: (key: string, value: string) => {
        dataRef.current[key] = value;
        debouncedSave();
        return "true";
      },
      LMSCommit: (_param: string) => {
        saveProgress();
        return "true";
      },
      LMSGetLastError: () => "0",
      LMSGetErrorString: (_code: string) => "No Error",
      LMSGetDiagnostic: (_code: string) => "No Diagnostic",
    };

    const API_1484_11 = {
      Initialize: (_param: string) => {
        isInitialized.current = true;
        return "true";
      },
      Terminate: (_param: string) => {
        saveProgress();
        isInitialized.current = false;
        return "true";
      },
      GetValue: (key: string) => {
        return dataRef.current[key] || "";
      },
      SetValue: (key: string, value: string) => {
        dataRef.current[key] = value;
        debouncedSave();
        return "true";
      },
      Commit: (_param: string) => {
        saveProgress();
        return "true";
      },
      GetLastError: () => "0",
      GetErrorString: (_code: string) => "No Error",
      GetDiagnostic: (_code: string) => "No Diagnostic",
    };

    return { API, API_1484_11 };
  }, [saveProgress, debouncedSave]);

  return { createApiObject, saveProgress, loadProgress };
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(4, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
}
