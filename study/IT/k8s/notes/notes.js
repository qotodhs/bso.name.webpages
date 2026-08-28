// CKA · CKAD 노트 로더
// chapters: [{ id, title, tagline, exams, topics, summary, sections, exam }]
//   sections: [{ heading, body, list, code, table:{head,rows}, tip }]
//   exams   : ["cka","ckad"] — 화면 상단 필터와 연결된다
window.K8S_NOTES = [];

const noteLoaderScript = document.currentScript;
const noteDataBase = new URL("./note-data/", noteLoaderScript.src);

window.addK8sNotes = (group, chapters) => {
  chapters.forEach((chapter, order) => {
    window.K8S_NOTES.push({
      exams: ["cka", "ckad"],
      topics: [],
      sections: [],
      exam: [],
      ...chapter,
      group,
      order
    });
  });
};

[
  "00-exam.js",
  "01-core.js",
  "02-network-storage.js",
  "03-ops-debug.js"
].forEach((filename) => {
  const src = new URL(filename, noteDataBase).href;
  document.write(`<script src="${src}"><\/script>`);
});
