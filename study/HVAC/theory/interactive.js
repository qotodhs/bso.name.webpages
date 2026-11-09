// 이론 노트의 상호작용 선도. 절(section)에 interactive: "psychro" | "pv" 를 적으면
// app.js 가 그 자리에 빈 상자를 그리고, 여기 있는 mount 함수가 상자 안을 채운다.
//   psychro — 습공기선도. 점을 끌거나 건구온도·상대습도를 넣으면 상태량을 계산한다
//   pv      — P-v 선도. 폴리트로픽 지수 n 과 체적비를 바꾸면 곡선·일·열량이 바뀐다
//   ph      — p-h 선도(R-134a). 증발·응축온도, 과냉각·과열도를 바꾸면 사이클과 성능값이 바뀐다
// 계산식은 이론 본문과 같은 근사를 쓴다(포화수증기압은 Magnus 식, 습구온도는 엔탈피선 근사).
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (parent) parent.appendChild(node);
    return node;
  };
  const html = (tag, attrs = {}, text = "") => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text) node.textContent = text;
    return node;
  };
  const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  const solve = (f, a, b) => {
    for (let i = 0; i < 70; i += 1) {
      const m = (a + b) / 2;
      if (f(a) * f(m) <= 0) b = m; else a = m;
    }
    return (a + b) / 2;
  };
  // SVG 좌표로 바꾼 포인터 위치
  const svgPoint = (svg, event) => {
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
  const readout = (rows) => {
    const dl = html("dl", { class: "ix-readout" });
    const cells = {};
    rows.forEach(([key, label]) => {
      const wrap = html("div");
      wrap.appendChild(html("dt", {}, label));
      cells[key] = html("dd");
      wrap.appendChild(cells[key]);
      dl.appendChild(wrap);
    });
    return { dl, cells };
  };

  // ── 습공기선도 ────────────────────────────────────────────────────────────
  const P_ATM = 101.325;
  const ps = (t) => 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
  const xOf = (t, phi) => (0.622 * phi * ps(t)) / (P_ATM - phi * ps(t));
  const pwOf = (x) => (x * P_ATM) / (0.622 + x);
  const hOf = (t, x) => 1.006 * t + x * (2501 + 1.86 * t);
  const xOnH = (h, t) => (h - 1.006 * t) / (2501 + 1.86 * t);

  function psychro(box) {
    const W = 640, H = 420, L = 48, R = 576, T = 16, B = 378, tMax = 40, xMax = 0.026;
    const X = (t) => L + ((R - L) * t) / tMax;
    const Y = (x) => B - ((B - T) * x) / xMax;
    const tOfX = (px) => ((px - L) * tMax) / (R - L);
    const xOfY = (py) => ((B - py) * xMax) / (B - T);
    const state = { t: 26, x: xOf(26, 0.5) };

    const head = html("p", { class: "ix-hint" }, "선도 위를 누르거나 끌어 상태점을 옮기세요. 아래 칸에 건구온도와 상대습도를 넣어도 됩니다.");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "ix-svg ix-drag", role: "img", "aria-label": "상호작용 습공기선도" });
    el("rect", { width: W, height: H, fill: "#ffffff" }, svg);
    const base = el("g", {}, svg);
    // 엔탈피선
    for (let h = 10; h <= 100; h += 10) {
      const tSat = solve((t) => xOf(t, 1) - xOnH(h, t), -20, 60);
      const line = range(Math.max(tSat, 0), Math.min(h / 1.006, tMax), 24)
        .filter((t) => xOnH(h, t) <= xMax && xOnH(h, t) >= 0)
        .map((t) => [X(t), Y(xOnH(h, t))]);
      if (line.length < 2) continue;
      el("polyline", { points: pts(line), fill: "none", stroke: "#b45309", "stroke-width": 0.8, "stroke-dasharray": "4 4", opacity: 0.55 }, base);
      if (h % 20 === 0) el("text", { x: line[0][0] - 4, y: line[0][1] - 4, "font-size": 10, fill: "#b45309", "text-anchor": "end" }, base).textContent = h;
    }
    // 상대습도 곡선
    for (let phi = 0.1; phi < 0.95; phi += 0.1) {
      const line = range(0, tMax, 60).map((t) => [X(t), Y(xOf(t, phi))]).filter(([, y]) => y >= T);
      el("polyline", { points: pts(line), fill: "none", stroke: "#cbd5e1", "stroke-width": 1 }, base);
      const [lx, ly] = line[line.length - 1];
      if (Math.round(phi * 10) % 2 === 0) el("text", { x: lx + 3, y: ly + 3, "font-size": 10, fill: "#64748b" }, base).textContent = `${Math.round(phi * 100)}%`;
    }
    const sat = range(0, tMax, 100).map((t) => [X(t), Y(xOf(t, 1))]).filter(([, y]) => y >= T);
    el("polyline", { points: pts(sat), fill: "none", stroke: "#2563eb", "stroke-width": 2.2 }, base);
    // 축·눈금
    el("line", { x1: L, y1: B, x2: R, y2: B, stroke: "#1e293b", "stroke-width": 1.2 }, base);
    el("line", { x1: R, y1: B, x2: R, y2: T, stroke: "#1e293b", "stroke-width": 1.2 }, base);
    [0, 10, 20, 30, 40].forEach((t) => {
      el("line", { x1: X(t), y1: B, x2: X(t), y2: B + 4, stroke: "#1e293b" }, base);
      el("text", { x: X(t), y: B + 16, "font-size": 11, fill: "#64748b", "text-anchor": "middle" }, base).textContent = t;
    });
    [0, 0.005, 0.01, 0.015, 0.02, 0.025].forEach((x) => {
      el("line", { x1: R, y1: Y(x), x2: R + 4, y2: Y(x), stroke: "#1e293b" }, base);
      el("text", { x: R + 7, y: Y(x) + 4, "font-size": 10, fill: "#64748b" }, base).textContent = x.toFixed(3);
    });
    el("text", { x: (L + R) / 2, y: B + 34, "font-size": 12, fill: "#1e293b", "text-anchor": "middle", "font-weight": 600 }, base).textContent = "건구온도 t [℃]";
    el("text", { x: R, y: T + 2, "font-size": 11, fill: "#1e293b", "text-anchor": "end", "font-weight": 600, dy: -4 }, base).textContent = "x [kg/kg′]";
    const live = el("g", {}, svg);

    // 입력칸
    const form = html("div", { class: "ix-controls" });
    const tLabel = html("label", {}, "건구온도 ");
    const tIn = html("input", { type: "number", min: "0", max: "40", step: "0.5", inputmode: "decimal" });
    tLabel.appendChild(tIn); tLabel.appendChild(document.createTextNode(" ℃"));
    const fLabel = html("label", {}, "상대습도 ");
    const fIn = html("input", { type: "number", min: "1", max: "100", step: "1", inputmode: "decimal" });
    fLabel.appendChild(fIn); fLabel.appendChild(document.createTextNode(" %"));
    form.append(tLabel, fLabel);
    [["실내 26 ℃·50 %", 26, 0.5], ["외기 32 ℃·60 %", 32, 0.6], ["겨울 외기 0 ℃·80 %", 0, 0.8]].forEach(([label, t, phi]) => {
      const button = html("button", { type: "button", class: "button secondary small" }, label);
      button.addEventListener("click", () => { state.t = t; state.x = xOf(t, phi); draw(true); });
      form.appendChild(button);
    });
    const { dl, cells } = readout([
      ["t", "건구온도"], ["phi", "상대습도 φ"], ["x", "절대습도 x"], ["h", "엔탈피 h"],
      ["dew", "노점온도"], ["wb", "습구온도 (엔탈피선 근사)"], ["pw", "수증기 분압"], ["v", "비체적"]
    ]);

    function draw(syncInputs) {
      const { t, x } = state;
      const phi = pwOf(x) / ps(t);
      const h = hOf(t, x);
      const dew = solve((tt) => xOf(tt, 1) - x, -40, 60);
      const wb = solve((tt) => xOf(tt, 1) - xOnH(h, tt), -40, t + 0.001);
      const v = (0.287 * (t + 273.15) * (1 + 1.608 * x)) / P_ATM;
      live.replaceChildren();
      const dash = { "stroke-dasharray": "5 4", "stroke-width": 1.3 };
      el("line", { x1: X(t), y1: Y(x), x2: X(t), y2: B, stroke: "#dc2626", ...dash }, live);
      el("line", { x1: X(t), y1: Y(x), x2: R, y2: Y(x), stroke: "#0f766e", ...dash }, live);
      if (dew >= 0) {
        el("line", { x1: X(t), y1: Y(x), x2: X(dew), y2: Y(x), stroke: "#7c3aed", "stroke-width": 1.8 }, live);
        el("circle", { cx: X(dew), cy: Y(x), r: 4, fill: "#7c3aed" }, live);
      }
      const wbLine = range(Math.max(wb, 0), t, 16).map((tt) => [X(tt), Y(xOnH(h, tt))]);
      if (wb >= 0) {
        el("polyline", { points: pts(wbLine), fill: "none", stroke: "#b45309", "stroke-width": 1.8 }, live);
        el("circle", { cx: X(wb), cy: Y(xOf(wb, 1)), r: 4, fill: "#b45309" }, live);
      }
      const rh = range(0, tMax, 60).map((tt) => [X(tt), Y(xOf(tt, Math.min(phi, 1)))]).filter(([, y]) => y >= T);
      el("polyline", { points: pts(rh), fill: "none", stroke: "#15803d", "stroke-width": 1.6, opacity: 0.8 }, live);
      el("circle", { cx: X(t), cy: Y(x), r: 7, fill: "#dc2626", stroke: "#ffffff", "stroke-width": 2 }, live);
      cells.t.textContent = `${t.toFixed(1)} ℃`;
      cells.phi.textContent = `${(phi * 100).toFixed(1)} %`;
      cells.x.textContent = `${x.toFixed(4)} kg/kg′`;
      cells.h.textContent = `${h.toFixed(1)} kJ/kg`;
      cells.dew.textContent = `${dew.toFixed(1)} ℃`;
      cells.wb.textContent = `${wb.toFixed(1)} ℃`;
      cells.pw.textContent = `${pwOf(x).toFixed(2)} kPa`;
      cells.v.textContent = `${v.toFixed(3)} m³/kg′`;
      if (syncInputs) {
        tIn.value = t.toFixed(1);
        fIn.value = Math.round(phi * 100);
      }
    }
    function moveTo(event) {
      const p = svgPoint(svg, event);
      const t = Math.min(tMax, Math.max(0, tOfX(p.x)));
      const x = Math.min(xOf(t, 1), xMax, Math.max(0.0002, xOfY(p.y)));
      state.t = t;
      state.x = x;
      draw(true);
    }
    let dragging = false;
    svg.addEventListener("pointerdown", (event) => { dragging = true; svg.setPointerCapture(event.pointerId); moveTo(event); });
    svg.addEventListener("pointermove", (event) => { if (dragging) moveTo(event); });
    svg.addEventListener("pointerup", () => { dragging = false; });
    svg.addEventListener("pointercancel", () => { dragging = false; });
    const fromInputs = () => {
      const t = Number(tIn.value), phi = Number(fIn.value) / 100;
      if (!Number.isFinite(t) || !Number.isFinite(phi) || t < 0 || t > tMax || phi <= 0 || phi > 1) return;
      state.t = t;
      state.x = Math.min(xOf(t, phi), xMax);
      draw(false);
    };
    tIn.addEventListener("input", fromInputs);
    fIn.addEventListener("input", fromInputs);

    const note = html("p", { class: "ix-note" },
      "노점은 같은 절대습도로 포화곡선까지(보라), 습구온도는 엔탈피선을 따라 포화곡선까지(주황) 간 점입니다. 초록 곡선은 지금 상대습도의 등습도선. 대기압 101.325 kPa 기준이며 시험 문제의 선도 판독값과는 소수점 아래가 조금 다를 수 있습니다.");
    box.append(head, svg, form, dl, note);
    draw(true);
  }

  // ── P-v 선도 ──────────────────────────────────────────────────────────────
  function pv(box) {
    const W = 640, H = 380, L = 64, R = 600, T = 20, B = 330;
    const k = 1.4, P1 = 200, V1 = 0.5;
    const state = { n: 1.4, ratio: 2 };

    const head = html("p", { class: "ix-hint" }, "지수 n 과 체적비를 바꿔 보세요. 상태 1 은 200 kPa · 0.5 m³ 의 공기(k = 1.4)로 고정입니다.");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "ix-svg", role: "img", "aria-label": "상호작용 P-v 선도" });
    el("rect", { width: W, height: H, fill: "#ffffff" }, svg);
    const plot = el("g", {}, svg);

    const form = html("div", { class: "ix-controls" });
    const nLabel = html("label", { class: "ix-range" }, "지수 n ");
    const nIn = html("input", { type: "range", min: "0", max: "2", step: "0.05" });
    const nOut = html("output");
    nLabel.append(nIn, nOut);
    const rLabel = html("label", { class: "ix-range" });
    const rText = html("span");
    const rIn = html("input", { type: "range", min: "0.4", max: "3", step: "0.05" });
    const rOut = html("output");
    rLabel.append(rText, rIn, rOut);
    form.append(nLabel, rLabel);
    [["정압 n = 0", 0], ["등온 n = 1", 1], ["단열 n = k", k], ["정적 n = ∞", Infinity]].forEach(([label, n]) => {
      const button = html("button", { type: "button", class: "button secondary small" }, label);
      button.addEventListener("click", () => { state.n = n; draw(); });
      form.appendChild(button);
    });
    const { dl, cells } = readout([
      ["p2", "P₂"], ["v2", "V₂"], ["t", "T₂ / T₁"], ["w", "절대일 W"], ["u", "내부에너지 변화 ΔU"], ["q", "열량 Q = ΔU + W"]
    ]);
    const verdict = html("p", { class: "ix-note" });

    function stateOf(n, ratio) {
      if (n === Infinity) return { V2: V1, P2: P1 * ratio, W: 0 };
      const V2 = V1 * ratio, P2 = P1 * Math.pow(V1 / V2, n);
      const W = Math.abs(n - 1) < 1e-9 ? P1 * V1 * Math.log(V2 / V1) : (P1 * V1 - P2 * V2) / (n - 1);
      return { V2, P2, W };
    }
    function draw() {
      const { n, ratio } = state;
      const iso = n === Infinity;
      nIn.value = iso ? 2 : n;
      nIn.disabled = iso;
      nOut.textContent = iso ? "∞" : n.toFixed(2);
      rText.textContent = iso ? "압력비 P₂/P₁ " : "체적비 V₂/V₁ ";
      rIn.value = ratio;
      rOut.textContent = ratio.toFixed(2);
      const { V2, P2, W } = stateOf(n, ratio);
      const dU = (P2 * V2 - P1 * V1) / (k - 1);
      const Q = dU + W;
      // 축 범위: 지금 과정과 비교 곡선이 다 들어오게
      const vLo = Math.min(V1, V2), vHi = Math.max(V1, V2);
      const vMax = Math.max(1.6, vHi * 1.15);
      const refs = [0, 1, k].map((m) => stateOf(m, iso ? 1 : ratio).P2);
      const pMax = Math.max(P1, P2, ...refs) * 1.18;
      const X = (v) => L + ((R - L) * v) / vMax, Y = (p) => B - ((B - T) * p) / pMax;
      const curve = (m) => range(V1, V1 * (iso ? 1 : ratio), 50).map((v) => [X(v), Y(P1 * Math.pow(V1 / v, m))]);
      plot.replaceChildren();
      // 일 = 곡선 아래 면적
      if (!iso) {
        const area = [[X(V1), Y(0)], ...curve(n), [X(V2), Y(0)]];
        el("polygon", { points: pts(area), fill: W >= 0 ? "#fef3c7" : "#e0f2fe" }, plot);
      }
      // 비교 곡선(흐리게)
      [[0, "#dc2626"], [1, "#0f766e"], [k, "#2563eb"]].forEach(([m, color]) => {
        if (!iso && Math.abs(m - n) < 1e-9) return;
        el("polyline", { points: pts(curve(m)), fill: "none", stroke: color, "stroke-width": 1.2, opacity: 0.35, "stroke-dasharray": "5 4" }, plot);
      });
      // 축
      el("line", { x1: L, y1: B, x2: R, y2: B, stroke: "#1e293b", "stroke-width": 1.2 }, plot);
      el("line", { x1: L, y1: B, x2: L, y2: T, stroke: "#1e293b", "stroke-width": 1.2 }, plot);
      el("text", { x: R, y: B + 30, "font-size": 12, "text-anchor": "end", fill: "#1e293b", "font-weight": 600 }, plot).textContent = "체적 V [m³]";
      el("text", { x: L + 6, y: T + 4, "font-size": 12, fill: "#1e293b", "font-weight": 600 }, plot).textContent = "압력 P [kPa]";
      range(0, vMax, 4).forEach((v) => el("text", { x: X(v), y: B + 15, "font-size": 10, fill: "#64748b", "text-anchor": "middle" }, plot).textContent = v.toFixed(1));
      range(0, pMax, 4).slice(1).forEach((p) => el("text", { x: L - 6, y: Y(p) + 4, "font-size": 10, fill: "#64748b", "text-anchor": "end" }, plot).textContent = Math.round(p));
      // 지금 과정
      const color = iso ? "#b45309" : n < 0.5 ? "#dc2626" : Math.abs(n - 1) < 0.05 ? "#0f766e" : "#2563eb";
      const path = iso ? [[X(V1), Y(P1)], [X(V1), Y(P2)]] : curve(n);
      el("polyline", { points: pts(path), fill: "none", stroke: color, "stroke-width": 3 }, plot);
      [[V1, P1, "1"], [V2, P2, "2"]].forEach(([v, p, label]) => {
        el("circle", { cx: X(v), cy: Y(p), r: 5, fill: "#1e293b" }, plot);
        el("text", { x: X(v) + 8, y: Y(p) - 8, "font-size": 14, "font-weight": 800, fill: "#1e293b" }, plot).textContent = label;
      });
      if (!iso) el("text", { x: (X(vLo) + X(vHi)) / 2, y: B - 10, "font-size": 12, "text-anchor": "middle", fill: "#92400e", "font-weight": 700 }, plot).textContent = "면적 = 절대일";
      const kJ = (value) => `${value >= 0 ? "" : "−"}${Math.abs(value).toFixed(1)} kJ`;
      cells.p2.textContent = `${P2.toFixed(1)} kPa`;
      cells.v2.textContent = `${V2.toFixed(3)} m³`;
      cells.t.textContent = (P2 * V2 / (P1 * V1)).toFixed(3);
      cells.w.textContent = kJ(W);
      cells.u.textContent = kJ(dU);
      cells.q.textContent = kJ(Q);
      const what = iso ? (ratio > 1 ? "정적 가열" : ratio < 1 ? "정적 냉각" : "변화 없음")
        : `${ratio > 1 ? "팽창" : ratio < 1 ? "압축" : "변화 없음"}`;
      const work = W > 0 ? "기체가 외부로 일을 한다" : W < 0 ? "기체가 일을 받는다" : "일은 0";
      const heat = Math.abs(Q) < 0.05 ? "열 출입 없음(단열)" : Q > 0 ? "열을 받는다" : "열을 내보낸다";
      const trend = iso ? "정적 과정은 부피가 그대로라 일이 0 이고, 받은 열이 모두 내부에너지가 된다."
        : ratio > 1 ? "같은 체적비로 팽창할 때 n 이 클수록 곡선이 가팔라 압력이 빨리 떨어지므로 하는 일이 줄어든다."
        : ratio < 1 ? "같은 체적비로 압축할 때 n 이 클수록 압력이 더 크게 올라 받는 일이 커진다." : "";
      verdict.textContent = `${what} — ${work}, ${heat}. W = ∫P dV 는 곡선 아래 면적이고, ΔU = (P₂V₂ − P₁V₁)/(k − 1) 이다. ${trend}`;
    }
    nIn.addEventListener("input", () => { state.n = Number(nIn.value); draw(); });
    rIn.addEventListener("input", () => { state.ratio = Number(rIn.value); draw(); });
    box.append(head, svg, form, dl, verdict);
    draw();
  }

  // ── p-h 선도 (R-134a) ────────────────────────────────────────────────────
  // 포화표: CoolProp 8.0 (HEOS) 의 R-134a 온도표, ASHRAE 기준(−40 ℃ 포화액 h = 0, s = 0).
  // [T ℃, P kPa, vg m³/kg, hf, hg kJ/kg, sg kJ/kg·K]
  const R134A = [
    [-40, 51.21, 0.36108, 0, 225.86, 0.96873], [-35, 66.14, 0.28402, 6.301, 229.02, 0.96192],
    [-30, 84.38, 0.22594, 12.65, 232.17, 0.95586], [-25, 106.40, 0.18162, 19.04, 235.31, 0.95048],
    [-20, 132.73, 0.14739, 25.49, 238.41, 0.94571], [-15, 163.94, 0.12067, 31.99, 241.48, 0.94148],
    [-10, 200.60, 0.099590, 38.55, 244.52, 0.93774], [-5, 243.34, 0.082801, 45.17, 247.51, 0.93442],
    [0, 292.80, 0.069309, 51.86, 250.46, 0.93148], [5, 349.66, 0.058374, 58.61, 253.35, 0.92885],
    [10, 414.61, 0.049442, 65.43, 256.17, 0.92650], [15, 488.37, 0.042090, 72.34, 258.93, 0.92438],
    [20, 571.71, 0.035997, 79.32, 261.60, 0.92243], [25, 665.38, 0.030912, 86.40, 264.19, 0.92062],
    [30, 770.20, 0.026642, 93.58, 266.67, 0.91888], [35, 886.98, 0.023033, 100.86, 269.04, 0.91718],
    [40, 1016.6, 0.019966, 108.27, 271.28, 0.91545], [45, 1159.9, 0.017344, 115.80, 273.38, 0.91362],
    [50, 1317.9, 0.015089, 123.48, 275.29, 0.91164], [55, 1491.5, 0.013140, 131.32, 277.01, 0.90940],
    [60, 1681.8, 0.011444, 139.36, 278.49, 0.90681]
  ];
  // 5 ℃ 간격 보간. 압력·비체적은 로그로, 나머지는 직선으로
  const sat = (t) => {
    const i = Math.min(R134A.length - 2, Math.max(0, Math.floor((t + 40) / 5)));
    const a = R134A[i], b = R134A[i + 1], f = (t - a[0]) / 5;
    const lin = (k) => a[k] + (b[k] - a[k]) * f;
    const log = (k) => Math.exp(Math.log(a[k]) + (Math.log(b[k]) - Math.log(a[k])) * f);
    return { P: log(1), vg: log(2), hf: lin(3), hg: lin(4), sg: lin(5) };
  };
  const tSatOf = (P) => solve((t) => sat(t).P - P, -40, 60);
  // 과열증기는 정압비열이 일정하다고 보는 근사. 흡입 쪽(저압) 0.86, 토출 쪽은 응축온도에 따라 1.03~1.09
  const CP_LOW = 0.86;
  const cpHigh = (tc) => 0.95 + 0.0025 * tc;
  // 포화온도 tp 인 압력에서 엔트로피 s 인 과열증기의 엔탈피·온도
  const superheated = (tp, s) => {
    const sp = sat(tp), cp = cpHigh(tp), TK = tp + 273.15;
    const T2 = TK * Math.exp(Math.max(0, s - sp.sg) / cp);
    return { h: sp.hg + cp * (T2 - TK), t: T2 - 273.15 };
  };
  // useful: 과열이 증발기 안에서 일어나면(유효 과열) 냉동효과에 넣고, 흡입관에서 주위 열로
  // 일어나면(무효 과열) 냉동효과에 넣지 않는다. 압축일·비체적은 어느 쪽이든 같다.
  function cycleOf({ te, tc, sc, sh, useful = true }) {
    const e = sat(te), c = sat(tc);
    const TeK = te + 273.15, T1K = TeK + sh;
    const h1 = e.hg + CP_LOW * sh;
    const s1 = e.sg + CP_LOW * Math.log(T1K / TeK);
    const v1 = e.vg * T1K / TeK;
    const out = superheated(tc, s1);
    const h3 = sat(tc - sc).hf;
    const qe = (useful ? h1 : e.hg) - h3, w = out.h - h1;
    return {
      te, tc, sc, sh, useful, Pe: e.P, Pc: c.P, h1, h2: out.h, h3, h4: h3, s1, t2: out.t, v1,
      qe, w, qc: out.h - h3, cop: qe / w, x4: (h3 - e.hf) / (e.hg - e.hf), qv: qe / v1,
      hfC: c.hf, hgC: c.hg, hgE: e.hg
    };
  }

  function ph(box) {
    const W = 640, H = 430, L = 58, R = 582, T = 14, B = 352;
    const hMin = 40, hMax = 310, pMin = 51.21, pMax = 1681.8;
    const X = (h) => L + ((R - L) * (h - hMin)) / (hMax - hMin);
    const Y = (P) => B - ((B - T) * Math.log(P / pMin)) / Math.log(pMax / pMin);
    const STD = { te: -15, tc: 30, sc: 5, sh: 0, useful: true };
    const state = { ...STD };
    let base = cycleOf(STD);

    const head = html("p", { class: "ix-hint" },
      "증발온도·응축온도·과냉각도·과열도를 바꿔 보세요. 회색 점선은 비교 기준 사이클(처음에는 표준 냉동사이클)이고, 아래 수치 옆의 작은 글씨가 기준과의 차이입니다.");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "ix-svg", role: "img", "aria-label": "상호작용 p-h 선도 (R-134a)" });
    el("rect", { width: W, height: H, fill: "#ffffff" }, svg);
    const clipId = `ph-clip-${Math.random().toString(36).slice(2, 8)}`;
    el("rect", { x: L, y: T, width: R - L, height: B - T }, el("clipPath", { id: clipId }, el("defs", {}, svg)));
    const grid = el("g", {}, svg);
    // 압력 눈금(로그)과 오른쪽 포화온도 눈금
    [60, 100, 200, 300, 500, 700, 1000, 1500].forEach((P) => {
      el("line", { x1: L, y1: Y(P), x2: R, y2: Y(P), stroke: "#eef2f7" }, grid);
      el("text", { x: L - 6, y: Y(P) + 4, "font-size": 10, fill: "#64748b", "text-anchor": "end" }, grid).textContent = P;
    });
    [-40, -20, 0, 20, 40, 60].forEach((t) => {
      const y = Y(sat(t).P);
      el("line", { x1: R, y1: y, x2: R + 4, y2: y, stroke: "#1e293b" }, grid);
      el("text", { x: R + 7, y: y + 4, "font-size": 10, fill: "#64748b" }, grid).textContent = `${t}℃`;
    });
    for (let h = 50; h <= 300; h += 50) {
      el("line", { x1: X(h), y1: T, x2: X(h), y2: B, stroke: "#eef2f7" }, grid);
      el("text", { x: X(h), y: B + 15, "font-size": 10, fill: "#64748b", "text-anchor": "middle" }, grid).textContent = h;
    }
    const clip = el("g", { "clip-path": `url(#${clipId})` }, svg);
    // 포화 돔
    const temps = range(-40, 60, 50);
    el("polyline", { points: pts(temps.map((t) => [X(sat(t).hf), Y(sat(t).P)])), fill: "none", stroke: "#2563eb", "stroke-width": 2 }, clip);
    el("polyline", { points: pts(temps.map((t) => [X(sat(t).hg), Y(sat(t).P)])), fill: "none", stroke: "#dc2626", "stroke-width": 2 }, clip);
    // 등건도선 0.2~0.8
    [0.2, 0.4, 0.6, 0.8].forEach((q) => {
      el("polyline", { points: pts(temps.map((t) => { const s = sat(t); return [X(s.hf + q * (s.hg - s.hf)), Y(s.P)]; })),
        fill: "none", stroke: "#cbd5e1", "stroke-width": 0.8, "stroke-dasharray": "3 4" }, clip);
    });
    const ghost = el("g", {}, clip);
    const live = el("g", {}, clip);
    const marks = el("g", {}, svg);
    el("line", { x1: L, y1: B, x2: R, y2: B, stroke: "#1e293b", "stroke-width": 1.2 }, svg);
    el("line", { x1: L, y1: B, x2: L, y2: T, stroke: "#1e293b", "stroke-width": 1.2 }, svg);
    el("line", { x1: R, y1: B, x2: R, y2: T, stroke: "#1e293b", "stroke-width": 1 }, svg);
    el("text", { x: R, y: B + 30, "font-size": 12, "text-anchor": "end", fill: "#1e293b", "font-weight": 600 }, svg).textContent = "엔탈피 h [kJ/kg]";
    el("text", { x: L + 6, y: T + 14, "font-size": 12, fill: "#1e293b", "font-weight": 600 }, svg).textContent = "압력 P [kPa, 로그 눈금]";
    el("text", { x: X(70), y: Y(110), "font-size": 11, fill: "#2563eb", "text-anchor": "end" }, svg).textContent = "포화액선";
    el("text", { x: X(236), y: Y(70), "font-size": 11, fill: "#dc2626", "text-anchor": "end" }, svg).textContent = "포화증기선";
    el("text", { x: X(160), y: Y(62), "font-size": 11, fill: "#94a3b8", "text-anchor": "middle" }, svg).textContent = "습증기(가는 점선 = 건도 0.2·0.4·0.6·0.8)";

    // 조작
    const form = html("div", { class: "ix-controls" });
    const sliders = {};
    [["te", "증발온도", -30, 10, "℃"], ["tc", "응축온도", 20, 55, "℃"], ["sc", "과냉각도", 0, 10, "K"], ["sh", "과열도", 0, 10, "K"]]
      .forEach(([key, label, min, max, unit]) => {
        const wrap = html("label", { class: "ix-range" }, `${label} `);
        const input = html("input", { type: "range", min: String(min), max: String(max), step: "1" });
        const output = html("output");
        wrap.append(input, output);
        input.addEventListener("input", () => { state[key] = Number(input.value); draw(); });
        sliders[key] = { input, output, unit };
        form.appendChild(wrap);
      });
    const stdButton = html("button", { type: "button", class: "button secondary small" }, "표준 냉동사이클로");
    stdButton.addEventListener("click", () => { Object.assign(state, STD); draw(); });
    const pinButton = html("button", { type: "button", class: "button secondary small" }, "지금 사이클을 기준으로");
    pinButton.addEventListener("click", () => { base = cycleOf(state); draw(); });
    const whereLabel = html("label", {}, "과열이 일어나는 곳 ");
    const whereIn = html("select");
    [["1", "증발기 안 (유효 과열)"], ["0", "흡입관 (무효 과열)"]].forEach(([value, text]) => whereIn.appendChild(html("option", { value }, text)));
    whereIn.addEventListener("change", () => { state.useful = whereIn.value === "1"; draw(); });
    whereLabel.appendChild(whereIn);
    form.append(whereLabel, stdButton, pinButton);

    const rows = [
      ["qe", "냉동효과 (h₁ − h₄)", (c) => c.qe, "kJ/kg", 1],
      ["w", "압축일 (h₂ − h₁)", (c) => c.w, "kJ/kg", 1],
      ["qc", "응축부하 (h₂ − h₃)", (c) => c.qc, "kJ/kg", 1],
      ["cop", "성적계수 COP", (c) => c.cop, "", 2],
      ["pr", "압축비 (응축압력 ÷ 증발압력)", (c) => c.Pc / c.Pe, "", 2],
      ["t2", "토출가스 온도 (근사)", (c) => c.t2, "℃", 1],
      ["x4", "팽창 후 건도 x₄", (c) => c.x4, "", 3],
      ["v1", "흡입가스 비체적 v₁", (c) => c.v1, "m³/kg", 4],
      ["qv", "체적 냉동효과 (냉동효과 ÷ v₁)", (c) => c.qv, "kJ/m³", 0]
    ];
    const { dl, cells } = readout(rows.map(([key, label]) => [key, label]));
    const verdict = html("p", { class: "ix-note" });
    const points = html("p", { class: "ix-note" });

    const cyclePath = (c) => {
      const comp = range(Math.log(c.Pe), Math.log(c.Pc), 24).map((lnP) => {
        const P = Math.exp(lnP);
        return [X(superheated(tSatOf(P), c.s1).h), Y(P)];
      });
      comp[0] = [X(c.h1), Y(c.Pe)];
      comp[comp.length - 1] = [X(c.h2), Y(c.Pc)];
      return [...comp, [X(c.h3), Y(c.Pc)], [X(c.h4), Y(c.Pe)], [X(c.h1), Y(c.Pe)]];
    };
    function draw() {
      // 응축온도는 증발온도보다 10 K 이상 높게
      if (state.tc < state.te + 10) state.tc = state.te + 10;
      Object.entries(sliders).forEach(([key, { input, output, unit }]) => {
        input.value = state[key];
        output.textContent = `${state[key]} ${unit}`;
      });
      whereIn.value = state.useful ? "1" : "0";
      const c = cycleOf(state);
      ghost.replaceChildren();
      el("polyline", { points: pts(cyclePath(base)), fill: "none", stroke: "#94a3b8", "stroke-width": 1.6, "stroke-dasharray": "6 4" }, ghost);
      live.replaceChildren();
      const path = cyclePath(c);
      el("polygon", { points: pts(path), fill: "#2563eb", opacity: 0.06 }, live);
      el("polyline", { points: pts(path), fill: "none", stroke: "#1e293b", "stroke-width": 2.6, "stroke-linejoin": "round" }, live);
      marks.replaceChildren();
      [[c.h1, c.Pe, "1", 6, 16], [c.h2, c.Pc, "2", 6, -8], [c.h3, c.Pc, "3", -16, -8], [c.h4, c.Pe, "4", -16, 16]].forEach(([h, P, label, dx, dy]) => {
        el("circle", { cx: X(h), cy: Y(P), r: 4.5, fill: "#1e293b" }, marks);
        el("text", { x: X(h) + dx, y: Y(P) + dy, "font-size": 14, "font-weight": 800, fill: "#1e293b" }, marks).textContent = label;
      });
      el("text", { x: (X(c.h3) + X(c.h2)) / 2, y: Y(c.Pc) - 7, "font-size": 11, fill: "#475569", "text-anchor": "middle" }, marks).textContent = `응축 ${c.tc} ℃ · ${c.Pc.toFixed(0)} kPa`;
      el("text", { x: (X(c.h4) + X(c.h1)) / 2, y: Y(c.Pe) + 15, "font-size": 11, fill: "#475569", "text-anchor": "middle" }, marks).textContent = `증발 ${c.te} ℃ · ${c.Pe.toFixed(0)} kPa`;
      // 아래쪽 막대: 냉동효과와 압축일의 길이
      const bar = (h1, h2, y, color, label) => {
        el("line", { x1: X(h1), y1: y, x2: X(h2), y2: y, stroke: color, "stroke-width": 5, "stroke-linecap": "round" }, marks);
        el("text", { x: X(h2) + 6, y: y + 4, "font-size": 11, fill: color, "font-weight": 700 }, marks).textContent = label;
      };
      bar(c.h4, c.h1, B + 46, "#2563eb", "냉동효과");
      bar(c.h1, c.h2, B + 62, "#dc2626", "압축일");
      el("text", { x: L, y: B + 50, "font-size": 10, fill: "#64748b" }, marks).textContent = "길이 비교";
      // 수치와 기준 대비
      rows.forEach(([key, , get, unit, digits]) => {
        const now = get(c), was = get(base), diff = now - was;
        const small = Math.abs(diff) < 0.5 * Math.pow(10, -digits);
        cells[key].replaceChildren(document.createTextNode(`${now.toFixed(digits)}${unit ? ` ${unit}` : ""}`));
        const delta = html("span", { class: `ix-delta${small ? "" : diff > 0 ? " up" : " down"}` },
          small ? "기준과 같음" : `기준 ${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(digits)}`);
        cells[key].appendChild(delta);
      });
      points.textContent = `h₁ ${c.h1.toFixed(1)} · h₂ ${c.h2.toFixed(1)} · h₃ = h₄ ${c.h3.toFixed(1)} kJ/kg (R-134a, ASHRAE 기준 — −40 ℃ 포화액을 0 으로 잡은 값이라 다른 표의 숫자와 절대값이 다를 수 있지만 차이는 같다)`;
      verdict.textContent = explain(c, base);
    }
    function explain(c, b) {
      const pct = (now, was) => `${now > was ? "+" : "−"}${Math.abs(((now - was) / was) * 100).toFixed(0)} %`;
      const changed = ["te", "tc", "sc", "sh"].filter((k) => c[k] !== b[k]);
      if (!changed.length && c.useful === b.useful) return "기준과 같은 사이클입니다. 슬라이더 하나만 움직여 보면 어떤 값이 따라 변하는지 가장 잘 보입니다.";
      if (!changed.length) return "온도는 그대로이고 과열이 일어나는 곳만 바뀌었습니다. 과열도를 올려 봐야 차이가 보입니다.";
      const why = {
        te: c.te < b.te ? "증발온도가 낮아져 흡입압력이 떨어지고 흡입가스가 묽어진다(비체적 증가)" : "증발온도가 높아져 흡입압력이 오르고 흡입가스가 진해진다(비체적 감소)",
        tc: c.tc > b.tc ? "응축온도가 높아져 토출압력이 오르고 팽창 전 액의 엔탈피가 커진다" : "응축온도가 낮아져 토출압력이 내려가고 팽창 전 액의 엔탈피가 작아진다",
        sc: c.sc > b.sc ? "과냉각도가 커져 3·4 점이 왼쪽으로 옮겨 간다" : "과냉각도가 작아져 3·4 점이 오른쪽으로 옮겨 간다",
        sh: `과열도가 ${c.sh > b.sh ? "커져 1 점이 오른쪽으로" : "작아져 1 점이 왼쪽으로"} 옮겨 간다${c.useful ? "" : "(흡입관 과열이라 냉동효과에는 들어가지 않는다)"}`
      };
      const pctOrSame = (now, was) => (Math.abs(now - was) / was < 0.005 ? "거의 그대로" : pct(now, was));
      const shNote = changed.includes("sh")
        ? (c.useful
          ? " R-134a 는 증발기 안의 과열이 냉동효과와 압축일을 비슷한 비율로 늘려 COP 가 거의 그대로다. 흡입관에서 과열되면(위 선택) 냉동효과는 늘지 않고 압축일만 늘어 COP 가 떨어진다 — 교재의 '흡입 과열 → COP 감소' 가 이 경우다."
          : " 흡입관에서 받은 열은 냉동에 쓰이지 않으므로 냉동효과는 그대로인데 압축일과 비체적만 늘어 COP 와 냉동능력이 함께 떨어진다.")
        : "";
      return `${changed.map((k) => why[k]).join(", ")}. 그 결과 냉동효과 ${pctOrSame(c.qe, b.qe)}, 압축일 ${pctOrSame(c.w, b.w)}, 성적계수 ${pctOrSame(c.cop, b.cop)}, `
        + `토출온도 ${c.t2 >= b.t2 ? "+" : "−"}${Math.abs(c.t2 - b.t2).toFixed(1)} K, 체적 냉동효과 ${pctOrSame(c.qv, b.qv)}(같은 압축기의 냉동능력이 이 비율로 변한다).${shNote}`;
    }
    const note = html("p", { class: "ix-note" },
      "포화값은 R-134a 포화표(CoolProp)에서 보간하고, 과열증기는 정압비열을 일정하게 본 근사로 계산했습니다. 엔탈피 차는 실제 선도와 1 % 안팎으로 맞고, 토출온도는 몇 ℃ 다를 수 있습니다. 시험의 선도 판독 문제는 문제에 주어진 엔탈피를 그대로 쓰세요.");
    box.append(head, svg, form, dl, verdict, points, note);
    draw();
  }

  window.HVAC_INTERACTIVE = { psychro, pv, ph };
})();
