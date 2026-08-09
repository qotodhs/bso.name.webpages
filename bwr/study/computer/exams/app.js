(() => {
  "use strict";

  const pastQuestions = Array.isArray(window.BWR_PAST_QUESTIONS) ? window.BWR_PAST_QUESTIONS : [];
  const predictedQuestions = Array.isArray(window.BWR_PREDICTED_QUESTIONS) ? window.BWR_PREDICTED_QUESTIONS : [];
  const questions = [...predictedQuestions, ...pastQuestions];
  const wrongKey = "bwr-computer-wrong-v1";
  const $ = (id) => document.getElementById(id);
  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  let queue = [];
  let index = 0;
  let answers = {};
  let seconds = 0;
  let timerId = null;
  let currentMode = "full";

  function readWrong() {
    try { return new Set(JSON.parse(localStorage.getItem(wrongKey)) || []); }
    catch (error) { return new Set(); }
  }

  function selectedMode() {
    return document.querySelector('input[name="mockMode"]:checked')?.value || "full";
  }

  function fillSources() {
    const sources = new Map();
    pastQuestions.forEach((item) => sources.set(item.source, item.sourceLabel));
    [...sources.entries()].sort((a, b) => b[0].localeCompare(a[0])).forEach(([value, label]) => {
      const option = document.createElement("option");
      const count = pastQuestions.filter((item) => item.source === value).length;
      option.value = value;
      option.textContent = `기출문제 (${label.replace(" 기출", "")} 회차) · ${count}문제`;
      $("mockPastSourceGroup").append(option);
    });
  }

  function sourcePool() {
    const source = $("mockSource").value;
    if (source === "all") return questions;
    if (source === "past") return pastQuestions;
    if (source === "predicted") return predictedQuestions;
    return pastQuestions.filter((item) => item.source === source);
  }

  function availableCounts() {
    const pool = sourcePool();
    const computer = Math.min(20, pool.filter((item) => item.subject === "computer").length);
    const spreadsheet = Math.min(20, pool.filter((item) => item.subject === "spreadsheet").length);
    return { computer, spreadsheet, full: computer + spreadsheet };
  }

  function updateFormatCounts() {
    const counts = availableCounts();
    $("fullFormatCount").textContent = counts.full;
    $("computerFormatCount").textContent = counts.computer;
    $("spreadsheetFormatCount").textContent = counts.spreadsheet;
    $("fullFormatDetail").textContent = `1과목 ${counts.computer} + 2과목 ${counts.spreadsheet} · ${counts.full}분`;
    $("computerFormatDetail").textContent = `컴퓨터 일반 · ${counts.computer}분`;
    $("spreadsheetFormatDetail").textContent = `스프레드시트 일반 · ${counts.spreadsheet}분`;
    $("mockSourceSummary").textContent = `${$("mockSource").selectedOptions[0].textContent}에서 최대 ${counts.full}문항을 출제합니다.`;
    document.querySelector('input[name="mockMode"][value="full"]').disabled = counts.full === 0;
    document.querySelector('input[name="mockMode"][value="computer"]').disabled = counts.computer === 0;
    document.querySelector('input[name="mockMode"][value="spreadsheet"]').disabled = counts.spreadsheet === 0;
  }

  function createQueue(mode) {
    const pool = sourcePool();
    const computer = shuffle(pool.filter((item) => item.subject === "computer"));
    const spreadsheet = shuffle(pool.filter((item) => item.subject === "spreadsheet"));
    if (mode === "computer") return computer.slice(0, 20);
    if (mode === "spreadsheet") return spreadsheet.slice(0, 20);
    return shuffle([...computer.slice(0, 20), ...spreadsheet.slice(0, 20)]);
  }

  function start() {
    currentMode = selectedMode();
    queue = createQueue(currentMode);
    if (!queue.length) {
      window.alert("모의고사 문제를 불러오지 못했습니다.");
      return;
    }
    index = 0;
    answers = {};
    seconds = queue.length * 60;
    $("mockSetup").hidden = true;
    $("resultPanel").hidden = true;
    $("questionStage").hidden = false;
    const modeLabel = currentMode === "full" ? "실전형" : currentMode === "computer" ? "1과목 집중" : "2과목 집중";
    $("mockModeLabel").textContent = `${$("mockSource").selectedOptions[0].textContent.split(" · ")[0]} · ${modeLabel} ${queue.length}문항`;
    clearInterval(timerId);
    timerId = setInterval(() => {
      seconds -= 1;
      paintTimer();
      if (seconds <= 0) finish();
    }, 1000);
    paintTimer();
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function paintTimer() {
    const minutes = Math.max(0, Math.floor(seconds / 60)).toString().padStart(2, "0");
    const remainder = Math.max(0, seconds % 60).toString().padStart(2, "0");
    $("timer").textContent = `${minutes}:${remainder}`;
  }

  function renderQuestion() {
    const item = queue[index];
    $("questionPosition").textContent = `${index + 1} / ${queue.length}`;
    $("progressBar").style.width = `${((index + 1) / queue.length) * 100}%`;
    $("questionSubject").textContent = item.subject === "computer" ? "1과목 · 컴퓨터 일반" : "2과목 · 스프레드시트 일반";
    $("questionSource").textContent = `${item.sourceLabel} · ${item.number}번`;
    $("questionTitle").textContent = item.q;
    $("answers").replaceChildren();

    item.c.forEach((choice, choiceIndex) => {
      const button = document.createElement("button");
      button.className = `answer-option${answers[item.id] === choiceIndex ? " selected" : ""}`;
      button.setAttribute("aria-pressed", String(answers[item.id] === choiceIndex));
      const number = document.createElement("span");
      number.className = "answer-number";
      number.textContent = choiceIndex + 1;
      const text = document.createElement("span");
      text.textContent = choice;
      button.append(number, text);
      button.addEventListener("click", () => choose(item.id, choiceIndex));
      $("answers").append(button);
    });

    $("previousQuestion").disabled = index === 0;
    $("nextQuestion").textContent = index === queue.length - 1 ? "시험 종료·채점" : "다음 문제 →";
  }

  function choose(id, choice) {
    answers[id] = choice;
    [...$("answers").querySelectorAll(".answer-option")].forEach((button, buttonIndex) => {
      const selected = buttonIndex === choice;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function move(delta) {
    const nextIndex = index + delta;
    if (nextIndex >= queue.length) finish();
    else if (nextIndex >= 0) { index = nextIndex; renderQuestion(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function finish() {
    if (!queue.length || $("questionStage").hidden) return;
    clearInterval(timerId);
    timerId = null;
    const wrong = readWrong();
    const scores = {
      computer: { total: 0, correct: 0 },
      spreadsheet: { total: 0, correct: 0 }
    };

    queue.forEach((item) => {
      scores[item.subject].total += 1;
      if (answers[item.id] === item.a) {
        scores[item.subject].correct += 1;
        wrong.delete(item.id);
      } else {
        wrong.add(item.id);
      }
    });
    localStorage.setItem(wrongKey, JSON.stringify([...wrong]));

    const totalCorrect = scores.computer.correct + scores.spreadsheet.correct;
    const percent = Math.round((totalCorrect / queue.length) * 100);
    const computerPercent = scores.computer.total ? Math.round((scores.computer.correct / scores.computer.total) * 100) : null;
    const spreadsheetPercent = scores.spreadsheet.total ? Math.round((scores.spreadsheet.correct / scores.spreadsheet.total) * 100) : null;
    const passed = percent >= 60
      && (computerPercent === null || computerPercent >= 40)
      && (spreadsheetPercent === null || spreadsheetPercent >= 40);

    $("questionStage").hidden = true;
    $("resultPanel").hidden = false;
    $("resultScore").textContent = `${totalCorrect} / ${queue.length}`;
    $("resultTitle").textContent = passed ? "합격 기준을 통과했습니다." : "오답을 정리하고 다시 도전하세요.";
    $("resultMessage").textContent = `총점 ${percent}점 · 미응답 ${queue.filter((item) => answers[item.id] === undefined).length}문항`;
    $("subjectResults").replaceChildren();

    [["computer", "1과목 · 컴퓨터 일반"], ["spreadsheet", "2과목 · 스프레드시트 일반"]].forEach(([key, label]) => {
      if (!scores[key].total) return;
      const card = document.createElement("article");
      const subjectPercent = Math.round((scores[key].correct / scores[key].total) * 100);
      const name = document.createElement("span");
      name.textContent = label;
      const value = document.createElement("strong");
      value.textContent = `${subjectPercent}점`;
      const detail = document.createElement("small");
      detail.textContent = `${scores[key].correct} / ${scores[key].total} 정답`;
      card.append(name, value, detail);
      $("subjectResults").append(card);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll('input[name="mockMode"]').forEach((input) => input.addEventListener("change", () => {
    document.querySelectorAll(".mock-format").forEach((label) => label.classList.toggle("active", label.contains(input) && input.checked));
  }));
  fillSources();
  updateFormatCounts();
  $("mockSource").addEventListener("change", updateFormatCounts);
  $("startMock").addEventListener("click", start);
  $("previousQuestion").addEventListener("click", () => move(-1));
  $("nextQuestion").addEventListener("click", () => move(1));
  $("finishMock").addEventListener("click", finish);
  $("restartMock").addEventListener("click", start);
})();
