/**
 * ScormApiAdapter — Generates injectable SCORM 1.2 and 2004 API scripts.
 * These scripts run inside the SCORM content iframe and communicate
 * with the parent window via postMessage.
 *
 * Enhanced with eFront-compatible features:
 * - mastery_score auto pass/fail
 * - launch_data from manifest
 * - max_time_allowed enforcement
 * - student_id / student_name injection
 * - completion_threshold / scaled_passing_score
 */

export interface ScormInitialData {
  lesson_status?: string;
  lesson_location?: string;
  suspend_data?: string;
  score_raw?: string;
  total_time?: string;
  /** Learner info */
  student_id?: string;
  student_name?: string;
  /** Manifest-derived data */
  launch_data?: string;
  mastery_score?: number;
  max_time_allowed?: string;
  time_limit_action?: string;
  /** SCORM 2004 */
  completion_threshold?: number;
  scaled_passing_score?: number;
}

// ─── SCORM 1.2 API ──────────────────────────────────────────────────────────

export function buildScorm12ApiScript(initialData: ScormInitialData): string {
  return `<script>
(function() {
  var _initialized = false, _finished = false, _lastError = '0';
  var _masteryScore = ${initialData.mastery_score != null ? initialData.mastery_score : "null"};
  var _maxTimeAllowed = ${JSON.stringify(initialData.max_time_allowed || "")};
  var _timeLimitAction = ${JSON.stringify(initialData.time_limit_action || "")};
  var cmiData = {
    'cmi.core.lesson_status': ${JSON.stringify(initialData.lesson_status || "not attempted")},
    'cmi.core.lesson_location': ${JSON.stringify(initialData.lesson_location || "")},
    'cmi.suspend_data': ${JSON.stringify(initialData.suspend_data || "")},
    'cmi.core.score.raw': ${JSON.stringify(initialData.score_raw || "")},
    'cmi.core.score.min': '0', 'cmi.core.score.max': '100',
    'cmi.core.total_time': ${JSON.stringify(initialData.total_time || "0000:00:00")},
    'cmi.core.session_time': '0000:00:00',
    'cmi.core.student_id': ${JSON.stringify(initialData.student_id || "")},
    'cmi.core.student_name': ${JSON.stringify(initialData.student_name || "")},
    'cmi.core.credit': 'credit',
    'cmi.core.entry': ${JSON.stringify(initialData.lesson_status && initialData.lesson_status !== "not attempted" ? "resume" : "ab-initio")},
    'cmi.core.exit': '', 'cmi.core.lesson_mode': 'normal',
    'cmi.launch_data': ${JSON.stringify(initialData.launch_data || "")},
    'cmi.comments': '', 'cmi.comments_from_lms': '',
    'cmi.student_data.mastery_score': ${JSON.stringify(initialData.mastery_score != null ? String(initialData.mastery_score) : "")},
    'cmi.student_data.max_time_allowed': ${JSON.stringify(initialData.max_time_allowed || "")},
    'cmi.student_data.time_limit_action': ${JSON.stringify(initialData.time_limit_action || "")}
  };

  function applyMasteryScore() {
    if (_masteryScore !== null && cmiData['cmi.core.score.raw'] !== '') {
      var score = parseFloat(cmiData['cmi.core.score.raw']);
      if (!isNaN(score)) {
        if (score >= _masteryScore) {
          cmiData['cmi.core.lesson_status'] = 'passed';
        } else {
          cmiData['cmi.core.lesson_status'] = 'failed';
        }
      }
    }
  }

  function sendToParent(method) {
    try {
      window.parent.postMessage({ type: 'scorm_api_event', scormVersion: '1.2', method: method, data: {
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
    LMSFinish: function() {
      if (!_initialized) { _lastError = '301'; return 'false'; }
      applyMasteryScore();
      _finished = true; _initialized = false; _lastError = '0';
      sendToParent('LMSFinish');
      return 'true';
    },
    LMSGetValue: function(el) {
      if (!_initialized) { _lastError = '301'; return ''; }
      _lastError = '0';
      if (el in cmiData) return cmiData[el];
      if (el.match(/_count$/)) return '0';
      return '';
    },
    LMSSetValue: function(el, val) {
      if (!_initialized) { _lastError = '301'; return 'false'; }
      _lastError = '0';
      cmiData[el] = val;
      // Auto apply mastery score when score.raw is set
      if (el === 'cmi.core.score.raw') applyMasteryScore();
      return 'true';
    },
    LMSCommit: function() {
      if (!_initialized) { _lastError = '301'; return 'false'; }
      _lastError = '0';
      applyMasteryScore();
      sendToParent('LMSCommit');
      return 'true';
    },
    LMSGetLastError: function() { return _lastError; },
    LMSGetErrorString: function(c) { return {'0':'No Error','101':'General Exception','301':'Not initialized','401':'Not implemented'}[c]||'Unknown'; },
    LMSGetDiagnostic: function(c) { return c||''; }
  };
  window.API = API;
})();
<\/script>`;
}

