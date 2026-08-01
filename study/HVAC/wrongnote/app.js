(() => {
  "use strict";

  const QUESTIONS = Array.isArray(window.HVAC_QUESTION_BANK) ? window.HVAC_QUESTION_BANK : [];
  const SUBJECTS = window.HVAC_SUBJECTS || {};
  const WRONG_KEY = "bso-hvac-engicert-wrong-v1";
  const MEMO_KEY = "bso-hvac-engicert-wrong-memo-v1";
  const choiceMarks = ["①", "②", "③", "④"];
  const $ = (id) => document.getElementById(id);
  const elements = {
    subjectFilter: $("subjectFilter"),
    searchInput: $("searchInput"),
    sortOrder: $("sortOrder"),
    clearAll: $("clearAll"),
    wrongList: $("wrongList"),
    emptyState: $("emptyState"),
    wrongCount: $("wrongCount"),
    subjectCount: $("subjectCount")
  };

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

  function getWrongIds() {
    const ids = safeParse(WRONG_KEY, []);
    return Array.isArray(ids) ? ids : [];
  }

  function saveWrongIds(ids) {
    localStorage.setItem(WRONG_KEY, JSON.stringify([...new Set(ids)]));
  }

  function getWrongQuestions() {
    const ids = getWrongIds();
    const order = new Map(ids.map((id, index) => [String(id), index]));
    return QUESTIONS
      .filter((question) => order.has(String(question.id)))
      .map((question) => ({ ...question, savedOrder: order.get(String(question.id)) }));
  }

  function fillSubjects() {
    elements.subjectFilter.innerHTML = "";
    Object.entries(SUBJECTS).forEach(([value, subject]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = subject.label;
      elements.subjectFilter.appendChild(option);
    });
  }

  function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function removeWrong(id) {
    const remaining = getWrongIds().filter((savedId) => String(savedId) !== String(id));
    saveWrongIds(remaining);
    render();
  }

  function saveMemo(id, value, status) {
    const memos = safeParse(MEMO_KEY, {});
    memos[String(id)] = value;
    localStorage.setItem(MEMO_KEY, JSON.stringify(memos));
    status.textContent = "오답 메모를 저장했습니다.";
    window.setTimeout(() => { status.textContent = ""; }, 1800);
  }

  function renderCard(question, memos) {
    const card = document.createElement("article");
    card.className = "wrong-card";
    const choicesHtml = question.choices.map((choice, index) => `
      <button class="choice" type="button" data-choice="${index}">
        <span>${choiceMarks[index]}</span>
        <span>${escapeHtml(choice)}</span>
      </button>
    `).join("");

    card.innerHTML = `
      <div class="card-head">
        <div>
          <div class="meta-row">
            <span class="badge">${escapeHtml(SUBJECTS[question.subject]?.short || question.subject)}</span>
            <span class="badge neutral">${escapeHtml(question.topic)}</span>
          </div>
          <h2>${escapeHtml(question.question)}</h2>
        </div>
        <button class="button secondary small master-button" type="button">정복 처리</button>
      </div>
      <div class="choice-list">${choicesHtml}</div>
      <div class="feedback hidden" aria-live="polite"></div>
      <details class="explanation">
        <summary>정답과 해설 확인</summary>
        <div class="explanation-body">
          <p><strong>정답:</strong> ${choiceMarks[question.answer]} ${escapeHtml(question.choices[question.answer])}</p>
          <p>${escapeHtml(question.explanation)}</p>
          <a class="button secondary small" href="${escapeHtml(question.theory)}">관련 이론 보기 ↗</a>
        </div>
      </details>
      <div class="memo-box">
        <div class="memo-head">
          <strong>왜 틀렸는지 기록</strong>
          <span class="badge neutral">브라우저 저장</span>
        </div>
        <textarea placeholder="헷갈린 보기, 잘못 적용한 공식, 다음에 확인할 기준을 적어두세요.">${escapeHtml(memos[String(question.id)] || "")}</textarea>
        <div class="card-actions">
          <button class="button primary small save-memo" type="button">메모 저장</button>
          <a class="button secondary small" href="${escapeHtml(question.theory)}">이론 복습</a>
        </div>
        <p class="status" aria-live="polite"></p>
      </div>
    `;

    const choiceButtons = [...card.querySelectorAll(".choice")];
    const feedback = card.querySelector(".feedback");
    choiceButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const selected = Number(button.dataset.choice);
        choiceButtons.forEach((item, index) => {
          item.disabled = true;
          if (index === question.answer) item.classList.add("correct");
          if (index === selected && selected !== question.answer) item.classList.add("wrong");
        });
        const correct = selected === question.answer;
        feedback.classList.remove("hidden", "correct", "wrong");
        feedback.classList.add(correct ? "correct" : "wrong");
        feedback.innerHTML = correct
          ? `<strong>정답입니다.</strong><span>${escapeHtml(question.explanation)}</span>`
          : `<strong>오답입니다. 정답은 ${choiceMarks[question.answer]}입니다.</strong><span>${escapeHtml(question.explanation)}</span>`;
      }, { once: true });
    });

    card.querySelector(".master-button").addEventListener("click", () => {
      if (window.confirm("이 문제를 오답노트에서 제거하고 정복 처리할까요?")) {
        removeWrong(question.id);
      }
    });

    const textarea = card.querySelector("textarea");
    const status = card.querySelector(".status");
    card.querySelector(".save-memo").addEventListener("click", () => {
      saveMemo(question.id, textarea.value, status);
    });

    return card;
  }

  function render() {
    const subject = elements.subjectFilter.value;
    const query = elements.searchInput.value.trim().toLowerCase();
    const sort = elements.sortOrder.value;
    const memos = safeParse(MEMO_KEY, {});
    let questions = getWrongQuestions().filter((question) => {
      const subjectMatch = subject === "all" || question.subject === subject;
      const haystack = [question.topic, question.question, question.explanation, ...question.choices]
        .join(" ")
        .toLowerCase();
      return subjectMatch && (!query || haystack.includes(query));
    });

    if (sort === "recent") {
      questions.sort((a, b) => b.savedOrder - a.savedOrder);
    } else if (sort === "random") {
      questions = shuffled(questions);
    } else {
      questions.sort((a, b) => {
        const subjectCompare = String(a.subject).localeCompare(String(b.subject), "ko");
        return subjectCompare || String(a.topic).localeCompare(String(b.topic), "ko");
      });
    }

    elements.wrongList.innerHTML = "";
    questions.forEach((question) => elements.wrongList.appendChild(renderCard(question, memos)));

    const allWrong = getWrongQuestions();
    const uniqueSubjects = new Set(allWrong.map((question) => question.subject));
    elements.wrongCount.textContent = `${allWrong.length}문제`;
    elements.subjectCount.textContent = `${uniqueSubjects.size}개 과목`;
    elements.emptyState.classList.toggle("hidden", allWrong.length > 0);
    elements.wrongList.classList.toggle("hidden", questions.length === 0);

    if (allWrong.length > 0 && questions.length === 0) {
      elements.emptyState.classList.remove("hidden");
      elements.emptyState.querySelector("h2").textContent = "현재 필터에 맞는 오답이 없습니다.";
      elements.emptyState.querySelector("p").textContent = "과목이나 검색어를 바꾸면 다른 오답을 볼 수 있습니다.";
    }
  }

  function initialize() {
    fillSubjects();
    elements.subjectFilter.addEventListener("change", render);
    elements.searchInput.addEventListener("input", render);
    elements.sortOrder.addEventListener("change", render);
    elements.clearAll.addEventListener("click", () => {
      if (!getWrongIds().length) return;
      if (window.confirm("저장된 오답을 모두 삭제할까요? 개인 메모는 유지됩니다.")) {
        saveWrongIds([]);
        render();
      }
    });
    render();
  }

  initialize();
})();
