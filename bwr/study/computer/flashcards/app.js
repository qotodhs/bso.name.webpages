(() => {
  "use strict";

  const questions = Array.isArray(window.BWR_PAST_QUESTIONS) ? window.BWR_PAST_QUESTIONS : [];
  const wrongKey = "bwr-computer-wrong-v1";
  const noteKey = "bwr-computer-explanations-v1";
  const $ = (id) => document.getElementById(id);
  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (error) { return fallback; }
  }

  let wrong = new Set(readJSON(wrongKey, []));
  let notes = readJSON(noteKey, {});
  let queue = [];
  let index = 0;
  let score = 0;
  let answered = false;

  function fillSources() {
    const sources = new Map();
    questions.forEach((item) => sources.set(item.source, item.sourceLabel));
    [...sources.entries()].sort((a, b) => b[0].localeCompare(a[0])).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      $("pastSourceGroup").append(option);
    });
  }

  function buildPool() {
    const source = $("sourceSelect").value;
    const subject = $("subjectSelect").value;
    return questions.filter((item) => {
      const sourceMatches = source === "past" || (source === "wrong" && wrong.has(item.id)) || item.source === source;
      return sourceMatches && (subject === "all" || item.subject === subject);
    });
  }

  function start() {
    const pool = buildPool();
    if (!pool.length) {
      window.alert("선택한 범위에 저장된 문제가 없습니다.");
      return;
    }
    const requested = $("countSelect").value;
    const count = requested === "all" ? pool.length : Math.min(Number(requested), pool.length);
    queue = shuffle(pool).slice(0, count);
    index = 0;
    score = 0;
    answered = false;
    $("practiceSetup").hidden = true;
    $("resultPanel").hidden = true;
    $("questionStage").hidden = false;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderQuestion() {
    const item = queue[index];
    answered = false;
    $("questionPosition").textContent = `${index + 1} / ${queue.length}`;
    $("scorePosition").textContent = `정답 ${score}`;
    $("progressBar").style.width = `${((index + 1) / queue.length) * 100}%`;
    $("practiceSubject").textContent = $("subjectSelect").selectedOptions[0].textContent;
    $("questionSubject").textContent = item.subject === "computer" ? "1과목 · 컴퓨터 일반" : "2과목 · 스프레드시트 일반";
    $("questionSource").textContent = `${item.sourceLabel} · ${item.number}번`;
    $("questionTitle").textContent = item.q;
    $("answers").replaceChildren();
    $("instantResult").hidden = true;
    $("noteEditor").hidden = true;
    $("userExplanation").value = notes[item.id] || "";
    $("noteStatus").textContent = "";
    $("nextQuestion").disabled = true;
    $("nextQuestion").textContent = index === queue.length - 1 ? "학습 결과 보기" : "다음 문제 →";

    item.c.forEach((choice, choiceIndex) => {
      const button = document.createElement("button");
      button.className = "answer-option";
      const number = document.createElement("span");
      number.className = "answer-number";
      number.textContent = choiceIndex + 1;
      const text = document.createElement("span");
      text.textContent = choice;
      button.append(number, text);
      button.addEventListener("click", () => answer(choiceIndex, button));
      $("answers").append(button);
    });
  }

  function answer(choice, selectedButton) {
    if (answered) return;
    answered = true;
    const item = queue[index];
    const buttons = [...$("answers").querySelectorAll(".answer-option")];
    buttons.forEach((button) => { button.disabled = true; });
    buttons[item.a].classList.add("correct");

    if (choice === item.a) {
      score += 1;
      wrong.delete(item.id);
      $("resultTitle").textContent = "정답입니다.";
      $("instantResult").className = "instant-result correct-result";
    } else {
      selectedButton.classList.add("wrong");
      wrong.add(item.id);
      $("resultTitle").textContent = `아쉬워요. 정답은 ${item.a + 1}번입니다.`;
      $("instantResult").className = "instant-result wrong-result";
    }

    localStorage.setItem(wrongKey, JSON.stringify([...wrong]));
    $("scorePosition").textContent = `정답 ${score}`;
    $("explanation").textContent = item.e;
    $("instantResult").hidden = false;
    $("noteEditor").hidden = false;
    $("nextQuestion").disabled = false;
    $("nextQuestion").focus();
  }

  function saveNote() {
    const item = queue[index];
    const value = $("userExplanation").value.trim();
    if (value) notes[item.id] = value;
    else delete notes[item.id];
    localStorage.setItem(noteKey, JSON.stringify(notes));
    $("noteStatus").textContent = value ? "저장되었습니다." : "저장된 메모를 삭제했습니다.";
  }

  function next() {
    if (!answered) return;
    if (index >= queue.length - 1) finish();
    else { index += 1; renderQuestion(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function finish() {
    $("questionStage").hidden = true;
    $("resultPanel").hidden = false;
    $("resultScore").textContent = `${score} / ${queue.length}`;
    const percent = Math.round((score / queue.length) * 100);
    $("resultMessage").textContent = `정답률 ${percent}% · ${queue.length - score}문제가 오답노트에 연결되었습니다.`;
  }

  fillSources();
  $("startPractice").addEventListener("click", start);
  $("nextQuestion").addEventListener("click", next);
  $("quitPractice").addEventListener("click", finish);
  $("restartPractice").addEventListener("click", start);
  $("saveExplanation").addEventListener("click", saveNote);
  if (new URLSearchParams(window.location.search).get("mode") === "wrong") $("sourceSelect").value = "wrong";
})();
