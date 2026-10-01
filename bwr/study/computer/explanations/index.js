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
  "predicted.js",
  "20200704.js",
  "20200229.js",
  "20190831.js",
  "20190302.js",
  "20180901.js",
  "20180303.js",
  "20170902.js",
  "20170304.js",
  "20161022.js",
  "20160625.js",
  "20160305.js",
  "20151017.js",
  "20150627.js",
  "20150307.js",
  "20141018.js",
  "20140308.js",
  "20131019.js",
  "20130622.js",
  "20130309.js",
  "20120922.js",
  "20120616.js",
  "20120317.js",
  "20111016.js",
  "20110710.js",
  "20110320.js",
  "20101017.js",
  "20100606.js",
  "20100321.js",
  "20091018.js",
  "20090726.js",
  "20090419.js",
  "20090215.js",
  "20081012.js",
  "20080803.js",
  "20080518.js",
  "20080224.js",
  "20071007.js",
  "20070701.js",
  "20070506.js",
  "20070211.js",
  "20060924.js",
  "20060723.js",
  "20060514.js",
  "20060219.js",
  "20051009.js",
  "20050724.js",
  "20050515.js",
  "20050220.js",
  "20040801.js",
  "20040215.js",
  "20030928.js",
  "20030713.js",
  "20030504.js",
  "20030209.js",
  "20020609.js",
  "20020317.js",
  "20011007.js",
  "20010318.js",
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
