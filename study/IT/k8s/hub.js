// 허브 화면 — 과제 분포와 진행 상황만 그린다
(() => {
  "use strict";
  const TASKS = Array.isArray(window.K8S_TASKS) ? window.K8S_TASKS : [];
  const EXAMS = window.K8S_EXAMS || {};

  const readList = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : [];
    } catch (error) { return []; }
  };

  const solved = readList("bso-k8s-practice-solved-v1");
  const missed = readList("bso-k8s-practice-missed-v1");
  document.getElementById("hubSolved").textContent = `${solved.length} / ${TASKS.length}`;
  document.getElementById("hubMissed").textContent = `막힌 과제 ${missed.length}개`;

  if (window.renderK8sDocs) window.renderK8sDocs("docsLinks", { open: true });

  document.getElementById("hubWeights").innerHTML = Object.values(EXAMS).map((exam) => `
    <div style="margin-bottom:22px">
      <p class="section-label" style="margin-bottom:10px">${exam.label} — ${exam.full}</p>
      <div class="weight-bar">
        ${Object.entries(exam.areas).map(([key, area]) => {
          const count = TASKS.filter((task) => task.areas[exam.id] === key).length;
          return `<div class="weight-row">
            <span>${area.label} (${count})</span>
            <span class="track"><i style="width:${area.weight * 2.6}%"></i></span>
            <span class="num">${area.weight}%</span>
          </div>`;
        }).join("")}
      </div>
    </div>`).join("");
})();
