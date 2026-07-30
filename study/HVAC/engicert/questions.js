// 공조냉동기계기사 문제은행 로더
// 업로드한 Anki 덱을 과목별 데이터 파일로 나누어 동기식으로 불러옵니다.
window.HVAC_QUESTION_BANK = [];
window.HVAC_SUBJECTS = {
  all: { label: "전체 과목", short: "전체" },
  energy: { label: "1과목 에너지관리", short: "에너지관리" },
  design: { label: "2과목 공조냉동설계", short: "공조냉동설계" },
  safety: { label: "3과목 시운전 및 안전관리", short: "시운전·안전" },
  maintenance: { label: "4과목 유지보수 공사관리", short: "유지보수·공사" },
  law: { label: "5과목 관련법령 (심화)", short: "관련법령" },
  ncs: { label: "6과목 NCS 학습모듈 (심화)", short: "NCS 모듈" }
};

window.addHVACQuestions = (subject, rows) => {
  rows.forEach(([id, topic, question, choices, answer, explanation]) => {
    window.HVAC_QUESTION_BANK.push({
      id,
      subject,
      topic,
      question,
      choices,
      answer,
      explanation,
      theory: "../theory/"
    });
  });
};

[
  "./question-data/01-energy.js",
  "./question-data/02-design.js",
  "./question-data/03-safety.js",
  "./question-data/04-maint-00-core.js",
  "./question-data/04-maint-01-materials.js",
  "./question-data/04-maint-02-support.js",
  "./question-data/04-maint-03-water.js",
  "./question-data/04-maint-04-heating.js",
  "./question-data/04-maint-05-refrigeration.js",
  "./question-data/04-maint-06-management.js",
  "./question-data/05-law.js",
  "./question-data/06-ncs.js"
].forEach((src) => document.write(`<script src="${src}"><\/script>`));
