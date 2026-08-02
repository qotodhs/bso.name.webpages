// 공조냉동기계기사 이론 노트 로더
// 과목별 이론 파일을 불러오고, 문제은행의 topic 값과 연결할 수 있게 색인을 만듭니다.
window.HVAC_THEORY = [];
window.HVAC_THEORY_INDEX = new Map();

const theoryLoaderScript = document.currentScript;
const theoryDataBase = new URL("./theory-data/", theoryLoaderScript.src);

// chapters: [{ id, title, tagline, topics, summary, sections, exam }]
//  - topics : 문제은행 question.topic 과 매칭할 키워드 배열
//             "배관재료" 처럼 대분류만 적으면 "배관재료 · KS기호" 같은 세부 주제도 함께 잡힙니다.
//  - sections: [{ heading, body, list, formulas, table, tip }]
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
  const src = new URL(filename, theoryDataBase).href;
  document.write(`<script src="${src}"><\/script>`);
});
