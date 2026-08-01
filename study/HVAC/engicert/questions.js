// 공조냉동기계기사 문제은행 로더
// 문제 데이터는 과목별 파일로 나누고, 이 파일을 불러온 페이지의 위치와 관계없이 동작합니다.
window.HVAC_QUESTION_BANK = [];
window.HVAC_EXAMS = [];
window.HVAC_SUBJECTS = {
  all: { label: "전체 과목", short: "전체" },
  energy: { label: "1과목 에너지관리", short: "에너지관리" },
  design: { label: "2과목 공조냉동설계", short: "공조냉동설계" },
  safety: { label: "3과목 시운전 및 안전관리", short: "시운전·안전" },
  maintenance: { label: "4과목 유지보수 공사관리", short: "유지보수·공사" },
  law: { label: "5과목 관련법령 (심화)", short: "관련법령" },
  ncs: { label: "6과목 NCS 학습모듈 (심화)", short: "NCS 모듈" }
};

const questionLoaderScript = document.currentScript;
const questionDataBase = new URL("./question-data/", questionLoaderScript.src);
const theoryBase = new URL("../theory/", questionLoaderScript.src);

window.addHVACQuestions = (subject, rows) => {
  rows.forEach(([id, topic, question, choices, answer, explanation]) => {
    const theoryUrl = new URL(theoryBase);
    theoryUrl.searchParams.set("subject", subject);
    theoryUrl.searchParams.set("topic", topic);

    window.HVAC_QUESTION_BANK.push({
      id,
      subject,
      topic,
      question,
      choices,
      answer,
      explanation,
      sourceType: "predicted",
      theory: theoryUrl.href
    });
  });
};

window.addHVACExamQuestions = (exam, rows) => {
  window.HVAC_EXAMS.push(exam);
  const choiceMarks = ["①", "②", "③", "④"];

  rows.forEach(([id, subject, subjectLabel, question, choices, answer, images]) => {
    const topic = `${exam.label} · ${subjectLabel}`;
    const theoryUrl = new URL(theoryBase);
    theoryUrl.searchParams.set("subject", subject);
    theoryUrl.searchParams.set("topic", subjectLabel);

    window.HVAC_QUESTION_BANK.push({
      id,
      subject,
      topic,
      question,
      choices,
      answer,
      explanation: `${exam.label} 기출문제의 정답은 ${choiceMarks[answer]}입니다.`,
      images,
      sourceType: "exam",
      exam: exam.id,
      examLabel: exam.label,
      sourceSubject: subjectLabel,
      theory: theoryUrl.href
    });
  });
};

[
  "01-energy.js",
  "02-design.js",
  "03-safety.js",
  "04-maint-00-core.js",
  "04-maint-01-materials.js",
  "04-maint-02-support.js",
  "04-maint-03-water.js",
  "04-maint-04-heating.js",
  "04-maint-05-refrigeration.js",
  "04-maint-06-management.js",
  "05-law.js",
  "06-ncs.js",
  "history/index.js"
].forEach((filename) => {
  const src = new URL(filename, questionDataBase).href;
  document.write(`<script src="${src}"><\/script>`);
});
