(() => {
  "use strict";

  const QUESTIONS = Array.isArray(window.HVAC_QUESTION_BANK) ? window.HVAC_QUESTION_BANK : [];
  const THEORY = Array.isArray(window.HVAC_THEORY) ? window.HVAC_THEORY : [];
  const SUBJECTS = window.HVAC_SUBJECTS || {};
  const MEMO_KEY = "bso-hvac-theory-memos-v1";
  const THEORY_SUBJECTS = ["energy", "design", "safety", "maintenance"];

  const $ = (id) => document.getElementById(id);
  const elements = {
    toc: $("toc"),
    tocToggle: $("tocToggle"),
    chapterNav: $("chapterNav"),
    searchInput: $("searchInput"),
    searchResults: $("searchResults"),
    chapterView: $("chapterView"),
    emptyState: $("emptyState"),
    topicCount: $("topicCount"),
    pointCount: $("pointCount")
  };

  const params = new URLSearchParams(location.search);
  const requestedSubject = params.get("subject") || "";
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

  // 검색·발췌용 평문. LaTeX 제어문자를 걷어낸다.
  function plain(text) {
    return String(text ?? "")
      .replace(/\$([^$]+)\$/g, (m, expr) => expr.replace(/\\[a-zA-Z]+/g, " ").replace(/[{}\\^_&]/g, ""))
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeParse(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  const headingOf = (section) => String(section.heading || "").replace(/^\s*\d+\.\s*/, "");
  const subjectLabel = (subject) => SUBJECTS[subject]?.label || subject;
  const subjectShort = (subject) => SUBJECTS[subject]?.short || subjectLabel(subject);
  const tablesOf = (section) => section.tables || (section.table ? [section.table] : []);

  // ── 목차 순서: 과목 → 파트(처음 나온 순) → 챕터(파일 순) ───────────────────
  const TREE = THEORY_SUBJECTS.map((subject) => {
    const chapters = THEORY.filter((chapter) => chapter.subject === subject);
    const parts = [];
    chapters.forEach((chapter) => {
      const name = chapter.part || "";
      let part = parts.find((item) => item.name === name);
      if (!part) parts.push((part = { name, chapters: [] }));
      part.chapters.push(chapter);
    });
    // 파트가 정해진 챕터를 먼저, 아직 파트가 없는 챕터는 뒤에 둔다
    parts.sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1));
    return { subject, parts };
  }).filter((group) => group.parts.length);

  const ORDER = TREE.flatMap((group) => group.parts.flatMap((part) => part.chapters));
  const byId = new Map(ORDER.map((chapter) => [chapter.id, chapter]));

  // ── 문제 연결(예상문제만 topic 이 있다) ───────────────────────────────────
  function topicRoots(topic) {
    const raw = String(topic || "");
    const roots = [raw.trim()];
    raw.split("·").forEach((part) => {
      const value = part.trim();
      if (value && !roots.includes(value)) roots.push(value);
    });
    return roots;
  }

  const questionMap = (() => {
    const map = new Map(THEORY.map((chapter) => [chapter.id, []]));
    QUESTIONS.forEach((question) => {
      if (question.sourceType === "exam") return;
      const roots = topicRoots(question.topic);
      THEORY.forEach((chapter) => {
        if (chapter.subject !== question.subject) return;
        if (chapter.topics.some((topic) => roots.includes(topic))) map.get(chapter.id).push(question);
      });
    });
    return map;
  })();

  const countExamQuestions = (subject) =>
    QUESTIONS.filter((item) => item.sourceType === "exam" && item.subject === subject).length;

  // 기출 문항 → 이론 연결(engicert/explanations/theory-links.js)을 거꾸로 센다.
  // 절 단위("chapterId#절번호")와 챕터 단위(그 챕터 아래 전부)를 따로 둔다.
  const examCounts = (() => {
    const bySection = new Map();
    const byChapter = new Map();
    QUESTIONS.forEach((question) => {
      if (question.sourceType !== "exam" || !question.theoryRef) return;
      const ref = question.theoryRef;
      bySection.set(ref, (bySection.get(ref) || 0) + 1);
      const chapterId = ref.split("#")[0];
      byChapter.set(chapterId, (byChapter.get(chapterId) || 0) + 1);
    });
    return { bySection, byChapter };
  })();

  // 문제은행이 ?theory= 로 받은 절·챕터의 기출만 바로 출제한다
  const practiceHref = (ref, label) =>
    `../engicert/?theory=${encodeURIComponent(ref)}&label=${encodeURIComponent(label)}`;

  // ── 검색 색인: 절 단위 ─────────────────────────────────────────────────────
  function sectionTexts(section) {
    const parts = [headingOf(section), section.key, section.body, section.tip];
    (section.core || []).forEach((item) => parts.push(item));
    (section.list || []).forEach((item) => parts.push(item));
    (section.traps || []).forEach((item) => parts.push(item));
    (section.points || []).forEach((group) => parts.push(group.title, ...(group.items || [])));
    (section.formulas || []).forEach(([expr, note]) => parts.push(`$${expr}$`, note));
    tablesOf(section).forEach((table) => {
      parts.push(table.head.join(" "));
      table.rows.forEach((row) => parts.push(row.join(" ")));
    });
    return parts.filter(Boolean).map(plain);
  }

  const INDEX = ORDER.flatMap((chapter) => {
    const head = {
      chapter,
      section: 0,
      texts: [chapter.title, chapter.tagline, chapter.summary, subjectLabel(chapter.subject), chapter.part,
        chapter.topics.join(" "), ...chapter.exam].filter(Boolean).map(plain)
    };
    return [head].concat(chapter.sections.map((section, index) => ({
      chapter,
      section: index + 1,
      texts: sectionTexts(section)
    })));
  });

  // ── 렌더링: 절 ─────────────────────────────────────────────────────────────
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

  const renderItems = (items) =>
    `<ul class="point-list">${items.map((item) => `<li>${withInlineMath(item)}</li>`).join("")}</ul>`;

  function renderSee(refs, from) {
    const links = (refs || [])
      .map((ref) => {
        const [id, number] = String(ref).split("#");
        const target = byId.get(id);
        if (!target) return "";
        const section = number ? target.sections[Number(number) - 1] : null;
        const label = section ? `${target.title} · ${headingOf(section)}` : target.title;
        const href = section ? `#${id}__${number}` : `#${id}`;
        // 다른 과목으로 넘어가는 링크에만 과목을 붙인다
        const subject = target.subject !== from.subject ? `<span>${escapeHtml(subjectShort(target.subject))}</span>` : "";
        return `<a href="${href}">${subject}${escapeHtml(label)}</a>`;
      })
      .filter(Boolean);
    return links.length ? `<div class="see-also"><strong>함께 보기</strong>${links.join("")}</div>` : "";
  }

  // 절은 '핵심 → 자세히' 두 층으로 그린다.
  //  핵심  : 공식 → 판별 기준 → 핵심 문장. 외울 것을 먼저 모아 보여 준다
  //  자세히: 설명 문단 → 그림 → 표 → 소제목 묶음 → 세부 목록
  //  그 뒤에 함정 → 짚고 넘어가기 → 함께 보기
  // 공식부터 내밀면 비약이 되는 절은 lead: "body" 로 설명 문단을 맨 앞에 둔다.
  // key·core 가 없는 옛 형식 절은 설명 → 공식 순서를 그대로 따른다.
  function renderSection(chapter, section, index) {
    const number = index + 1;
    const structured = Boolean(section.key || (section.core && section.core.length));
    const bodyFirst = !structured || section.lead === "body";
    const body = section.body ? `<p class="section-body">${withInlineMath(section.body)}</p>` : "";
    const figures = (section.figures || []).map((figure) => `
      <figure class="section-figure">
        <img src="${escapeHtml(figure.src)}" alt="${escapeHtml(figure.alt || "")}" loading="lazy" />
        ${figure.caption ? `<figcaption>${withInlineMath(figure.caption)}</figcaption>` : ""}
      </figure>
    `).join("");
    // 상호작용 선도 자리. 내용은 interactive.js 가 채운다(renderChapter 끝의 mountInteractives)
    const interactive = section.interactive
      ? `<div class="interactive-box" data-interactive="${escapeHtml(section.interactive)}">
           <p class="interactive-title">직접 움직여 보기</p>
         </div>`
      : "";
    const details = [
      bodyFirst ? "" : body,
      figures,
      interactive,
      tablesOf(section).map(renderTable).join(""),
      (section.points || []).map((group) => `
        <div class="point-group">
          <h4>${withInlineMath(group.title)}</h4>
          ${renderItems(group.items || [])}
        </div>
      `).join(""),
      section.list && section.list.length ? renderItems(section.list) : ""
    ].join("").trim();

    let core = "";
    if (structured) {
      core = `
        <div class="core-block">
          ${renderFormulas(section.formulas)}
          ${section.key ? `<p class="key-box"><strong>판별 기준</strong>${withInlineMath(section.key)}</p>` : ""}
          ${section.core && section.core.length
            ? `<ul class="core-list">${section.core.map((item) => `<li>${withInlineMath(item)}</li>`).join("")}</ul>`
            : ""}
        </div>
      `;
    }

    return `
      <section class="theory-section" id="${escapeHtml(chapter.id)}__${number}">
        <h3><span class="sec-no">${number}</span>${escapeHtml(headingOf(section))}</h3>
        ${bodyFirst ? body : ""}
        ${structured ? core : renderFormulas(section.formulas)}
        ${details ? (structured ? `<div class="detail-block"><p class="detail-label">자세히</p>${details}</div>` : details) : ""}
        ${section.traps && section.traps.length ? `
          <div class="trap-box">
            <strong>함정</strong>
            <ul>${section.traps.map((item) => `<li>${withInlineMath(item)}</li>`).join("")}</ul>
          </div>
        ` : ""}
        ${section.tip ? `<p class="tip-box"><strong>짚고 넘어가기</strong>${withInlineMath(section.tip)}</p>` : ""}
        ${renderSee(section.see, chapter)}
        ${renderSectionPractice(chapter, section, number)}
      </section>
    `;
  }

  function renderSectionPractice(chapter, section, number) {
    const ref = `${chapter.id}#${number}`;
    const count = examCounts.bySection.get(ref) || 0;
    if (!count) return "";
    return `
      <div class="section-practice">
        <a class="button secondary small" href="${escapeHtml(practiceHref(ref, headingOf(section)))}">이 절의 기출 ${count}문항 풀기 ↗</a>
      </div>
    `;
  }

  // ── 렌더링: 챕터 ───────────────────────────────────────────────────────────
  function chapterPracticeHref(chapter) {
    return examCounts.byChapter.get(chapter.id)
      ? practiceHref(chapter.id, chapter.title)
      : `../engicert/?subject=${encodeURIComponent(chapter.subject)}`;
  }

  function renderProblems(chapter) {
    const linked = questionMap.get(chapter.id) || [];
    const examCount = examCounts.byChapter.get(chapter.id) || 0;
    const examLine = examCount
      ? `<p class="problem-empty">이 챕터와 연결된 기출 ${examCount}문항이 있습니다.
           <a href="${escapeHtml(chapterPracticeHref(chapter))}">기출 ${examCount}문항 풀기 ↗</a></p>`
      : `<p class="problem-empty">
           이 챕터와 연결된 기출 문항은 아직 없습니다.
           문제은행에서 ${escapeHtml(subjectShort(chapter.subject))} 기출 ${countExamQuestions(chapter.subject)}문항을 풀어보세요.
         </p>`;
    if (!linked.length) {
      return `
        <details class="fold"${examCount ? " open" : ""}>
          <summary>연결된 문제 풀어보기${examCount ? ` · 기출 ${examCount}문항` : ""}</summary>
          ${examLine}
        </details>
      `;
    }
    const items = linked
      .map((question, index) => `
        <div class="problem-item">
          <p><strong>${index + 1}.</strong> ${escapeHtml(question.question)}</p>
          <small>정답: ${escapeHtml(question.choices[question.answer] || "")}</small>
        </div>
      `)
      .join("");
    return `
      <details class="fold">
        <summary>연결된 문제 ${linked.length}개 풀어보기${examCount ? ` · 기출 ${examCount}문항` : ""}</summary>
        ${examLine}
        <div class="problem-list">${items}</div>
      </details>
    `;
  }

  function pagerLink(chapter, rel) {
    if (!chapter) return `<span></span>`;
    return `
      <a class="pager-link ${rel}" href="#${escapeHtml(chapter.id)}">
        <small>${rel === "prev" ? "← 이전" : "다음 →"} · ${escapeHtml(subjectShort(chapter.subject))}${chapter.part ? ` · ${escapeHtml(chapter.part)}` : ""}</small>
        <strong>${escapeHtml(chapter.title)}</strong>
      </a>
    `;
  }

  // interactive.js 가 없거나 모르는 종류면 빈 상자를 지운다(화면에 빈칸이 남지 않게)
  function mountInteractives() {
    elements.chapterView.querySelectorAll("[data-interactive]").forEach((box) => {
      const mount = window.HVAC_INTERACTIVE && window.HVAC_INTERACTIVE[box.dataset.interactive];
      if (typeof mount !== "function") { box.remove(); return; }
      try { mount(box); } catch (error) { box.remove(); }
    });
  }

  function renderChapter(chapter) {
    const memos = safeParse(MEMO_KEY, {});
    const position = ORDER.indexOf(chapter);
    const flow = chapter.sections.length > 1
      ? `
        <nav class="chapter-flow" aria-label="이 챕터의 절">
          <span>이 챕터의 흐름</span>
          <ol>${chapter.sections.map((section, index) => `
            <li><a href="#${escapeHtml(chapter.id)}__${index + 1}">${escapeHtml(headingOf(section))}</a></li>
          `).join("")}</ol>
        </nav>
      `
      : "";
    const exam = chapter.exam.length
      ? `
        <div class="exam-box">
          <strong>시험에 이렇게 나온다</strong>
          <ul>${chapter.exam.map((item) => `<li>${withInlineMath(item)}</li>`).join("")}</ul>
        </div>
      `
      : "";

    elements.chapterView.innerHTML = `
      <header class="chapter-head">
        <div class="topic-meta">
          <span class="badge">${escapeHtml(subjectLabel(chapter.subject))}</span>
          ${chapter.part ? `<span class="badge neutral">${escapeHtml(chapter.part)}</span>` : ""}
        </div>
        <h2>${escapeHtml(chapter.title)}</h2>
        ${chapter.tagline ? `<p class="tagline">${escapeHtml(chapter.tagline)}</p>` : ""}
        ${chapter.summary ? `<p class="summary">${withInlineMath(chapter.summary)}</p>` : ""}
        ${flow}
      </header>
      <div class="theory-body">${chapter.sections.map((section, index) => renderSection(chapter, section, index)).join("")}</div>
      ${exam}
      <nav class="pager" aria-label="챕터 이동">
        ${pagerLink(ORDER[position - 1], "prev")}
        ${pagerLink(ORDER[position + 1], "next")}
      </nav>
      <div class="chapter-tools">
        ${renderProblems(chapter)}
        <details class="fold">
          <summary>나만의 이론 메모${memos[chapter.id] ? " · 저장됨" : ""}</summary>
          <textarea aria-label="${escapeHtml(chapter.title)} 개인 메모" placeholder="공식, 헷갈리는 부분, 암기 문장을 적어두세요.">${escapeHtml(memos[chapter.id] || "")}</textarea>
          <div class="card-actions">
            <button class="button primary small save-memo" type="button">메모 저장</button>
            <a class="button secondary small" href="${escapeHtml(chapterPracticeHref(chapter))}">문제 풀기 ↗</a>
            <a class="button secondary small" href="../wrongnote/">오답노트 보기</a>
          </div>
          <p class="saved-status" aria-live="polite"></p>
        </details>
      </div>
    `;
    mountInteractives();

    const textarea = elements.chapterView.querySelector("textarea");
    const status = elements.chapterView.querySelector(".saved-status");
    elements.chapterView.querySelector(".save-memo").addEventListener("click", () => {
      const saved = safeParse(MEMO_KEY, {});
      saved[chapter.id] = textarea.value;
      try {
        localStorage.setItem(MEMO_KEY, JSON.stringify(saved));
        status.textContent = "개인 메모를 저장했습니다.";
      } catch (error) {
        status.textContent = "이 브라우저에서는 메모를 저장할 수 없습니다.";
      }
      window.setTimeout(() => { status.textContent = ""; }, 1800);
    });
  }

  // ── 목차 ──────────────────────────────────────────────────────────────────
  const openSubjects = new Set();

  function renderToc(current) {
    if (current) openSubjects.add(current.subject);
    elements.chapterNav.innerHTML = TREE.map((group) => `
      <details class="toc-subject" data-subject="${group.subject}" ${openSubjects.has(group.subject) ? "open" : ""}>
        <summary>${escapeHtml(subjectLabel(group.subject))}<span>${group.parts.reduce((n, part) => n + part.chapters.length, 0)}</span></summary>
        ${group.parts.map((part) => `
          <div class="toc-part">
            ${part.name ? `<p class="toc-part-name">${escapeHtml(part.name)}</p>` : ""}
            ${part.chapters.map((chapter) => {
              const active = chapter === current;
              return `
                <a class="toc-chapter${active ? " active" : ""}" href="#${escapeHtml(chapter.id)}" ${active ? 'aria-current="page"' : ""}>${escapeHtml(chapter.title)}</a>
                ${active ? `<ol class="toc-sections">${chapter.sections.map((section, index) => `
                  <li><a href="#${escapeHtml(chapter.id)}__${index + 1}">${escapeHtml(headingOf(section))}</a></li>
                `).join("")}</ol>` : ""}
              `;
            }).join("")}
          </div>
        `).join("")}
      </details>
    `).join("");

    elements.chapterNav.querySelectorAll(".toc-subject").forEach((node) => {
      node.addEventListener("toggle", () => {
        if (node.open) openSubjects.add(node.dataset.subject);
        else openSubjects.delete(node.dataset.subject);
      });
    });
  }

  // ── 검색 ──────────────────────────────────────────────────────────────────
  function snippet(texts, query) {
    const joined = texts.join(" · ");
    const at = joined.toLowerCase().indexOf(query);
    if (at < 0) return escapeHtml(joined.slice(0, 90));
    const start = Math.max(0, at - 40);
    const end = Math.min(joined.length, at + query.length + 60);
    return `${start ? "…" : ""}${escapeHtml(joined.slice(start, at))}<mark>${escapeHtml(joined.slice(at, at + query.length))}</mark>${escapeHtml(joined.slice(at + query.length, end))}${end < joined.length ? "…" : ""}`;
  }

  function renderSearch() {
    const raw = elements.searchInput.value.trim();
    const query = raw.toLowerCase();
    if (!query) {
      elements.searchResults.classList.add("hidden");
      elements.chapterView.classList.remove("hidden");
      elements.emptyState.classList.add("hidden");
      return;
    }
    const hits = INDEX.filter((entry) => entry.texts.some((text) => text.toLowerCase().includes(query)));
    const groups = new Map();
    hits.forEach((hit) => {
      if (!groups.has(hit.chapter)) groups.set(hit.chapter, []);
      groups.get(hit.chapter).push(hit);
    });

    const wasHidden = elements.searchResults.classList.contains("hidden") && elements.emptyState.classList.contains("hidden");
    elements.chapterView.classList.add("hidden");
    elements.emptyState.classList.toggle("hidden", groups.size > 0);
    elements.searchResults.classList.toggle("hidden", groups.size === 0);
    // 본문을 읽던 자리에서 검색을 시작하면 결과 맨 위가 화면 밖에 남는다
    if (wasHidden) {
      const top = elements.searchResults.parentElement.getBoundingClientRect().top;
      if (top < 0) window.scrollTo({ top: window.scrollY + top - 16 });
    }
    elements.searchResults.innerHTML = `
      <p class="search-summary">“${escapeHtml(raw)}” — ${groups.size}개 챕터, ${hits.length}곳</p>
      ${[...groups.entries()].map(([chapter, list]) => `
        <div class="search-group">
          <a class="search-chapter" href="#${escapeHtml(chapter.id)}">
            <span>${escapeHtml(subjectShort(chapter.subject))}${chapter.part ? ` · ${escapeHtml(chapter.part)}` : ""}</span>
            ${escapeHtml(chapter.title)}
          </a>
          ${list.filter((hit) => hit.section).map((hit) => `
            <a class="search-hit" href="#${escapeHtml(chapter.id)}__${hit.section}">
              <strong>${hit.section}. ${escapeHtml(headingOf(chapter.sections[hit.section - 1]))}</strong>
              <span>${snippet(hit.texts, query)}</span>
            </a>
          `).join("")}
        </div>
      `).join("")}
    `;
  }

  // ── 라우팅: #챕터id 또는 #챕터id__절번호 ──────────────────────────────────
  function chapterForRequest() {
    if (requestedTopic) {
      const roots = topicRoots(requestedTopic);
      const hit = ORDER.find((chapter) =>
        (!requestedSubject || chapter.subject === requestedSubject) &&
        chapter.topics.some((topic) => roots.includes(topic)));
      if (hit) return hit;
    }
    if (requestedSubject) {
      const first = ORDER.find((chapter) => chapter.subject === requestedSubject);
      if (first) return first;
    }
    return ORDER[0];
  }

  let shownChapter = null;

  function route() {
    const hash = decodeURIComponent(location.hash.slice(1));
    const [id, number] = hash.split("__");
    let chapter = byId.get(id);
    if (!chapter) {
      chapter = chapterForRequest();
      if (!chapter) return;
      history.replaceState(null, "", `${location.pathname}${location.search}#${chapter.id}`);
    }

    // 검색 결과에서 들어오면 결과를 닫고 본문으로 돌아간다
    elements.searchResults.classList.add("hidden");
    elements.emptyState.classList.add("hidden");
    elements.chapterView.classList.remove("hidden");

    const changed = chapter !== shownChapter;
    if (changed) {
      renderChapter(chapter);
      shownChapter = chapter;
      document.title = `${chapter.title} | HVAC 이론 노트`;
    }
    renderToc(chapter);
    elements.toc.classList.remove("open");
    elements.tocToggle.setAttribute("aria-expanded", "false");

    const target = number ? document.getElementById(`${chapter.id}__${number}`) : null;
    if (target) {
      // 처음 열 때는 글꼴·수식이 늦게 자리를 잡아 위치가 밀리므로 load 뒤에 한 번 더 맞춘다
      const go = () => target.scrollIntoView({ block: "start", behavior: "instant" });
      go();
      if (document.readyState !== "complete") window.addEventListener("load", go, { once: true });
    } else if (changed) {
      const top = elements.chapterView.getBoundingClientRect().top + window.scrollY - 16;
      if (window.scrollY > top) window.scrollTo({ top });
    }
  }

  function initialize() {
    // 새로고침 때 브라우저가 옛 스크롤 위치를 되살려 절 앵커 이동을 덮어쓰지 않게 한다
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const sections = THEORY.reduce((sum, chapter) => sum + chapter.sections.length, 0);
    elements.topicCount.textContent = `${THEORY.length}개 챕터`;
    elements.pointCount.textContent = `${sections}개 절`;

    let timer = 0;
    elements.searchInput.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(renderSearch, 120);
    });
    elements.searchInput.addEventListener("focus", () => {
      if (elements.searchInput.value.trim()) renderSearch();
    });
    elements.tocToggle.addEventListener("click", () => {
      const open = elements.toc.classList.toggle("open");
      elements.tocToggle.setAttribute("aria-expanded", String(open));
    });
    window.addEventListener("hashchange", route);
    // 지금 주소와 같은 링크를 누르면 hashchange 가 없으므로 직접 다시 맞춘다
    document.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (link && link.getAttribute("href") === location.hash) {
        event.preventDefault();
        route();
      }
    });
    route();
  }

  initialize();
})();
