(() => {
  "use strict";

  const QUESTIONS = Array.isArray(window.HVAC_QUESTION_BANK) ? window.HVAC_QUESTION_BANK : [];
  const SUBJECTS = window.HVAC_SUBJECTS || {};
  const MEMO_KEY = "bso-hvac-theory-memos-v1";
  const $ = (id) => document.getElementById(id);
  const elements = {
    subjectFilter: $("subjectFilter"),
    searchInput: $("searchInput"),
    resetFilter: $("resetFilter"),
    theoryList: $("theoryList"),
    emptyState: $("emptyState"),
    activeFilter: $("activeFilter"),
    topicCount: $("topicCount"),
    pointCount: $("pointCount")
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

  function safeParse(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function topicKey(subject, topic) {
    return `${subject}::${topic}`;
  }

  function groupTopics() {
    const map = new Map();
    QUESTIONS.forEach((question) => {
      const key = topicKey(question.subject, question.topic);
      if (!map.has(key)) {
        map.set(key, {
          key,
          subject: question.subject,
          topic: question.topic,
          points: [],
          questions: []
        });
      }
      const group = map.get(key);
      group.questions.push(question);
      if (question.explanation && !group.points.includes(question.explanation)) {
        group.points.push(question.explanation);
      }
    });
    return [...map.values()];
  }

  const topicGroups = groupTopics();

  function fillSubjects() {
    elements.subjectFilter.innerHTML = "";
    Object.entries(SUBJECTS).forEach(([value, subject]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = subject.label;
      elements.subjectFilter.appendChild(option);
    });
    elements.subjectFilter.value = SUBJECTS[requestedSubject] ? requestedSubject : "all";
  }

  function saveMemo(key, value, statusElement) {
    const memos = safeParse(MEMO_KEY, {});
    memos[key] = value;
    localStorage.setItem(MEMO_KEY, JSON.stringify(memos));
    statusElement.textContent = "개인 메모를 저장했습니다.";
    window.setTimeout(() => { statusElement.textContent = ""; }, 1800);
  }

  function render() {
    const subject = elements.subjectFilter.value;
    const query = elements.searchInput.value.trim().toLowerCase();
    const memos = safeParse(MEMO_KEY, {});

    const filtered = topicGroups.filter((group) => {
      const subjectMatch = subject === "all" || group.subject === subject;
      const haystack = [
        group.topic,
        SUBJECTS[group.subject]?.label || "",
        ...group.points,
        ...group.questions.map((item) => item.question)
      ].join(" ").toLowerCase();
      return subjectMatch && (!query || haystack.includes(query));
    });

    elements.theoryList.innerHTML = "";
    filtered.forEach((group) => {
      const card = document.createElement("article");
      card.className = "theory-card";
      card.dataset.subject = group.subject;
      card.dataset.topic = group.topic;
      if (requestedTopic && group.topic === requestedTopic) card.classList.add("highlight");

      const pointsHtml = group.points
        .map((point) => `<li>${escapeHtml(point)}</li>`)
        .join("");
      const problemsHtml = group.questions
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

      card.innerHTML = `
        <div class="card-head">
          <div>
            <div class="topic-meta">
              <span class="badge">${escapeHtml(SUBJECTS[group.subject]?.short || group.subject)}</span>
              <span class="badge neutral">연결 문제 ${group.questions.length}개</span>
            </div>
            <h2>${escapeHtml(group.topic)}</h2>
          </div>
          <a class="button secondary small" href="../engicert/">문제은행 ↗</a>
        </div>
        <ul class="point-list">${pointsHtml}</ul>
        <details class="connected-problems">
          <summary>연결된 예상문제 보기</summary>
          <div class="problem-list">${problemsHtml}</div>
        </details>
        <div class="memo-box">
          <div class="memo-head">
            <strong>나만의 이론 메모</strong>
            <span class="badge neutral">브라우저 저장</span>
          </div>
          <textarea aria-label="${escapeHtml(group.topic)} 개인 메모" placeholder="공식, 헷갈리는 부분, 암기 문장을 적어두세요.">${escapeHtml(memos[group.key] || "")}</textarea>
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
        saveMemo(group.key, textarea.value, status);
      });
      elements.theoryList.appendChild(card);
    });

    const totalPoints = filtered.reduce((sum, group) => sum + group.points.length, 0);
    elements.topicCount.textContent = `${filtered.length}개 주제`;
    elements.pointCount.textContent = `${totalPoints}개 핵심 포인트`;
    elements.emptyState.classList.toggle("hidden", filtered.length > 0);

    const filters = [];
    if (subject !== "all") filters.push(SUBJECTS[subject]?.label || subject);
    if (query) filters.push(`검색: ${elements.searchInput.value.trim()}`);
    if (requestedTopic && !query) filters.push(`문제 연결 주제: ${requestedTopic}`);
    elements.activeFilter.textContent = filters.length ? filters.join(" · ") : "";
    elements.activeFilter.classList.toggle("hidden", filters.length === 0);
  }

  function initialize() {
    fillSubjects();
    if (requestedTopic) elements.searchInput.value = requestedTopic;
    elements.subjectFilter.addEventListener("change", render);
    elements.searchInput.addEventListener("input", render);
    elements.resetFilter.addEventListener("click", () => {
      elements.subjectFilter.value = "all";
      elements.searchInput.value = "";
      history.replaceState({}, "", location.pathname);
      render();
    });
    render();
    if (requestedTopic) {
      requestAnimationFrame(() => {
        document.querySelector(".theory-card.highlight")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  initialize();
})();
