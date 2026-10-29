(() => {
  "use strict";

  const pastQuestions = Array.isArray(window.BWR_PAST_QUESTIONS) ? window.BWR_PAST_QUESTIONS : [];
  const predictedQuestions = Array.isArray(window.BWR_PREDICTED_QUESTIONS) ? window.BWR_PREDICTED_QUESTIONS : [];
  const questions = [...predictedQuestions, ...pastQuestions];
  const wrongKey = "bwr-computer-wrong-v1";
  const resultKey = "bwr-computer-last-mock-v1";
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
  let examLabel = "";
  let completedAt = "";
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);

  function readWrong() {
    try { const ids = JSON.parse(localStorage.getItem(wrongKey)); return new Set(Array.isArray(ids) ? ids : []); }
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
    const modeLabel = currentMode === "full" ? "실전형" : currentMode === "computer" ? "1과목 집중" : "2과목 집중";
    begin(createQueue(currentMode), `${$("mockSource").selectedOptions[0].textContent.split(" · ")[0]} · ${modeLabel}`);
  }

  function begin(items, label) {
    queue = [...items];
    examLabel = label;
    if (!queue.length) {
      window.alert("모의고사 문제를 불러오지 못했습니다.");
      return;
    }
    index = 0;
    answers = {};
    seconds = queue.length * 60;
    $("mockSetup").hidden = true;
    $("resultPanel").hidden = true;
    $("reviewPanel").hidden = true;
    $("questionStage").hidden = false;
    $("mockModeLabel").textContent = `${examLabel} ${queue.length}문항`;
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
    queue.forEach((item) => {
      if (answers[item.id] === item.a) {
        wrong.delete(item.id);
      } else {
        wrong.add(item.id);
      }
    });
    completedAt = new Date().toISOString();
    const failures = [];
    try { localStorage.setItem(wrongKey, JSON.stringify([...wrong])); }
    catch { failures.push("누적 오답"); }
    try {
      localStorage.setItem(resultKey, JSON.stringify({ version: 1, ids: queue.map((q) => q.id), answers, label: examLabel, mode: currentMode, completedAt }));
      $("restoreMock").hidden = false;
    } catch { failures.push("최근 시험 결과"); }
    $("resultStorageStatus").textContent = failures.length ? `${failures.join("·")} 저장이 제한되었습니다. 현재 결과는 아래에서 확인할 수 있지만 새로고침하면 사라질 수 있습니다.` : "최근 시험 결과는 이 브라우저에 저장됩니다. 시험 설정에서 다시 볼 수 있습니다.";
    showResult();
  }

  function showResult() {
    const scores = { computer: { total: 0, correct: 0 }, spreadsheet: { total: 0, correct: 0 } };
    queue.forEach((item) => {
      scores[item.subject].total += 1;
      if (answers[item.id] === item.a) scores[item.subject].correct += 1;
    });

    const totalCorrect = scores.computer.correct + scores.spreadsheet.correct;
    const percent = Math.round((totalCorrect / queue.length) * 100);
    const computerPercent = scores.computer.total ? Math.round((scores.computer.correct / scores.computer.total) * 100) : null;
    const spreadsheetPercent = scores.spreadsheet.total ? Math.round((scores.spreadsheet.correct / scores.spreadsheet.total) * 100) : null;
    const passed = percent >= 60
      && (computerPercent === null || computerPercent >= 40)
      && (spreadsheetPercent === null || spreadsheetPercent >= 40);

    $("questionStage").hidden = true;
    $("mockSetup").hidden = true;
    $("resultPanel").hidden = false;
    $("resultScore").textContent = `${totalCorrect} / ${queue.length}`;
    $("resultTitle").textContent = passed ? "합격 기준을 통과했습니다." : "오답을 정리하고 다시 도전하세요.";
    $("resultMessage").textContent = `총점 ${percent}점 · 미응답 ${queue.filter((item) => answers[item.id] === undefined).length}문항`;
    $("resultContext").textContent = `${examLabel} · ${new Date(completedAt).toLocaleString("ko-KR")}`;
    $("retryWrong").disabled = queue.every((item) => answers[item.id] === item.a);
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
    $("reviewPanel").hidden = false;
    $("reviewFilter").value = queue.every((item) => answers[item.id] === item.a) ? "all" : "wrong";
    renderReview();
    $("resultTitle").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderReview() {
    const filter = $("reviewFilter").value;
    const totalWrong = queue.filter((q) => answers[q.id] !== q.a).length;
    const unanswered = queue.filter((q) => answers[q.id] === undefined).length;
    const visible = queue.map((item, i) => ({ item, number: i + 1 })).filter(({ item }) => filter === "all" || (filter === "unanswered" ? answers[item.id] === undefined : answers[item.id] !== item.a));
    $("reviewSummary").textContent = `전체 ${queue.length}문항 · 정답 ${queue.length - totalWrong} · 오답 ${totalWrong - unanswered} · 미응답 ${unanswered} · 현재 ${visible.length}문항 표시`;
    $("reviewList").replaceChildren();
    $("reviewEmpty").hidden = visible.length > 0;
    visible.forEach(({ item, number }) => {
      const chosen = answers[item.id];
      const correct = chosen === item.a;
      const detail = (window.BWR_EXPLANATIONS || {})[item.id];
      const card = document.createElement("details");
      card.className = `mock-review-card ${correct ? "is-correct" : "is-wrong"}`;
      card.open = !correct;
      const state = chosen === undefined ? "미응답" : correct ? "정답" : "오답";
      const subject = item.subject === "computer" ? "컴퓨터 일반" : "스프레드시트 일반";
      const choices = item.c.map((choice, i) => `<li class="${i === item.a ? "review-correct" : i === chosen ? "review-chosen" : ""}"><span>${i + 1}. ${escapeHTML(choice)}</span>${i === item.a ? '<strong>정답</strong>' : ''}${i === chosen ? '<strong>내 선택</strong>' : ''}</li>`).join("");
      card.innerHTML = `<summary><span class="review-state">${number}번 · ${state}</span><span>${escapeHTML(item.q)}</span></summary><div class="mock-review-body"><p class="review-source">${escapeHTML(item.sourceLabel || "예상문제")} · ${subject} · 원문 ${escapeHTML(item.number)}번</p><p class="review-answer-line"><strong>내 답</strong> ${chosen === undefined ? "선택하지 않음" : `${chosen + 1}. ${escapeHTML(item.c[chosen])}`}<br><strong>정답</strong> ${item.a + 1}. ${escapeHTML(item.c[item.a])}</p><ol class="review-choices">${choices}</ol><p><strong>${detail ? "상세 해설" : "기본 해설"}</strong> ${escapeHTML(detail?.explanation || item.e)}</p>${detail?.criterion ? `<p><strong>판별 기준</strong> ${escapeHTML(detail.criterion)}</p>` : ""}${detail?.trap ? `<p><strong>주의할 점</strong> ${escapeHTML(detail.trap)}</p>` : ""}</div>`;
      $("reviewList").append(card);
    });
  }

  function readLastResult() {
    try {
      const saved = JSON.parse(localStorage.getItem(resultKey));
      if (!saved || saved.version !== 1 || !Array.isArray(saved.ids) || !saved.ids.length || saved.ids.length > 40 || new Set(saved.ids).size !== saved.ids.length || !saved.answers || typeof saved.answers !== "object" || Array.isArray(saved.answers) || typeof saved.label !== "string" || !Number.isFinite(Date.parse(saved.completedAt))) return null;
      const bank = new Map(questions.map((q) => [q.id, q]));
      if (saved.ids.some((id) => !bank.has(id))) return null;
      const cleanAnswers = {};
      for (const id of saved.ids) {
        const value = saved.answers[id];
        if (value !== undefined) {
          if (!Number.isInteger(value) || value < 0 || value >= bank.get(id).c.length) return null;
          cleanAnswers[id] = value;
        }
      }
      return { ...saved, answers: cleanAnswers, items: saved.ids.map((id) => bank.get(id)) };
    } catch { return null; }
  }

  $("reviewFilter").addEventListener("change", renderReview);
  $("retryWrong").addEventListener("click", () => {
    const wrongItems = queue.filter((q) => answers[q.id] !== q.a);
    if (wrongItems.length) begin(wrongItems, "이번 오답 다시 풀기");
  });
  $("changeMock").addEventListener("click", () => {
    $("resultPanel").hidden = true;
    $("reviewPanel").hidden = true;
    $("mockSetup").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("restoreMock").hidden = !readLastResult();
  $("restoreMock").addEventListener("click", () => {
    const saved = readLastResult();
    if (!saved) { $("restoreMock").hidden = true; return; }
    queue = saved.items;
    answers = saved.answers;
    examLabel = saved.label;
    currentMode = saved.mode;
    completedAt = saved.completedAt;
    $("resultStorageStatus").textContent = "이 브라우저에 저장된 최근 시험 결과입니다.";
    showResult();
  });
  Promise.resolve(window.BWR_EXPLANATION_READY).then(() => {
    if (!$("reviewPanel").hidden) renderReview();
  });

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
