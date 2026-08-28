#!/usr/bin/env node
// CKA·CKAD 과제은행 검증
//  - 로더(tasks.js)를 그대로 재현해 데이터 파일을 순서대로 실행한다
//  - ID 중복 / 필수 필드 / areas 키 / docs 링크를 확인한다
//  - **모범답안이 자기 채점 기준을 통과하는지** 전수 채점한다
//  - practice/index.html 이 참조하는 엘리먼트 ID 가 실제로 있는지 본다
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const k8sRoot = path.join(siteRoot, "study", "IT", "k8s");
const require = createRequire(import.meta.url);

globalThis.window = globalThis;
globalThis.document = {
  currentScript: null,
  write(markup) {
    const match = markup.match(/<script src="([^"]+)"/);
    if (!match) throw new Error(`스크립트 태그를 읽지 못했습니다: ${markup}`);
    loadScript(fileURLToPath(match[1]));
  }
};

function loadScript(filename) {
  const previous = document.currentScript;
  document.currentScript = { src: pathToFileURL(filename).href };
  vm.runInThisContext(fs.readFileSync(filename, "utf8"), { filename });
  document.currentScript = previous;
}

loadScript(path.join(k8sRoot, "tasks.js"));
loadScript(path.join(k8sRoot, "notes", "notes.js"));

const grader = require(path.join(k8sRoot, "practice", "grader.js"));
const yaml = require(path.join(k8sRoot, "vendor", "js-yaml.min.js"));

const tasks = globalThis.K8S_TASKS;
const exams = globalThis.K8S_EXAMS;
const notes = globalThis.K8S_NOTES;
const failures = [];
const seen = new Set();

for (const task of tasks) {
  const at = task.id;
  if (seen.has(at)) failures.push(`${at}: ID 중복`);
  seen.add(at);

  for (const field of ["title", "prompt", "answer", "explain", "docs", "hint"]) {
    if (!task[field]) failures.push(`${at}: ${field} 누락`);
  }
  if (task.docs && !/^https:\/\/kubernetes\.io\//.test(task.docs)) {
    failures.push(`${at}: docs 링크가 kubernetes.io 가 아님 — ${task.docs}`);
  }
  const areaKeys = Object.keys(task.areas || {});
  if (!areaKeys.length) failures.push(`${at}: areas 비어 있음`);
  for (const examId of areaKeys) {
    if (!exams[examId]) { failures.push(`${at}: 알 수 없는 시험 ${examId}`); continue; }
    if (!exams[examId].areas[task.areas[examId]]) {
      failures.push(`${at}: ${examId} 영역 키 오류 — ${task.areas[examId]}`);
    }
  }
  if (![1, 2, 3].includes(Number(task.level))) failures.push(`${at}: level 값 오류`);

  if (task.type === "command") {
    if (!task.match) { failures.push(`${at}: match 없음`); continue; }
    const result = grader.gradeCommand(task.answer, task.match);
    if (!result.pass) {
      const miss = result.checks.filter((c) => !c.ok).map((c) => `${c.label} ${c.got}`).join(" / ");
      failures.push(`${at}: 모범답안이 채점 기준을 통과하지 못함 — ${miss}`);
    }
  } else if (task.type === "manifest") {
    if (!Array.isArray(task.checks) || !task.checks.length) { failures.push(`${at}: checks 없음`); continue; }
    if (!task.starter) failures.push(`${at}: starter 없음`);
    const result = grader.gradeManifest(task.answer, task.checks, yaml);
    if (!result.pass) {
      const miss = result.error || result.checks.filter((c) => !c.ok).map((c) => `${c.label} ${c.got}`).join(" / ");
      failures.push(`${at}: 모범 매니페스트가 checks 를 통과하지 못함 — ${miss}`);
    }
  } else {
    failures.push(`${at}: 알 수 없는 type — ${task.type}`);
  }
}

// 세션 표본이 영역별로 뽑히려면 영역마다 최소 1과제가 있어야 한다
for (const [examId, exam] of Object.entries(exams)) {
  for (const [key, area] of Object.entries(exam.areas)) {
    const count = tasks.filter((task) => task.areas[examId] === key).length;
    if (!count) failures.push(`${examId}/${key}(${area.label}): 과제 0개`);
  }
}

// 화면이 찾는 엘리먼트 ID 가 HTML 에 있는지
for (const page of ["practice", "notes"]) {
  const appSource = fs.readFileSync(path.join(k8sRoot, page, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(k8sRoot, page, "index.html"), "utf8");
  const ids = new Set([...appSource.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map((m) => m[1]));
  for (const id of ids) {
    if (!html.includes(`id="${id}"`)) failures.push(`${page}/index.html: id="${id}" 없음`);
  }
}

const distribution = {};
for (const [examId, exam] of Object.entries(exams)) {
  distribution[examId] = Object.fromEntries(Object.keys(exam.areas)
    .map((key) => [key, tasks.filter((task) => task.areas[examId] === key).length]));
}

console.log(JSON.stringify({
  tasks: tasks.length,
  command: tasks.filter((t) => t.type === "command").length,
  manifest: tasks.filter((t) => t.type === "manifest").length,
  noteChapters: notes.length,
  noteSections: notes.reduce((sum, chapter) => sum + chapter.sections.length, 0),
  distribution,
  failures
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
