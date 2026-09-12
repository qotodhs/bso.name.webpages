// 노트 화면 — 시험 필터 · 검색 · 목차
(() => {
  "use strict";

  const NOTES = Array.isArray(window.K8S_NOTES) ? window.K8S_NOTES : [];
  const EXAMS = window.K8S_EXAMS || {};
  const $ = (id) => document.getElementById(id);

  const el = {
    examFilter: $("examFilter"),
    searchInput: $("searchInput"),
    resetFilter: $("resetFilter"),
    chapterNav: $("chapterNav"),
    noteList: $("noteList"),
    emptyState: $("emptyState"),
    chapterCount: $("chapterCount"),
    sectionCount: $("sectionCount")
  };

  const escapeHtml = (text) => String(text == null ? "" : text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const md = (text) => escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  function renderSection(section) {
    const parts = [];
    if (section.heading) parts.push(`<h3>${escapeHtml(section.heading)}</h3>`);
    if (section.body) parts.push(`<p>${md(section.body)}</p>`);
    if (section.code) parts.push(`<pre>${escapeHtml(section.code)}</pre>`);
    if (Array.isArray(section.list)) {
      parts.push(`<ul>${section.list.map((item) => `<li>${md(item)}</li>`).join("")}</ul>`);
    }
    if (section.table) {
      parts.push(`<div style="overflow-x:auto"><table class="note-table">
        <thead><tr>${section.table.head.map((h) => `<th>${md(h)}</th>`).join("")}</tr></thead>
        <tbody>${section.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${md(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`);
    }
    if (section.tip) parts.push(`<p class="note-tip">${md(section.tip)}</p>`);
    return parts.join("");
  }

  function renderChapter(chapter) {
    const badges = chapter.exams.map((id) =>
      `<span class="badge exam">${EXAMS[id] ? EXAMS[id].label : id}</span>`).join(" ");
    return `<article class="note-card" id="${chapter.id}">
      <div class="task-meta">${badges}${chapter.topics.map((t) => `<span class="badge type">${escapeHtml(t)}</span>`).join("")}</div>
      <h2>${escapeHtml(chapter.title)}</h2>
      <p class="tagline">${escapeHtml(chapter.tagline || "")}</p>
      ${chapter.summary ? `<p>${md(chapter.summary)}</p>` : ""}
      ${chapter.sections.map(renderSection).join("")}
      ${chapter.exam.length ? `<div class="note-exam"><strong>시험 포인트</strong>
        <ul>${chapter.exam.map((item) => `<li>${md(item)}</li>`).join("")}</ul></div>` : ""}
    </article>`;
  }

  function matches(chapter, exam, query) {
    if (exam !== "all" && !chapter.exams.includes(exam)) return false;
    if (!query) return true;
    const haystack = JSON.stringify(chapter).toLowerCase();
    return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
  }

  function render() {
    const exam = el.examFilter.value;
    const query = el.searchInput.value.trim();
    const list = NOTES.filter((chapter) => matches(chapter, exam, query));

    el.noteList.innerHTML = list.map(renderChapter).join("");
    el.emptyState.classList.toggle("hidden", list.length > 0);
    el.chapterNav.classList.toggle("hidden", list.length === 0);
    el.chapterNav.innerHTML = list.map((chapter) =>
      `<a href="#${chapter.id}">${escapeHtml(chapter.title)}</a>`).join("");
  }

  function init() {
    el.examFilter.innerHTML = '<option value="all">CKA + CKAD</option>' +
      Object.values(EXAMS).map((exam) => `<option value="${exam.id}">${exam.label}</option>`).join("");
    const sections = NOTES.reduce((sum, chapter) => sum + chapter.sections.length, 0);
    el.chapterCount.textContent = `${NOTES.length}개 주제`;
    el.sectionCount.textContent = `${sections}개 절`;

    const params = new URLSearchParams(window.location.search);
    if (params.get("exam") && EXAMS[params.get("exam")]) el.examFilter.value = params.get("exam");
    if (params.get("q")) el.searchInput.value = params.get("q");

    el.examFilter.addEventListener("change", render);
    el.searchInput.addEventListener("input", render);
    el.resetFilter.addEventListener("click", () => {
      el.examFilter.value = "all";
      el.searchInput.value = "";
      render();
    });
    render();
    if (window.renderK8sDocs) window.renderK8sDocs("docsLinks");

    const topic = params.get("topic");
    if (topic) {
      const target = document.getElementById(topic);
      if (target) window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }

  init();
})();
