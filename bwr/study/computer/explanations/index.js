/*
 * 컴활 상세 오답 해설 로더.
 * 새 회차 파일을 만든 뒤 BWR_EXPLANATION_FILES에 파일명을 등록하면
 * 개념카드, 한 문제씩 풀이, 오답노트가 같은 해설을 함께 사용합니다.
 */
window.BWR_EXPLANATIONS = window.BWR_EXPLANATIONS || {};
window.addBWRExplanations = (records) => {
  Object.entries(records || {}).forEach(([questionId, record]) => {
    if (!record || typeof record !== "object") return;
    window.BWR_EXPLANATIONS[questionId] = { questionId, ...record };
  });
};

window.BWR_EXPLANATION_FILES = [
  // "20200704.js",
];

const explanationIndexScript = document.currentScript;
const explanationBase = new URL("./", explanationIndexScript.src);
window.BWR_EXPLANATION_READY = Promise.all(window.BWR_EXPLANATION_FILES.map((filename) => new Promise((resolve, reject) => {
  const script = document.createElement("script");
  script.src = new URL(filename, explanationBase).href;
  script.onload = resolve;
  script.onerror = () => reject(new Error(`상세 해설을 불러오지 못했습니다: ${filename}`));
  document.head.append(script);
}))).catch((error) => {
  console.error(error);
});
