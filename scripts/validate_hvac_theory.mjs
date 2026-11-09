#!/usr/bin/env node
// 이론 노트 검증 — 로더를 재현해 형식·참조를 확인하고, 개편 전후의 내용 보존을 대조한다.
//
//   node scripts/validate_hvac_theory.mjs                        구조·참조 검사
//   node scripts/validate_hvac_theory.mjs --snapshot out.json    지금 이론의 문장을 모두 떠 둔다
//   node scripts/validate_hvac_theory.mjs --baseline origin/main 그 시점의 문장이 지금도 모두 있는지
//   node scripts/validate_hvac_theory.mjs --baseline out.json    (git ref 대신 스냅숏 파일도 된다)
//
// 내용 보존 검사는 문장을 '그대로' 옮겼는지 본다. 절 제목의 손번호("2. ")는 떼고 비교한다.
// KaTeX 컴파일은 node 에 KaTeX 가 없으면 건너뛰므로 브라우저에서 따로 돌린다(CLAUDE.md).
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(scriptDir, "..");
const hvac = path.join(repo, "study", "HVAC");
const dataDir = path.join(hvac, "theory", "theory-data");
const FILES = ["01-energy.js", "02-design.js", "03-safety.js", "04-maintenance.js"];
const SUBJECTS = ["energy", "design", "safety", "maintenance"];
const LIST_LIMIT = 7;

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

function loadChapters(readFile) {
  const chapters = [];
  const sandbox = {
    window: {
      addHVACTheory: (subject, list) => list.forEach((c, order) => chapters.push({ ...c, subject, order }))
    }
  };
  for (const file of FILES) vm.runInNewContext(readFile(file), sandbox, { filename: file });
  return chapters;
}

const stripNumber = (heading) => String(heading || "").replace(/^\s*\d+\.\s*/, "");

// 챕터 하나에서 사람이 읽는 문장을 모두 뽑는다(새 필드 포함).
// 절 제목은 구조의 일부라 보존 대조에서 뺀다(제목 인용은 아래 인용 검사가 본다).
function textsOf(chapter, { headings = true } = {}) {
  const out = [];
  const push = (v) => { if (typeof v === "string" && v.trim()) out.push(v.trim()); };
  push(chapter.title); push(chapter.tagline); push(chapter.summary);
  (chapter.exam || []).forEach(push);
  (chapter.sections || []).forEach((s) => {
    if (headings) push(stripNumber(s.heading));
    push(s.body); push(s.tip); push(s.key);
    (s.list || []).forEach(push);
    (s.traps || []).forEach(push);
    (s.core || []).forEach(push);
    (s.points || []).forEach((g) => { push(g.title); (g.items || []).forEach(push); });
    (s.formulas || []).forEach(([expr, note]) => { push(expr); push(note); });
    (s.figures || []).forEach((f) => { push(f.src); push(f.alt); push(f.caption); });
    const tables = s.tables || (s.table ? [s.table] : []);
    tables.forEach((t) => { (t.head || []).forEach(push); (t.rows || []).forEach((r) => r.forEach(push)); });
  });
  return out;
}

const chapters = loadChapters((file) => fs.readFileSync(path.join(dataDir, file), "utf8"));
const byId = new Map(chapters.map((c) => [c.id, c]));
const failures = [];
const warnings = [];
const fail = (id, message) => failures.push(`${id}: ${message}`);

