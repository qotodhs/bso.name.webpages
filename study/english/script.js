const opicQuestions = [
  {
    question: "Describe your favorite place to study.",
    hint: "장소, 이유, 자주 하는 행동, 장점을 4문장 정도로 연결해보세요."
  },
  {
    question: "Tell me about your usual weekend routine.",
    hint: "언제, 어디서, 무엇을 하는지 순서대로 설명해보세요."
  },
  {
    question: "Describe a café you often visit.",
    hint: "분위기, 메뉴, 가는 이유, 최근 경험을 묶어서 말해보세요."
  },
  {
    question: "Tell me about a hobby you enjoy these days.",
    hint: "시작한 계기, 얼마나 자주 하는지, 왜 좋은지 넣어보세요."
  },
  {
    question: "Describe a memorable trip you took.",
    hint: "언제 갔는지, 누구와 갔는지, 무엇이 좋았는지, 기억에 남는 장면을 넣어보세요."
  }
];

const opicQuestionEl = document.getElementById("opicQuestion");
const opicHintEl = document.getElementById("opicHint");
const changeOpicQuestionBtn = document.getElementById("changeOpicQuestion");

changeOpicQuestionBtn?.addEventListener("click", () => {
  const random = opicQuestions[Math.floor(Math.random() * opicQuestions.length)];
  if (opicQuestionEl) opicQuestionEl.textContent = random.question;
  if (opicHintEl) opicHintEl.textContent = random.hint;
});

const vocabGrid = document.getElementById("vocabGrid");
const shuffleWordsBtn = document.getElementById("shuffleWords");
shuffleWordsBtn?.addEventListener("click", () => {
  if (!vocabGrid) return;
  const cards = Array.from(vocabGrid.children);
  cards.sort(() => Math.random() - 0.5).forEach(card => vocabGrid.appendChild(card));
});

const saveButtons = document.querySelectorAll(".save-btn");
saveButtons.forEach((button) => {
  const storageKey = button.dataset.storageKey;
  const targetId = button.dataset.target;
  const targetText = document.getElementById(targetId || "");
  const targetTextareaId = button.dataset.textarea;
  const textarea = document.getElementById(targetTextareaId || "");

  if (!storageKey || !(textarea instanceof HTMLTextAreaElement)) return;

  const storedValue = localStorage.getItem(storageKey);
  if (storedValue) {
    textarea.value = storedValue;
    if (targetText) targetText.textContent = "이전에 저장한 메모를 불러왔습니다.";
  }

  button.addEventListener("click", () => {
    localStorage.setItem(storageKey, textarea.value);
    if (targetText) targetText.textContent = "브라우저에 저장했습니다.";
  });
});

