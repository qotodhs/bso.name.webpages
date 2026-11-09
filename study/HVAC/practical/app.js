(() => {
  const STORAGE_KEY = "hvacPractical.v1";
  const exams = window.HVAC_PRACTICAL || [];
  const problems = exams.flatMap((exam) => exam.problems);
  const byId = new Map(problems.map((problem) => [problem.id, problem]));

  const $ = (id) => document.getElementById(id);
  const el = {
    examList: $("examList"),
    card: $("problemCard"),
    navCurrent: $("navCurrent"),
    navDisclosure: $("navDisclosure"),
    statProblems: $("statProblems"),
    statReady: $("statReady"),
    statScore: $("statScore"),
    resumeLink: $("resumeLink")
  };

  // ── 저장소 ────────────────────────────────────────────────
  // { answers: { 문항ID: { 소문항번호: 문자열 | 2차원 배열 } },
  //   revealed: { 문항ID: true }, grades: { 문항ID: [채점포인트 키] }, last: 문항ID }
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return value && typeof value === "object" ? value : {};
    } catch (error) {
      return {};
    }
  }
  const store = Object.assign({ answers: {}, revealed: {}, grades: {}, last: "" }, load());
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      /* 비공개 창 등에서는 기록 없이 동작 */
    }
  }

  // ── 렌더링 도구 ───────────────────────────────────────────
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderMath(expr, displayMode) {
    const source = String(expr);
    if (typeof window.katex === "undefined") {
      return `<code class="math-fallback">${escapeHtml(source)}</code>`;
    }
    try {
      return window.katex.renderToString(source, { displayMode: Boolean(displayMode), throwOnError: false, strict: false });
    } catch (error) {
      return `<code class="math-fallback">${escapeHtml(source)}</code>`;
    }
  }

  function rich(text) {
    const source = String(text ?? "");
    const display = source.trim().match(/^\$\$([\s\S]+)\$\$$/);
    if (display) return renderMath(display[1], true);
    return source
      .split(/\$([^$]+)\$/g)
      .map((part, index) => (index % 2 ? renderMath(part, false) : escapeHtml(part)))
      .join("");
  }

  const formatDate = (date) => date.replaceAll("-", ".");
  const isReady = (problem) => problem.needs.length === 0 && problem.parts.every((part) => part.solution);
  const gradingKeys = (problem) =>
    problem.parts.flatMap((part, p) => (part.grading || []).map((item, g) => ({ key: `${p}.${g}`, ...item })));

  function earned(problem) {
    const checked = new Set(store.grades[problem.id] || []);
    return gradingKeys(problem).filter((item) => checked.has(item.key)).reduce((sum, item) => sum + item.score, 0);
  }

  function hasDraft(problem) {
    const answers = store.answers[problem.id];
    if (!answers) return false;
    return Object.values(answers).some((value) =>
      Array.isArray(value) ? value.some((row) => row.some((cell) => String(cell || "").trim())) : String(value || "").trim()
    );
  }

  function status(problem) {
    if (!isReady(problem)) return "waiting";
    if (store.revealed[problem.id]) return "graded";
    if (hasDraft(problem)) return "draft";
    return "todo";
  }
  const STATUS_LABEL = { waiting: "자료 대기", graded: "채점 완료", draft: "작성 중", todo: "미풀이" };

  // ── 현재 문항 ─────────────────────────────────────────────
  const params = new URLSearchParams(location.search);
  let currentId = [params.get("p"), store.last, problems[0]?.id].find((id) => id && byId.has(id));

  function go(id, { scroll = true } = {}) {
    if (!byId.has(id)) return;
    currentId = id;
    store.last = id;
    save();
    const url = new URL(location.href);
    url.searchParams.set("p", id);
    history.replaceState(null, "", url);
    renderNav();
    renderProblem();
    if (window.matchMedia("(max-width: 900px)").matches) el.navDisclosure.open = false;
    if (scroll) el.card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── 문항 목록 ─────────────────────────────────────────────
  function renderNav() {
    el.examList.innerHTML = exams.map((exam) => {
      const ready = exam.problems.filter(isReady);
      const total = ready.reduce((sum, problem) => sum + problem.points, 0);
      const mine = ready.filter((problem) => store.revealed[problem.id]).reduce((sum, problem) => sum + earned(problem), 0);
      const graded = ready.some((problem) => store.revealed[problem.id]);
      return `
        <section class="exam-group">
          <header>
            <h2>${formatDate(exam.date)} 시행</h2>
            <span class="exam-score">${graded ? `${mine} / ${total}점` : `${exam.problems.length}문항`}</span>
          </header>
          <ol>
            ${exam.problems.map((problem) => {
              const state = status(problem);
              return `
                <li>
                  <button type="button" class="nav-item${problem.id === currentId ? " active" : ""}" data-id="${problem.id}"
                    aria-current="${problem.id === currentId ? "true" : "false"}">
                    <span class="nav-no">${problem.no}</span>
                    <span class="nav-title">${escapeHtml(problem.title)}</span>
                    <span class="nav-meta"><i class="dot ${state}" title="${STATUS_LABEL[state]}"></i>${problem.points}점</span>
                  </button>
                </li>`;
            }).join("")}
          </ol>
        </section>`;
    }).join("");

    const current = byId.get(currentId);
    el.navCurrent.textContent = current ? `${formatDate(current.date)} · 문제 ${current.no}` : "";
  }

  el.examList.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-item");
    if (button) go(button.dataset.id);
  });

  // ── 답안 입력 ─────────────────────────────────────────────
  function answerOf(problem, partIndex) {
    return store.answers[problem.id]?.[partIndex];
  }

  function inputHtml(problem, part, partIndex) {
    const saved = answerOf(problem, partIndex);
    const input = part.input || { type: "text" };
    const revealed = Boolean(store.revealed[problem.id]);
    const check = part.solution?.check;

    if (input.type === "table") {
      const head = input.head.map((cell) => `<th scope="col">${rich(cell)}</th>`).join("");
      const body = input.rows.map((row, r) => `
        <tr>${row.map((cell, c) => {
          if (typeof cell === "string") {
            return c === 0 ? `<th scope="row">${rich(cell)}</th>` : `<td class="fixed">${rich(cell)}</td>`;
          }
          const value = saved?.[r]?.[c] ?? "";
          const verdict = revealed ? judge(value, check?.[r]?.[c]) : "";
          return `<td class="${verdict}">
            <input type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(value)}"
              data-part="${partIndex}" data-row="${r}" data-col="${c}"
              aria-label="${escapeHtml(stripMath(row[0]))} ${escapeHtml(stripMath(input.head[c]))}" />
            ${verdict ? `<span class="cell-answer">${escapeHtml(formatNumber(check[r][c].value))}</span>` : ""}
          </td>`;
        }).join("")}</tr>`).join("");
      return `<div class="table-scroll"><table class="answer-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    }

    if (input.type === "number") {
      const value = saved ?? "";
      const verdict = revealed ? judge(value, check) : "";
      return `
        <label class="number-answer ${verdict}">
          <span class="sr-only">${escapeHtml(part.label)} 답</span>
          <input type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(value)}" data-part="${partIndex}" placeholder="답" />
          <span class="unit">${escapeHtml(input.unit || "")}</span>
          ${verdict ? `<span class="verdict-text">${verdict === "ok" ? "허용오차 안" : `모범답안 ${escapeHtml(formatNumber(check.value))}`}</span>` : ""}
        </label>
        <textarea class="work-area" data-part="${partIndex}" data-work="1" rows="4"
          placeholder="풀이 과정 — 실기는 식과 대입이 채점됩니다">${escapeHtml(store.answers[problem.id]?.[`${partIndex}w`] ?? "")}</textarea>`;
    }

    return `<textarea class="work-area" data-part="${partIndex}" rows="6"
      placeholder="답안을 시험지에 쓰듯 적어 보세요">${escapeHtml(saved ?? "")}</textarea>`;
  }

  const stripMath = (text) => String(text).replace(/\$([^$]+)\$/g, "$1").replace(/\\mathrm\{([^}]*)\}/g, "$1");
  const formatNumber = (value) => (Number.isFinite(value) ? String(+value.toFixed(4)) : String(value ?? ""));

  function judge(raw, check) {
    if (!check || check.value === undefined) return "";
    const value = Number(String(raw ?? "").replace(/,/g, "").trim());
    if (String(raw ?? "").trim() === "" || !Number.isFinite(value)) return "ng";
    return Math.abs(value - check.value) <= (check.tol ?? 0) ? "ok" : "ng";
  }

  el.card.addEventListener("input", (event) => {
    const target = event.target;
    if (!target.dataset || target.dataset.part === undefined) return;
    const problem = byId.get(currentId);
    const answers = (store.answers[problem.id] ||= {});
    const part = target.dataset.part;
    if (target.dataset.row !== undefined) {
      const grid = Array.isArray(answers[part]) ? answers[part] : [];
      const r = Number(target.dataset.row);
      grid[r] ||= [];
      grid[r][Number(target.dataset.col)] = target.value;
      answers[part] = grid;
    } else if (target.dataset.work) {
      answers[`${part}w`] = target.value;
    } else {
      answers[part] = target.value;
    }
    save();
    refreshNavDot(problem);
  });

  function refreshNavDot(problem) {
    const dot = el.examList.querySelector(`[data-id="${problem.id}"] .dot`);
    if (!dot) return;
    const state = status(problem);
    dot.className = `dot ${state}`;
    dot.title = STATUS_LABEL[state];
  }

  // ── 문항 본문 ─────────────────────────────────────────────
  function renderProblem() {
    const problem = byId.get(currentId);
    if (!problem) {
      el.card.innerHTML = `<div class="empty">아직 수록된 문항이 없습니다.</div>`;
      return;
    }
    const ready = isReady(problem);
    const revealed = ready && Boolean(store.revealed[problem.id]);
    const index = problems.indexOf(problem);
    const prev = problems[index - 1];
    const next = problems[index + 1];

    const conditions = problem.conditions.map((item) => {
      const text = typeof item === "string" ? item : item.text;
      const note = typeof item === "string" ? "" : item.note;
      return `<li>${rich(text)}${note ? `<span class="cond-note">(${rich(note)})</span>` : ""}</li>`;
    }).join("");

    const figures = problem.figures.map((figure) => `
      <figure>
        <a href="${escapeHtml(figure.src)}" target="_blank" rel="noopener" title="새 창에서 크게 보기">
          <img src="${escapeHtml(figure.src)}" alt="${escapeHtml(figure.alt || "")}" loading="lazy" />
        </a>
        ${figure.caption ? `<figcaption>${rich(figure.caption)}</figcaption>` : ""}
      </figure>`).join("");

    const parts = problem.parts.map((part, p) => `
      <section class="part">
        <h3><span class="part-label">${escapeHtml(part.label)}</span><span>${rich(part.text)}</span></h3>
        <div class="answer-block">
          <p class="block-label">내 답안</p>
          ${inputHtml(problem, part, p)}
        </div>
        ${revealed ? solutionHtml(problem, part, p) : ""}
      </section>`).join("");

    const theory = problem.theory.map((item) =>
      `<a class="theory-link" href="../theory/?topic=${encodeURIComponent(item.topic)}">이론 · ${escapeHtml(item.title)} ↗</a>`
    ).join("");

    el.card.innerHTML = `
      <header class="problem-head">
        <div class="chips">
          <span class="chip">${formatDate(problem.date)} 시행</span>
          <span class="chip strong">문제 ${problem.no}</span>
          <span class="chip">${problem.points}점</span>
          <span class="chip state ${status(problem)}">${STATUS_LABEL[status(problem)]}</span>
        </div>
        <h2>${escapeHtml(problem.title)}</h2>
        ${theory ? `<div class="theory-row">${theory}</div>` : ""}
      </header>

      ${ready ? "" : `
        <div class="notice waiting">
          <strong>모범답안 준비 중</strong>
          <p>아래 자료가 들어오면 풀이·채점 포인트·해설이 열립니다. 답안은 지금 적어 두어도 저장됩니다.</p>
          <ul>${problem.needs.map((item) => `<li>${rich(item)}</li>`).join("")}</ul>
        </div>`}

      <div class="question">
        <p class="question-body">${rich(problem.body)}</p>
        ${conditions ? `<div class="conditions"><p class="block-label">조건</p><ol>${conditions}</ol></div>` : ""}
        ${figures ? `<div class="figures">${figures}</div>` : ""}
      </div>

      ${parts}

      ${ready ? gradeBarHtml(problem, revealed) : ""}
      ${revealed && problem.explanation ? `
        <section class="explanation">
          <p class="block-label">해설</p>
          <p>${rich(problem.explanation)}</p>
        </section>` : ""}

      <nav class="pager" aria-label="문항 이동">
        ${prev ? `<button type="button" class="button ghost" data-go="${prev.id}">← ${formatDate(prev.date)} 문제 ${prev.no}</button>` : "<span></span>"}
        ${next ? `<button type="button" class="button ghost" data-go="${next.id}">${formatDate(next.date)} 문제 ${next.no} →</button>` : "<span></span>"}
      </nav>`;
  }

  function solutionHtml(problem, part, p) {
    const solution = part.solution;
    const checked = new Set(store.grades[problem.id] || []);
    const steps = (solution.steps || []).map((step) => `<li>${rich(step)}</li>`).join("");
    const grading = (part.grading || []).map((item, g) => {
      const key = `${p}.${g}`;
      return `
        <label class="grade-item">
          <input type="checkbox" data-grade="${key}" ${checked.has(key) ? "checked" : ""} />
          <span>${rich(item.label)}</span>
          <b>${item.score}점</b>
        </label>`;
    }).join("");
    return `
      <div class="solution">
        <p class="block-label">모범답안</p>
        ${steps ? `<ol class="steps">${steps}</ol>` : ""}
        ${solution.answer ? `<p class="final-answer"><span class="answer-tag">답</span><span>${rich(solution.answer)}</span></p>` : ""}
        ${grading ? `<div class="grading"><p class="block-label">채점 포인트 — 내 답안에 있으면 체크</p>${grading}</div>` : ""}
      </div>`;
  }

  function gradeBarHtml(problem, revealed) {
    if (!revealed) {
      return `
        <div class="grade-bar">
          <p>답안을 다 썼다면 모범답안과 비교해 채점 포인트를 체크하세요.</p>
          <button type="button" class="button primary" data-reveal="1">모범답안과 비교하기</button>
        </div>`;
    }
    const score = earned(problem);
    const ratio = problem.points ? score / problem.points : 0;
    return `
      <div class="grade-bar revealed">
        <div class="score">
          <span>자기채점</span>
          <strong>${score}<small> / ${problem.points}점</small></strong>
          <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${problem.points}" aria-valuenow="${score}">
            <i style="width:${Math.round(ratio * 100)}%"></i>
          </div>
        </div>
        <button type="button" class="button ghost" data-reset="1">다시 풀기</button>
      </div>`;
  }

  el.card.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    const problem = byId.get(currentId);
    if (target.dataset.go) {
      go(target.dataset.go);
    } else if (target.dataset.reveal) {
      store.revealed[problem.id] = true;
      save();
      renderNav();
      renderProblem();
      el.card.querySelector(".solution")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (target.dataset.reset) {
      if (!confirm("이 문항의 답안과 채점 기록을 지우고 다시 풀까요?")) return;
      delete store.answers[problem.id];
      delete store.revealed[problem.id];
      delete store.grades[problem.id];
      save();
      renderNav();
      renderProblem();
      renderStats();
    }
  });

  el.card.addEventListener("change", (event) => {
    const key = event.target.dataset?.grade;
    if (key === undefined) return;
    const problem = byId.get(currentId);
    const set = new Set(store.grades[problem.id] || []);
    event.target.checked ? set.add(key) : set.delete(key);
    store.grades[problem.id] = [...set];
    save();
    // 점수 막대만 갱신해 입력 포커스·스크롤을 유지한다
    const bar = el.card.querySelector(".grade-bar");
    if (bar) bar.outerHTML = gradeBarHtml(problem, true);
    renderNav();
    renderStats();
  });

  // ── 현황 ─────────────────────────────────────────────────
  function renderStats() {
    const ready = problems.filter(isReady);
    const graded = ready.filter((problem) => store.revealed[problem.id]);
    el.statProblems.textContent = `${problems.length}문항`;
    el.statReady.textContent = `${ready.length}문항`;
    if (graded.length) {
      const mine = graded.reduce((sum, problem) => sum + earned(problem), 0);
      const total = graded.reduce((sum, problem) => sum + problem.points, 0);
      el.statScore.textContent = `${mine} / ${total}점`;
    } else {
      el.statScore.textContent = "기록 없음";
    }
  }

  el.resumeLink.addEventListener("click", (event) => {
    event.preventDefault();
    el.card.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (currentId) {
    store.last = currentId;
    save();
  }
  renderStats();
  renderNav();
  renderProblem();
})();
