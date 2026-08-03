// 기출문제 해설 로더
// 해설을 작성한 회차 파일만 여기에 추가하면 됩니다.
// 해설이 없는 문항은 questions.js 가 정답 보기 내용을 담은 안내문으로 대체합니다.
const hvacExplanationBase = new URL("./", document.currentScript.src);
[
  "20220305.js",
  "20220424.js"
].forEach((filename) => {
  const src = new URL(filename, hvacExplanationBase).href;
  document.write(`<script src="${src}"><\/script>`);
});