const calendarGrid = document.getElementById("calendarGrid");
if (calendarGrid) {
  const today = new Date();
  let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const calendarMonthLabel = document.getElementById("calendarMonthLabel");
  const calendarHelper = document.getElementById("calendarHelper");
  const selectedDateLabel = document.getElementById("selectedDateLabel");
  const selectedWeekLabel = document.getElementById("selectedWeekLabel");

  const monthlyGoalTitle = document.getElementById("monthlyGoalTitle");
  const weeklyGoalTitle = document.getElementById("weeklyGoalTitle");
  const monthlyMemoTitle = document.getElementById("monthlyMemoTitle");

  const monthlyGoals = document.getElementById("monthlyGoals");
  const weeklyGoals = document.getElementById("weeklyGoals");
  const monthlyMemo = document.getElementById("monthlyMemo");
  const dailyNote = document.getElementById("dailyNote");

  const monthlyGoalStatus = document.getElementById("monthlyGoalStatus");
  const weeklyGoalStatus = document.getElementById("weeklyGoalStatus");
  const monthlyMemoStatus = document.getElementById("monthlyMemoStatus");
  const dailyNoteStatus = document.getElementById("dailyNoteStatus");

  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");
  const goTodayBtn = document.getElementById("goToday");

  const saveMonthlyGoalsBtn = document.getElementById("saveMonthlyGoals");
  const clearMonthlyGoalsBtn = document.getElementById("clearMonthlyGoals");
  const saveWeeklyGoalsBtn = document.getElementById("saveWeeklyGoals");
  const clearWeeklyGoalsBtn = document.getElementById("clearWeeklyGoals");
  const saveMonthlyMemoBtn = document.getElementById("saveMonthlyMemo");
  const clearMonthlyMemoBtn = document.getElementById("clearMonthlyMemo");
  const saveDailyNoteBtn = document.getElementById("saveDailyNote");
  const clearDailyNoteBtn = document.getElementById("clearDailyNote");

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function formatMonthKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function formatMonthLabel(date) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  }

  function formatDateLabel(date) {
    const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
  }

  function getStartOfWeek(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - start.getDay());
    return start;
  }

  function getEndOfWeek(date) {
    const end = getStartOfWeek(date);
    end.setDate(end.getDate() + 6);
    return end;
  }

  function formatWeekLabel(date) {
    const start = getStartOfWeek(date);
    const end = getEndOfWeek(date);
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  }

  function weekStorageKey(date) {
    const start = getStartOfWeek(date);
    return `englishWeeklyGoals::${formatDateKey(start)}`;
  }

  function monthGoalStorageKey(date) {
    return `englishMonthlyGoals::${formatMonthKey(date)}`;
  }

  function monthMemoStorageKey(date) {
    return `englishMonthlyMemo::${formatMonthKey(date)}`;
  }

  function dailyNoteStorageKey(date) {
    return `englishDailyNote::${formatDateKey(date)}`;
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function setStatus(target, message) {
    if (target) target.textContent = message;
  }

  function loadMonthlyData() {
    if (!(monthlyGoals instanceof HTMLTextAreaElement)) return;
    const monthLabel = formatMonthLabel(visibleMonth);
    const monthKey = monthGoalStorageKey(visibleMonth);
    const memoKey = monthMemoStorageKey(visibleMonth);

    monthlyGoalTitle.textContent = `${monthLabel} 목표`;
    monthlyMemoTitle.textContent = `${monthLabel} 운영 메모`;
    monthlyGoals.value = localStorage.getItem(monthKey) || "";
    if (monthlyMemo instanceof HTMLTextAreaElement) {
      monthlyMemo.value = localStorage.getItem(memoKey) || "";
    }
    setStatus(monthlyGoalStatus, monthlyGoals.value ? "이 달의 목표를 불러왔습니다." : "");
    setStatus(monthlyMemoStatus, monthlyMemo?.value ? "이 달의 메모를 불러왔습니다." : "");
  }

  function loadWeeklyData() {
    if (!(weeklyGoals instanceof HTMLTextAreaElement)) return;
    const weekLabel = formatWeekLabel(selectedDate);
    weeklyGoalTitle.textContent = `${weekLabel} 주간 목표`;
    selectedWeekLabel.textContent = weekLabel;
    weeklyGoals.value = localStorage.getItem(weekStorageKey(selectedDate)) || "";
    setStatus(weeklyGoalStatus, weeklyGoals.value ? "이 주의 목표를 불러왔습니다." : "");
  }

  function loadDailyNote() {
    if (!(dailyNote instanceof HTMLTextAreaElement)) return;
    selectedDateLabel.textContent = formatDateLabel(selectedDate);
    dailyNote.value = localStorage.getItem(dailyNoteStorageKey(selectedDate)) || "";
    setStatus(dailyNoteStatus, dailyNote.value ? "이 날짜의 메모를 불러왔습니다." : "");
  }

  function renderCalendar() {
    calendarGrid.innerHTML = "";
    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());

    calendarMonthLabel.textContent = formatMonthLabel(visibleMonth);
    calendarHelper.textContent = `${formatMonthLabel(visibleMonth)} 목표와 메모가 위 카드에 연결됩니다.`;

    for (let index = 0; index < 42; index += 1) {
      const day = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "calendar-day";

      if (day.getMonth() !== visibleMonth.getMonth()) {
        button.classList.add("outside-month");
      }
      if (isSameDate(day, today)) {
        button.classList.add("today");
      }
      if (isSameDate(day, selectedDate)) {
        button.classList.add("selected");
      }

      const noteValue = localStorage.getItem(dailyNoteStorageKey(day));
      const preview = noteValue ? noteValue.replace(/\n+/g, " ").trim() : "";

      const number = document.createElement("span");
      number.className = "calendar-day-number";
      number.textContent = String(day.getDate());
      button.appendChild(number);

      const notePreview = document.createElement("div");
      notePreview.className = "calendar-day-note";
      notePreview.textContent = preview || (day.getMonth() === visibleMonth.getMonth() ? "학습 메모 없음" : "");
      button.appendChild(notePreview);

      if (preview) {
        const indicator = document.createElement("span");
        indicator.className = "note-indicator";
        indicator.setAttribute("aria-hidden", "true");
        button.appendChild(indicator);
      }

      button.addEventListener("click", () => {
        selectedDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        visibleMonth = new Date(day.getFullYear(), day.getMonth(), 1);
        loadMonthlyData();
        loadWeeklyData();
        loadDailyNote();
        renderCalendar();
      });

      calendarGrid.appendChild(button);
    }

    if (monthStart.getMonth() === monthEnd.getMonth()) {
      loadMonthlyData();
    }
  }

  prevMonthBtn?.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  nextMonthBtn?.addEventListener("click", () => {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  goTodayBtn?.addEventListener("click", () => {
    visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    loadMonthlyData();
    loadWeeklyData();
    loadDailyNote();
    renderCalendar();
  });

  saveMonthlyGoalsBtn?.addEventListener("click", () => {
    if (!(monthlyGoals instanceof HTMLTextAreaElement)) return;
    localStorage.setItem(monthGoalStorageKey(visibleMonth), monthlyGoals.value);
    setStatus(monthlyGoalStatus, "이 달의 목표를 저장했습니다.");
  });

  clearMonthlyGoalsBtn?.addEventListener("click", () => {
    if (!(monthlyGoals instanceof HTMLTextAreaElement)) return;
    monthlyGoals.value = "";
    localStorage.removeItem(monthGoalStorageKey(visibleMonth));
    setStatus(monthlyGoalStatus, "이 달의 목표를 비웠습니다.");
  });

  saveWeeklyGoalsBtn?.addEventListener("click", () => {
    if (!(weeklyGoals instanceof HTMLTextAreaElement)) return;
    localStorage.setItem(weekStorageKey(selectedDate), weeklyGoals.value);
    setStatus(weeklyGoalStatus, "이 주의 목표를 저장했습니다.");
  });

  clearWeeklyGoalsBtn?.addEventListener("click", () => {
    if (!(weeklyGoals instanceof HTMLTextAreaElement)) return;
    weeklyGoals.value = "";
    localStorage.removeItem(weekStorageKey(selectedDate));
    setStatus(weeklyGoalStatus, "이 주의 목표를 비웠습니다.");
  });

  saveMonthlyMemoBtn?.addEventListener("click", () => {
    if (!(monthlyMemo instanceof HTMLTextAreaElement)) return;
    localStorage.setItem(monthMemoStorageKey(visibleMonth), monthlyMemo.value);
    setStatus(monthlyMemoStatus, "이 달의 운영 메모를 저장했습니다.");
  });

  clearMonthlyMemoBtn?.addEventListener("click", () => {
    if (!(monthlyMemo instanceof HTMLTextAreaElement)) return;
    monthlyMemo.value = "";
    localStorage.removeItem(monthMemoStorageKey(visibleMonth));
    setStatus(monthlyMemoStatus, "이 달의 운영 메모를 비웠습니다.");
  });

  saveDailyNoteBtn?.addEventListener("click", () => {
    if (!(dailyNote instanceof HTMLTextAreaElement)) return;
    const value = dailyNote.value.trim();
    if (value) {
      localStorage.setItem(dailyNoteStorageKey(selectedDate), dailyNote.value);
    } else {
      localStorage.removeItem(dailyNoteStorageKey(selectedDate));
    }
    setStatus(dailyNoteStatus, value ? "이 날짜의 메모를 저장했습니다." : "빈 메모라서 삭제했습니다.");
    renderCalendar();
  });

  clearDailyNoteBtn?.addEventListener("click", () => {
    if (!(dailyNote instanceof HTMLTextAreaElement)) return;
    dailyNote.value = "";
    localStorage.removeItem(dailyNoteStorageKey(selectedDate));
    setStatus(dailyNoteStatus, "이 날짜의 메모를 비웠습니다.");
    renderCalendar();
  });

  loadMonthlyData();
  loadWeeklyData();
  loadDailyNote();
  renderCalendar();
}


const toeicVocabApp = document.getElementById("toeicStudyApp");

if (toeicVocabApp) {
  const chunkSelect = document.getElementById("toeicChunkSelect");
  const searchInput = document.getElementById("toeicSearchInput");
  const prevBtn = document.getElementById("toeicPrevSet");
  const nextBtn = document.getElementById("toeicNextSet");
  const startStudyBtn = document.getElementById("toeicStartStudy");
  const toggleMeaningBtn = document.getElementById("toeicToggleMeaning");
  const clearCheckedBtn = document.getElementById("toeicClearChecked");
  const deckSummary = document.getElementById("toeicDeckSummary");
  const totalWords = document.getElementById("toeicTotalWords");
  const totalSets = document.getElementById("toeicTotalSets");
  const currentSet = document.getElementById("toeicCurrentSet");
  const currentRange = document.getElementById("toeicCurrentRange");
  const searchCount = document.getElementById("toeicSearchCount");
  const setDescription = document.getElementById("toeicSetDescription");
  const toggleListBtn = document.getElementById("toeicToggleList");
  const setListPanel = document.getElementById("toeicSetListPanel");
  const vocabGrid = document.getElementById("toeicVocabGrid");
  const emptyState = document.getElementById("toeicEmptyState");

  const sessionPanel = document.getElementById("toeicSessionPanel");
  const roundLabel = document.getElementById("toeicRoundLabel");
  const studyProgress = document.getElementById("toeicStudyProgress");
  const unknownCount = document.getElementById("toeicUnknownCount");
  const studyWordIndex = document.getElementById("toeicStudyWordIndex");
  const studyTerm = document.getElementById("toeicStudyTerm");
  const studyMeaning = document.getElementById("toeicStudyMeaning");
  const studySource = document.getElementById("toeicStudySource");
  const revealMeaningBtn = document.getElementById("toeicRevealMeaning");
  const knowBtn = document.getElementById("toeicKnowBtn");
  const dontKnowBtn = document.getElementById("toeicDontKnowBtn");
  const endSessionBtn = document.getElementById("toeicEndSession");

  const checkedStorageKey = "englishToeicVocabChecked";
  const uiStorageKey = "englishToeicVocabUiState";
  const chunkSize = 100;

  const state = {
    allEntries: [],
    chunkedEntries: [],
    currentSetEntries: [],
    visibleEntries: [],
    chunkIndex: 0,
    hideMeaning: false,
    listExpanded: true,
    search: "",
    checked: {},
    sessionActive: false,
    reviewMode: false,
    showMeaning: false,
    sessionQueue: [],
    unknownPool: [],
    sessionIndex: 0
  };

  function loadChecked() {
    try {
      state.checked = JSON.parse(localStorage.getItem(checkedStorageKey) || "{}");
    } catch (error) {
      state.checked = {};
    }
  }

  function saveChecked() {
    localStorage.setItem(checkedStorageKey, JSON.stringify(state.checked));
  }

  function loadUiState() {
    try {
      const saved = JSON.parse(localStorage.getItem(uiStorageKey) || "{}");
      if (typeof saved.chunkIndex === "number") state.chunkIndex = saved.chunkIndex;
      if (typeof saved.hideMeaning === "boolean") state.hideMeaning = saved.hideMeaning;
      if (typeof saved.listExpanded === "boolean") state.listExpanded = saved.listExpanded;
      if (typeof saved.search === "string") state.search = saved.search;
    } catch (error) {
      state.chunkIndex = 0;
      state.hideMeaning = false;
      state.search = "";
    }
  }

  function saveUiState() {
    localStorage.setItem(uiStorageKey, JSON.stringify({
      chunkIndex: state.chunkIndex,
      hideMeaning: state.hideMeaning,
      listExpanded: state.listExpanded,
      search: state.search
    }));
  }

  function buildChunks(entries) {
    const chunks = [];
    for (let index = 0; index < entries.length; index += chunkSize) {
      chunks.push(entries.slice(index, index + chunkSize));
    }
    return chunks;
  }

  function getTotalChunks() {
    return state.chunkedEntries.length;
  }

  function getCurrentChunk() {
    return state.chunkedEntries[state.chunkIndex] || [];
  }

  function applyCurrentSetFilter() {
    const keyword = state.search.trim().toLowerCase();
    state.currentSetEntries = getCurrentChunk();

    if (!keyword) {
      state.visibleEntries = [...state.currentSetEntries];
    } else {
      state.visibleEntries = state.currentSetEntries.filter((entry) => {
        return entry.term.toLowerCase().includes(keyword)
          || entry.detail.toLowerCase().includes(keyword)
          || String(entry.source_day).includes(keyword);
      });
    }

    saveUiState();
    renderSetBrowser();
  }

  function updateListVisibility() {
    if (setListPanel) {
      setListPanel.hidden = !state.listExpanded;
    }
    if (toggleListBtn instanceof HTMLButtonElement) {
      toggleListBtn.textContent = state.listExpanded ? "접기" : "펼치기";
      toggleListBtn.setAttribute("aria-expanded", String(state.listExpanded));
    }
  }

  function renderChunkOptions() {
    chunkSelect.innerHTML = "";
    state.chunkedEntries.forEach((entries, index) => {
      const start = index * chunkSize + 1;
      const end = start + entries.length - 1;
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `세트 ${String(index + 1).padStart(2, "0")} · ${start}-${end}`;
      chunkSelect.appendChild(option);
    });
    chunkSelect.value = String(state.chunkIndex);
  }

  function renderSetBrowser() {
    const total = state.allEntries.length;
    const totalChunkCount = getTotalChunks();
    const currentEntries = getCurrentChunk();
    const visibleEntries = state.visibleEntries;
    const start = currentEntries.length ? state.chunkIndex * chunkSize + 1 : 0;
    const end = currentEntries.length ? start + currentEntries.length - 1 : 0;

    renderChunkOptions();

    totalWords.textContent = total.toLocaleString("ko-KR");
    totalSets.textContent = String(totalChunkCount).padStart(2, "0");
    currentSet.textContent = `${String(state.chunkIndex + 1).padStart(2, "0")} / ${String(totalChunkCount).padStart(2, "0")}`;
    currentRange.textContent = currentEntries.length ? `${start} - ${end}` : "0 - 0";
    deckSummary.textContent = state.sessionActive ? "학습 진행 중" : "세트 탐색 중";
    searchCount.textContent = `${visibleEntries.length}개 표시 중`;
    setDescription.textContent = currentEntries.length
      ? `현재 세트는 전체 ${total.toLocaleString("ko-KR")}개 단어 중 ${start}번부터 ${end}번까지입니다. 검색은 현재 세트 안에서만 적용됩니다.`
      : "표시할 세트가 없습니다.";

    updateListVisibility();

    prevBtn.disabled = state.chunkIndex === 0;
    nextBtn.disabled = state.chunkIndex >= totalChunkCount - 1;

    vocabGrid.innerHTML = "";
    emptyState.hidden = visibleEntries.length > 0;

    visibleEntries.forEach((entry) => {
      const absoluteIndex = state.chunkIndex * chunkSize + (entry.source_order_in_set || 0);
      const card = document.createElement("article");
      card.className = "toeic-vocab-card";

      const top = document.createElement("div");
      top.className = "toeic-vocab-top";

      const indexPill = document.createElement("span");
      indexPill.className = "toeic-vocab-index";
      indexPill.textContent = String(absoluteIndex || entry.absolute_index || 0).padStart(4, "0");

      const checkBtn = document.createElement("button");
      checkBtn.type = "button";
      checkBtn.className = "check-btn";
      checkBtn.textContent = state.checked[entry.id] ? "체크됨" : "체크";
      if (state.checked[entry.id]) {
        checkBtn.classList.add("is-done");
      }
      checkBtn.addEventListener("click", () => {
        state.checked[entry.id] = !state.checked[entry.id];
        saveChecked();
        renderSetBrowser();
      });

      top.appendChild(indexPill);
      top.appendChild(checkBtn);

      const term = document.createElement("h3");
      term.textContent = entry.term;

      const meaning = document.createElement("p");
      meaning.className = "toeic-vocab-meaning";
      meaning.textContent = state.hideMeaning ? "뜻 가리기 상태입니다." : entry.detail;

      const meta = document.createElement("div");
      meta.className = "toeic-vocab-meta";

      const dayChip = document.createElement("span");
      dayChip.className = "day-chip";
      dayChip.textContent = `Source Day ${String(entry.source_day).padStart(2, "0")} · ${entry.source_index}`;
      meta.appendChild(dayChip);

      card.appendChild(top);
      card.appendChild(term);
      card.appendChild(meaning);
      card.appendChild(meta);
      vocabGrid.appendChild(card);
    });
  }

  function randomizeEntries(entries) {
    const copy = [...entries];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function updateSessionCard() {
    if (!state.sessionActive || !state.sessionQueue.length) return;
    const entry = state.sessionQueue[state.sessionIndex];

    roundLabel.textContent = state.reviewMode ? "복습 라운드" : "학습 라운드";
    studyProgress.textContent = `${state.sessionIndex + 1} / ${state.sessionQueue.length}`;
    unknownCount.textContent = `모르는 단어 ${state.unknownPool.length}개`;
    studyWordIndex.textContent = `#${String((state.chunkIndex * chunkSize) + state.sessionIndex + 1).padStart(4, "0")}`;
    studyTerm.textContent = entry.term;
    studyMeaning.textContent = state.showMeaning ? entry.detail : "뜻 보기 버튼을 눌러주세요.";
    studyMeaning.classList.toggle("is-hidden", !state.showMeaning);
    studySource.textContent = `Source Day ${String(entry.source_day).padStart(2, "0")} · ${entry.source_index}`;
    revealMeaningBtn.textContent = state.showMeaning ? "뜻 숨기기" : "뜻 보기";
  }

  function openSession() {
    state.sessionActive = true;
    state.reviewMode = false;
    state.showMeaning = false;
    state.sessionIndex = 0;
    state.unknownPool = [];
    state.sessionQueue = randomizeEntries(getCurrentChunk());
    sessionPanel.hidden = false;
    updateSessionCard();
    deckSummary.textContent = "학습 진행 중";
  }

  function closeSession(message) {
    state.sessionActive = false;
    state.reviewMode = false;
    state.showMeaning = false;
    state.sessionIndex = 0;
    state.sessionQueue = [];
    state.unknownPool = [];
    sessionPanel.hidden = true;
    deckSummary.textContent = "세트 탐색 중";
    if (message) {
      window.alert(message);
    }
  }

  function startReviewRound() {
    state.reviewMode = true;
    state.showMeaning = false;
    state.sessionIndex = 0;
    state.sessionQueue = randomizeEntries(state.unknownPool);
    updateSessionCard();
  }

  function moveNext() {
    if (state.sessionIndex < state.sessionQueue.length - 1) {
      state.sessionIndex += 1;
      state.showMeaning = false;
      updateSessionCard();
      return;
    }

    if (!state.reviewMode) {
      if (!state.unknownPool.length) {
        closeSession("수고하셨습니다. 현재 세트 학습이 끝났습니다.");
      } else {
        startReviewRound();
      }
      return;
    }

    if (!state.unknownPool.length) {
      closeSession("수고하셨습니다. 현재 세트 복습까지 끝났습니다.");
    } else {
      startReviewRound();
    }
  }

  function markKnown() {
    if (!state.sessionActive) return;
    const current = state.sessionQueue[state.sessionIndex];
    state.checked[current.id] = true;
    saveChecked();
    if (state.reviewMode) {
      state.unknownPool = state.unknownPool.filter((item) => item.id !== current.id);
    }
    renderSetBrowser();
    moveNext();
  }

  function markUnknown() {
    if (!state.sessionActive) return;
    const current = state.sessionQueue[state.sessionIndex];
    if (!state.reviewMode && !state.unknownPool.some((item) => item.id === current.id)) {
      state.unknownPool.push(current);
    }
    renderSetBrowser();
    moveNext();
  }

  chunkSelect?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    state.chunkIndex = Number(target.value);
    state.search = "";
    if (searchInput instanceof HTMLInputElement) {
      searchInput.value = "";
    }
    saveUiState();
    applyCurrentSetFilter();
    if (state.sessionActive) {
      closeSession();
    }
  });

  searchInput?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    state.search = target.value;
    saveUiState();
    applyCurrentSetFilter();
  });

  prevBtn?.addEventListener("click", () => {
    if (state.chunkIndex > 0) {
      state.chunkIndex -= 1;
      state.search = "";
      if (searchInput instanceof HTMLInputElement) searchInput.value = "";
      saveUiState();
      applyCurrentSetFilter();
      if (state.sessionActive) closeSession();
    }
  });

  nextBtn?.addEventListener("click", () => {
    if (state.chunkIndex < getTotalChunks() - 1) {
      state.chunkIndex += 1;
      state.search = "";
      if (searchInput instanceof HTMLInputElement) searchInput.value = "";
      saveUiState();
      applyCurrentSetFilter();
      if (state.sessionActive) closeSession();
    }
  });

  toggleListBtn?.addEventListener("click", () => {
    state.listExpanded = !state.listExpanded;
    saveUiState();
    updateListVisibility();
  });

  startStudyBtn?.addEventListener("click", () => {
    openSession();
  });

  toggleMeaningBtn?.addEventListener("click", () => {
    state.hideMeaning = !state.hideMeaning;
    toggleMeaningBtn.textContent = state.hideMeaning ? "뜻 보기" : "뜻 가리기";
    saveUiState();
    renderSetBrowser();
  });

  clearCheckedBtn?.addEventListener("click", () => {
    if (Object.keys(state.checked).length === 0) {
      alert("체크된 단어가 없습니다.");
      return;
    }
    if (confirm("체크해둔 모든 단어(전체 세트)를 일괄 해제하시겠습니까?")) {
      state.checked = {};
      saveChecked();
      renderSetBrowser();
    }
  });

  revealMeaningBtn?.addEventListener("click", () => {
    state.showMeaning = !state.showMeaning;
    updateSessionCard();
  });

  knowBtn?.addEventListener("click", markKnown);
  dontKnowBtn?.addEventListener("click", markUnknown);
  endSessionBtn?.addEventListener("click", () => {
    closeSession();
  });

  loadChecked();
  loadUiState();
  updateListVisibility();

  const data = window.__TOEIC_VOCAB_DATA;

  if (data && Array.isArray(data.entries)) {
    state.allEntries = data.entries.map((entry, index) => ({
      ...entry,
      absolute_index: index + 1
    }));
    state.chunkedEntries = buildChunks(state.allEntries).map((chunk) => {
      return chunk.map((entry, index) => ({
        ...entry,
        source_order_in_set: index + 1
      }));
    });

    if (state.chunkIndex >= getTotalChunks()) {
      state.chunkIndex = 0;
    }

    if (searchInput instanceof HTMLInputElement) {
      searchInput.value = state.search;
    }
    toggleMeaningBtn.textContent = state.hideMeaning ? "뜻 보기" : "뜻 가리기";

    applyCurrentSetFilter();
  } else {
    deckSummary.textContent = "불러오기 실패";
    setDescription.textContent = "단어장 데이터 파일을 읽지 못했습니다.";
    totalWords.textContent = "0";
    totalSets.textContent = "0";
    currentSet.textContent = "-";
    currentRange.textContent = "-";
    searchCount.textContent = "0개";
    emptyState.hidden = false;
    emptyState.textContent = "데이터를 불러오지 못했습니다.";
  }
}
