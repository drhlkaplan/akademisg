/**
 * scormApiShim — Same-origin SCORM 1.2 & 2004 API shims attached to window.
 * SCORM content (in iframe) walks window.parent and finds these.
 * No postMessage needed — direct callback to player.
 */

export interface ScormInitialData {
  lesson_status?: string;
  lesson_location?: string;
  suspend_data?: string;
  score_raw?: string;
  total_time?: string;
  student_id?: string;
  student_name?: string;
  launch_data?: string;
  mastery_score?: number | null;
  max_time_allowed?: string;
  time_limit_action?: string;
  completion_threshold?: number | null;
  scaled_passing_score?: number | null;
}

export interface ScormCmiSnapshot {
  lesson_status: string;
  lesson_location: string;
  suspend_data: string;
  score_raw: string;
  total_time: string;
  session_time: string;
  exit: string;
  progress_measure?: string;
  completion_status?: string;
  success_status?: string;
}

type EventCallback = (method: string, data: ScormCmiSnapshot) => void;

interface ScormApi12 {
  LMSInitialize: (p?: string) => string;
  LMSFinish: (p?: string) => string;
  LMSGetValue: (k: string) => string;
  LMSSetValue: (k: string, v: string) => string;
  LMSCommit: (p?: string) => string;
  LMSGetLastError: () => string;
  LMSGetErrorString: (c: string) => string;
  LMSGetDiagnostic: (c: string) => string;
}

interface ScormApi2004 {
  Initialize: (p?: string) => string;
  Terminate: (p?: string) => string;
  GetValue: (k: string) => string;
  SetValue: (k: string, v: string) => string;
  Commit: (p?: string) => string;
  GetLastError: () => string;
  GetErrorString: (c: string) => string;
  GetDiagnostic: (c: string) => string;
}

declare global {
  interface Window {
    API?: ScormApi12;
    API_1484_11?: ScormApi2004;
  }
}

export function installScorm12(initial: ScormInitialData, onEvent: EventCallback): () => void {
  const masteryScore = initial.mastery_score ?? null;
  let initialized = false;
  let finished = false;
  let lastError = "0";

  const cmi: Record<string, string> = {
    "cmi.core.lesson_status": initial.lesson_status || "not attempted",
    "cmi.core.lesson_location": initial.lesson_location || "",
    "cmi.suspend_data": initial.suspend_data || "",
    "cmi.core.score.raw": initial.score_raw || "",
    "cmi.core.score.min": "0",
    "cmi.core.score.max": "100",
    "cmi.core.total_time": initial.total_time || "0000:00:00",
    "cmi.core.session_time": "0000:00:00",
    "cmi.core.student_id": initial.student_id || "",
    "cmi.core.student_name": initial.student_name || "",
    "cmi.core.credit": "credit",
    "cmi.core.entry":
      initial.lesson_status && initial.lesson_status !== "not attempted" ? "resume" : "ab-initio",
    "cmi.core.exit": "",
    "cmi.core.lesson_mode": "normal",
    "cmi.launch_data": initial.launch_data || "",
    "cmi.comments": "",
    "cmi.comments_from_lms": "",
    "cmi.student_data.mastery_score": masteryScore != null ? String(masteryScore) : "",
    "cmi.student_data.max_time_allowed": initial.max_time_allowed || "",
    "cmi.student_data.time_limit_action": initial.time_limit_action || "",
  };

  const applyMastery = () => {
    if (masteryScore != null && cmi["cmi.core.score.raw"] !== "") {
      const s = parseFloat(cmi["cmi.core.score.raw"]);
      if (!isNaN(s)) {
        cmi["cmi.core.lesson_status"] = s >= masteryScore ? "passed" : "failed";
      }
    }
  };

  const snapshot = (): ScormCmiSnapshot => ({
    lesson_status: cmi["cmi.core.lesson_status"],
    lesson_location: cmi["cmi.core.lesson_location"],
    suspend_data: cmi["cmi.suspend_data"],
    score_raw: cmi["cmi.core.score.raw"],
    total_time: cmi["cmi.core.total_time"],
    session_time: cmi["cmi.core.session_time"],
    exit: cmi["cmi.core.exit"],
  });

  const api: ScormApi12 = {
    LMSInitialize: () => {
      initialized = true;
      finished = false;
      lastError = "0";
      onEvent("LMSInitialize", snapshot());
      return "true";
    },
    LMSFinish: () => {
      if (!initialized) {
        lastError = "301";
        return "false";
      }
      applyMastery();
      finished = true;
      initialized = false;
      lastError = "0";
      onEvent("LMSFinish", snapshot());
      return "true";
    },
    LMSGetValue: (key) => {
      if (!initialized) {
        lastError = "301";
        return "";
      }
      lastError = "0";
      if (key in cmi) return cmi[key];
      if (/_count$/.test(key)) return "0";
      return "";
    },
    LMSSetValue: (key, val) => {
      if (!initialized) {
        lastError = "301";
        return "false";
      }
      lastError = "0";
      cmi[key] = val;
      if (key === "cmi.core.score.raw") applyMastery();
      return "true";
    },
    LMSCommit: () => {
      if (!initialized) {
        lastError = "301";
        return "false";
      }
      lastError = "0";
      applyMastery();
      onEvent("LMSCommit", snapshot());
      return "true";
    },
    LMSGetLastError: () => lastError,
    LMSGetErrorString: (c) =>
      ({ "0": "No Error", "101": "General Exception", "301": "Not initialized", "401": "Not implemented" } as Record<string, string>)[c] || "Unknown",
    LMSGetDiagnostic: (c) => c || "",
  };

  window.API = api;
  return () => {
    if (window.API === api) delete window.API;
  };
}

