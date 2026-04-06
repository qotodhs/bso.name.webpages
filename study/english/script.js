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
