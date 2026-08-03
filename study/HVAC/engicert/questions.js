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
const explanationBase = new URL("./explanations/", questionLoaderScript.src);
const theoryBase = new URL("../theory/", questionLoaderScript.src);

// 기출문제 해설 저장소. 해설 파일이 문제 파일보다 먼저 실행되므로
// addHVACExamQuestions 시점에는 이미 채워져 있다.
window.HVAC_EXPLANATIONS = {};
window.addHVACExplanations = (rows) => {
  Object.assign(window.HVAC_EXPLANATIONS, rows);
};

// 원문 그림·표·수식이 유실된 문항에 붙일 안내문.
window.HVAC_SOURCE_NOTES = {};
window.addHVACSourceNotes = (rows) => {
  Object.assign(window.HVAC_SOURCE_NOTES, rows);
};

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

    const authored = window.HVAC_EXPLANATIONS[id];
    const answerText = String(choices[answer] || "").trim();
    // 해설을 아직 쓰지 않은 문항은 최소한 정답 '내용'과 찾아볼 곳을 알려준다.
    const fallback = /원문 이미지의 보기/.test(answerText) || !answerText
      ? `정답은 ${choiceMarks[answer]}번입니다. 이 문항은 보기가 이미지로만 제공되어 해설을 준비하지 못했습니다. ${subjectLabel} 이론에서 관련 개념을 확인하세요.`
      : `정답은 ${choiceMarks[answer]} ${answerText} 입니다. 상세 해설은 아직 준비 중이며, ${subjectLabel} 이론 노트에서 근거를 확인할 수 있습니다.`;

    window.HVAC_QUESTION_BANK.push({
      id,
      subject,
      topic,
      question,
      choices,
      answer,
      explanation: authored || fallback,
      hasAuthoredExplanation: Boolean(authored),
      sourceNote: window.HVAC_SOURCE_NOTES[id] || "",
      images,
      sourceType: "exam",
      exam: exam.id,
      examLabel: exam.label,
      sourceSubject: subjectLabel,
      theory: theoryUrl.href
    });
  });
};

// 해설 파일을 문제 파일보다 먼저 실행시킨다.
[
  "index.js"
].forEach((filename) => {
  const src = new URL(filename, explanationBase).href;
  document.write(`<script src="${src}"><\/script>`);
});

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
