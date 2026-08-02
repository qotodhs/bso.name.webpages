(() => {
  "use strict";

  const QUESTIONS = Array.isArray(window.HVAC_QUESTION_BANK) ? window.HVAC_QUESTION_BANK : [];
  const THEORY = Array.isArray(window.HVAC_THEORY) ? window.HVAC_THEORY : [];
  const SUBJECTS = window.HVAC_SUBJECTS || {};
  const MEMO_KEY = "bso-hvac-theory-memos-v1";
  const THEORY_SUBJECTS = ["energy", "design", "safety", "maintenance"];

  const $ = (id) => document.getElementById(id);
  const elements = {
    subjectFilter: $("subjectFilter"),
    searchInput: $("searchInput"),
    resetFilter: $("resetFilter"),
    theoryList: $("theoryList"),
    emptyState: $("emptyState"),
    activeFilter: $("activeFilter"),
    topicCount: $("topicCount"),
    pointCount: $("pointCount"),
    chapterNav: $("chapterNav")
  };

  const params = new URLSearchParams(location.search);
  const requestedSubject = params.get("subject") || "all";
  const requestedTopic = params.get("topic") || "";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // KaTeX 는 CDN 에서 불러온다. 로드에 실패해도 원본 수식을 그대로 보여준다.
  function renderMath(expr, displayMode) {
    const source = String(expr);
    if (typeof window.katex === "undefined") {
      return `<code class="math-fallback">${escapeHtml(source)}</code>`;
    }
    try {
      return window.katex.renderToString(source, {
        displayMode: Boolean(displayMode),
        throwOnError: false,
        strict: false
      });
    } catch (error) {
      return `<code class="math-fallback">${escapeHtml(source)}</code>`;
    }
  }

  // 본문·목록·표 안의 $...$ 구간만 수식으로 렌더링하고 나머지는 그대로 이스케이프한다.
  function withInlineMath(text) {
    return String(text ?? "")
      .split(/\$([^$]+)\$/g)
      .map((part, index) => (index % 2 ? renderMath(part, false) : escapeHtml(part)))
      .join("");
  }

  function safeParse(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  // "배관재료 · KS기호" 처럼 세부 주제가 붙은 경우 대분류만 떼어낸다.
  function topicRoots(topic) {
    const raw = String(topic || "");
    const roots = [raw.trim()];
    raw.split("·").forEach((part) => {
      const value = part.trim();
      if (value && !roots.includes(value)) roots.push(value);
    });
    return roots;
  }

  // 기출 문제는 "2022년 04월 24일 · 에너지관리" 형태라 이론 주제와 직접 연결되지 않는다.
  function linkQuestions() {
    const map = new Map();
    THEORY.forEach((chapter) => map.set(chapter.id, []));

    QUESTIONS.forEach((question) => {
      if (question.sourceType === "exam") return;
      const roots = topicRoots(question.topic);
      THEORY.forEach((chapter) => {
        if (chapter.subject !== question.subject) return;
        const hit = chapter.topics.some((topic) => roots.includes(topic));
        if (hit) map.get(chapter.id).push(question);
      });
    });
    return map;
  }

  const questionMap = linkQuestions();

  function countExamQuestions(subject) {
    return QUESTIONS.filter((item) => item.sourceType === "exam" && item.subject === subject).length;
  }

  function fillSubjects() {
    elements.subjectFilter.innerHTML = "";
    const options = [["all", "전체 과목"]].concat(
      THEORY_SUBJECTS.map((value) => [value, SUBJECTS[value]?.label || value])
    );
    options.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      elements.subjectFilter.appendChild(option);
    });
    const wanted = THEORY_SUBJECTS.includes(requestedSubject) ? requestedSubject : "all";
    elements.subjectFilter.value = wanted;
  }

  function saveMemo(key, value, statusElement) {
    const memos = safeParse(MEMO_KEY, {});
    memos[key] = value;
    localStorage.setItem(MEMO_KEY, JSON.stringify(memos));
    statusElement.textContent = "개인 메모를 저장했습니다.";
    window.setTimeout(() => { statusElement.textContent = ""; }, 1800);
  }

  function haystackOf(chapter) {
    const parts = [
      chapter.title,
      chapter.tagline || "",
      chapter.summary || "",
      SUBJECTS[chapter.subject]?.label || "",
      chapter.topics.join(" "),
      chapter.exam.join(" ")
    ];
    chapter.sections.forEach((section) => {
      parts.push(section.heading || "", section.body || "", section.tip || "");
      (section.list || []).forEach((item) => parts.push(item));
      (section.formulas || []).forEach(([expr, note]) => parts.push(expr, note || ""));
      if (section.table) {
        parts.push(section.table.head.join(" "));
        section.table.rows.forEach((row) => parts.push(row.join(" ")));
      }
    });
    // 검색어는 평문으로 들어오므로 LaTeX 제어문자를 걷어낸 형태로 색인한다.
    return parts
      .join(" ")
      .replace(/\\[a-zA-Z]+/g, " ")
      .replace(/[${}\\^_&]/g, " ")
      .toLowerCase();
  }

  const chapterHaystacks = new Map(THEORY.map((chapter) => [chapter.id, haystackOf(chapter)]));

  function renderFormulas(formulas) {
    if (!formulas || !formulas.length) return "";
    const rows = formulas
      .map(([expr, note]) => `
        <div class="formula-row">
          <div class="formula-expr">${renderMath(expr, true)}</div>
          ${note ? `<span>${withInlineMath(note)}</span>` : ""}
        </div>
      `)
      .join("");
    return `<div class="formula-box">${rows}</div>`;
  }

  function renderTable(table) {
    if (!table) return "";
    const head = table.head.map((cell) => `<th>${withInlineMath(cell)}</th>`).join("");
    const body = table.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${withInlineMath(cell)}</td>`).join("")}</tr>`)
      .join("");
    return `
      <div class="table-scroll">
        <table class="theory-table">
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  }

  function renderSection(section) {
    return `
      <section class="theory-section">
        <h3>${escapeHtml(section.heading || "")}</h3>
        ${section.body ? `<p class="section-body">${withInlineMath(section.body)}</p>` : ""}
        ${renderFormulas(section.formulas)}
        ${section.list && section.list.length
          ? `<ul class="point-list">${section.list.map((item) => `<li>${withInlineMath(item)}</li>`).join("")}</ul>`
          : ""}
        ${renderTable(section.table)}
        ${section.tip ? `<p class="tip-box"><strong>짚고 넘어가기</strong>${withInlineMath(section.tip)}</p>` : ""}
      </section>
    `;
  }

  function renderProblems(chapter) {
    const linked = questionMap.get(chapter.id) || [];
    const examCount = countExamQuestions(chapter.subject);
    if (!linked.length) {
      return `
        <details class="connected-problems">
          <summary>연결된 문제 풀어보기</summary>
          <div class="problem-list">
            <p class="problem-empty">
              이 주제에 직접 연결된 예상문제는 아직 없습니다.
              문제은행에서 ${escapeHtml(SUBJECTS[chapter.subject]?.short || chapter.subject)} 기출 ${examCount}문항을 풀어보세요.
            </p>
          </div>
        </details>
      `;
    }
    const items = linked
      .map((question, index) => {
        const answerText = question.choices[question.answer] || "";
        return `
          <div class="problem-item">
            <p><strong>${index + 1}.</strong> ${escapeHtml(question.question)}</p>
            <small>정답: ${escapeHtml(answerText)}</small>
          </div>
        `;
      })
      .join("");
    return `
      <details class="connected-problems">
        <summary>연결된 문제 ${linked.length}개 풀어보기</summary>
        <div class="problem-list">${items}</div>
      </details>
    `;
  }

  function buildCard(chapter, memos) {
    const card = document.createElement("article");
    card.className = "theory-card";
    card.id = `chapter-${chapter.id}`;
    card.dataset.subject = chapter.subject;

    const linked = questionMap.get(chapter.id) || [];
    const sectionsHtml = chapter.sections.map(renderSection).join("");
    const examHtml = chapter.exam.length
      ? `
        <div class="exam-box">
          <strong>시험에 이렇게 나온다</strong>
          <ul>${chapter.exam.map((item) => `<li>${withInlineMath(item)}</li>`).join("")}</ul>
        </div>
      `
      : "";

    card.innerHTML = `
      <div class="card-head">
        <div>
          <div class="topic-meta">
            <span class="badge">${escapeHtml(SUBJECTS[chapter.subject]?.short || chapter.subject)}</span>
            <span class="badge neutral">섹션 ${chapter.sections.length}개</span>
            ${linked.length ? `<span class="badge neutral">연결 문제 ${linked.length}개</span>` : ""}
          </div>
          <h2>${escapeHtml(chapter.title)}</h2>
          ${chapter.tagline ? `<p class="tagline">${escapeHtml(chapter.tagline)}</p>` : ""}
        </div>
        <a class="button secondary small" href="../engicert/?subject=${encodeURIComponent(chapter.subject)}">문제 풀기 ↗</a>
      </div>
      ${chapter.summary ? `<p class="summary">${withInlineMath(chapter.summary)}</p>` : ""}
      <div class="theory-body">${sectionsHtml}</div>
      ${examHtml}
      ${renderProblems(chapter)}
      <div class="memo-box">
        <div class="memo-head">
          <strong>나만의 이론 메모</strong>
          <span class="badge neutral">브라우저 저장</span>
        </div>
        <textarea aria-label="${escapeHtml(chapter.title)} 개인 메모" placeholder="공식, 헷갈리는 부분, 암기 문장을 적어두세요.">${escapeHtml(memos[chapter.id] || "")}</textarea>
        <div class="card-actions">
          <button class="button primary small save-memo" type="button">메모 저장</button>
          <a class="button secondary small" href="../wrongnote/">오답노트 보기</a>
        </div>
        <p class="saved-status" aria-live="polite"></p>
      </div>
    `;

    const textarea = card.querySelector("textarea");
    const status = card.querySelector(".saved-status");
    card.querySelector(".save-memo").addEventListener("click", () => {
      saveMemo(chapter.id, textarea.value, status);
    });
    return card;
  }

  function renderNav(filtered) {
    if (!elements.chapterNav) return;
    if (filtered.length < 2) {
      elements.chapterNav.innerHTML = "";
      elements.chapterNav.classList.add("hidden");
      return;
    }
    const groups = new Map();
    filtered.forEach((chapter) => {
      if (!groups.has(chapter.subject)) groups.set(chapter.subject, []);
      groups.get(chapter.subject).push(chapter);
    });
    elements.chapterNav.innerHTML = [...groups.entries()]
      .map(([subject, chapters]) => `
        <div class="nav-group">
          <span class="nav-label">${escapeHtml(SUBJECTS[subject]?.label || subject)}</span>
          <div class="nav-links">
            ${chapters
              .map((chapter) => `<a href="#chapter-${chapter.id}">${escapeHtml(chapter.title)}</a>`)
              .join("")}
          </div>
        </div>
      `)
      .join("");
    elements.chapterNav.classList.remove("hidden");
  }

  function render() {
    const subject = elements.subjectFilter.value;
    const query = elements.searchInput.value.trim().toLowerCase();
    const memos = safeParse(MEMO_KEY, {});

    const filtered = THEORY.filter((chapter) => {
      const subjectMatch = subject === "all" || chapter.subject === subject;
      const queryMatch = !query || (chapterHaystacks.get(chapter.id) || "").includes(query);
      return subjectMatch && queryMatch;
    });

    elements.theoryList.innerHTML = "";
    filtered.forEach((chapter) => {
      elements.theoryList.appendChild(buildCard(chapter, memos));
    });

    renderNav(filtered);

    const totalSections = filtered.reduce((sum, chapter) => sum + chapter.sections.length, 0);
    elements.topicCount.textContent = `${filtered.length}개 이론 주제`;
    elements.pointCount.textContent = `${totalSections}개 세부 이론 섹션`;
    elements.emptyState.classList.toggle("hidden", filtered.length > 0);

    const filters = [];
    if (subject !== "all") filters.push(SUBJECTS[subject]?.label || subject);
    if (query) filters.push(`검색: ${elements.searchInput.value.trim()}`);
    elements.activeFilter.textContent = filters.length ? filters.join(" · ") : "";
    elements.activeFilter.classList.toggle("hidden", filters.length === 0);
  }

  // 문제은행에서 넘어온 topic 을 이론 챕터로 되돌린다.
  function chapterForRequestedTopic() {
    if (!requestedTopic) return null;
    const roots = topicRoots(requestedTopic);
    return (
      THEORY.find(
        (chapter) =>
          (requestedSubject === "all" || chapter.subject === requestedSubject) &&
          chapter.topics.some((topic) => roots.includes(topic))
      ) || null
    );
  }

  function initialize() {
    fillSubjects();
    const target = chapterForRequestedTopic();
    render();

    if (target) {
      const card = document.getElementById(`chapter-${target.id}`);
      if (card) {
        card.classList.add("highlight");
        requestAnimationFrame(() => {
          card.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }

    elements.subjectFilter.addEventListener("change", render);
    elements.searchInput.addEventListener("input", render);
    elements.resetFilter.addEventListener("click", () => {
      elements.subjectFilter.value = "all";
      elements.searchInput.value = "";
      history.replaceState({}, "", location.pathname);
      render();
    });
  }

  initialize();
})();
