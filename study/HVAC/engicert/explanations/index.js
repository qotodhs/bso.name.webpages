// 기출문제 해설 로더
// 해설을 작성한 회차 파일만 여기에 추가하면 됩니다.
// 해설이 없는 문항은 questions.js 가 정답 보기 내용을 담은 안내문으로 대체합니다.
const hvacExplanationBase = new URL("./", document.currentScript.src);
// source-incomplete.js 를 먼저 두어, 나중에 작성한 회차별 파일이 덮어쓰도록 한다.
[
  "source-notes.js",
  "source-incomplete.js",
  "20060305.js",
  "20090510.js",
  "20100307.js",
  "20100725.js",
  "20120304.js",
  "20140525.js",
  "20160306.js",
  "20200822.js",
  "20200926.js",
  "20210814.js",
  "20220305.js",
  "20220424.js"
].forEach((filename) => {
  const src = new URL(filename, hvacExplanationBase).href;
  document.write(`<script src="${src}"><\/script>`);
});
