#!/usr/bin/env node
// CKA·CKAD 실습실 검증
//  - 브라우저 로더(document.write)를 재현해 랩 데이터를 읽는다
//  - 랩마다 모범 해답(solution)을 가짜 클러스터에서 실제로 실행한다
//  - 그런 다음 모든 과제의 verify 가 통과하는지 확인한다
//    → 구현되지 않은 kubectl 기능에 기대는 과제를 여기서 잡는다
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const labRoot = path.join(siteRoot, "study", "IT", "k8s", "lab");
const require = createRequire(import.meta.url);

globalThis.window = globalThis;
globalThis.atob = (text) => Buffer.from(text, "base64").toString("binary");
globalThis.btoa = (text) => Buffer.from(text, "binary").toString("base64");
globalThis.document = {
  currentScript: null,
  write(markup) {
    const m = markup.match(/<script src="([^"]+)"/);
    if (!m) throw new Error(`스크립트 태그를 읽지 못했습니다: ${markup}`);
    load(fileURLToPath(m[1]));
  }
};

function load(filename) {
  const previous = document.currentScript;
  document.currentScript = { src: pathToFileURL(filename).href };
  vm.runInThisContext(fs.readFileSync(filename, "utf8"), { filename });
  document.currentScript = previous;
}

const { Cluster } = require(path.join(labRoot, "cluster.js"));
const { Kubectl } = require(path.join(labRoot, "kubectl.js"));
const { Shell } = require(path.join(labRoot, "shell.js"));
const yaml = require(path.join(siteRoot, "study", "IT", "k8s", "vendor", "js-yaml.min.js"));
load(path.join(labRoot, "labs.js"));

const failures = [];
const report = [];

for (const lab of globalThis.K8S_LABS) {
  const at = `lab ${lab.id}`;
  if (!lab.tasks.length) { failures.push(`${at}: 과제가 없습니다`); continue; }
  if (!Array.isArray(lab.solution) || !lab.solution.length) { failures.push(`${at}: solution 이 없습니다`); continue; }

  const cluster = new Cluster();
  try { lab.seed(cluster, globalThis.labHelpers); } catch (e) { failures.push(`${at}: 시드 실패 — ${e.message}`); continue; }

  const shell = new Shell({ cluster, kubectl: null, files: Object.assign({}, lab.files), openEditor() {} });
  shell.kubectl = new Kubectl(cluster, {
    yaml,
    readFile: (p) => shell.readFile(p),
    writeFile: (p, t) => shell.writeFile(p, t),
    openEditor() {}
  });

  // 파드가 Running 이 되기를 기다리는 대신 시계를 앞당긴다
  const advance = (times = 6) => {
    for (let i = 0; i < times; i += 1) {
      cluster.objects.forEach((o) => { if (o.kind === "Pod") o._readyAt = Date.now() - 1; });
      cluster.tick();
    }
  };

  advance(2);
  for (const step of lab.solution) {
    if (typeof step === "object") { shell.writeFile(step.write, step.text); continue; }
    const result = shell.exec(step);
    if (result.error) failures.push(`${at}: 해답 실행 실패 — ${step}\n      → ${result.error}`);
    advance(2);
  }
  advance(4);

  const ctx = { c: cluster, read: (p) => shell.readFile(p), files: shell.files };
  const results = lab.tasks.map((task) => {
    let raw;
    try { raw = task.verify(ctx); }
    catch (e) { return { id: task.id, ok: false, detail: `검사 중 오류: ${e.message}` }; }
    const r = raw === true ? { ok: true } : raw === false ? { ok: false } : raw;
    return { id: task.id, ok: Boolean(r.ok), detail: r.detail };
  });
  results.filter((r) => !r.ok).forEach((r) =>
    failures.push(`${at}/${r.id}: 모범 해답으로도 통과하지 못함 — ${r.detail || "(이유 없음)"}`));

  // 과제마다 필수 항목
  lab.tasks.forEach((task) => {
    ["prompt", "hint", "docs"].forEach((field) => {
      if (!task[field]) failures.push(`${at}/${task.id}: ${field} 누락`);
    });
    if (task.docs && !globalThis.K8S_DOC_HINTS) return;
  });

  report.push({ id: lab.id, exam: lab.exam, tasks: lab.tasks.length, minutes: lab.minutes, passed: results.filter((r) => r.ok).length });
}

console.log(JSON.stringify({ labs: report, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