export function installScorm2004(initial: ScormInitialData, onEvent: EventCallback): () => void {
  const completionStatus =
    initial.lesson_status === "completed" || initial.lesson_status === "passed"
      ? "completed"
      : initial.lesson_status === "incomplete"
      ? "incomplete"
      : "unknown";
  const successStatus =
    initial.lesson_status === "passed" ? "passed" : initial.lesson_status === "failed" ? "failed" : "unknown";

  const tp = (initial.total_time || "0000:00:00").split(":");
  const isoTotal =
    tp.length === 3 ? `PT${parseInt(tp[0])}H${parseInt(tp[1])}M${parseInt(tp[2])}S` : "PT0S";

  const scaledPassingScore = initial.scaled_passing_score ?? null;
  const completionThreshold = initial.completion_threshold ?? null;

  let initialized = false;
  let terminated = false;
  let lastError = "0";

  const cmi: Record<string, string> = {
    "cmi.completion_status": completionStatus,
    "cmi.success_status": successStatus,
    "cmi.location": initial.lesson_location || "",
    "cmi.suspend_data": initial.suspend_data || "",
    "cmi.score.raw": initial.score_raw || "",
    "cmi.score.min": "0",
    "cmi.score.max": "100",
    "cmi.score.scaled": initial.score_raw ? String(parseFloat(initial.score_raw) / 100) : "",
    "cmi.total_time": isoTotal,
    "cmi.session_time": "PT0S",
    "cmi.learner_id": initial.student_id || "",
    "cmi.learner_name": initial.student_name || "",
    "cmi.credit": "credit",
    "cmi.entry": completionStatus !== "unknown" ? "resume" : "ab-initio",
    "cmi.exit": "",
    "cmi.mode": "normal",
    "cmi.launch_data": initial.launch_data || "",
    "cmi.comments_from_learner._count": "0",
    "cmi.comments_from_lms._count": "0",
    "cmi.interactions._count": "0",
    "cmi.objectives._count": "0",
    "cmi.learner_preference.audio_level": "1",
    "cmi.learner_preference.language": "",
    "cmi.learner_preference.delivery_speed": "1",
    "cmi.learner_preference.audio_captioning": "0",
    "cmi.completion_threshold": completionThreshold != null ? String(completionThreshold) : "",
    "cmi.scaled_passing_score": scaledPassingScore != null ? String(scaledPassingScore) : "",
    "cmi.progress_measure": "",
    "adl.nav.request": "_none_",
  };

  const applyLogic = () => {
    if (scaledPassingScore != null && cmi["cmi.score.scaled"] !== "") {
      const s = parseFloat(cmi["cmi.score.scaled"]);
      if (!isNaN(s)) cmi["cmi.success_status"] = s >= scaledPassingScore ? "passed" : "failed";
    }
    if (completionThreshold != null && cmi["cmi.progress_measure"] !== "") {
      const p = parseFloat(cmi["cmi.progress_measure"]);
      if (!isNaN(p)) cmi["cmi.completion_status"] = p >= completionThreshold ? "completed" : "incomplete";
    }
  };

  const snapshot = (): ScormCmiSnapshot => {
    const ls = cmi["cmi.completion_status"] || "unknown";
    const ss = cmi["cmi.success_status"] || "unknown";
    const merged =
      ss === "passed"
        ? "passed"
        : ss === "failed"
        ? "failed"
        : ls === "completed"
        ? "completed"
        : ls === "incomplete"
        ? "incomplete"
        : "not attempted";
    return {
      lesson_status: merged,
      lesson_location: cmi["cmi.location"] || "",
      suspend_data: cmi["cmi.suspend_data"] || "",
      score_raw: cmi["cmi.score.raw"] || "",
      total_time: cmi["cmi.total_time"] || "PT0S",
      session_time: cmi["cmi.session_time"] || "PT0S",
      exit: cmi["cmi.exit"] || "",
      completion_status: cmi["cmi.completion_status"],
      success_status: cmi["cmi.success_status"],
      progress_measure: cmi["cmi.progress_measure"] || "",
    };
  };

  const api: ScormApi2004 = {
    Initialize: () => {
      if (initialized) {
        lastError = "103";
        return "false";
      }
      initialized = true;
      terminated = false;
      lastError = "0";
      onEvent("Initialize", snapshot());
      return "true";
    },
    Terminate: () => {
      if (!initialized) {
        lastError = "112";
        return "false";
      }
      if (terminated) {
        lastError = "113";
        return "false";
      }
      applyLogic();
      terminated = true;
      initialized = false;
      lastError = "0";
      onEvent("Terminate", snapshot());
      return "true";
    },
    GetValue: (key) => {
      if (!initialized) {
        lastError = "122";
        return "";
      }
      lastError = "0";
      if (key in cmi) return cmi[key];
      if (/\._count$/.test(key)) return "0";
      return "";
    },
    SetValue: (key, val) => {
      if (!initialized) {
        lastError = "132";
        return "false";
      }
      lastError = "0";
      cmi[key] = val;
      const m = key.match(/^cmi\.(interactions|objectives|comments_from_learner)\.(\d+)\./);
      if (m) {
        const ck = `cmi.${m[1]}._count`;
        const current = parseInt(cmi[ck] || "0");
        if (parseInt(m[2]) >= current) cmi[ck] = String(parseInt(m[2]) + 1);
      }
      if (key === "cmi.score.raw" && val !== "") {
        const r = parseFloat(val);
        if (!isNaN(r)) cmi["cmi.score.scaled"] = String(r / 100);
      }
      if (key === "cmi.score.scaled" || key === "cmi.score.raw" || key === "cmi.progress_measure") {
        applyLogic();
      }
      return "true";
    },
    Commit: () => {
      if (!initialized) {
        lastError = "142";
        return "false";
      }
      lastError = "0";
      applyLogic();
      onEvent("Commit", snapshot());
      return "true";
    },
    GetLastError: () => lastError,
    GetErrorString: (c) =>
      ({
        "0": "No Error",
        "101": "General Exception",
        "103": "Already Initialized",
        "112": "Termination Before Init",
        "113": "Termination After Termination",
        "122": "Retrieve Data Before Init",
        "132": "Store Data Before Init",
        "142": "Commit Before Init",
        "401": "Undefined Data Model",
      } as Record<string, string>)[c] || "Unknown Error",
    GetDiagnostic: (c) => c || "",
  };

  window.API_1484_11 = api;
  return () => {
    if (window.API_1484_11 === api) delete window.API_1484_11;
  };
}
