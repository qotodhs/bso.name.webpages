(() => {
  "use strict";

  const QUESTIONS = Array.isArray(window.HVAC_QUESTION_BANK) ? window.HVAC_QUESTION_BANK : [];
  const SUBJECTS = window.HVAC_SUBJECTS || {};
  const EXAMS = Array.isArray(window.HVAC_EXAMS) ? window.HVAC_EXAMS : [];
  const STORAGE = {
    wrong: "bso-hvac-engicert-wrong-v1",
    recent: "bso-hvac-engicert-recent-v1"
  };
  const choiceMarks = ["①", "②", "③", "④"];

  const state = {
    setupMode: "flashcard",
    sessionType: null,
    questions: [],
    currentIndex: 0,
    answers: {},
    timerSeconds: 0,
    timerId: null,
    lastWrongIds: [],
    reviewOpen: false
  };

  const $ = (id) => document.getElementById(id);

  const elements = {
    totalQuestionCount: $("totalQuestionCount"),
    recentAccuracy: $("recentAccuracy"),
    savedWrongCount: $("savedWrongCount"),
    flashcardTab: $("flashcardTab"),
    examTab: $("examTab"),
    flashcardSetup: $("flashcardSetup"),
    examSetup: $("examSetup"),
    flashDataset: $("flashDataset"),
    flashSubject: $("flashSubject"),
    flashRange: $("flashRange"),
    flashOrder: $("flashOrder"),
    examDataset: $("examDataset"),
    examSubject: $("examSubject"),
    examCount: $("examCount"),
    shuffleChoices: $("shuffleChoices"),
    startFlashcard: $("startFlashcard"),
    startExam: $("startExam"),
    practiceArea: $("practiceArea"),
    resultArea: $("resultArea"),
    practiceModeBadge: $("practiceModeBadge"),
    practiceSubjectLabel: $("practiceSubjectLabel"),
    questionProgress: $("questionProgress"),
    scoreProgress: $("scoreProgress"),
    timerDisplay: $("timerDisplay"),
    progressBar: $("progressBar"),
    questionSubject: $("questionSubject"),
    questionTopic: $("questionTopic"),
    questionText: $("questionText"),
    questionImages: $("questionImages"),
    choiceList: $("choiceList"),
    instantFeedback: $("instantFeedback"),
    feedbackTitle: $("feedbackTitle"),
    feedbackText: $("feedbackText"),
    theoryLink: $("theoryLink"),
    previousQuestion: $("previousQuestion"),
    nextQuestion: $("nextQuestion"),
    finishExam: $("finishExam"),
    examPalette: $("examPalette"),
    resultTitle: $("resultTitle"),
    resultMessage: $("resultMessage"),
    resultScore: $("resultScore"),
    subjectScores: $("subjectScores"),
    retryWrong: $("retryWrong"),
    restartPractice: $("restartPractice"),
    toggleReview: $("toggleReview"),
    reviewList: $("reviewList")
  };

  function cloneQuestion(question) {
    return {
      ...question,
      choices: [...question.choices]
    };
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function shuffledChoices(question) {
    const paired = question.choices.map((text, originalIndex) => ({ text, originalIndex }));
    const mixed = shuffle(paired);
    return {
      ...cloneQuestion(question),
      choices: mixed.map((item) => item.text),
      answer: mixed.findIndex((item) => item.originalIndex === question.answer)
    };
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
    const saved = safeParse(STORAGE.wrong, []);
    return Array.isArray(saved) ? saved : [];
  }

  function saveWrongIds(ids) {
    localStorage.setItem(STORAGE.wrong, JSON.stringify([...new Set(ids)]));
    updateSummary();
  }

  function updateSummary() {
    elements.totalQuestionCount.textContent = `${QUESTIONS.length}문제`;
    elements.savedWrongCount.textContent = `${getWrongIds().length}문제`;
    const recent = safeParse(STORAGE.recent, null);
    elements.recentAccuracy.textContent = recent && Number.isFinite(recent.score)
      ? `${recent.score}%`
      : "기록 없음";
  }

  function fillSubjectOptions() {
    [elements.flashSubject, elements.examSubject].forEach((select) => {
      select.innerHTML = "";
      Object.entries(SUBJECTS).forEach(([value, subject]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = subject.label;
        select.appendChild(option);
      });
    });
  }

  function fillDatasetOptions() {
    [elements.flashDataset, elements.examDataset].forEach((select) => {
      select.innerHTML = "";

      [
        ["predicted", "예상문제"],
        ["exam-all", `기출문제 전체 (${EXAMS.length}회)`],
        ["all", "예상 + 기출 전체"]
      ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });

      const group = document.createElement("optgroup");
      group.label = "회차별 기출문제";
      [...EXAMS].reverse().forEach((exam) => {
        const option = document.createElement("option");
        option.value = `exam:${exam.id}`;
        option.textContent = `${exam.label} · ${exam.total}문항`;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
  }

  function questionsForDataset(dataset) {
    if (dataset === "all") return QUESTIONS;
    if (dataset === "predicted") {
      return QUESTIONS.filter((question) => question.sourceType !== "exam");
    }
    if (dataset === "exam-all") {
      return QUESTIONS.filter((question) => question.sourceType === "exam");
    }
    if (dataset.startsWith("exam:")) {
      const examId = dataset.slice("exam:".length);
      return QUESTIONS.filter((question) => question.exam === examId);
    }
    return QUESTIONS;
  }

  function datasetLabel(dataset) {
    if (dataset.startsWith("exam:")) {
      return EXAMS.find((exam) => exam.id === dataset.slice("exam:".length))?.label ?? "기출문제";
    }
    return {
      predicted: "예상문제",
      "exam-all": "기출문제 전체",
      all: "전체 문제"
    }[dataset] ?? "전체 문제";
  }

  function updateExamCountOptions() {
    const subject = elements.examSubject.value;
    const dataset = elements.examDataset.value;
    const available = questionsForSubject(subject, dataset).length;

    elements.examCount.innerHTML = "";
    if (subject === "all") {
      const practice = document.createElement("option");
      practice.value = String(Math.min(20, available));
      practice.textContent = `${Math.min(20, available)}문항 · ${Math.ceil(Math.min(20, available) * 1.5)}분`;
      elements.examCount.appendChild(practice);

      if (available > 20) {
        const full = document.createElement("option");
        full.value = String(available);
        full.textContent = `전체 ${available}문항 · ${Math.ceil(available * 1.5)}분`;
        elements.examCount.appendChild(full);
      }
    } else {
      const option = document.createElement("option");
      option.value = String(available);
      option.textContent = `${available}문항 · ${Math.ceil(available * 1.5)}분`;
      elements.examCount.appendChild(option);
    }
  }

  function switchMode(mode, shouldScroll = false) {
    state.setupMode = mode;
    const flashActive = mode === "flashcard";
    elements.flashcardTab.classList.toggle("active", flashActive);
    elements.examTab.classList.toggle("active", !flashActive);
    elements.flashcardTab.setAttribute("aria-selected", String(flashActive));
    elements.examTab.setAttribute("aria-selected", String(!flashActive));
    elements.flashcardSetup.classList.toggle("hidden", !flashActive);
    elements.examSetup.classList.toggle("hidden", flashActive);

    if (shouldScroll) {
      document.querySelector(".mode-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function questionsForSubject(subject, dataset = "all") {
    const datasetQuestions = questionsForDataset(dataset);
    return subject === "all"
      ? datasetQuestions.map(cloneQuestion)
      : datasetQuestions.filter((question) => question.subject === subject).map(cloneQuestion);
  }

  function balancedMixedQuestions(count, dataset) {
    const subjectKeys = Object.keys(SUBJECTS).filter((key) => key !== "all");
    const groups = Object.fromEntries(
      subjectKeys.map((key) => [key, shuffle(questionsForSubject(key, dataset))])
    );
    const selected = [];
    let cursor = 0;

    while (selected.length < count) {
      const key = subjectKeys[cursor % subjectKeys.length];
      if (groups[key].length) {
        selected.push(groups[key].shift());
      }
      cursor += 1;
      if (cursor > count * subjectKeys.length * 2) break;
    }

    return shuffle(selected);
  }

  function startFlashcard(config = null) {
    stopTimer();
    const dataset = config?.dataset ?? elements.flashDataset.value;
    const subject = config?.subject ?? elements.flashSubject.value;
    const range = config?.range ?? elements.flashRange.value;
    const order = config?.order ?? elements.flashOrder.value;
    let pool = questionsForSubject(subject, dataset);

    if (range === "wrong") {
      const wrongIds = config?.wrongIds ?? getWrongIds();
      pool = pool.filter((question) => wrongIds.includes(question.id));
      if (!pool.length) {
        window.alert("선택한 범위에 저장된 오답이 없어 전체 문제에서 10문제를 시작합니다.");
        pool = questionsForSubject(subject, dataset);
      }
    }

    if (order === "random") pool = shuffle(pool);
    if (range !== "all" && range !== "wrong") {
      pool = pool.slice(0, Math.min(Number(range), pool.length));
    }

    if (!pool.length) {
      window.alert("학습할 문제가 없습니다.");
      return;
    }

    beginSession({
      type: "flashcard",
      questions: pool,
      subject,
      dataset,
      seconds: 0
    });
  }

  function startExam() {
    stopTimer();
    const dataset = elements.examDataset.value;
    const subject = elements.examSubject.value;
    const requestedCount = Number(elements.examCount.value);
    let questions = subject === "all"
      ? balancedMixedQuestions(requestedCount, dataset)
      : shuffle(questionsForSubject(subject, dataset)).slice(0, requestedCount);

    if (elements.shuffleChoices.checked) {
      questions = questions.map(shuffledChoices);
    }

    if (!questions.length) {
      window.alert("출제할 문제가 없습니다.");
      return;
    }

    beginSession({
      type: "exam",
      questions,
      subject,
      dataset,
      seconds: Math.ceil(questions.length * 1.5) * 60
    });
  }

  function beginSession({ type, questions, subject, dataset, seconds }) {
    state.sessionType = type;
    state.questions = questions;
    state.currentIndex = 0;
    state.answers = {};
    state.lastWrongIds = [];
    state.reviewOpen = false;
    state.timerSeconds = seconds;

    elements.practiceArea.classList.remove("hidden");
    elements.resultArea.classList.add("hidden");
    elements.practiceModeBadge.textContent = type === "exam" ? "모의고사" : "플래시카드";
    elements.practiceSubjectLabel.textContent = `${datasetLabel(dataset)} · ${SUBJECTS[subject]?.label ?? "전체 과목"}`;
    elements.timerDisplay.classList.toggle("hidden", type !== "exam");
    elements.examPalette.classList.toggle("hidden", type !== "exam");
    elements.finishExam.classList.toggle("hidden", type !== "exam");
    elements.scoreProgress.classList.toggle("hidden", type === "exam");

    if (type === "exam") startTimer();
    renderQuestion();
    elements.practiceArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startTimer() {
    updateTimerDisplay();
    state.timerId = window.setInterval(() => {
      state.timerSeconds -= 1;
      updateTimerDisplay();
      if (state.timerSeconds <= 0) {
        stopTimer();
        window.alert("제한시간이 종료되어 자동으로 채점합니다.");
        finishSession();
      }
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function updateTimerDisplay() {
    const seconds = Math.max(0, state.timerSeconds);
    const minutesPart = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secondsPart = (seconds % 60).toString().padStart(2, "0");
    elements.timerDisplay.textContent = `${minutesPart}:${secondsPart}`;
  }

  function renderQuestion() {
    const question = state.questions[state.currentIndex];
    const selectedAnswer = state.answers[question.id];
    const isFlashcard = state.sessionType === "flashcard";
    const answered = Number.isInteger(selectedAnswer);

    elements.questionProgress.textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
    elements.progressBar.style.width = `${((state.currentIndex + 1) / state.questions.length) * 100}%`;
    elements.questionSubject.textContent = SUBJECTS[question.subject]?.short ?? question.subject;
    elements.questionTopic.textContent = question.topic;
    elements.questionText.textContent = question.question;
    renderQuestionImages(question);
    elements.choiceList.innerHTML = "";

    question.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.innerHTML = `<span class="choice-number">${choiceMarks[index]}</span><span>${escapeHtml(choice)}</span>`;

      if (answered && selectedAnswer === index) button.classList.add("selected");
      if (isFlashcard && answered) {
        button.disabled = true;
        if (index === question.answer) button.classList.add("correct");
        if (index === selectedAnswer && index !== question.answer) button.classList.add("wrong");
      }

      button.addEventListener("click", () => selectAnswer(index));
      elements.choiceList.appendChild(button);
    });

    if (isFlashcard && answered) {
      showInstantFeedback(question, selectedAnswer);
    } else {
      elements.instantFeedback.classList.add("hidden");
      elements.instantFeedback.classList.remove("correct-feedback", "wrong-feedback");
    }

    const correctCount = state.questions.filter(
      (item) => state.answers[item.id] === item.answer
    ).length;
    elements.scoreProgress.textContent = `정답 ${correctCount}`;

    elements.previousQuestion.disabled = state.currentIndex === 0;
    elements.nextQuestion.textContent = state.currentIndex === state.questions.length - 1
      ? (isFlashcard ? "결과 보기" : "처음으로")
      : "다음";

    if (state.sessionType === "exam") renderPalette();
  }

  function renderQuestionImages(question) {
    const images = Array.isArray(question.images) ? question.images : [];
    elements.questionImages.innerHTML = "";
    elements.questionImages.classList.toggle("hidden", images.length === 0);
    images.forEach((source, index) => {
      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener";
      link.title = "원문 이미지를 새 창에서 크게 보기";

      const image = document.createElement("img");
      image.src = source;
      image.alt = `${question.examLabel ?? "기출문제"} ${question.id.split("-").at(-1)}번 원문 ${index + 1}`;
      image.loading = "eager";
      link.appendChild(image);
      elements.questionImages.appendChild(link);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function selectAnswer(index) {
    const question = state.questions[state.currentIndex];
    if (state.sessionType === "flashcard" && Number.isInteger(state.answers[question.id])) return;
    state.answers[question.id] = index;
    renderQuestion();
  }

  function showInstantFeedback(question, selectedAnswer) {
    const correct = selectedAnswer === question.answer;
    elements.instantFeedback.classList.remove("hidden", "correct-feedback", "wrong-feedback");
    elements.instantFeedback.classList.add(correct ? "correct-feedback" : "wrong-feedback");
    elements.feedbackTitle.textContent = correct
      ? "정답입니다."
      : `오답입니다. 정답은 ${choiceMarks[question.answer]}입니다.`;
    elements.feedbackText.textContent = question.explanation;
    elements.theoryLink.href = question.theory;
    elements.theoryLink.title = "이론 페이지는 아직 준비 중입니다.";
  }

  function renderPalette() {
    elements.examPalette.innerHTML = "";
    state.questions.forEach((question, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "palette-button";
      button.textContent = String(index + 1);
      if (Number.isInteger(state.answers[question.id])) button.classList.add("answered");
      if (index === state.currentIndex) button.classList.add("current");
      button.addEventListener("click", () => {
        state.currentIndex = index;
        renderQuestion();
      });
      elements.examPalette.appendChild(button);
    });
  }

  function previousQuestion() {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderQuestion();
    }
  }

  function nextQuestion() {
    const question = state.questions[state.currentIndex];
    if (state.sessionType === "flashcard" && !Number.isInteger(state.answers[question.id])) {
      window.alert("답을 선택한 뒤 다음 문제로 이동해 주세요.");
      return;
    }

    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
      return;
    }

    if (state.sessionType === "flashcard") {
      finishSession();
    } else {
      state.currentIndex = 0;
      renderQuestion();
    }
  }

  function requestExamFinish() {
    const unanswered = state.questions.filter((question) => !Number.isInteger(state.answers[question.id])).length;
    const message = unanswered
      ? `답하지 않은 문제가 ${unanswered}개 있습니다. 시험을 종료할까요?`
      : "답안을 제출하고 시험을 종료할까요?";
    if (window.confirm(message)) finishSession();
  }

  function finishSession() {
    stopTimer();
    const results = state.questions.map((question) => ({
      question,
      selected: state.answers[question.id],
      correct: state.answers[question.id] === question.answer
    }));
    const correctCount = results.filter((result) => result.correct).length;
    const score = Math.round((correctCount / results.length) * 100);
    const wrongIds = results.filter((result) => !result.correct).map((result) => result.question.id);
    state.lastWrongIds = wrongIds;

    updateStoredWrong(results);
    localStorage.setItem(STORAGE.recent, JSON.stringify({
      score,
      date: new Date().toISOString(),
      type: state.sessionType,
      count: results.length
    }));

    elements.practiceArea.classList.add("hidden");
    elements.resultArea.classList.remove("hidden");
    elements.resultTitle.textContent = state.sessionType === "exam" ? "모의고사 결과" : "플래시카드 결과";
    elements.resultScore.textContent = `${score}점`;

    const subjectResults = calculateSubjectResults(results);
    const allSubjectsIncluded = Object.keys(subjectResults).length > 1;
    const hasFailingSubject = Object.values(subjectResults).some((item) => item.score < 40);
    const passed = score >= 60 && (!allSubjectsIncluded || !hasFailingSubject);

    if (state.sessionType === "exam") {
      elements.resultMessage.textContent = passed
        ? `정답 ${correctCount}/${results.length}문제입니다. 연습 합격기준을 충족했습니다.`
        : `정답 ${correctCount}/${results.length}문제입니다. 평균 60점과 과목별 40점을 기준으로 보완해 보세요.`;
    } else {
      elements.resultMessage.textContent = `정답 ${correctCount}/${results.length}문제이며 오답 ${wrongIds.length}문제가 저장되었습니다.`;
    }

    renderSubjectScores(subjectResults);
    renderReview(results);
    elements.retryWrong.disabled = wrongIds.length === 0;
    elements.toggleReview.textContent = "전체 펼치기";
    state.reviewOpen = false;
    updateSummary();
    elements.resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateStoredWrong(results) {
    const wrongSet = new Set(getWrongIds());
    results.forEach((result) => {
      if (result.correct) wrongSet.delete(result.question.id);
      else wrongSet.add(result.question.id);
    });
    saveWrongIds([...wrongSet]);
  }

  function calculateSubjectResults(results) {
    return results.reduce((accumulator, result) => {
      const key = result.question.subject;
      if (!accumulator[key]) accumulator[key] = { total: 0, correct: 0, score: 0 };
      accumulator[key].total += 1;
      if (result.correct) accumulator[key].correct += 1;
      accumulator[key].score = Math.round((accumulator[key].correct / accumulator[key].total) * 100);
      return accumulator;
    }, {});
  }

  function renderSubjectScores(subjectResults) {
    elements.subjectScores.innerHTML = "";
    Object.entries(subjectResults).forEach(([subjectKey, result]) => {
      const card = document.createElement("article");
      card.className = "subject-score-card";
      if (result.score < 40) card.classList.add("fail");
      card.innerHTML = `
        <span>${escapeHtml(SUBJECTS[subjectKey]?.short ?? subjectKey)}</span>
        <strong>${result.score}점</strong>
        <small>${result.correct}/${result.total} 정답${result.score < 40 ? " · 과락 주의" : ""}</small>
      `;
      elements.subjectScores.appendChild(card);
    });
  }

  function renderReview(results) {
    elements.reviewList.innerHTML = "";
    results.forEach((result, index) => {
      const details = document.createElement("details");
      details.className = "review-item";
      const selectedText = Number.isInteger(result.selected)
        ? `${choiceMarks[result.selected]} ${result.question.choices[result.selected]}`
        : "미응답";
      const correctText = `${choiceMarks[result.question.answer]} ${result.question.choices[result.question.answer]}`;
      const reviewImages = (result.question.images ?? []).map((source, imageIndex) => `
        <a href="${escapeHtml(source)}" target="_blank" rel="noopener">
          <img src="${escapeHtml(source)}" alt="원문 이미지 ${imageIndex + 1}" loading="lazy" />
        </a>
      `).join("");
      details.innerHTML = `
        <summary>
          <span class="review-status ${result.correct ? "correct" : "wrong"}">${result.correct ? "정답" : "오답"}</span>
          <strong>${index + 1}. ${escapeHtml(result.question.question)}</strong>
          <span>${escapeHtml(SUBJECTS[result.question.subject]?.short ?? "")}</span>
        </summary>
        <div class="review-body">
          ${reviewImages ? `<div class="review-images">${reviewImages}</div>` : ""}
          <p><strong>선택:</strong> ${escapeHtml(selectedText)}</p>
          <p><strong>정답:</strong> ${escapeHtml(correctText)}</p>
          <p>${escapeHtml(result.question.explanation)}</p>
          <a class="theory-link" href="${escapeHtml(result.question.theory)}" title="이론 페이지는 아직 준비 중입니다.">관련 이론 보기 ↗</a>
        </div>
      `;
      elements.reviewList.appendChild(details);
    });
  }

  function retryWrong() {
    if (!state.lastWrongIds.length) return;
    switchMode("flashcard", false);
    startFlashcard({
      dataset: "all",
      subject: "all",
      range: "wrong",
      order: "random",
      wrongIds: state.lastWrongIds
    });
  }

  function restartPractice() {
    stopTimer();
    elements.practiceArea.classList.add("hidden");
    elements.resultArea.classList.add("hidden");
    document.querySelector(".mode-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleAllReviews() {
    state.reviewOpen = !state.reviewOpen;
    elements.reviewList.querySelectorAll("details").forEach((details) => {
      details.open = state.reviewOpen;
    });
    elements.toggleReview.textContent = state.reviewOpen ? "전체 접기" : "전체 펼치기";
  }

  function bindEvents() {
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => switchMode(button.dataset.mode));
    });

    document.querySelectorAll("[data-mode-target]").forEach((button) => {
      button.addEventListener("click", () => switchMode(button.dataset.modeTarget, true));
    });

    elements.examDataset.addEventListener("change", updateExamCountOptions);
    elements.examSubject.addEventListener("change", updateExamCountOptions);
    elements.startFlashcard.addEventListener("click", () => startFlashcard());
    elements.startExam.addEventListener("click", startExam);
    elements.previousQuestion.addEventListener("click", previousQuestion);
    elements.nextQuestion.addEventListener("click", nextQuestion);
    elements.finishExam.addEventListener("click", requestExamFinish);
    elements.retryWrong.addEventListener("click", retryWrong);
    elements.restartPractice.addEventListener("click", restartPractice);
    elements.toggleReview.addEventListener("click", toggleAllReviews);

    window.addEventListener("beforeunload", stopTimer);
  }

  function initialize() {
    fillDatasetOptions();
    fillSubjectOptions();
    updateExamCountOptions();
    updateSummary();
    bindEvents();
  }

  initialize();
})();
