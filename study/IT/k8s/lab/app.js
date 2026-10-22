// 실습실 조립 — 랩 선택, 클러스터 구동, 터미널·편집기 연결, 채점
(() => {
  "use strict";

  const { Cluster, Kubectl, Shell, Terminal } = window.K8sLab;
  const LABS = Array.isArray(window.K8S_LABS) ? window.K8S_LABS : [];
  const $ = (id) => document.getElementById(id);

  const el = {
    labSelect: $("labSelect"), ctxLabel: $("ctxLabel"), timer: $("timer"),
    gradeButton: $("gradeButton"), resetButton: $("resetButton"), docsButton: $("docsButton"),
    clearButton: $("clearButton"),
    labTitle: $("labTitle"), labIntro: $("labIntro"), taskList: $("taskList"),
    scoreLabel: $("scoreLabel"), gradeSummary: $("gradeSummary"),
    termOut: $("termOut"), termIn: $("termIn"), ps1: $("ps1"),
    editor: $("editor"), editorName: $("editorName"), fileSelect: $("fileSelect"), saveButton: $("saveButton"),
    toast: $("toast")
  };

  const state = {
    lab: null, cluster: null, shell: null, kubectl: null, terminal: null,
    tickId: null, timerId: null, remaining: 0,
    editing: null,            // { path, onSave }
    results: {}
  };

  const escapeHtml = (text) => String(text == null ? "" : text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const md = (text) => escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");

  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.remove("hidden");
    window.clearTimeout(state.toastId);
    state.toastId = window.setTimeout(() => el.toast.classList.add("hidden"), 2200);
  }

  // ---------- 랩 구동 ----------
  function startLab(lab) {
    state.lab = lab;
    state.results = {};
    if (state.tickId) window.clearInterval(state.tickId);
    if (state.timerId) window.clearInterval(state.timerId);

    const cluster = new Cluster();
    try { lab.seed(cluster, window.labHelpers); } catch (e) { console.error("시드 실패", e); }
    cluster.tick();

    const shell = new Shell({
      cluster,
      kubectl: null,
      files: Object.assign({ "/root/.bashrc": "alias k=kubectl\nexport do='--dry-run=client -o yaml'\n" }, lab.files || {}),
      openEditor: (path, text, onSave) => openEditor(path, text, onSave)
    });
    const kubectl = new Kubectl(cluster, {
      yaml: window.jsyaml,
      readFile: (path) => shell.readFile(path),
      writeFile: (path, text) => shell.writeFile(path, text),
      openEditor: (name, text, onSave) => openEditor(`/root/${name}`, text, onSave)
    });
    shell.kubectl = kubectl;

    state.cluster = cluster;
    state.shell = shell;
    state.kubectl = kubectl;

    if (!state.terminal) {
      state.terminal = new Terminal({
        output: el.termOut, input: el.termIn, prompt: el.ps1,
        onRun: (line) => runLine(line),
        complete: (line) => completions(line)
      });
    }
    state.terminal.clear();
    state.terminal.history = [];
    state.terminal.write(`CKA · CKAD 실습실 — ${lab.title}`, "note");
    state.terminal.write("브라우저 안에서 도는 모의 클러스터입니다. `help` 로 쓸 수 있는 명령을 보세요.", "note");
    state.terminal.write("", "out");

    state.tickId = window.setInterval(() => {
      cluster.tick();
      syncContext();
    }, 1000);

    state.remaining = lab.minutes * 60;
    paintTimer();
    state.timerId = window.setInterval(() => {
      state.remaining -= 1;
      paintTimer();
      if (state.remaining <= 0) { window.clearInterval(state.timerId); grade(true); }
    }, 1000);

    el.labTitle.textContent = lab.title;
    el.labIntro.innerHTML = md(lab.intro || "");
    renderTasks();
    syncContext();
    refreshFiles();
    el.editor.value = "";
    el.editorName.textContent = "편집기";
    state.editing = null;
    state.terminal.focus();
  }

  function runLine(line) {
    const result = state.shell.exec(line);
    state.cluster.tick();
    syncContext();
    refreshFiles();
    return result;
  }

  function syncContext() {
    const c = state.cluster;
    el.ctxLabel.textContent = `${c.context} · ${c.namespace}`;
    const cwd = state.shell.cwd === "/root" ? "~" : state.shell.cwd;
    el.ps1.textContent = `root@controlplane:${cwd}$`;
  }

  function paintTimer() {
    const total = Math.max(0, state.remaining);
    el.timer.textContent = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    el.timer.classList.toggle("urgent", total <= 300);
  }

  // ---------- 자동완성 ----------
  function completions(line) {
    const parts = line.split(/\s+/);
    const last = parts[parts.length - 1] || "";
    const verbs = ["get", "describe", "create", "apply", "run", "expose", "delete", "scale", "set", "label",
      "annotate", "taint", "logs", "exec", "rollout", "edit", "patch", "config", "top", "explain", "auth", "drain"];
    if (parts.length <= 1) {
      return ["kubectl", "k", "ls", "cat", "vi", "echo", "grep", "help", "clear"].filter((x) => x.startsWith(last));
    }
    if (parts.length === 2 && /^k(ubectl)?$/.test(parts[0])) return verbs.filter((v) => v.startsWith(last));
    if (parts.length === 3 && /^k(ubectl)?$/.test(parts[0])) {
      return Object.keys(window.K8sLab.RESOURCES).filter((r) => r.startsWith(last));
    }
    const plural = window.K8sLab.resolveKind(parts[2] || "");
    if (plural) {
      const ns = state.cluster.namespace;
      return state.cluster.list(plural, ns).map((o) => o.metadata.name).filter((n) => n.startsWith(last));
    }
    return Object.keys(state.shell.files)
      .map((p) => p.split("/").pop())
      .filter((n) => n.startsWith(last));
  }

  // ---------- 편집기 ----------
  function openEditor(path, text, onSave) {
    state.editing = { path, onSave };
    el.editor.value = text;
    el.editorName.textContent = path;
    refreshFiles();
    el.fileSelect.value = path;
    el.editor.focus();
  }

  function saveEditor() {
    if (!state.editing) {
      const name = window.prompt("저장할 파일 이름", "/root/manifest.yaml");
      if (!name) return;
      state.editing = { path: state.shell.resolve(name), onSave: null };
      el.editorName.textContent = state.editing.path;
    }
    const { path, onSave } = state.editing;
    state.shell.writeFile(path, el.editor.value);
    if (onSave) {
      try { onSave(el.editor.value); toast(`${path} 저장 — 클러스터에 반영했습니다`); }
      catch (e) { toast(`반영 실패: ${e.reason || e.message}`); return; }
    } else {
      toast(`${path} 저장`);
    }
    state.cluster.tick();
    refreshFiles();
  }

  function refreshFiles() {
    const paths = Object.keys(state.shell.files).sort();
    const current = el.fileSelect.value;
    el.fileSelect.innerHTML = '<option value="">파일 열기…</option>' +
      paths.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
    if (paths.includes(current)) el.fileSelect.value = current;
  }

  // ---------- 과제·채점 ----------
  function renderTasks() {
    const lab = state.lab;
    el.taskList.innerHTML = lab.tasks.map((task, index) => {
      const result = state.results[task.id];
      const cls = result ? (result.ok ? "pass" : "fail") : "";
      const doc = window.k8sDocHint && task.docs ? window.k8sDocHint(task.docs) : null;
      return `<li class="task ${cls}" data-task="${task.id}">
        <div class="task-top">
          <span class="task-num">${result ? (result.ok ? "✓" : "✗") : index + 1}</span>
          <p class="task-prompt">${md(task.prompt)}</p>
        </div>
        ${result && !result.ok && result.detail ? `<p class="task-detail">${md(result.detail)}</p>` : ""}
        <div class="task-actions">
          <button class="btn tiny" type="button" data-check="${task.id}">확인</button>
          <button class="btn tiny ghost" type="button" data-hint="${task.id}">힌트</button>
        </div>
        <div class="hint-box hidden" data-hintbox="${task.id}">
          ${md(task.hint || "")}
          ${doc ? `<br /><br />문서에서 찾기 — <code>${escapeHtml(doc.site)}</code> 검색창에 <strong>${escapeHtml(doc.keyword)}</strong>
            · <a href="${task.docs}" target="_blank" rel="noopener">${escapeHtml(doc.page)} 열기 ↗</a>` : ""}
        </div>
      </li>`;
    }).join("");
    updateScore();
  }

  function checkTask(task) {
    const ctx = {
      c: state.cluster,
      read: (path) => state.shell.readFile(path),
      files: state.shell.files
    };
    try {
      const raw = task.verify(ctx);
      const result = raw === true ? { ok: true } : raw === false ? { ok: false } : raw;
      state.results[task.id] = result;
      return result;
    } catch (e) {
      const result = { ok: false, detail: `검사 중 오류: ${e.message}` };
      state.results[task.id] = result;
      return result;
    }
  }

  function grade(timedOut) {
    state.cluster.tick();
    state.lab.tasks.forEach(checkTask);
    renderTasks();
    const passed = state.lab.tasks.filter((t) => (state.results[t.id] || {}).ok).length;
    const total = state.lab.tasks.length;
    const percent = Math.round((passed / total) * 100);
    el.gradeSummary.innerHTML = `${timedOut ? "<strong>시간 종료.</strong> " : ""}${passed} / ${total} 통과 · ${percent}% ` +
      (percent >= 66 ? "— 합격선(66%)을 넘었습니다." : "— 합격선은 66% 입니다.");
    toast(`${passed} / ${total} 통과`);
  }

  function updateScore() {
    const passed = state.lab.tasks.filter((t) => (state.results[t.id] || {}).ok).length;
    el.scoreLabel.textContent = `${passed} / ${state.lab.tasks.length}`;
  }

  // ---------- 이벤트 ----------
  function bind() {
    el.labSelect.addEventListener("change", () => {
      const lab = LABS.find((l) => l.id === el.labSelect.value);
      if (lab) startLab(lab);
    });
    el.resetButton.addEventListener("click", () => {
      if (window.confirm("랩을 처음 상태로 되돌릴까요? 만든 오브젝트와 파일이 사라집니다.")) startLab(state.lab);
    });
    el.gradeButton.addEventListener("click", () => grade(false));
    el.clearButton.addEventListener("click", () => state.terminal.clear());
    el.docsButton.addEventListener("click", () => window.open("https://kubernetes.io/docs/", "_blank", "noopener"));

    el.taskList.addEventListener("click", (event) => {
      const checkId = event.target.getAttribute("data-check");
      const hintId = event.target.getAttribute("data-hint");
      if (checkId) {
        const task = state.lab.tasks.find((t) => t.id === checkId);
        const result = checkTask(task);
        renderTasks();
        toast(result.ok ? "통과" : (result.detail || "아직입니다"));
      }
      if (hintId) {
        const box = el.taskList.querySelector(`[data-hintbox="${hintId}"]`);
        if (box) box.classList.toggle("hidden");
      }
    });

    el.saveButton.addEventListener("click", saveEditor);
    el.editor.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        const start = el.editor.selectionStart, end = el.editor.selectionEnd;
        el.editor.value = `${el.editor.value.slice(0, start)}  ${el.editor.value.slice(end)}`;
        el.editor.selectionStart = el.editor.selectionEnd = start + 2;
      }
      if (event.key === "s" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); saveEditor(); }
    });
    el.fileSelect.addEventListener("change", () => {
      const path = el.fileSelect.value;
      if (!path) return;
      openEditor(path, state.shell.readFile(path) || "", null);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") state.terminal.focus();
    });
  }

  // ---------- 시작 ----------
  if (!LABS.length) {
    el.labTitle.textContent = "랩을 불러오지 못했습니다";
    return;
  }
  el.labSelect.innerHTML = LABS.map((lab) =>
    `<option value="${lab.id}">${lab.exam.toUpperCase()} · ${lab.title}</option>`).join("");
  bind();
  startLab(LABS[0]);
})();
