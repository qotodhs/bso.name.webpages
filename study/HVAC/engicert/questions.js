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

// 해설에 곁들이는 그림. { 문항 ID: [{ src, alt, caption }] } — src 는 engicert 페이지 기준 경로.
window.HVAC_EXPLANATION_FIGURES = {};
window.addHVACExplanationFigures = (rows) => {
  Object.assign(window.HVAC_EXPLANATION_FIGURES, rows);
};

// 문항별 '관련 이론 보기' 대상. { 문항 ID: "chapterId#절번호" } — 이론 노트의 see 와 같은 형식.
// 등록하지 않은 문항은 그 과목의 첫 챕터로 간다.
window.HVAC_THEORY_LINKS = {};
window.addHVACTheoryLinks = (rows) => {
  Object.assign(window.HVAC_THEORY_LINKS, rows);
};

// 지문 서식. 지문은 한 줄이 기본이고, 줄바꿈(\n) 뒤에 블록을 이어 붙일 수 있다.
//   "> " 로 시작하는 줄 — 보기 박스(<보기>, ㉠~㉣ 진술 등). ">   (가) …" 처럼 > 뒤를 두 칸 이상
//                         들여 쓰면 들여 쓴 하위 항목이 된다
//   "|" 로 시작하는 줄   — 표. 첫 줄이 머리글이고, 둘째 줄이 |---|---| 면 구분선으로 보고 건너뛴다
// 원문이 표·보기 상자를 이미지로만 갖고 있던 문항을 텍스트로 옮길 때 쓴다.
// inline 은 각 페이지의 수식 렌더러(withInlineMath)라 칸 안에서도 $...$ 가 그대로 렌더링된다.
window.HVAC_formatQuestion = (text, inline) => {
  const lines = String(text ?? "").split("\n");
  if (lines.length === 1) return inline(lines[0]);
  const cells = (row) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const isRule = (row) => /^\|?[\s:|-]+\|?$/.test(row.trim()) && row.includes("-");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith(">")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        const body = lines[i].slice(1).replace(/^ /, "");
        const sub = /^\s{2,}/.test(body);
        items.push(`<p${sub ? ' class="sub"' : ""}>${inline(body.trim())}</p>`);
        i += 1;
      }
      out.push(`<div class="question-box">${items.join("")}</div>`);
    } else if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i]);
        i += 1;
      }
      const [head, ...rest] = rows.filter((row, index) => !(index === 1 && isRule(row)));
      out.push(`
        <div class="question-table-wrap"><table class="question-table">
          <thead><tr>${cells(head).map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead>
          <tbody>${rest.map((row) => `<tr>${cells(row).map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div>`);
    } else {
      if (line.trim()) out.push(`<span class="question-line">${inline(line)}</span>`);
      i += 1;
    }
  }
  return out.join("");
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

  rows.forEach(([id, subject, subjectLabel, question, choices, answer, images, choiceImages]) => {
    const topic = `${exam.label} · ${subjectLabel}`;
    const theoryUrl = new URL(theoryBase);
    theoryUrl.searchParams.set("subject", subject);
    theoryUrl.searchParams.set("topic", subjectLabel);
    const theoryLink = window.HVAC_THEORY_LINKS[id];
    if (theoryLink) {
      const [chapterId, number] = theoryLink.split("#");
      theoryUrl.hash = number ? `${chapterId}__${number}` : chapterId;
    }

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
      explanationFigures: window.HVAC_EXPLANATION_FIGURES[id] || [],
      sourceNote: window.HVAC_SOURCE_NOTES[id] || "",
      images,
      // 보기가 그림인 문항. 없으면 undefined 라 기존 문항은 그대로 텍스트로 렌더링된다.
      choiceImages: Array.isArray(choiceImages) ? choiceImages : null,
      sourceType: "exam",
      exam: exam.id,
      examLabel: exam.label,
      sourceSubject: subjectLabel,
      // 이론 노트가 절마다 '이 절의 기출 풀기' 를 만들 때 쓰는 역방향 키("chapterId#절번호")
      theoryRef: theoryLink || null,
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
