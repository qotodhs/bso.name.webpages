#!/usr/bin/env node
// 실기 필답형 데이터 검증 — 로더를 그대로 재현해 구조·배점·참조를 확인한다.
// 수식 컴파일은 KaTeX 가 node 에 없으면 건너뛰므로 브라우저에서 따로 돌린다(CLAUDE.md).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..", "study", "HVAC");
const practicalDir = path.join(root, "practical");
const entry = path.join(practicalDir, "practical.js");

globalThis.window = globalThis;
globalThis.document = {
  currentScript: { src: pathToFileURL(entry).href },
  write(markup) {
    const match = markup.match(/<script src="([^"]+)"/);
    if (!match) throw new Error(`스크립트 태그를 읽을 수 없음: ${markup}`);
    loadScript(fileURLToPath(match[1]));
  }
};
function loadScript(filename) {
  const previous = document.currentScript;
  document.currentScript = { src: pathToFileURL(filename).href };
  vm.runInThisContext(fs.readFileSync(filename, "utf8"), { filename });
  document.currentScript = previous;
}
loadScript(entry);

// 이론 챕터 — ?topic= 키워드가 어느 챕터로 가는지
globalThis.HVAC_THEORY = [];
const theoryChapters = [];
for (const file of fs.readdirSync(path.join(root, "theory", "theory-data")).filter((f) => f.endsWith(".js"))) {
  const source = fs.readFileSync(path.join(root, "theory", "theory-data", file), "utf8");
  const sandbox = { window: {} };
  sandbox.window = new Proxy({}, {
    get: (_, key) => (typeof key === "string" && key.startsWith("add") ? (...args) => args.flat().forEach((c) => c && c.id && theoryChapters.push(c)) : undefined),
    set: (_, key, value) => { if (Array.isArray(value)) value.forEach((c) => c && c.id && theoryChapters.push(c)); return true; }
  });
  vm.runInNewContext(source, sandbox, { filename: file });
}

let katex = null;
try { katex = (await import("katex")).default; } catch { /* 브라우저에서 확인 */ }

const failures = [];
const fail = (id, message) => failures.push(`${id}: ${message}`);
const exams = globalThis.HVAC_PRACTICAL;
const ids = new Set();
let ready = 0;
let mathCount = 0;

function eachMath(text, id) {
  for (const m of String(text ?? "").matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+)\$/g)) {
    const expr = m[1] ?? m[2];
    mathCount += 1;
    if (/\\ohm\b/.test(expr)) fail(id, `\\ohm 은 KaTeX 에 없다: ${expr}`);
    if (/\\,\^/.test(expr)) fail(id, `\\,^ 는 파싱 오류: ${expr}`);
    if (katex) {
      try { katex.renderToString(expr, { throwOnError: true, displayMode: Boolean(m[1]) }); }
      catch (error) { fail(id, `수식 오류 ${expr} — ${error.message}`); }
    }
  }
}

for (const exam of exams) {
  if (!/^\d{8}$/.test(exam.id)) fail(exam.id, "시행일 id 는 YYYYMMDD");
  if (exam.date.replaceAll("-", "") !== exam.id) fail(exam.id, `date ${exam.date} 와 id 불일치`);
  for (const problem of exam.problems) {
    const id = problem.id;
    if (ids.has(id)) fail(id, "문항 ID 중복");
    ids.add(id);
    for (const key of ["no", "points", "title", "body"]) if (problem[key] === undefined || problem[key] === "") fail(id, `${key} 없음`);
    if (!problem.parts.length) fail(id, "소문항 없음");

    [problem.body, problem.explanation, ...problem.needs].forEach((t) => eachMath(t, id));
    problem.conditions.forEach((c) => (typeof c === "string" ? eachMath(c, id) : (eachMath(c.text, id), eachMath(c.note, id))));

    for (const figure of problem.figures) {
      const file = path.resolve(practicalDir, figure.src);
      if (!fs.existsSync(file)) fail(id, `그림 없음 ${figure.src}`);
      if (!figure.alt) fail(id, `그림 alt 없음 ${figure.src}`);
    }

    for (const item of problem.theory) {
      const chapter = theoryChapters.find((c) => (c.topics || []).includes(item.topic));
      if (!chapter) fail(id, `이론 키워드 '${item.topic}' 에 해당하는 챕터 없음`);
      else if (chapter.title !== item.title) fail(id, `이론 제목 불일치: '${item.title}' ≠ '${chapter.title}'`);
    }

    const isReady = problem.needs.length === 0;
    let gradingSum = 0;
    problem.parts.forEach((part, p) => {
      const where = `${id} ${part.label || `#${p}`}`;
      eachMath(part.text, where);
      const input = part.input || { type: "text" };
      if (!["text", "number", "table"].includes(input.type)) fail(where, `input.type '${input.type}'`);
      if (input.type === "table") {
        input.head.forEach((h) => eachMath(h, where));
        input.rows.forEach((row, r) => {
          if (row.length !== input.head.length) fail(where, `표 ${r}행 칸 수 ${row.length} ≠ 머리 ${input.head.length}`);
        });
      }
      if (!isReady) return;
      if (!part.solution) { fail(where, "자료가 다 들어왔는데 모범답안 없음"); return; }
      (part.solution.steps || []).forEach((s) => eachMath(s, where));
      eachMath(part.solution.answer, where);
      const check = part.solution.check;
      if (input.type === "number" && check && !Number.isFinite(check.value)) fail(where, "check.value 숫자 아님");
      if (input.type === "table" && check) {
        input.rows.forEach((row, r) => row.forEach((cell, c) => {
          const want = check[r]?.[c];
          if (typeof cell === "string" && want) fail(where, `고정 셀 [${r},${c}] 에 check 가 있음`);
          if (typeof cell !== "string" && !(want && Number.isFinite(want.value))) fail(where, `입력 셀 [${r},${c}] 에 check 없음`);
        }));
      }
      (part.grading || []).forEach((g) => { eachMath(g.label, where); gradingSum += g.score; });
    });
    if (isReady) {
      ready += 1;
      if (!problem.explanation) fail(id, "해설 없음");
      if (gradingSum !== problem.points) fail(id, `채점 포인트 합 ${gradingSum} ≠ 배점 ${problem.points}`);
    }
  }
}

// app.js 가 찾는 엘리먼트가 HTML 에 있는지
const html = fs.readFileSync(path.join(practicalDir, "index.html"), "utf8");
const app = fs.readFileSync(path.join(practicalDir, "app.js"), "utf8");
for (const [, elId] of app.matchAll(/\$\("([^"]+)"\)/g)) if (!html.includes(`id="${elId}"`)) fail("app.js", `#${elId} 가 HTML 에 없음`);

const total = exams.reduce((n, e) => n + e.problems.length, 0);
console.log(`시행 ${exams.length}회 · 문항 ${total} · 모범답안 완료 ${ready} · 자료 대기 ${total - ready}`);
console.log(`수식 ${mathCount}개 ${katex ? "컴파일 확인" : "— KaTeX 없음, 브라우저에서 컴파일 확인 필요"}`);
console.log("failures:", failures);
process.exit(failures.length ? 1 : 0);