// 1. 구조
const seen = new Set();
for (const c of chapters) {
  if (!c.id) fail("?", `id 없는 챕터: ${c.title}`);
  if (seen.has(c.id)) fail(c.id, "챕터 id 중복");
  seen.add(c.id);
  if (!SUBJECTS.includes(c.subject)) fail(c.id, `알 수 없는 과목 ${c.subject}`);
  if (!c.title) fail(c.id, "title 없음");
  if (!Array.isArray(c.sections) || !c.sections.length) fail(c.id, "sections 없음");
  // 개편을 마친 챕터 = 절 제목에 손번호가 하나도 없는 챕터
  const migrated = (c.sections || []).every((s) => !/^\s*\d+\.\s/.test(s.heading || ""));
  (c.sections || []).forEach((s, i) => {
    const where = `${c.id} §${i + 1}`;
    if (!s.heading) fail(where, "heading 없음");
    if (migrated && /^\s*\d+\.\s/.test(s.heading || "")) fail(where, `손번호가 남아 있다: ${s.heading}`);
    if (migrated && (s.list || []).length > LIST_LIMIT) fail(where, `flat list ${s.list.length}개 — points 로 묶는다`);
    if (s.points && !Array.isArray(s.points)) fail(where, "points 는 배열");
    (s.points || []).forEach((g, j) => {
      if (!g.title) fail(where, `points[${j}] 제목 없음`);
      if (!Array.isArray(g.items) || !g.items.length) fail(where, `points[${j}] 항목 없음`);
    });
    if (s.traps && !Array.isArray(s.traps)) fail(where, "traps 는 배열");
    if (s.key && typeof s.key !== "string") fail(where, "key 는 문자열");
    if (s.core && !Array.isArray(s.core)) fail(where, "core 는 배열");
    if (s.lead && s.lead !== "body") fail(where, `lead 는 "body" 만: ${s.lead}`);
    // interactive.js 의 HVAC_INTERACTIVE 에 있는 종류만
    if (s.interactive && !["psychro", "pv", "ph"].includes(s.interactive)) fail(where, `모르는 interactive: ${s.interactive}`);
    (s.see || []).forEach((ref) => {
      const [cid, sec] = String(ref).split("#");
      const target = byId.get(cid);
      if (!target) return fail(where, `see 대상 챕터 없음: ${ref}`);
      if (sec && !(Number(sec) >= 1 && Number(sec) <= target.sections.length)) fail(where, `see 대상 절 없음: ${ref}`);
    });
    (s.figures || []).forEach((f) => {
      const file = path.join(hvac, "theory", f.src);
      if (!fs.existsSync(file)) fail(where, `그림 파일 없음: ${f.src}`);
    });
  });
}

// 2. 해설·이론이 '…' 단원 으로 인용한 챕터 제목이 실재하는가
const titles = new Set(chapters.map((c) => c.title));
const headings = new Set(chapters.flatMap((c) => c.sections.map((s) => stripNumber(s.heading))));
const explDir = path.join(hvac, "engicert", "explanations");
const citeSources = fs.readdirSync(explDir).filter((f) => f.endsWith(".js")).map((f) => path.join(explDir, f))
  .concat(FILES.map((f) => path.join(dataDir, f)));
let citeCount = 0;
for (const file of citeSources) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/'([^'\n]{2,40})' 단원/g)) {
    citeCount += 1;
    if (!titles.has(m[1])) fail(path.basename(file), `없는 단원을 인용: '${m[1]}' 단원`);
  }
  for (const m of text.matchAll(/'([^'\n]{2,40})' 절/g)) {
    citeCount += 1;
    const known = titles.has(m[1]) || [...headings].some((h) => h === m[1] || h.startsWith(`${m[1]}(`) || h.startsWith(`${m[1]} —`));
    if (!known) warnings.push(`${path.basename(file)}: 절 인용 확인 필요 '${m[1]}' 절`);
  }
}

// 2-1. 문항별 '관련 이론 보기'(explanations/theory-links.js) 대상이 실재하는가
const linkRows = {};
vm.runInNewContext(fs.readFileSync(path.join(explDir, "theory-links.js"), "utf8"),
  { window: { addHVACTheoryLinks: (rows) => Object.assign(linkRows, rows) } }, { filename: "theory-links.js" });
