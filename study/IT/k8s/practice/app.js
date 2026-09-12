// CKA · CKAD 연습실
// 드릴(즉시 채점) 과 모의 세션(시간 재고 일괄 채점) 두 가지 흐름을 한 화면에서 돌린다.
(() => {
  "use strict";

  const TASKS = Array.isArray(window.K8S_TASKS) ? window.K8S_TASKS : [];
  const EXAMS = window.K8S_EXAMS || {};
  const MOCKS = Array.isArray(window.K8S_MOCKS) ? window.K8S_MOCKS : [];
  const LEVELS = window.K8S_LEVELS || {};
  const GRADER = window.K8SGrader;
  const MINUTES_PER_TASK = 7;

  const STORAGE = {
    solved: "bso-k8s-practice-solved-v1",
    missed: "bso-k8s-practice-missed-v1",
    recent: "bso-k8s-practice-recent-v1",
    best: "bso-k8s-practice-best-v1"
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    totalTaskCount: $("totalTaskCount"), bankBreakdown: $("bankBreakdown"),
    solvedCount: $("solvedCount"), missedCount: $("missedCount"), recentScore: $("recentScore"),
    drillTab: $("drillTab"), sessionTab: $("sessionTab"),
    drillSetup: $("drillSetup"), sessionSetup: $("sessionSetup"),
    drillExam: $("drillExam"), drillArea: $("drillArea"), drillType: $("drillType"),
    drillLevel: $("drillLevel"), drillRange: $("drillRange"), startDrill: $("startDrill"),
    sessionExam: $("sessionExam"), sessionSource: $("sessionSource"),
    sessionCount: $("sessionCount"), sessionLevel: $("sessionLevel"),
    startSession: $("startSession"), weightPreview: $("weightPreview"),
    practiceArea: $("practiceArea"), taskBadges: $("taskBadges"), taskProgress: $("taskProgress"),
    scoreProgress: $("scoreProgress"), taskClock: $("taskClock"),
    timerDisplay: $("timerDisplay"), progressBar: $("progressBar"),
    taskTitle: $("taskTitle"), taskPrompt: $("taskPrompt"), taskContext: $("taskContext"),
    answerLabel: $("answerLabel"), commandShell: $("commandShell"), commandInput: $("commandInput"),
    manifestInput: $("manifestInput"), editorHint: $("editorHint"),
    gradeButton: $("gradeButton"), hintButton: $("hintButton"), revealButton: $("revealButton"),
    prevTask: $("prevTask"), nextTask: $("nextTask"), finishSession: $("finishSession"),
    hintBox: $("hintBox"), verdict: $("verdict"), reveal: $("reveal"),
    resultArea: $("resultArea"), resultTitle: $("resultTitle"), resultMessage: $("resultMessage"),
    resultScore: $("resultScore"), timeStats: $("timeStats"), areaScores: $("areaScores"),
    reviewList: $("reviewList"),
    retryMissed: $("retryMissed"), restartPractice: $("restartPractice")
  };

  const state = {
    setupMode: "drill",
    mode: null,            // "drill" | "session"
    exam: "cka",           // 세션 채점 기준이 되는 시험
    tasks: [],
    index: 0,
    answers: {},
    results: {},
    shownHint: {},
    shownAnswer: {},
    timerId: null,
    remaining: 0,
    setLabel: "",
    times: {},            // 과제 id -> 그 과제에 쓴 누적 초
    taskStartedAt: null,
    clockId: null
  };

  // ---------- 저장소 ----------
  const readList = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch (error) { return []; }
  };
  const writeList = (key, ids) => localStorage.setItem(key, JSON.stringify([...new Set(ids)]));

  const readMap = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) { return {}; }
  };

  // 통과한 과제만 최고 기록을 남긴다. 틀린 채로 빨리 넘긴 시간은 기록이 아니다.
  function recordBestTime(taskId, seconds) {
    if (!(seconds > 0)) return null;
    const best = readMap(STORAGE.best);
    const previous = best[taskId];
    if (previous === undefined || seconds < previous) {
      best[taskId] = Math.round(seconds);
      localStorage.setItem(STORAGE.best, JSON.stringify(best));
    }
    return previous;
  }

  function recordOutcome(taskId, passed) {
    const solved = new Set(readList(STORAGE.solved));
    const missed = new Set(readList(STORAGE.missed));
    if (passed) { solved.add(taskId); missed.delete(taskId); }
    else { missed.add(taskId); }
    writeList(STORAGE.solved, [...solved]);
    writeList(STORAGE.missed, [...missed]);
  }

  // ---------- 표시 ----------
  const escapeHtml = (text) => String(text == null ? "" : text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 백틱은 인라인 코드, **굵게** 는 strong 으로만 바꾼다.
  const md = (text) => escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  const shuffle = (list) => {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const areaLabel = (task, exam) => {
    const key = task.areas[exam];
    const area = key && EXAMS[exam] && EXAMS[exam].areas[key];
    return area ? area.short : "";
  };

  const primaryExam = (task) => (state.exam !== "all" && task.areas[state.exam]) ? state.exam : task.exams[0];

  // ---------- 셋업 ----------
  function fillSetup() {
    el.drillExam.innerHTML = '<option value="all">CKA + CKAD 전체</option>' +
      Object.values(EXAMS).map((exam) => `<option value="${exam.id}">${exam.label} — ${exam.full}</option>`).join("");
    el.sessionExam.innerHTML = Object.values(EXAMS)
      .map((exam) => `<option value="${exam.id}">${exam.label} — ${exam.full}</option>`).join("");
    el.drillExam.value = "all";
    el.sessionExam.value = "cka";
    fillAreas();
    fillSources();
    renderWeights();

    const commands = TASKS.filter((t) => t.type === "command").length;
    el.totalTaskCount.textContent = `${TASKS.length}개`;
    el.bankBreakdown.textContent = `명령 ${commands} · 매니페스트 ${TASKS.length - commands}`;
  }

  function fillAreas() {
    const exam = el.drillExam.value;
    const options = ['<option value="all">전체 영역</option>'];
    if (EXAMS[exam]) {
      Object.entries(EXAMS[exam].areas).forEach(([key, area]) => {
        const count = TASKS.filter((t) => t.areas[exam] === key).length;
        options.push(`<option value="${key}">${area.label} (${count})</option>`);
      });
    }
    el.drillArea.innerHTML = options.join("");
  }

  // 배점 비율대로 영역별 문항 수를 나누고, 합이 문항 수와 맞도록 조정한다.
  function areaQuota(examId, count) {
    const areas = EXAMS[examId].areas;
    const keys = Object.keys(areas);
    const quota = {};
    keys.forEach((key) => { quota[key] = Math.max(1, Math.round((count * areas[key].weight) / 100)); });
    let sum = keys.reduce((acc, key) => acc + quota[key], 0);
    const heavyFirst = keys.slice().sort((a, b) => areas[b].weight - areas[a].weight);
    while (sum > count) {
      const target = heavyFirst.slice().reverse().find((key) => quota[key] > 1);
      if (!target) break;
      quota[target] -= 1; sum -= 1;
    }
    while (sum < count) {
      for (const key of heavyFirst) {
        if (sum >= count) break;
        quota[key] += 1; sum += 1;
      }
    }
    return quota;
  }

  // 고른 시험의 고정 세트 목록을 채운다.
  function fillSources() {
    const exam = el.sessionExam.value;
    const sets = MOCKS.filter((mock) => mock.exam === exam);
    el.sessionSource.innerHTML = '<option value="weighted">배점대로 무작위</option>' +
      sets.map((mock) => `<option value="${mock.id}">${mock.label} (${mock.tasks.length}문항)</option>`).join("");
    el.sessionSource.value = "weighted";
    syncSourceControls();
  }

  // 고정 세트를 고르면 문항 수·난이도는 세트가 정한다.
  function syncSourceControls() {
    const fixed = el.sessionSource.value !== "weighted";
    el.sessionCount.disabled = fixed;
    el.sessionLevel.disabled = fixed;
  }

  const findMock = (id) => MOCKS.find((mock) => mock.id === id);

  function renderWeights() {
    const exam = EXAMS[el.sessionExam.value];
    const count = Number(el.sessionCount.value);
    if (!exam) return;

    const mock = findMock(el.sessionSource.value);
    if (mock) {
      const rows = mock.tasks.map((id, index) => {
        const task = window.K8S_TASK_INDEX.get(id);
        if (!task) return "";
        const area = exam.areas[task.areas[mock.exam]];
        return `<div class="weight-row">
          <span>${index + 1}. ${task.title}</span>
          <span class="track"><i style="width:${task.level * 33}%"></i></span>
          <span class="num">${area ? area.short : ""}</span>
        </div>`;
      }).join("");
      el.weightPreview.innerHTML = `<p style="margin:0 0 10px;color:var(--muted);font-size:0.88rem">
        ${mock.tagline} · ${mock.tasks.length}문항 ${mock.minutes}분 · 합격선 ${exam.pass}%</p>${rows}`;
      return;
    }
    const quota = areaQuota(exam.id, count);
    el.weightPreview.innerHTML = Object.entries(exam.areas).map(([key, area]) => {
      const want = quota[key];
      return `<div class="weight-row">
        <span>${area.label}</span>
        <span class="track"><i style="width:${area.weight * 2.6}%"></i></span>
        <span class="num">${want}문항</span>
      </div>`;
    }).join("") + `<p style="margin:6px 0 0;color:var(--muted);font-size:0.85rem">
      합격선 ${exam.pass}% · 실제 시험은 ${exam.minutes}분에 ${exam.taskCountLabel} 규모입니다.</p>`;
  }

  function updateSummary() {
    el.solvedCount.textContent = `${readList(STORAGE.solved).length}개`;
    el.missedCount.textContent = `${readList(STORAGE.missed).length}개`;
    try {
      const recent = JSON.parse(localStorage.getItem(STORAGE.recent));
      el.recentScore.textContent = recent ? `${recent.score}% · ${recent.exam.toUpperCase()}` : "기록 없음";
    } catch (error) { el.recentScore.textContent = "기록 없음"; }
  }

  function setSetupMode(mode) {
    state.setupMode = mode;
    el.drillTab.classList.toggle("active", mode === "drill");
    el.sessionTab.classList.toggle("active", mode === "session");
    el.drillTab.setAttribute("aria-selected", String(mode === "drill"));
    el.sessionTab.setAttribute("aria-selected", String(mode === "session"));
    el.drillSetup.classList.toggle("hidden", mode !== "drill");
    el.sessionSetup.classList.toggle("hidden", mode !== "session");
  }

  // ---------- 과제 고르기 ----------
  function filterTasks({ exam, area, type, level }) {
    return TASKS.filter((task) => {
      if (exam !== "all" && !task.areas[exam]) return false;
      if (area && area !== "all" && task.areas[exam] !== area) return false;
      if (type && type !== "all" && task.type !== type) return false;
      if (level && level !== "all") {
        // "min2" 는 표준 이상, 숫자는 그 난이도만
        if (level === "min2") { if (Number(task.level) < 2) return false; }
        else if (String(task.level) !== String(level)) return false;
      }
      return true;
    });
  }

  function sampleByWeight(exam, count, pool) {
    const areas = EXAMS[exam].areas;
    const buckets = {};
    pool.forEach((task) => {
      const key = task.areas[exam];
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(task);
    });
    const quota = areaQuota(exam, count);
    const picked = [];
    Object.keys(areas).forEach((key) => {
      picked.push(...shuffle(buckets[key] || []).slice(0, quota[key]));
    });
    if (picked.length < count) {
      const chosen = new Set(picked.map((t) => t.id));
      picked.push(...shuffle(pool.filter((t) => !chosen.has(t.id))).slice(0, count - picked.length));
    }
    return shuffle(picked).slice(0, count);
  }

  function startDrill() {
    const exam = el.drillExam.value;
    const range = el.drillRange.value;
    let pool = filterTasks({
      exam, area: el.drillArea.value, type: el.drillType.value, level: el.drillLevel.value
    });
    if (range === "missed") {
      const missed = new Set(readList(STORAGE.missed));
      pool = pool.filter((task) => missed.has(task.id));
      if (!pool.length) { window.alert("막힌 과제가 없습니다. 다른 범위를 골라 보세요."); return; }
    }
    if (!pool.length) { window.alert("조건에 맞는 과제가 없습니다."); return; }
    const size = (range === "all" || range === "missed") ? pool.length : Number(range);
    beginSession("drill", exam, shuffle(pool).slice(0, size), 0);
  }

  function startSession() {
    const exam = el.sessionExam.value;
    const mock = findMock(el.sessionSource.value);
    if (mock) {
      const picked = mock.tasks.map((id) => window.K8S_TASK_INDEX.get(id)).filter(Boolean);
      if (!picked.length) { window.alert("세트의 과제를 찾지 못했습니다."); return; }
      beginSession("session", exam, picked, mock.minutes * 60, mock.label);
      return;
    }
    const count = Number(el.sessionCount.value);
    const pool = filterTasks({ exam, area: "all", type: "all", level: el.sessionLevel.value });
    if (pool.length < 3) { window.alert("조건에 맞는 과제가 부족합니다."); return; }
    const picked = sampleByWeight(exam, Math.min(count, pool.length), pool);
    beginSession("session", exam, picked, picked.length * MINUTES_PER_TASK * 60);
  }

  function beginSession(mode, exam, tasks, seconds, setLabel) {
    state.mode = mode;
    state.exam = exam;
    state.setLabel = setLabel || "";
    state.tasks = tasks;
    state.index = 0;
    state.answers = {};
    state.results = {};
    state.shownHint = {};
    state.shownAnswer = {};
    state.times = {};
    state.taskStartedAt = null;
    stopTimer();
    el.resultArea.classList.add("hidden");
    el.practiceArea.classList.remove("hidden");
    el.finishSession.classList.toggle("hidden", mode !== "session");
    el.hintButton.classList.toggle("hidden", mode === "session");
    el.revealButton.classList.toggle("hidden", mode === "session");
    el.gradeButton.textContent = mode === "session" ? "저장하고 다음" : "채점";
    if (mode === "session") startTimer(seconds); else el.timerDisplay.classList.add("hidden");
    renderTask();
    el.practiceArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- 타이머 ----------
  function startTimer(seconds) {
    state.remaining = seconds;
    el.timerDisplay.classList.remove("hidden");
    paintTimer();
    state.timerId = window.setInterval(() => {
      state.remaining -= 1;
      paintTimer();
      if (state.remaining <= 0) { stopTimer(); finish(true); }
    }, 1000);
  }
  function stopTimer() {
    if (state.timerId) window.clearInterval(state.timerId);
    state.timerId = null;
  }
  function stopClock() {
    if (state.clockId) window.clearInterval(state.clockId);
    state.clockId = null;
  }
  function paintTimer() {
    const total = Math.max(0, state.remaining);
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    el.timerDisplay.textContent = `${mm}:${ss}`;
    el.timerDisplay.classList.toggle("urgent", total <= 300);
  }

  // ---------- 문항별 시간 ----------
  const formatClock = (seconds) => {
    const total = Math.max(0, Math.round(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  function startTaskClock() {
    state.taskStartedAt = Date.now();
    paintTaskClock();
    if (!state.clockId) state.clockId = window.setInterval(paintTaskClock, 1000);
  }

  // 화면을 떠날 때 그때까지의 시간을 과제에 더한다. 다시 오면 이어서 잰다.
  function stopTaskClock() {
    const task = currentTask();
    if (!task || !state.taskStartedAt) { state.taskStartedAt = null; return; }
    state.times[task.id] = (state.times[task.id] || 0) + (Date.now() - state.taskStartedAt) / 1000;
    state.taskStartedAt = null;
  }

  function elapsedFor(taskId) {
    const base = state.times[taskId] || 0;
    const task = currentTask();
    if (task && task.id === taskId && state.taskStartedAt) {
      return base + (Date.now() - state.taskStartedAt) / 1000;
    }
    return base;
  }

  function paintTaskClock() {
    const task = currentTask();
    if (!task) return;
    const seconds = elapsedFor(task.id);
    el.taskClock.textContent = formatClock(seconds);
    // 명령 한 줄에 2분을 넘기면 문서를 찾아볼 때다
    el.taskClock.classList.toggle("slow", seconds > (task.type === "command" ? 120 : 300));
  }

  // ---------- 과제 화면 ----------
  function currentTask() { return state.tasks[state.index]; }

  function renderTask() {
    const task = currentTask();
    if (!task) return;
    const exam = primaryExam(task);

    el.taskBadges.innerHTML = [
      ...task.exams.map((id) => `<span class="badge exam">${EXAMS[id] ? EXAMS[id].label : id}</span>`),
      `<span class="badge">${areaLabel(task, exam)}</span>`,
      `<span class="badge level${task.level}">${(LEVELS[task.level] || {}).label || ""}</span>`,
      `<span class="badge type">${task.type === "command" ? "명령" : "매니페스트"}</span>`
    ].join("");

    el.taskTitle.textContent = task.title;
    el.taskPrompt.innerHTML = md(task.prompt);
    if (task.context) {
      el.taskContext.textContent = `이 과제는 ${task.context} 컨텍스트에서 수행합니다 — kubectl config use-context ${task.context}`;
      el.taskContext.classList.remove("hidden");
    } else {
      el.taskContext.classList.add("hidden");
    }

    const isCommand = task.type === "command";
    el.commandShell.classList.toggle("hidden", !isCommand);
    el.manifestInput.classList.toggle("hidden", isCommand);
    el.editorHint.classList.toggle("hidden", isCommand);
    el.answerLabel.textContent = isCommand ? "명령 입력" : "매니페스트 작성";
    el.answerLabel.setAttribute("for", isCommand ? "commandInput" : "manifestInput");

    const saved = state.answers[task.id];
    if (isCommand) {
      el.commandInput.value = saved || "";
      window.setTimeout(() => el.commandInput.focus(), 30);
    } else {
      el.manifestInput.value = saved !== undefined ? saved : (task.starter || "");
    }

    el.taskProgress.textContent = `${state.index + 1} / ${state.tasks.length}`;
    el.progressBar.style.width = `${((state.index + 1) / state.tasks.length) * 100}%`;
    const done = Object.keys(state.results).length;
    el.scoreProgress.textContent = state.mode === "session"
      ? `답안 ${Object.keys(state.answers).filter((k) => state.answers[k].trim()).length}개 저장`
      : `채점 ${done}개`;

    el.prevTask.disabled = state.index === 0;
    el.nextTask.textContent = state.index === state.tasks.length - 1 ? "결과 보기" : "다음";

    el.hintBox.classList.toggle("hidden", !state.shownHint[task.id]);
    if (state.shownHint[task.id]) renderHint(task);

    if (state.mode === "drill" && state.results[task.id]) renderVerdict(state.results[task.id]);
    else el.verdict.classList.add("hidden");

    if (state.shownAnswer[task.id]) renderReveal(task); else el.reveal.classList.add("hidden");

    startTaskClock();
  }

  // 힌트 + 공식 문서에서 그 내용을 찾는 검색어와 링크
  function renderHint(task) {
    const doc = window.k8sDocHint ? window.k8sDocHint(task.docs) : null;
    el.hintBox.innerHTML = `<p class="hint-text">${md(task.hint || "힌트가 없습니다.")}</p>` +
      (doc ? `<div class="hint-doc">
        <span class="hint-doc-label">문서에서 찾기</span>
        <p><code class="inline">${escapeHtml(doc.site)}</code> 검색창에 <span class="kw">${escapeHtml(doc.keyword)}</span></p>
        <a href="${doc.url}" target="_blank" rel="noopener">${escapeHtml(doc.page)} 문서 열기 ↗</a>
      </div>` : "");
    el.hintBox.classList.remove("hidden");
  }

  function readAnswer(task) {
    return task.type === "command" ? el.commandInput.value : el.manifestInput.value;
  }

  function storeAnswer() {
    const task = currentTask();
    if (!task) return;
    state.answers[task.id] = readAnswer(task);
  }

  // 매니페스트 과제는 편집기에 뼈대가 채워져 있으므로, 손대지 않은 것과
  // 실제로 답을 쓴 것을 구분해야 '막힌 과제'가 부풀지 않는다.
  function isUntouched(task, answer) {
    const text = String(answer || "").trim();
    if (!text) return true;
    return task.type === "manifest" && text === String(task.starter || "").trim();
  }

  function gradeTask(task, answer) {
    if (task.type === "command") return GRADER.gradeCommand(answer, task.match || {});
    return GRADER.gradeManifest(answer, task.checks || [], window.jsyaml);
  }

  function handleGrade() {
    const task = currentTask();
    if (!task) return;
    storeAnswer();
    if (state.mode === "session") { goTo(state.index + 1); return; }
    const answer = state.answers[task.id] || "";
    const result = gradeTask(task, answer);
    state.results[task.id] = result;
    const seconds = elapsedFor(task.id);
    result.seconds = seconds;
    if (answer.trim()) recordOutcome(task.id, result.pass);
    if (result.pass) result.previousBest = recordBestTime(task.id, seconds);
    updateSummary();
    renderVerdict(result);
    if (result.pass) renderReveal(task, true);
    el.scoreProgress.textContent = `채점 ${Object.keys(state.results).length}개`;
  }

  function renderVerdict(result) {
    const tone = result.pass ? "pass" : (result.score > 0 ? "partial" : "fail");
    const passed = result.checks.filter((c) => c.ok).length;
    const time = result.seconds > 0 ? ` · ${Math.round(result.seconds)}초` : "";
    const record = result.pass && result.previousBest !== undefined && result.previousBest !== null
      ? (result.seconds < result.previousBest
          ? ` (지난 기록 ${result.previousBest}초 — 갱신)`
          : ` (내 최고 기록 ${result.previousBest}초)`)
      : "";
    const heading = (result.pass
      ? "통과 — 조건을 모두 만족합니다"
      : (result.error ? result.error : `${passed} / ${result.checks.length} 조건 충족`)) + time + record;
    el.verdict.className = `verdict ${tone}`;
    el.verdict.innerHTML = `<h3>${escapeHtml(heading)}</h3>
      <ul class="check-list">${result.checks.map((check) => `
        <li class="${check.ok ? "ok" : "no"}">
          <span class="mark">${check.ok ? "✓" : "✗"}</span>
          <span>${md(check.label)}${check.ok || !check.got ? "" : ` <span class="got">— ${md(check.got)}</span>`}</span>
        </li>`).join("")}</ul>
      ${result.notes && result.notes.length
        ? `<ul class="verdict-notes">${result.notes.map((note) => `<li>${md(note)}</li>`).join("")}</ul>` : ""}`;
    el.verdict.classList.remove("hidden");
  }

  function renderReveal(task, quiet) {
    state.shownAnswer[task.id] = true;
    el.reveal.innerHTML = `
      <div>
        <p class="section-label">${quiet ? "MODEL ANSWER" : "ANSWER"}</p>
        <pre>${escapeHtml(task.answer || "")}</pre>
      </div>
      <p class="explain">${md(task.explain || "")}</p>
      ${task.docs ? `<a class="docs-link" href="${task.docs}" target="_blank" rel="noopener">공식 문서에서 확인 ↗</a>` : ""}`;
    el.reveal.classList.remove("hidden");
  }

  function goTo(index) {
    storeAnswer();
    stopTaskClock();
    if (index >= state.tasks.length) { finish(false); return; }
    state.index = Math.max(0, Math.min(index, state.tasks.length - 1));
    renderTask();
  }

  // ---------- 결과 ----------
  function finish(timedOut) {
    storeAnswer();
    stopTaskClock();
    stopTimer();
    stopClock();
    state.tasks.forEach((task) => {
      if (!state.results[task.id]) {
        const answer = state.answers[task.id] || "";
        const result = gradeTask(task, answer);
        state.results[task.id] = result;
        // 손도 안 댄 과제를 '막힌 과제'로 쌓지 않는다.
        if (!isUntouched(task, answer)) recordOutcome(task.id, result.pass);
      }
      const seconds = state.times[task.id] || 0;
      state.results[task.id].seconds = state.results[task.id].seconds || seconds;
      if (state.results[task.id].pass) recordBestTime(task.id, seconds);
    });
    updateSummary();

    const total = state.tasks.reduce((sum, task) => sum + state.results[task.id].score, 0);
    const score = Math.round((total / state.tasks.length) * 100);
    const exam = EXAMS[state.exam];
    const passLine = exam ? exam.pass : 66;
    const passed = score >= passLine;

    el.practiceArea.classList.add("hidden");
    el.resultArea.classList.remove("hidden");
    el.resultTitle.textContent = state.mode === "session"
      ? (state.setLabel || "모의 세션 결과")
      : "드릴 결과";
    el.resultScore.textContent = `${score}%`;
    el.resultScore.className = `score-ring${passed ? "" : " fail"}`;
    el.resultMessage.textContent = state.mode === "session"
      ? `${timedOut ? "시간이 끝났습니다. " : ""}${exam ? exam.label : ""} 합격선 ${passLine}% 기준 ${passed ? "통과" : "미달"}입니다. 부분점수까지 합산한 값입니다.`
      : `${state.tasks.length}개 중 ${state.tasks.filter((t) => state.results[t.id].pass).length}개를 완전히 맞혔습니다.`;

    if (state.mode === "session") {
      localStorage.setItem(STORAGE.recent, JSON.stringify({ exam: state.exam, score, at: Date.now() }));
      updateSummary();
    }

    renderTimeStats();
    renderAreaScores();
    renderReview();
    el.resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderTimeStats() {
    const entries = state.tasks
      .map((task) => ({ task, seconds: state.times[task.id] || 0 }))
      .filter((row) => row.seconds > 1);
    if (!entries.length) { el.timeStats.innerHTML = ""; return; }
    const total = entries.reduce((sum, row) => sum + row.seconds, 0);
    const average = total / entries.length;
    const slowest = entries.slice().sort((a, b) => b.seconds - a.seconds)[0];
    const fastest = entries.slice().sort((a, b) => a.seconds - b.seconds)[0];
    el.timeStats.innerHTML = `
      <article class="time-stat">
        <span>총 소요</span><strong>${formatClock(total)}</strong>
        <small>${entries.length}개 과제 기준</small>
      </article>
      <article class="time-stat">
        <span>과제당 평균</span><strong>${Math.round(average)}초</strong>
        <small>실제 시험은 문항당 6~7분</small>
      </article>
      <article class="time-stat">
        <span>가장 오래 걸린 과제</span><strong>${Math.round(slowest.seconds)}초</strong>
        <small>${escapeHtml(slowest.task.title)}</small>
      </article>
      <article class="time-stat">
        <span>가장 빨랐던 과제</span><strong>${Math.round(fastest.seconds)}초</strong>
        <small>${escapeHtml(fastest.task.title)}</small>
      </article>`;
  }

  function renderAreaScores() {
    const exam = state.exam;
    if (!EXAMS[exam]) { el.areaScores.innerHTML = ""; return; }
    const rows = Object.entries(EXAMS[exam].areas).map(([key, area]) => {
      const tasks = state.tasks.filter((task) => task.areas[exam] === key);
      if (!tasks.length) return "";
      const sum = tasks.reduce((acc, task) => acc + state.results[task.id].score, 0);
      const percent = Math.round((sum / tasks.length) * 100);
      return `<article class="area-score">
        <span>${area.label}</span>
        <strong>${percent}%</strong>
        <div class="bar"><i style="width:${percent}%"></i></div>
        <span>${tasks.length}과제</span>
      </article>`;
    });
    el.areaScores.innerHTML = rows.join("");
  }

  function renderReview() {
    el.reviewList.innerHTML = state.tasks.map((task, index) => {
      const result = state.results[task.id];
      const mine = (state.answers[task.id] || "").trim() || "(입력 없음)";
      return `<details class="review-item ${result.pass ? "ok" : "no"}">
        <summary>${index + 1}. ${escapeHtml(task.title)} — ${result.pass ? "통과" : `${Math.round(result.score * 100)}%`}${
          state.times[task.id] > 1 ? ` · ${Math.round(state.times[task.id])}초` : ""}</summary>
        <p style="margin:10px 0 0;line-height:1.8">${md(task.prompt)}</p>
        <p style="margin:12px 0 0;font-size:0.8rem;font-weight:700;color:var(--muted)">내 답</p>
        <pre>${escapeHtml(mine)}</pre>
        <p style="margin:12px 0 0;font-size:0.8rem;font-weight:700;color:var(--muted)">모범 답안</p>
        <pre>${escapeHtml(task.answer || "")}</pre>
        <p style="margin:12px 0 0;line-height:1.8">${md(task.explain || "")}</p>
        ${task.docs ? `<p style="margin:10px 0 0"><a class="docs-link" href="${task.docs}" target="_blank" rel="noopener">공식 문서 ↗</a></p>` : ""}
      </details>`;
    }).join("");
  }

  // ---------- 이벤트 ----------
  function bind() {
    el.drillTab.addEventListener("click", () => setSetupMode("drill"));
    el.sessionTab.addEventListener("click", () => setSetupMode("session"));
    document.querySelectorAll("[data-mode-target]").forEach((button) => {
      button.addEventListener("click", () => {
        setSetupMode(button.dataset.modeTarget);
        document.querySelector(".mode-tabs").scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
    el.drillExam.addEventListener("change", fillAreas);
    el.sessionExam.addEventListener("change", () => { fillSources(); renderWeights(); });
    el.sessionSource.addEventListener("change", () => { syncSourceControls(); renderWeights(); });
    el.sessionCount.addEventListener("change", renderWeights);
    el.startDrill.addEventListener("click", startDrill);
    el.startSession.addEventListener("click", startSession);

    el.gradeButton.addEventListener("click", handleGrade);
    el.prevTask.addEventListener("click", () => goTo(state.index - 1));
    el.nextTask.addEventListener("click", () => goTo(state.index + 1));
    el.finishSession.addEventListener("click", () => {
      if (window.confirm("세션을 끝내고 채점할까요?")) finish(false);
    });
    el.hintButton.addEventListener("click", () => {
      const task = currentTask();
      if (!task) return;
      state.shownHint[task.id] = true;
      renderHint(task);
    });
    el.revealButton.addEventListener("click", () => {
      const task = currentTask();
      if (task) renderReveal(task);
    });

    el.commandInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); handleGrade(); }
    });
    el.manifestInput.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        const start = el.manifestInput.selectionStart;
        const end = el.manifestInput.selectionEnd;
        const value = el.manifestInput.value;
        el.manifestInput.value = `${value.slice(0, start)}  ${value.slice(end)}`;
        el.manifestInput.selectionStart = el.manifestInput.selectionEnd = start + 2;
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); handleGrade(); }
    });
    [el.commandInput, el.manifestInput].forEach((input) => input.addEventListener("input", storeAnswer));

    el.retryMissed.addEventListener("click", () => {
      const missed = new Set(readList(STORAGE.missed));
      const pool = TASKS.filter((task) => missed.has(task.id));
      if (!pool.length) { window.alert("막힌 과제가 없습니다."); return; }
      beginSession("drill", state.exam, shuffle(pool), 0);
    });
    el.restartPractice.addEventListener("click", () => {
      el.resultArea.classList.add("hidden");
      document.querySelector(".mode-tabs").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  if (!TASKS.length) {
    el.totalTaskCount.textContent = "0개";
    console.warn("[k8s] 과제 데이터를 불러오지 못했습니다.");
  }
  fillSetup();
  updateSummary();
  if (window.renderK8sDocs) window.renderK8sDocs("docsLinks");
  setSetupMode("drill");
  bind();
})();
