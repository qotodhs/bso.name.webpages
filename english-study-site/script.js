const expressions = [
  {
    expression: "I’m trying to get used to it.",
    meaning: "아직 익숙해지려고 하는 중이에요.",
    example: "Example: I recently started studying every morning, so I’m trying to get used to it."
  },
  {
    expression: "I need to review what I learned.",
    meaning: "배운 내용을 복습할 필요가 있어요.",
    example: "Example: Before bed, I need to review what I learned today."
  },
  {
    expression: "I want to speak more naturally.",
    meaning: "더 자연스럽게 말하고 싶어요.",
    example: "Example: I practice shadowing because I want to speak more naturally."
  },
  {
    expression: "I hesitate when I speak English.",
    meaning: "영어로 말할 때 망설이게 돼요.",
    example: "Example: I know the words, but I hesitate when I speak English."
  }
];

const expressionEl = document.getElementById("expression");
const meaningEl = document.getElementById("meaning");
const exampleEl = document.getElementById("example");
const changeExpressionBtn = document.getElementById("changeExpression");

changeExpressionBtn?.addEventListener("click", () => {
  const random = expressions[Math.floor(Math.random() * expressions.length)];
  expressionEl.textContent = random.expression;
  meaningEl.textContent = random.meaning;
  exampleEl.textContent = random.example;
});

const vocabGrid = document.getElementById("vocabGrid");
const shuffleWordsBtn = document.getElementById("shuffleWords");
shuffleWordsBtn?.addEventListener("click", () => {
  const cards = Array.from(vocabGrid.children);
  cards
    .sort(() => Math.random() - 0.5)
    .forEach(card => vocabGrid.appendChild(card));
});

const quizButtons = document.querySelectorAll(".quiz-btn");
const quizResult = document.getElementById("quizResult");
quizButtons.forEach(button => {
  button.addEventListener("click", () => {
    const isCorrect = button.dataset.answer === "yes";
    quizResult.textContent = isCorrect
      ? "정답입니다. get used to = 익숙해지다."
      : "오답입니다. 정답은 ‘I’m getting used to it.’ 입니다.";
  });
});

const diary = document.getElementById("diary");
const saveDiary = document.getElementById("saveDiary");
const savedDiaryText = document.getElementById("savedDiaryText");

const storedDiary = localStorage.getItem("englishDiaryDraft");
if (storedDiary) {
  diary.value = storedDiary;
  savedDiaryText.textContent = "이전에 저장한 초안이 불러와졌습니다.";
}

saveDiary?.addEventListener("click", () => {
  localStorage.setItem("englishDiaryDraft", diary.value);
  savedDiaryText.textContent = "브라우저에 임시 저장했습니다.";
});