// ─── SCORM 2004 API ─────────────────────────────────────────────────────────

export function buildScorm2004ApiScript(initialData: ScormInitialData): string {
  const completionStatus =
    initialData.lesson_status === "completed" || initialData.lesson_status === "passed"
      ? "completed"
      : initialData.lesson_status === "incomplete"
        ? "incomplete"
        : "unknown";
  const successStatus =
    initialData.lesson_status === "passed"
      ? "passed"
      : initialData.lesson_status === "failed"
        ? "failed"
        : "unknown";
  const totalTime12 = initialData.total_time || "0000:00:00";
  const tp = totalTime12.split(":");
  const isoTotal =
    tp.length === 3
      ? "PT" + parseInt(tp[0]) + "H" + parseInt(tp[1]) + "M" + parseInt(tp[2]) + "S"
      : "PT0S";

  return `<script>
(function() {
  var _initialized = false, _terminated = false, _lastError = '0';
  var _scaledPassingScore = ${initialData.scaled_passing_score != null ? initialData.scaled_passing_score : "null"};
  var _completionThreshold = ${initialData.completion_threshold != null ? initialData.completion_threshold : "null"};
  var cmiData = {
    'cmi.completion_status': ${JSON.stringify(completionStatus)},
    'cmi.success_status': ${JSON.stringify(successStatus)},
    'cmi.location': ${JSON.stringify(initialData.lesson_location || "")},
    'cmi.suspend_data': ${JSON.stringify(initialData.suspend_data || "")},
    'cmi.score.raw': ${JSON.stringify(initialData.score_raw || "")},
    'cmi.score.min': '0', 'cmi.score.max': '100',
    'cmi.score.scaled': ${JSON.stringify(initialData.score_raw ? (parseFloat(initialData.score_raw) / 100).toString() : "")},
    'cmi.total_time': ${JSON.stringify(isoTotal)},
    'cmi.session_time': 'PT0S',
    'cmi.learner_id': ${JSON.stringify(initialData.student_id || "")},
    'cmi.learner_name': ${JSON.stringify(initialData.student_name || "")},
    'cmi.credit': 'credit',
    'cmi.entry': ${JSON.stringify(completionStatus !== "unknown" ? "resume" : "ab-initio")},
    'cmi.exit': '', 'cmi.mode': 'normal',
    'cmi.launch_data': ${JSON.stringify(initialData.launch_data || "")},
    'cmi.comments_from_learner._count': '0', 'cmi.comments_from_lms._count': '0',
    'cmi.interactions._count': '0', 'cmi.objectives._count': '0',
    'cmi.learner_preference.audio_level': '1', 'cmi.learner_preference.language': '',
    'cmi.learner_preference.delivery_speed': '1', 'cmi.learner_preference.audio_captioning': '0',
    'cmi.completion_threshold': ${JSON.stringify(initialData.completion_threshold != null ? String(initialData.completion_threshold) : "")},
    'cmi.scaled_passing_score': ${JSON.stringify(initialData.scaled_passing_score != null ? String(initialData.scaled_passing_score) : "")},
    'cmi.progress_measure': '',
    'adl.nav.request': '_none_'
  };

  function applyPassingLogic() {
    // Auto success_status based on scaled_passing_score
    if (_scaledPassingScore !== null && cmiData['cmi.score.scaled'] !== '') {
      var scaled = parseFloat(cmiData['cmi.score.scaled']);
      if (!isNaN(scaled)) {
        cmiData['cmi.success_status'] = scaled >= _scaledPassingScore ? 'passed' : 'failed';
      }
    }
    // Auto completion_status based on completion_threshold
    if (_completionThreshold !== null && cmiData['cmi.progress_measure'] !== '') {
      var pm = parseFloat(cmiData['cmi.progress_measure']);
      if (!isNaN(pm)) {
        cmiData['cmi.completion_status'] = pm >= _completionThreshold ? 'completed' : 'incomplete';
      }
    }
  }

  function sendToParent(method) {
    try {
      var ls = cmiData['cmi.completion_status'] || 'unknown';
      var ss = cmiData['cmi.success_status'] || 'unknown';
      var ns = ss === 'passed' ? 'passed' : ss === 'failed' ? 'failed' : ls === 'completed' ? 'completed' : ls === 'incomplete' ? 'incomplete' : 'not attempted';
      window.parent.postMessage({ type: 'scorm_api_event', method: method, scormVersion: '2004', data: {
        lesson_status: ns, lesson_location: cmiData['cmi.location'] || '',
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
    Terminate: function(p) {
      if (!_initialized) { _lastError = '112'; return 'false'; }
      if (_terminated) { _lastError = '113'; return 'false'; }
      applyPassingLogic();
      _terminated = true; _initialized = false; _lastError = '0';
      sendToParent('Terminate');
      return 'true';
    },
    GetValue: function(el) {
      if (!_initialized) { _lastError = '122'; return ''; }
      _lastError = '0';
      if (el in cmiData) return cmiData[el];
      if (el.match(/\\._count$/)) return '0';
      var match = el.match(/^cmi\\.(interactions|objectives|comments_from_learner)\\.(\\d+)\\./);
      if (match && cmiData[el] !== undefined) return cmiData[el];
      if (match) return '';
      _lastError = '401'; return '';
    },
    SetValue: function(el, val) {
      if (!_initialized) { _lastError = '132'; return 'false'; }
      _lastError = '0'; cmiData[el] = val;
      var cMatch = el.match(/^cmi\\.(interactions|objectives|comments_from_learner)\\.(\\d+)\\./);
      if (cMatch) {
        var countKey = 'cmi.' + cMatch[1] + '._count';
        var current = parseInt(cmiData[countKey] || '0');
        if (parseInt(cMatch[2]) >= current) cmiData[countKey] = String(parseInt(cMatch[2]) + 1);
      }
      // Auto-apply passing logic when score or progress changes
      if (el === 'cmi.score.scaled' || el === 'cmi.score.raw' || el === 'cmi.progress_measure') {
        if (el === 'cmi.score.raw' && val !== '') {
          var raw = parseFloat(val);
          if (!isNaN(raw)) cmiData['cmi.score.scaled'] = String(raw / 100);
        }
        applyPassingLogic();
      }
      return 'true';
    },
    Commit: function(p) {
      if (!_initialized) { _lastError = '142'; return 'false'; }
      _lastError = '0';
      applyPassingLogic();
      sendToParent('Commit');
      return 'true';
    },
    GetLastError: function() { return _lastError; },
    GetErrorString: function(c) { var m = {'0':'No Error','101':'General Exception','103':'Already Initialized','112':'Termination Before Init','113':'Termination After Termination','122':'Retrieve Data Before Init','132':'Store Data Before Init','142':'Commit Before Init','401':'Undefined Data Model'}; return m[c] || 'Unknown Error'; },
    GetDiagnostic: function(c) { return c || ''; }
  };
  window.API_1484_11 = API_1484_11;
})();
<\/script>`;
}

// ─── Version-aware builder ──────────────────────────────────────────────────

export function buildScormApiScript(
  initialData: ScormInitialData,
  version?: string,
): string {
  if (version && version.startsWith("2004")) {
    return buildScorm2004ApiScript(initialData);
  }
  return buildScorm12ApiScript(initialData);
}