const linkIds = new Set();
const questionDir = path.join(hvac, "engicert", "question-data", "history");
fs.readdirSync(questionDir).filter((f) => /^\d{8}\.js$/.test(f)).forEach((f) => {
  vm.runInNewContext(fs.readFileSync(path.join(questionDir, f), "utf8"),
    { window: { addHVACExamQuestions: (exam, rows) => rows.forEach((r) => linkIds.add(r[0])) } }, { filename: f });
});
for (const [id, ref] of Object.entries(linkRows)) {
  if (!linkIds.has(id)) fail("theory-links.js", `없는 문항: ${id}`);
  const [cid, sec] = String(ref).split("#");
  const target = byId.get(cid);
  if (!target) fail("theory-links.js", `${id} → 없는 챕터: ${ref}`);
  else if (sec && !(Number(sec) >= 1 && Number(sec) <= target.sections.length)) fail("theory-links.js", `${id} → 없는 절: ${ref}`);
}

// 3. 스냅숏
const snapshotOut = option("--snapshot");
if (snapshotOut) {
  const snap = {};
  chapters.forEach((c) => { snap[c.id] = textsOf(c, { headings: false }); });
  fs.writeFileSync(snapshotOut, JSON.stringify(snap, null, 1));
  console.log(`스냅숏: ${snapshotOut} (${Object.values(snap).flat().length}문장)`);
}

// 4. 내용 보존
const baseline = option("--baseline");
let missing = [];
if (baseline) {
  let base;
  if (fs.existsSync(baseline)) {
    base = JSON.parse(fs.readFileSync(baseline, "utf8"));
  } else {
    const prior = loadChapters((file) =>
      execFileSync("git", ["show", `${baseline}:study/HVAC/theory/theory-data/${file}`], { cwd: repo, encoding: "utf8", maxBuffer: 64 << 20 }));
    base = {};
    prior.forEach((c) => { base[c.id] = textsOf(c, { headings: false }); });
  }
  // 문장 단위로 대조한다. 한 bullet 을 판별 기준·세부·함정으로 쪼개 옮겨도 문장이 그대로면 통과.
  // 판별 기준 상자로 옮기며 떼어 낸 머리말("판별 기준은 하나다 — ")은 비교에서 뺀다.
  const corpus = chapters.flatMap(textsOf).join("\n");
  const lead = /^[^—\n]{0,20}판별 기준[^—\n]{0,10}—\s*/;
  const sentences = (text) => text.split(/(?<=\.)\s+(?=\S)/).map((t) => t.replace(lead, "").trim()).filter(Boolean);
  for (const [id, texts] of Object.entries(base)) {
    texts.forEach((t) => sentences(t).forEach((one) => {
      if (!corpus.includes(one)) missing.push(`${id}: ${one.slice(0, 80)}`);
    }));
  }
  missing.forEach((m) => fail("내용 보존", `사라진 문장 — ${m}`));
}

// 보고
const migrated = chapters.filter((c) => c.part).map((c) => c.id);
const restructured = chapters.filter((c) => c.sections.every((s) => !/^\s*\d+\.\s/.test(s.heading || ""))).map((c) => c.id);
const sectionCount = chapters.reduce((n, c) => n + c.sections.length, 0);
console.log(`챕터 ${chapters.length} · 절 ${sectionCount} · 파트 지정 ${migrated.length} · 개편 완료 ${restructured.length} · 인용 ${citeCount} · 문항 이론 링크 ${Object.keys(linkRows).length}`);
if (restructured.length) console.log(`  개편 완료: ${restructured.join(", ")}`);
SUBJECTS.forEach((s) => {
  const list = chapters.filter((c) => c.subject === s);
  const parts = [...new Set(list.map((c) => c.part).filter(Boolean))];
  console.log(`  ${s.padEnd(12)} ${list.length}챕터${parts.length ? ` · 파트: ${parts.join(" / ")}` : ""}`);
});
if (baseline) console.log(`내용 보존(${baseline}): 사라진 문장 ${missing.length}`);
warnings.forEach((w) => console.log(`  확인: ${w}`));
if (failures.length) {
  console.log(`\nfailures (${failures.length})`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("failures: 0");
