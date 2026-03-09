import { useCallback, useRef, useEffect } from "react";
import { Scorm12API } from "scorm-again";
import { supabase } from "@/integrations/supabase/client";

interface UseScormApiOptions {
  enrollmentId: string;
  scormPackageId: string;
  lessonId: string;
  userId: string;
  onComplete?: () => void;
}

export function useScormApi({ enrollmentId, scormPackageId, lessonId, userId, onComplete }: UseScormApiOptions) {
  const apiRef = useRef<Scorm12API | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Create and configure scorm-again API instance
  const getOrCreateApi = useCallback(() => {
    if (apiRef.current) return apiRef.current;

    const api = new Scorm12API({
      autocommit: true,
      autocommitSeconds: 30,
      logLevel: 1, // error only
    });

    // Listen for commit events to persist to DB
    api.on("LMSSetValue.cmi.*", () => {
      debouncedSave(api);
    });

    api.on("LMSFinish", () => {
      saveProgress(api);
    });

    api.on("LMSCommit", () => {
      saveProgress(api);
    });

    apiRef.current = api;
    return api;
  }, []);

  // Load existing progress on mount
  useEffect(() => {
    loadProgress();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      // Cleanup API
      if (apiRef.current) {
        try {
          // Only terminate if API was actually initialized
          const status = apiRef.current.lmsGetValue?.("cmi.core.lesson_status");
          if (status && status !== "" && status !== "not attempted") {
            apiRef.current.terminate("", true);
          }
        } catch {
          // ignore terminate errors
        }
        apiRef.current = null;
      }
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
      const api = getOrCreateApi();
      // Pre-load CMI data before initialization
      try {
        api.loadFromJSON({
          cmi: {
            core: {
              lesson_location: data.lesson_location || "",
              lesson_status: data.lesson_status || "not attempted",
              score: {
                raw: data.score_raw?.toString() || "",
                min: data.score_min?.toString() || "0",
                max: data.score_max?.toString() || "100",
              },
              total_time: formatTime(data.total_time || 0),
            },
            suspend_data: data.suspend_data || "",
          },
        } as any);
      } catch {
        // Pre-load failed, will start fresh
      }
    }
  };

  const saveProgress = useCallback(async (api?: Scorm12API) => {
    const activeApi = api || apiRef.current;
    if (!activeApi) return;

    try {
      const lessonStatus = activeApi.lmsGetValue("cmi.core.lesson_status") || "not attempted";
      const scoreRawStr = activeApi.lmsGetValue("cmi.core.score.raw");
      const scoreRaw = scoreRawStr ? parseFloat(scoreRawStr) : null;
      const totalTimeStr = activeApi.lmsGetValue("cmi.core.total_time") || "0000:00:00";
      const totalTimeSeconds = parseTimeToSeconds(totalTimeStr);
      const lessonLocation = activeApi.lmsGetValue("cmi.core.lesson_location") || null;
      const suspendData = activeApi.lmsGetValue("cmi.suspend_data") || null;

      // Use SECURITY DEFINER RPC instead of direct upsert
      await supabase.rpc("record_lesson_progress", {
        _enrollment_id: enrollmentId,
        _lesson_id: lessonId,
        _lesson_status: lessonStatus,
        _score_raw: scoreRaw,
        _lesson_location: lessonLocation,
        _suspend_data: suspendData,
        _total_time: totalTimeSeconds,
        _scorm_package_id: scormPackageId,
      });

      if ((lessonStatus === "completed" || lessonStatus === "passed") && onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("SCORM save error:", err);
    }
  }, [enrollmentId, scormPackageId, lessonId, onComplete]);

  const debouncedSave = useCallback((api?: Scorm12API) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveProgress(api), 2000);
  }, [saveProgress]);

  // Create the API objects to inject into window
  const createApiObject = useCallback(() => {
    const api = getOrCreateApi();
    
    // scorm-again Scorm12API is itself the window.API object
    // It has all LMSInitialize, LMSGetValue, LMSSetValue etc. methods
    return {
      API: api,
      API_1484_11: api, // scorm-again handles both via same interface
    };
  }, [getOrCreateApi]);

  return { createApiObject, saveProgress: () => saveProgress(), loadProgress, apiRef };
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
