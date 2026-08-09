const wrongKey = "bwr-computer-wrong-v1";
const noteKey = "bwr-computer-explanations-v1";
let wrongIds = new Set(JSON.parse(localStorage.getItem(wrongKey) || "[]"));
let savedNotes = JSON.parse(localStorage.getItem(noteKey) || "{}");
let wrongSubject = "all";

const wrongList = document.getElementById("wrongList");
const emptyWrong = document.getElementById("emptyWrong");
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[character]);

function saveNote(questionId, value, status) {
  const clean = value.trim();
  if (clean) savedNotes[questionId] = clean;
  else delete savedNotes[questionId];
  localStorage.setItem(noteKey, JSON.stringify(savedNotes));
  status.textContent = clean ? "내 해설을 저장했습니다." : "저장된 해설을 삭제했습니다.";
}

function markMastered(questionId) {
  wrongIds.delete(questionId);
  localStorage.setItem(wrongKey, JSON.stringify([...wrongIds]));
  renderWrongNotes();
}

function renderWrongNotes() {
  const questionBank = [...(window.BWR_PREDICTED_QUESTIONS || []), ...(window.BWR_PAST_QUESTIONS || [])];
  const items = questionBank.filter((item) => wrongIds.has(item.id) && (wrongSubject === "all" || item.subject === wrongSubject));
  wrongList.replaceChildren();
  document.getElementById("wrongCount").textContent = wrongIds.size;
  emptyWrong.hidden = items.length !== 0;

  items.forEach((item, index) => {
    const article = document.createElement("article");
    article.className = "wrong-card";
    const sourceLabel = item.sourceLabel || (item.source === "set02" ? "2026 상시 02 기출형" : "2026 상시 03 기출형");
    const detailed = (window.BWR_EXPLANATIONS || {})[item.id];
    const explanation = detailed?.explanation || item.e;
    const explanationGuide = detailed && (detailed.criterion || detailed.trap)
      ? `<p class="base-explanation"><strong>판별 기준·함정</strong> ${escapeHTML([detailed.criterion, detailed.trap].filter(Boolean).join(" · "))}</p>`
      : "";
    article.innerHTML = `
      <div class="wrong-card-head"><span>${String(index + 1).padStart(2, "0")}</span><p>${escapeHTML(sourceLabel)} · ${item.subject === "computer" ? "컴퓨터 일반" : "스프레드시트 일반"}</p></div>
      <h2>${escapeHTML(item.q)}</h2>
      <p class="correct-line"><strong>정답</strong> ${item.a + 1}. ${escapeHTML(item.c[item.a])}</p>
      <p class="base-explanation"><strong>${detailed ? "상세 해설" : "기본 해설"}</strong> ${escapeHTML(explanation)}</p>
      ${explanationGuide}
      <label class="wrong-note-label">내 해설 · 오답 원인<textarea rows="4" placeholder="이 문제를 틀린 이유와 다시 볼 포인트를 적으세요."></textarea></label>
      <div class="wrong-actions"><button class="save-wrong-note" type="button">내 해설 저장</button><button class="master-button" type="button">정복 처리</button><span aria-live="polite"></span></div>`;
    const textarea = article.querySelector("textarea");
    const status = article.querySelector(".wrong-actions span");
    textarea.value = savedNotes[item.id] || "";
    article.querySelector(".save-wrong-note").addEventListener("click", () => saveNote(item.id, textarea.value, status));
    article.querySelector(".master-button").addEventListener("click", () => markMastered(item.id));
    wrongList.append(article);
  });
}

Promise.resolve(window.BWR_EXPLANATION_READY).then(() => {
  document.getElementById("wrongSubject").addEventListener("change", (event) => { wrongSubject = event.target.value; renderWrongNotes(); });
  renderWrongNotes();
});
