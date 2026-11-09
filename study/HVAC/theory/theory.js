// 공조냉동기계기사 이론 노트 로더
// 과목별 이론 파일을 불러오고, 문제은행의 topic 값과 연결할 수 있게 색인을 만듭니다.
window.HVAC_THEORY = [];
window.HVAC_THEORY_INDEX = new Map();

// 데이터 형식이 바뀌면 올린다. 화면(app.js)과 데이터가 서로 다른 판으로 캐시되면 내용이 빠져 보인다
const THEORY_DATA_VERSION = "2026-11-09";
const theoryLoaderScript = document.currentScript;
const theoryDataBase = new URL("./theory-data/", theoryLoaderScript.src);

// chapters: [{ id, title, part, tagline, topics, summary, sections, exam }]
//  - title  : 해설이 "'…' 단원" 으로 인용하므로 바꾸지 않는다
//  - part   : 과목 안의 큰 흐름(예: "열역학"). 목차가 과목 > 파트 > 챕터로 묶이고,
//             같은 파트의 챕터는 파일에 적힌 순서대로 이어진다. 없으면 파트 없이 나열
//  - summary: 이 챕터에서 무엇을 왜 배우는지 한 문단
//  - topics : 문제은행 question.topic 과 매칭할 키워드 배열
//             "배관재료" 처럼 대분류만 적으면 "배관재료 · KS기호" 같은 세부 주제도 함께 잡힙니다.
//
// sections: [{ heading, formulas, key, core, lead, body, figures, interactive, table, points, list, traps, tip, see }]
//  화면은 '핵심 → 자세히' 두 층이다.
//   핵심  : formulas → key → core          외울 것(공식과 핵심 문장)을 먼저 모은다
//   자세히: body → figures → table → points → list   왜 그런지, 어떻게 쓰는지
//   끝    : traps → tip → see
//  - heading : 번호는 적지 않는다(렌더러가 붙인다)
//  - key     : 판별 기준 한 줄. 이 절의 문제를 하나의 기준으로 가르는 문장
//  - core    : 핵심 문장 몇 줄. 공식만으로 말해지지 않는 사실을 짧게
//  - lead    : "body" 면 설명 문단을 핵심보다 앞에 둔다. 개념을 먼저 세우지 않으면
//              공식이 비약이 되는 절에만 쓴다
//  - body    : 개념 설명 문단
//  - points  : [{ title, items[] }] 소제목으로 묶은 세부 사항. 항목이 7개를 넘으면 list 대신 이것
//  - list    : 묶을 필요가 없는 짧은 세부 사항(7개 이하)
//  - traps   : 함정·단골 오답. 문항을 풀다 찾은 함정은 여기에 넣는다
//  - tip     : 짚고 넘어가기 한 문장(절을 닫는 요약)
//  - see     : ["chapterId", "chapterId#절번호"] 다른 챕터·과목의 관련 절
//  - interactive : "psychro" | "pv" | "ph" — 그림 아래에 '직접 움직여 보기' 선도를 붙인다(interactive.js)
//  key·core 가 없는 옛 형식 절은 설명 → 공식 → 세부 순서로 그린다.
//  새 내용을 끝에 덧붙이지 말고 key·points·traps 중 제자리에 넣는다.
window.addHVACTheory = (subject, chapters) => {
  chapters.forEach((chapter, order) => {
    const entry = {
      ...chapter,
      subject,
      order,
      topics: Array.isArray(chapter.topics) ? chapter.topics : [],
      sections: Array.isArray(chapter.sections) ? chapter.sections : [],
      exam: Array.isArray(chapter.exam) ? chapter.exam : []
    };
    window.HVAC_THEORY.push(entry);
    entry.topics.forEach((topic) => {
      if (!window.HVAC_THEORY_INDEX.has(topic)) window.HVAC_THEORY_INDEX.set(topic, []);
      window.HVAC_THEORY_INDEX.get(topic).push(entry);
    });
  });
};

[
  "01-energy.js",
  "02-design.js",
  "03-safety.js",
  "04-maintenance.js"
].forEach((filename) => {
  const src = new URL(`${filename}?v=${THEORY_DATA_VERSION}`, theoryDataBase).href;
  document.write(`<script src="${src}"><\/script>`);
});
