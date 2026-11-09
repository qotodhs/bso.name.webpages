// 공조냉동기계기사 실기(필답형) 로더
//
// ── 데이터 형식 (이 주석이 정본) ─────────────────────────────────────────
// practical-data/YYYYMMDD.js 하나가 시행일 하나다.
//
//   addHVACPracticalExam({
//     id: "20211016",            시행일. 문항 ID 는 `P-20211016-01`
//     date: "2021-10-16",
//     problems: [ 문항, … ]
//   })
//
// 문항
//   no        문제 번호
//   points    배점
//   title     목록에 보일 한 줄 제목 (사용자가 준 지문에는 없다 — 내용으로 붙인다)
//   theory    [{ topic, title }] — topic 은 이론 챕터의 topics 키워드
//             (theory/?topic=<키워드> 가 그 챕터로 스크롤한다), title 은 챕터 제목
//   body      지문 첫 문장
//   conditions  조건 목록. 각 항목은 문자열 또는 { text, note } (note 는 괄호 단서)
//   figures   [{ src, alt, caption }] — src 는 practical 페이지 기준 경로
//   needs     아직 받지 못한 자료. 하나라도 있으면 '자료 대기' 상태로 표시하고
//             모범답안·해설을 열지 않는다
//   parts     소문항 배열
//   explanation  해설(렌더링 기준 200~300자, 필기와 같은 규칙)
//
// 소문항
//   label     "(1)"
//   text      물음
//   input     답안 입력란
//     { type: "text" }                         서술 — 자유 기술
//     { type: "number", unit: "Pa" }           수치 하나
//     { type: "table", head: [...], rows: [[셀, …], …] }
//        셀: 문자열이면 고정 표시, { unit } 이면 입력칸
//   solution  모범답안 (needs 가 비었을 때만 쓴다)
//     steps   [문자열] — 풀이 과정. 한 줄이 `$$…$$` 면 디스플레이 수식
//     answer  최종 답 문자열
//     check   자동 확인값. number 는 { value, tol }, table 은 셀 위치와 같은
//             모양의 2차원 배열(고정 셀은 null). tol 은 절대 허용오차
//   grading   채점 포인트 [{ label, score }] — 문항 안 모든 소문항의 score 합이
//             points 와 같아야 한다 (검증 스크립트가 확인)
// ─────────────────────────────────────────────────────────────────────────
window.HVAC_PRACTICAL = [];

window.addHVACPracticalExam = (exam) => {
  const problems = (exam.problems || []).map((problem) => ({
    ...problem,
    id: `P-${exam.id}-${String(problem.no).padStart(2, "0")}`,
    examId: exam.id,
    date: exam.date,
    needs: problem.needs || [],
    figures: problem.figures || [],
    conditions: problem.conditions || [],
    parts: problem.parts || [],
    theory: problem.theory || []
  }));
  window.HVAC_PRACTICAL.push({ ...exam, problems });
  window.HVAC_PRACTICAL.sort((a, b) => b.id.localeCompare(a.id));
};

(() => {
  const loader = document.currentScript;
  const dataBase = new URL("./practical-data/", loader.src);
  // 새 시행일 파일은 여기에 등록한다
  const files = ["20211016.js"];
  files.forEach((file) => {
    document.write(`<script src="${new URL(file, dataBase).href}"><\/script>`);
  });
})();
