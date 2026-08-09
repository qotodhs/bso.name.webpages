(() => {
  "use strict";

  const concepts = Array.isArray(window.BWR_CONCEPTS) ? window.BWR_CONCEPTS : [];
  const pastQuestions = Array.isArray(window.BWR_PAST_QUESTIONS) ? window.BWR_PAST_QUESTIONS : [];
  const matchConcept = typeof window.BWR_CONCEPT_MATCH === "function" ? window.BWR_CONCEPT_MATCH : () => false;
  const knownKey = "bwr-computer-known-v1";
  const el = (id) => document.getElementById(id);

  let cards = [];
  let known = new Set(JSON.parse(localStorage.getItem(knownKey) || "[]"));
  let subject = "all";
  let view = "all";
  let position = 0;
  let flipped = false;

  function unique(items) {
    return [...new Set(items.filter(Boolean))];
  }

  function shorten(text, limit = 135) {
    const value = String(text || "").trim();
    return value.length > limit ? `${value.slice(0, limit).trim()}…` : value;
  }

  function buildCards() {
    const explanationRecords = Object.values(window.BWR_EXPLANATIONS || {});
    cards = concepts.map((concept) => {
      const relatedPast = pastQuestions.filter((question) => matchConcept(concept, question));
      const linkedExplanations = explanationRecords.filter((record) => record.conceptId === concept.id);
      return { ...concept, relatedPast, linkedExplanations };
    });
    known = new Set([...known].filter((id) => cards.some((card) => card.id === id)));
    localStorage.setItem(knownKey, JSON.stringify([...known]));
    el("explanationFilter").hidden = !cards.some((card) => card.linkedExplanations.length);
  }

  function filtered() {
    return cards.filter((card) => {
      const subjectMatches = subject === "all" || card.subject === subject;
      const viewMatches = view === "all"
        || (view === "unknown" && !known.has(card.id))
        || (view === "evidence" && card.relatedPast.length > 0)
        || (view === "explanation" && card.linkedExplanations.length > 0);
      return subjectMatches && viewMatches;
    });
  }

  function evidenceText(card) {
    if (!card.relatedPast.length) return "현재 문제은행에서 직접 일치하는 문항을 검토 중입니다.";
    const sources = unique(card.relatedPast.map((question) => question.sourceLabel)).slice(0, 3);
    const representative = card.relatedPast[0];
    return `실제 기출 ${card.relatedPast.length}문항에서 확인 · 최근 회차 ${sources.join(", ")} · 대표 유형: ${shorten(representative.q)}`;
  }

  function mistakeText(card) {
    const traps = unique(card.linkedExplanations.map((record) => record.trap)).slice(0, 2);
    return traps.length ? `${card.mistake} 추가된 상세 해설의 반복 함정: ${traps.join(" / ")}` : card.mistake;
  }

  function explanationPreview(card) {
    if (!card.linkedExplanations.length) return "";
    const previews = card.linkedExplanations.slice(0, 2).map((record) => shorten(record.explanation, 150));
    return `${card.linkedExplanations.length}개 문항의 상세 해설이 연결되었습니다. ${previews.join(" / ")}`;
  }

  function render() {
    const list = filtered();
    if (!list.length) {
      view = "all";
      position = 0;
      document.querySelectorAll(".view-filter").forEach((button) => button.classList.toggle("active", button.dataset.view === "all"));
      return render();
    }
    position = (position + list.length) % list.length;
    const card = list[position];
    const sources = unique(card.relatedPast.map((question) => question.sourceLabel));

    el("cardSubject").textContent = card.subject === "computer" ? "1과목 · 컴퓨터 일반" : "2과목 · 스프레드시트 일반";
    el("cardSubject").dataset.subject = card.subject;
    el("cardPastCount").textContent = `기출 ${card.relatedPast.length}문항`;
    el("cardExplanationCount").hidden = card.linkedExplanations.length === 0;
    el("cardExplanationCount").textContent = `상세 해설 ${card.linkedExplanations.length}개`;
    el("cardPosition").textContent = `${position + 1} / ${list.length}`;
    el("cardTerm").textContent = card.term;
    el("cardDefinition").textContent = card.definition;
    el("cardCriterion").textContent = card.criterion;
    el("cardEvidence").textContent = evidenceText(card);
    el("cardMistake").textContent = mistakeText(card);
    el("cardExplanationSection").hidden = card.linkedExplanations.length === 0;
    el("cardExplanationPreview").textContent = explanationPreview(card);
    el("cardHint").hidden = flipped;
    el("conceptDetails").hidden = !flipped;
    el("knownCard").textContent = known.has(card.id) ? "알고 있어요 ✓" : "알아요 ✓";
    el("knownStat").textContent = `${cards.filter((item) => known.has(item.id)).length} / ${cards.length} 알아요`;
    el("conceptPracticeLink").hidden = card.relatedPast.length === 0;
    el("conceptPracticeLink").href = `../flashcards/?concept=${encodeURIComponent(card.id)}`;
    el("conceptPracticeLink").textContent = `${card.term} 관련 기출 ${card.relatedPast.length}문제 풀기 →`;
    el("conceptPracticeLink").title = sources.length ? `연결 회차: ${sources.slice(0, 5).join(", ")}` : "";
  }

  function flip() { flipped = !flipped; render(); }
  function move(delta) { position += delta; flipped = false; render(); }
  function currentCard() { return filtered()[position]; }

  function initialize() {
    buildCards();
    el("flashcard").addEventListener("click", flip);
    el("flashcard").addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); flip(); }
    });
    el("prevCard").addEventListener("click", () => move(-1));
    el("nextCard").addEventListener("click", () => move(1));
    el("againCard").addEventListener("click", () => {
      known.delete(currentCard().id);
      localStorage.setItem(knownKey, JSON.stringify([...known]));
      move(1);
    });
    el("knownCard").addEventListener("click", () => {
      known.add(currentCard().id);
      localStorage.setItem(knownKey, JSON.stringify([...known]));
      move(1);
    });
    document.querySelectorAll(".subject-tab").forEach((button) => button.addEventListener("click", () => {
      subject = button.dataset.subject;
      position = 0;
      flipped = false;
      document.querySelectorAll(".subject-tab").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      render();
    }));
    document.querySelectorAll(".view-filter").forEach((button) => button.addEventListener("click", () => {
      view = button.dataset.view;
      position = 0;
      flipped = false;
      document.querySelectorAll(".view-filter").forEach((item) => item.classList.toggle("active", item === button));
      render();
    }));
    render();
  }

  Promise.resolve(window.BWR_EXPLANATION_READY).then(initialize);
})();
