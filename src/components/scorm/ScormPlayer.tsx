import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Maximize2,
  Minimize2,
  AlertTriangle,
  RefreshCw,
  SkipBack,
  SkipForward,
  Pause,
  Play,
  Volume2,
  Settings,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ScormPlayerProps {
  packageUrl: string;
  entryPoint: string;
  enrollmentId: string;
  scormPackageId: string;
  lessonId: string;
  userId: string;
  scormVersion?: string;
  onComplete?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  lessonTitle?: string;
  courseTitle?: string;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

function extractFolderPath(packageUrl: string): string | null {
  const marker = "scorm-packages/";
  const idx = packageUrl.indexOf(marker);
  if (idx === -1) return null;
  const raw = packageUrl
    .slice(idx + marker.length)
    .split("?")[0]
    .split("#")[0];
  return raw.replace(/^\/+|\/+$/g, "") || null;
}

function buildProxyUrl(folderPath: string, filePath: string): string {
  return `${supabaseUrl}/functions/v1/scorm-proxy/${folderPath}/${filePath}`;
}

function buildProxyBaseUrl(folderPath: string, entryDir: string): string {
  const base = entryDir
    ? `${supabaseUrl}/functions/v1/scorm-proxy/${folderPath}/${entryDir}`
    : `${supabaseUrl}/functions/v1/scorm-proxy/${folderPath}/`;
  return base.endsWith("/") ? base : base + "/";
}

function buildListUrl(folderPath: string): string {
  return `${supabaseUrl}/functions/v1/scorm-proxy/${folderPath}?list=1`;
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authFetch(url: string, token: string): Promise<Response> {
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

interface StorageItem {
  name: string;
  id: string | null;
  metadata: Record<string, unknown> | null;
}

const PRIORITY_FILES = ["index_lms_html5.html", "story.html", "story_html5.html", "index.html", "index_lms.html"];

async function listFiles(folderPath: string, token: string): Promise<StorageItem[]> {
  try {
    const res = await authFetch(buildListUrl(folderPath), token);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function resolveEntryFile(folderPath: string, entryPoint: string, token: string): Promise<string | null> {
  const rootFiles = await listFiles(folderPath, token);
  const rootFileNames = new Set(rootFiles.map((f) => f.name));
  for (const file of PRIORITY_FILES) {
    if (rootFileNames.has(file)) return file;
  }
  if (rootFileNames.has("scormcontent")) {
    const subFiles = await listFiles(`${folderPath}/scormcontent`, token);
    if (subFiles.some((f) => f.name === "index.html")) return "scormcontent/index.html";
  }
  const sanitizedEntry = entryPoint.replace(/&/g, "_").replace(/ /g, "_");
  const entryParts = sanitizedEntry.split("/");
  if (entryParts.length > 1) {
    for (let depth = entryParts.length - 1; depth >= 1; depth--) {
      const subPath = entryParts.slice(0, depth).join("/");
      const subFiles = await listFiles(`${folderPath}/${subPath}`, token);
      const subFileNames = new Set(subFiles.map((f) => f.name));
      for (const file of PRIORITY_FILES) {
        if (subFileNames.has(file)) return `${subPath}/${file}`;
      }
    }
  }
  const subfolders = rootFiles.filter((f) => f.id === null);
  for (const folder of subfolders) {
    const subFiles = await listFiles(`${folderPath}/${folder.name}`, token);
    const subFileNames = new Set(subFiles.map((f) => f.name));
    for (const file of PRIORITY_FILES) {
      if (subFileNames.has(file)) return `${folder.name}/${file}`;
    }
  }
  if (rootFileNames.has("imsmanifest.xml")) {
    const manifestUrl = buildProxyUrl(folderPath, "imsmanifest.xml");
    try {
      const res = await authFetch(manifestUrl, token);
      if (res.ok) {
        const xml = await res.text();
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        for (const resource of doc.querySelectorAll("resource")) {
          const href = resource.getAttribute("href");
          if (href?.endsWith(".html") && !href.toLowerCase().includes("aicccomm")) return href;
        }
      }
    } catch {}
  }
  return null;
}

function parseTimeToSeconds(timeStr: string): number {
  // Handle ISO 8601 duration (SCORM 2004): PT#H#M#S or PT#S
  const isoMatch = timeStr.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (isoMatch) {
    return (
      parseInt(isoMatch[1] || "0") * 3600 +
      parseInt(isoMatch[2] || "0") * 60 +
      Math.round(parseFloat(isoMatch[3] || "0"))
    );
  }
  // Handle SCORM 1.2 format: HHHH:MM:SS
  const parts = timeStr.split(":");
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  return 0;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(4, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDisplayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m}dk`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

function buildScorm12ApiScript(initialData: Record<string, string>): string {
  return `<script>
(function() {
  var _initialized = false, _finished = false, _lastError = '0';
  var cmiData = {
    'cmi.core.lesson_status': ${JSON.stringify(initialData.lesson_status || "not attempted")},
    'cmi.core.lesson_location': ${JSON.stringify(initialData.lesson_location || "")},
    'cmi.suspend_data': ${JSON.stringify(initialData.suspend_data || "")},
    'cmi.core.score.raw': ${JSON.stringify(initialData.score_raw || "")},
    'cmi.core.score.min': '0', 'cmi.core.score.max': '100',
    'cmi.core.total_time': ${JSON.stringify(initialData.total_time || "0000:00:00")},
    'cmi.core.session_time': '0000:00:00',
    'cmi.core.student_id': '', 'cmi.core.student_name': '',
    'cmi.core.credit': 'credit',
    'cmi.core.entry': ${JSON.stringify(initialData.lesson_status && initialData.lesson_status !== "not attempted" ? "resume" : "ab-initio")},
    'cmi.core.exit': '', 'cmi.core.lesson_mode': 'normal',
    'cmi.launch_data': '', 'cmi.comments': '', 'cmi.comments_from_lms': ''
  };
  function sendToParent(method) {
    try {
      window.parent.postMessage({ type: 'scorm_api_event', method: method, data: {
        lesson_status: cmiData['cmi.core.lesson_status'],
        lesson_location: cmiData['cmi.core.lesson_location'],
        suspend_data: cmiData['cmi.suspend_data'],
        score_raw: cmiData['cmi.core.score.raw'],
        total_time: cmiData['cmi.core.total_time'],
        session_time: cmiData['cmi.core.session_time'],
        exit: cmiData['cmi.core.exit']
      }}, '*');
    } catch(e) {}
  }
  var API = {
    LMSInitialize: function() { _initialized = true; _finished = false; _lastError = '0'; sendToParent('LMSInitialize'); return 'true'; },
    LMSFinish: function() { if (!_initialized) { _lastError = '301'; return 'false'; } _finished = true; _initialized = false; _lastError = '0'; sendToParent('LMSFinish'); return 'true'; },
    LMSGetValue: function(el) { if (!_initialized) { _lastError = '301'; return ''; } _lastError = '0'; if (el in cmiData) return cmiData[el]; if (el.match(/_count$/)) return '0'; return ''; },
    LMSSetValue: function(el, val) { if (!_initialized) { _lastError = '301'; return 'false'; } _lastError = '0'; cmiData[el] = val; return 'true'; },
    LMSCommit: function() { if (!_initialized) { _lastError = '301'; return 'false'; } _lastError = '0'; sendToParent('LMSCommit'); return 'true'; },
    LMSGetLastError: function() { return _lastError; },
    LMSGetErrorString: function(c) { return {'0':'No Error','101':'General Exception','301':'Not initialized','401':'Not implemented'}[c]||'Unknown'; },
    LMSGetDiagnostic: function(c) { return c||''; }
  };
  window.API = API;
})();
<\/script>`;
}

function buildScorm2004ApiScript(initialData: Record<string, string>): string {
  // Map saved progress to SCORM 2004 CMI model
  const completionStatus =
    initialData.lesson_status === "completed" || initialData.lesson_status === "passed"
      ? "completed"
      : initialData.lesson_status === "incomplete"
        ? "incomplete"
        : "unknown";
  const successStatus =
    initialData.lesson_status === "passed" ? "passed" : initialData.lesson_status === "failed" ? "failed" : "unknown";
  // Convert SCORM 1.2 time (HHHH:MM:SS) to ISO 8601 duration (PT#H#M#S)
  const totalTime12 = initialData.total_time || "0000:00:00";
  const tp = totalTime12.split(":");
  const isoTotal =
    tp.length === 3 ? "PT" + parseInt(tp[0]) + "H" + parseInt(tp[1]) + "M" + parseInt(tp[2]) + "S" : "PT0S";

  return `<script>
(function() {
  var _initialized = false, _terminated = false, _lastError = '0';
  var cmiData = {
    'cmi.completion_status': ${JSON.stringify(completionStatus)},
    'cmi.success_status': ${JSON.stringify(successStatus)},
    'cmi.location': ${JSON.stringify(initialData.lesson_location || "")},
    'cmi.suspend_data': ${JSON.stringify(initialData.suspend_data || "")},
    'cmi.score.raw': ${JSON.stringify(initialData.score_raw || "")},
    'cmi.score.min': '0',
    'cmi.score.max': '100',
    'cmi.score.scaled': ${JSON.stringify(initialData.score_raw ? (parseFloat(initialData.score_raw) / 100).toString() : "")},
    'cmi.total_time': ${JSON.stringify(isoTotal)},
    'cmi.session_time': 'PT0S',
    'cmi.learner_id': '',
    'cmi.learner_name': '',
    'cmi.credit': 'credit',
    'cmi.entry': ${JSON.stringify(completionStatus !== "unknown" ? "resume" : "ab-initio")},
    'cmi.exit': '',
    'cmi.mode': 'normal',
    'cmi.launch_data': '',
    'cmi.comments_from_learner._count': '0',
    'cmi.comments_from_lms._count': '0',
    'cmi.interactions._count': '0',
    'cmi.objectives._count': '0',
    'cmi.learner_preference.audio_level': '1',
    'cmi.learner_preference.language': '',
    'cmi.learner_preference.delivery_speed': '1',
    'cmi.learner_preference.audio_captioning': '0',
    'cmi.completion_threshold': '',
    'cmi.scaled_passing_score': '',
    'cmi.progress_measure': '',
    'adl.nav.request': '_none_'
  };
  // Track dynamic _count elements (interactions, objectives, comments)
  var _counters = { interactions: 0, objectives: 0, comments_from_learner: 0 };
  function sendToParent(method) {
    try {
      // Normalize to same format as SCORM 1.2 for unified handling
      var ls = cmiData['cmi.completion_status'] || 'unknown';
      var ss = cmiData['cmi.success_status'] || 'unknown';
      var normalizedStatus = ss === 'passed' ? 'passed' : ss === 'failed' ? 'failed' : ls === 'completed' ? 'completed' : ls === 'incomplete' ? 'incomplete' : 'not attempted';
      window.parent.postMessage({ type: 'scorm_api_event', method: method, scormVersion: '2004', data: {
        lesson_status: normalizedStatus,
        lesson_location: cmiData['cmi.location'] || '',
        suspend_data: cmiData['cmi.suspend_data'] || '',
        score_raw: cmiData['cmi.score.raw'] || '',
        total_time: cmiData['cmi.total_time'] || 'PT0S',
        session_time: cmiData['cmi.session_time'] || 'PT0S',
        exit: cmiData['cmi.exit'] || '',
        completion_status: cmiData['cmi.completion_status'],
        success_status: cmiData['cmi.success_status'],
        progress_measure: cmiData['cmi.progress_measure'] || '',
        nav_request: cmiData['adl.nav.request'] || '_none_'
      }}, '*');
    } catch(e) {}
  }
  var API_1484_11 = {
    Initialize: function(p) { if (_initialized) { _lastError = '103'; return 'false'; } _initialized = true; _terminated = false; _lastError = '0'; sendToParent('Initialize'); return 'true'; },
    Terminate: function(p) { if (!_initialized) { _lastError = '112'; return 'false'; } if (_terminated) { _lastError = '113'; return 'false'; } _terminated = true; _initialized = false; _lastError = '0'; sendToParent('Terminate'); return 'true'; },
    GetValue: function(el) {
      if (!_initialized) { _lastError = '122'; return ''; }
      _lastError = '0';
      if (el in cmiData) return cmiData[el];
      // Handle _count for dynamic children
      if (el.match(/\\._count$/)) return '0';
      // Handle individual interaction/objective elements
      var match = el.match(/^cmi\\.(interactions|objectives|comments_from_learner)\\.(\\d+)\\./);
      if (match && cmiData[el] !== undefined) return cmiData[el];
      if (match) return '';
      _lastError = '401';
      return '';
    },
    SetValue: function(el, val) {
      if (!_initialized) { _lastError = '132'; return 'false'; }
      _lastError = '0';
      cmiData[el] = val;
      // Auto-increment _count for new indexed elements
      var cMatch = el.match(/^cmi\\.(interactions|objectives|comments_from_learner)\\.(\\d+)\\./);
      if (cMatch) {
        var key = cMatch[1];
        var idx = parseInt(cMatch[2]);
        var countKey = 'cmi.' + key + '._count';
        var current = parseInt(cmiData[countKey] || '0');
        if (idx >= current) cmiData[countKey] = String(idx + 1);
      }
      return 'true';
    },
    Commit: function(p) { if (!_initialized) { _lastError = '142'; return 'false'; } _lastError = '0'; sendToParent('Commit'); return 'true'; },
    GetLastError: function() { return _lastError; },
    GetErrorString: function(c) { var m = {'0':'No Error','101':'General Exception','102':'General Init Failure','103':'Already Initialized','104':'Content Instance Terminated','111':'General Termination Failure','112':'Termination Before Init','113':'Termination After Termination','122':'Retrieve Data Before Init','123':'Retrieve Data After Termination','132':'Store Data Before Init','133':'Store Data After Termination','142':'Commit Before Init','143':'Commit After Termination','201':'General Argument Error','301':'General Get Failure','351':'General Set Failure','391':'General Commit Failure','401':'Undefined Data Model','402':'Unimplemented Data Model','403':'Data Model Element Value Not Initialized','404':'Data Model Element Is Read Only','405':'Data Model Element Is Write Only','406':'Data Model Element Type Mismatch','407':'Data Model Element Value Out Of Range','408':'Data Model Dependency Not Established'}; return m[c] || 'Unknown Error'; },
    GetDiagnostic: function(c) { return c || ''; }
  };
  window.API_1484_11 = API_1484_11;
})();
<\/script>`;
}

function buildScormApiScript(initialData: Record<string, string>, version?: string): string {
  if (version && version.startsWith("2004")) {
    return buildScorm2004ApiScript(initialData);
  }
  return buildScorm12ApiScript(initialData);
}

export function ScormPlayer({
  packageUrl,
  entryPoint,
  enrollmentId,
  scormPackageId,
  lessonId,
  userId,
  scormVersion,
  onComplete,
  onPrevious,
  onNext,
  lessonTitle,
  courseTitle,
  hasPrevious = false,
  hasNext = false,
}: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const blobUrlRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const [lessonStatus, setLessonStatus] = useState<string>("not attempted");
  const [scoreRaw, setScoreRaw] = useState<string>("");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Session timer
  useEffect(() => {
    sessionStartRef.current = Date.now();
    const interval = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lessonId]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const persistProgress = useCallback(
    async (data: Record<string, string>, method: string) => {
      try {
        const status = data.lesson_status || "not attempted";
        const score = data.score_raw ? parseFloat(data.score_raw) : null;
        const totalTimeSeconds = data.total_time ? parseTimeToSeconds(data.total_time) : null;

        setLessonStatus(status);
        if (data.score_raw) setScoreRaw(data.score_raw);

        await supabase.rpc("record_lesson_progress", {
          _enrollment_id: enrollmentId,
          _lesson_id: lessonId,
          _lesson_status: status,
          _score_raw: score,
          _lesson_location: data.lesson_location || null,
          _suspend_data: data.suspend_data || null,
          _total_time: totalTimeSeconds,
          _scorm_package_id: scormPackageId,
        });

        // Track xAPI event
        try {
          await supabase.from("xapi_statements").insert({
            user_id: userId,
            verb:
              method === "LMSFinish" || method === "Terminate"
                ? "terminated"
                : method === "LMSCommit" || method === "Commit"
                  ? "progressed"
                  : "interacted",
            object_type: "scorm_lesson",
            object_id: lessonId,
            result: {
              completion: status === "completed" || status === "passed",
              success: status === "passed",
              score: score != null ? { raw: score, min: 0, max: 100 } : null,
              duration: `PT${sessionSeconds}S`,
            },
            context: {
              enrollment_id: enrollmentId,
              course_title: courseTitle || "",
              lesson_title: lessonTitle || "",
              scorm_method: method,
            },
          });
        } catch {
          // xAPI tracking is non-critical
        }

        if ((method === "LMSFinish" || method === "Terminate") && (status === "completed" || status === "passed")) {
          onComplete?.();
        }
      } catch (err) {
        console.error("SCORM save error:", err);
      }
    },
    [enrollmentId, lessonId, scormPackageId, onComplete, userId, sessionSeconds, courseTitle, lessonTitle],
  );

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "scorm_api_event") return;
      const { method, data } = event.data;
      const is2004 = event.data.scormVersion === "2004";
      // Normalize SCORM 2004 methods to unified handlers
      const commitMethods = ["LMSCommit", "Commit"];
      const finishMethods = ["LMSFinish", "Terminate"];
      const initMethods = ["LMSInitialize", "Initialize"];
      if (commitMethods.includes(method)) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => persistProgress(data, method), 2000);
      } else if (finishMethods.includes(method)) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        persistProgress(data, method);
      } else if (initMethods.includes(method)) {
        setLessonStatus(data.lesson_status || "not attempted");
      }
    };
    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [persistProgress]);

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setBlobUrl(null);

    const token = await getAuthToken();
    if (!token) {
      setError("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      setIsLoading(false);
      return;
    }

    const folderPath = extractFolderPath(packageUrl);
    if (!folderPath) {
      setError("Paket yolu çözümlenemedi.");
      setIsLoading(false);
      return;
    }

    const entryFile = await resolveEntryFile(folderPath, entryPoint, token);
    if (!entryFile) {
      setError("SCORM başlangıç dosyası bulunamadı.");
      setIsLoading(false);
      return;
    }

    const proxyFileUrl = buildProxyUrl(folderPath, entryFile);
    const entryDir = entryFile.includes("/") ? entryFile.substring(0, entryFile.lastIndexOf("/") + 1) : "";
    const baseUrl = buildProxyBaseUrl(folderPath, entryDir);

    try {
      const res = await authFetch(proxyFileUrl, token);
      if (!res.ok) {
        if (res.status === 401) setError("Oturumunuz sona ermiş. Lütfen sayfayı yenileyip tekrar giriş yapın.");
        else if (res.status === 403) setError("Bu eğitim içeriğine erişim yetkiniz yok.");
        else setError(`İçerik dosyası yüklenemedi (HTTP ${res.status}).`);
        setIsLoading(false);
        return;
      }
      let html = await res.text();

      const initialData: Record<string, string> = {};
      try {
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("*")
          .eq("enrollment_id", enrollmentId)
          .eq("lesson_id", lessonId)
          .maybeSingle();
        if (progress) {
          if (progress.lesson_status) {
            initialData.lesson_status = progress.lesson_status;
            setLessonStatus(progress.lesson_status);
          }
          if (progress.lesson_location) initialData.lesson_location = progress.lesson_location;
          if (progress.suspend_data && progress.suspend_data.length < 4000)
            initialData.suspend_data = progress.suspend_data;
          if (progress.score_raw != null) {
            initialData.score_raw = String(progress.score_raw);
            setScoreRaw(String(progress.score_raw));
          }
          if (progress.total_time != null) initialData.total_time = formatTime(progress.total_time);
        }
      } catch {}

      const scormScript = buildScormApiScript(initialData, scormVersion);
      const baseTag = `<base href="${baseUrl}">`;

      if (html.match(/<head[^>]*>/i)) {
        html = html.replace(/<head[^>]*>/i, `$&\n${baseTag}\n${scormScript}`);
      } else if (html.match(/<html[^>]*>/i)) {
        html = html.replace(/<html[^>]*>/i, `$&\n<head>${baseTag}\n${scormScript}</head>`);
      } else {
        html = `<!DOCTYPE html><html><head>${baseTag}\n${scormScript}</head><body>${html}</body></html>`;
      }

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setBlobUrl(url);

      // Track lesson started xAPI event
      try {
        await supabase.from("xapi_statements").insert({
          user_id: userId,
          verb: "launched",
          object_type: "scorm_lesson",
          object_id: lessonId,
          context: { enrollment_id: enrollmentId, course_title: courseTitle || "", lesson_title: lessonTitle || "" },
        });
      } catch {}
    } catch (err: any) {
      console.error("SCORM fetch error:", err);
      setError("Eğitim içeriği yüklenirken bir hata oluştu.");
      setIsLoading(false);
    }
  }, [packageUrl, entryPoint, enrollmentId, lessonId, userId, courseTitle, lessonTitle]);

  useEffect(() => {
    loadContent();
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [loadContent]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const statusConfig = {
    "not attempted": { label: "Başlanmadı", color: "bg-muted text-muted-foreground" },
    incomplete: { label: "Devam Ediyor", color: "bg-warning/20 text-warning" },
    completed: { label: "Tamamlandı", color: "bg-success/20 text-success" },
    passed: { label: "Başarılı", color: "bg-success/20 text-success" },
    failed: { label: "Başarısız", color: "bg-destructive/20 text-destructive" },
    browsed: { label: "İncelendi", color: "bg-info/20 text-info" },
  };

  const currentStatus = statusConfig[lessonStatus as keyof typeof statusConfig] || statusConfig["not attempted"];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[hsl(var(--primary)/0.03)] rounded-xl p-8">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">İçerik Yüklenemedi</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">{error}</p>
        <Button onClick={loadContent} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full bg-[hsl(222,47%,6%)] rounded-xl overflow-hidden"
      onMouseMove={resetControlsTimer}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Top Bar - Netflix style header */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-20 transition-all duration-500",
          "bg-gradient-to-b from-[hsl(222,47%,6%/0.95)] via-[hsl(222,47%,6%/0.6)] to-transparent",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
        )}
      >
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
              <span className="text-xs font-medium text-white/90 tracking-wide uppercase">
                {scormVersion?.startsWith("2004") ? "SCORM 2004" : "SCORM 1.2"}
              </span>
            </div>
            {lessonTitle && (
              <>
                <div className="w-px h-4 bg-white/20" />
                <span className="text-sm font-medium text-white/80 truncate">{lessonTitle}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Status badge */}
            <div className={cn("px-3 py-1 rounded-full text-xs font-medium", currentStatus.color)}>
              {currentStatus.label}
            </div>
            {scoreRaw && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]">
                <Award className="h-3 w-3" />
                <span className="text-xs font-semibold">{scoreRaw}%</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white/70">
              <Clock className="h-3 w-3" />
              <span className="text-xs font-medium">{formatDisplayTime(sessionSeconds)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[hsl(222,47%,6%)] z-30">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-[hsl(var(--accent)/0.15)] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-[hsl(var(--accent)/0.1)] animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/90">Eğitim içeriği yükleniyor</p>
              <p className="text-xs text-white/50 mt-1">Lütfen bekleyin...</p>
            </div>
          </div>
        </div>
      )}

      {/* SCORM Content iframe */}
      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          className="flex-1 w-full border-0 bg-white"
          style={{ minHeight: "500px" }}
          onLoad={handleIframeLoad}
          onError={() => {
            setIsLoading(false);
            setError("Eğitim içeriği yüklenemedi.");
          }}
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="SCORM Eğitim İçeriği"
        />
      )}

      {/* Bottom Controls - Netflix style */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 transition-all duration-500",
          "bg-gradient-to-t from-[hsl(222,47%,6%/0.95)] via-[hsl(222,47%,6%/0.6)] to-transparent",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
        )}
      >
        {/* Progress bar */}
        <div className="px-5 pt-6">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden group cursor-pointer">
            <div
              className="h-full bg-[hsl(var(--accent))] rounded-full transition-all duration-300 group-hover:h-1.5 relative"
              style={{
                width: `${lessonStatus === "completed" || lessonStatus === "passed" ? 100 : lessonStatus === "incomplete" ? 50 : 0}%`,
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-[hsl(var(--accent))] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-1">
            {/* Previous */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
              title="Önceki ders"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            {/* Reload/Resume */}
            <Button
              variant="ghost"
              size="icon"
              onClick={loadContent}
              className="h-10 w-10 text-white hover:text-white hover:bg-white/10"
              title="Yeniden yükle"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>

            {/* Next */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              disabled={!hasNext}
              className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
              title="Sonraki ders"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10"
              title={isFullscreen ? "Küçült" : "Tam ekran"}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
