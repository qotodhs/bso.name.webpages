#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const entry = path.join(siteRoot, "study", "HVAC", "engicert", "questions.js");
const appFile = path.join(siteRoot, "study", "HVAC", "engicert", "app.js");
const htmlFile = path.join(siteRoot, "study", "HVAC", "engicert", "index.html");

globalThis.window = globalThis;
globalThis.document = {
  currentScript: { src: pathToFileURL(entry).href },
  write(markup) {
    const match = markup.match(/<script src="([^"]+)"/);
    if (!match) throw new Error(`Unable to read script tag: ${markup}`);
    loadScript(fileURLToPath(match[1]));
  }
};

function loadScript(filename) {
  const previous = document.currentScript;
  document.currentScript = { src: pathToFileURL(filename).href };
  const source = fs.readFileSync(filename, "utf8");
  vm.runInThisContext(source, { filename });
  document.currentScript = previous;
}

loadScript(entry);

const questions = globalThis.HVAC_QUESTION_BANK;
const exams = globalThis.HVAC_EXAMS;
const failures = [];
const ids = new Set();
const referencedImages = new Set();

const appSource = fs.readFileSync(appFile, "utf8");
const htmlSource = fs.readFileSync(htmlFile, "utf8");
const appElementIds = new Set([...appSource.matchAll(/\$\("([^"]+)"\)/g)].map((match) => match[1]));
const htmlElementIds = new Set([...htmlSource.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const missingElementIds = [...appElementIds].filter((id) => !htmlElementIds.has(id));
for (const id of missingElementIds) failures.push(`missing HTML element: ${id}`);

for (const question of questions) {
  if (ids.has(question.id)) failures.push(`duplicate id: ${question.id}`);
  ids.add(question.id);
  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
    failures.push(`invalid answer: ${question.id}`);
  }
  if (!Array.isArray(question.choices) || question.choices.length !== 4 || question.choices.some((choice) => !String(choice).trim())) {
    failures.push(`invalid choices: ${question.id}`);
  }
  for (const image of question.images ?? []) {
    const absolute = path.resolve(path.dirname(entry), image);
    referencedImages.add(path.normalize(absolute));
    if (!fs.existsSync(absolute)) failures.push(`missing image: ${question.id} -> ${image}`);
  }
}

const historical = questions.filter((question) => question.sourceType === "exam");
const predicted = questions.filter((question) => question.sourceType !== "exam");
if (historical.length !== 5060) failures.push(`historical count: ${historical.length}`);
if (predicted.length !== 552) failures.push(`predicted count: ${predicted.length}`);
if (exams.length !== 51) failures.push(`exam count: ${exams.length}`);

for (const exam of exams) {
  const actual = historical.filter((question) => question.exam === exam.id).length;
  if (actual !== exam.total) failures.push(`exam total: ${exam.id} metadata=${exam.total} actual=${actual}`);
}

const imageRoot = path.join(siteRoot, "study", "HVAC", "engicert", "question-images", "history");
const actualImages = [];
if (fs.existsSync(imageRoot)) {
  const stack = [imageRoot];
  while (stack.length) {
    const directory = stack.pop();
    for (const entryItem of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entryItem.name);
      if (entryItem.isDirectory()) stack.push(absolute);
      else if (entryItem.isFile()) actualImages.push(path.normalize(absolute));
    }
  }
}

const orphanImages = actualImages.filter((image) => !referencedImages.has(image));

const report = {
  questions: questions.length,
  predicted: predicted.length,
  historical: historical.length,
  exams: exams.length,
  referencedImages: referencedImages.size,
  actualImages: actualImages.length,
  appElementIds: appElementIds.size,
  missingElementIds,
  orphanImages,
  failures
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = failures.length ? 1 : 0;
