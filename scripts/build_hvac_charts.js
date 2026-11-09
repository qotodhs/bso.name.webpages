// 이론 노트용 선도 SVG 생성기 — 습공기선도 2, p-h, P-v, T-s, 오토·디젤 P-v, 랭킨 T-s
// node scripts/build_hvac_charts.js  →  study/HVAC/figures/*.svg 를 다시 쓴다
// 습공기선도는 실제 식(포화수증기압 근사, x = 0.622φPs/(P − φPs), h = 1.006t + x(2501 + 1.86t))으로 그리고,
// p-h·T-s 돔과 사이클은 냉매·물성값 없이 모양만 맞춘 개략도다.
const fs = require("fs");
const OUT = require("path").join(__dirname, "..", "study", "HVAC", "figures") + "/";
const FONT = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
const C = { ink: "#1e293b", mute: "#64748b", grid: "#cbd5e1", light: "#e2e8f0", red: "#dc2626", blue: "#2563eb", teal: "#0f766e", amber: "#b45309", violet: "#7c3aed", green: "#15803d" };
const f1 = (n) => Math.round(n * 10) / 10;

function svg(w, h, title, body) {
  const marker = (id, color) => `<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" fill="${color}"/></marker>`;
  const defs = Object.entries(C).map(([k, v]) => marker(`m-${k}`, v)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">
<title>${title}</title>
<defs>${defs}</defs>
<rect width="${w}" height="${h}" fill="#ffffff"/>
${body}
</svg>
`;
}
const line = (x1, y1, x2, y2, color = C.ink, width = 1.4, extra = "") =>
  `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const arrow = (x1, y1, x2, y2, color = "ink", width = 2) =>
  line(x1, y1, x2, y2, C[color], width, `marker-end="url(#m-${color})"`);
const poly = (pts, color = C.ink, width = 2, extra = "") =>
  `<polyline points="${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" ${extra}/>`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, { size = 13, color = C.ink, anchor = "start", weight = 400 } = {}) =>
  `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;
const dot = (x, y, color = C.ink, r = 4) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${color}"/>`;
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
// 곡선 위의 중간점에 진행 방향 화살촉
const midArrow = (pts, color) => {
  const i = Math.floor(pts.length / 2);
  const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
  return `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${C[color]}" stroke-width="2" marker-end="url(#m-${color})"/>`;
};

// ───────────────────────── 습공기 물성
const P = 101.325;
const ps = (t) => 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
const xOf = (t, phi) => (0.622 * phi * ps(t)) / (P - phi * ps(t));
const hOf = (t, x) => 1.006 * t + x * (2501 + 1.86 * t);
const xOnH = (h, t) => (h - 1.006 * t) / (2501 + 1.86 * t);
const solve = (f, a, b) => { for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; } return (a + b) / 2; };

function psychroFrame({ W, H, L, R, T, B, tMax, xMax, rh = [0.2, 0.4, 0.6, 0.8], hs = [], labels = true }) {
  const X = (t) => L + ((R - L) * t) / tMax;
  const Y = (x) => B - ((B - T) * x) / xMax;
  const out = [];
  // 엔탈피선(가는 점선)
  hs.forEach((h) => {
    const tSat = solve((t) => xOf(t, 1) - xOnH(h, t), -10, 60);
    const t0 = Math.min(h / 1.006, tMax);
    const pts = range(Math.max(tSat, 0), t0, 30).filter((t) => xOnH(h, t) <= xMax).map((t) => [X(t), Y(Math.max(0, xOnH(h, t)))]);
    out.push(poly(pts, C.amber, 1, 'stroke-dasharray="4 4" opacity="0.7"'));
    if (labels) { const [lx, ly] = pts[0]; out.push(text(lx - 6, ly - 6, `${h}`, { size: 11, color: C.amber, anchor: "end" })); }
  });
  // 상대습도 곡선
  rh.forEach((phi) => {
    const pts = range(0, tMax, 80).map((t) => [X(t), Y(xOf(t, phi))]).filter(([, y]) => y >= T);
    out.push(poly(pts, C.grid, 1.2));
    if (labels) { const [lx, ly] = pts[pts.length - 1]; out.push(text(lx + 4, ly + 4, `${phi * 100}%`, { size: 11, color: C.mute })); }
  });
  // 포화곡선
  const sat = range(0, tMax, 120).map((t) => [X(t), Y(xOf(t, 1))]).filter(([, y]) => y >= T);
  out.push(poly(sat, C.blue, 2.4));
  // 축(오른쪽이 절대습도)
  out.push(line(L, B, R, B, C.ink, 1.4), line(R, B, R, T - 6, C.ink, 1.4, 'marker-end="url(#m-ink)"'));
  return { X, Y, out, sat };
}

// 1. 습공기선도 읽는 법
{
  const W = 680, H = 470, L = 50, R = 590, T = 40, B = 410, tMax = 40, xMax = 0.026;
  const { X, Y, out, sat } = psychroFrame({ W, H, L, R, T, B, tMax, xMax, hs: [10, 30, 60, 80, 100] });
  const tP = 26, phiP = 0.5, xP = xOf(tP, phiP), hP = hOf(tP, xP);
  const tDew = solve((t) => xOf(t, 1) - xP, -10, 40);
  const tWb = solve((t) => xOf(t, 1) - xOnH(hP, t), -10, 40);
  const b = [];
  // 눈금
  [0, 10, 20, 30, 40].forEach((t) => { b.push(line(X(t), B, X(t), B + 5), text(X(t), B + 20, t, { size: 11, color: C.mute, anchor: "middle" })); });
  [0, 0.005, 0.01, 0.015, 0.02, 0.025].forEach((x) => { b.push(line(R, Y(x), R + 5, Y(x)), text(R + 9, Y(x) + 4, x.toFixed(3), { size: 11, color: C.mute })); });
  b.push(text((L + R) / 2, B + 42, "건구온도 t [℃]", { size: 13, anchor: "middle", weight: 600 }));
  b.push(text(R + 8, T - 14, "절대습도 x [kg/kg′]", { size: 13, anchor: "end", weight: 600 }));
  // 상태점 P 에서 읽는 선
  const dash = 'stroke-dasharray="5 4"';
  b.push(line(X(tP), Y(xP), X(tP), B, C.red, 1.4, dash));
  b.push(line(X(tP), Y(xP), R, Y(xP), C.teal, 1.4, dash));
  b.push(line(X(tP), Y(xP), X(tDew), Y(xP), C.violet, 1.6));
  const wb = range(tWb, tP, 20).map((t) => [X(t), Y(xOnH(hP, t))]);
  b.push(poly(wb, C.amber, 2));
  b.push(dot(X(tDew), Y(xP), C.violet), dot(X(tWb), Y(xOf(tWb, 1)), C.amber), dot(X(tP), Y(xP), C.red, 5));
  // 상대습도 50 % 곡선 강조
  const rh50 = range(12, 36, 40).map((t) => [X(t), Y(xOf(t, 0.5))]);
  b.push(poly(rh50, C.green, 1.8));
  // 라벨
  b.push(text(X(tP) + 8, Y(xP) + 18, `상태점 (${tP} ℃, φ 50 %)`, { size: 12, color: C.red, weight: 700 }));
  b.push(text(X(tP) + 4, B - 8, `건구온도 ${tP} ℃`, { size: 11, color: C.red }));
  b.push(text(R - 6, Y(xP) - 6, `절대습도 ${xP.toFixed(4)}`, { size: 11, color: C.teal, anchor: "end" }));
  b.push(text(X(tDew) - 14, Y(xP) + 4, `노점온도 ${tDew.toFixed(1)} ℃`, { size: 12, color: C.violet, anchor: "end", weight: 700 }));
  b.push(text(X(tDew) - 14, Y(xP) + 19, "(수평으로 포화곡선까지)", { size: 11, color: C.violet, anchor: "end" }));
  b.push(text(X(tWb) - 8, Y(xOf(tWb, 1)) - 8, `습구온도 ${tWb.toFixed(1)} ℃ · 엔탈피 ${hP.toFixed(0)} kJ/kg`, { size: 12, color: C.amber, anchor: "end", weight: 700 }));
  b.push(text(X(tWb) - 8, Y(xOf(tWb, 1)) + 7, "(엔탈피선을 따라 포화곡선까지)", { size: 11, color: C.amber, anchor: "end" }));
  b.push(text(X(12) + 4, Y(xOf(12, 0.5)) + 18, "상대습도 50 % 곡선", { size: 11, color: C.green, weight: 700 }));
  const [sx, sy] = sat[Math.floor(sat.length * 0.86)];
  b.push(text(sx - 10, sy, "포화곡선 (φ 100 %)", { size: 12, color: C.blue, anchor: "end", weight: 700 }));
  b.push(text(L + 4, T + 6, "점선 = 엔탈피 [kJ/kg]", { size: 11, color: C.amber }));
  fs.writeFileSync(OUT + "psychro-chart-reading.svg", svg(W, H, "습공기선도 읽는 법", out.concat(b).join("\n")));
  console.log("psychro-chart-reading", { xP: xP.toFixed(4), hP: hP.toFixed(1), tDew: tDew.toFixed(1), tWb: tWb.toFixed(1) });
}

// 2. 습공기선도의 상태변화 8방향
{
  const W = 680, H = 470, L = 50, R = 590, T = 40, B = 410, tMax = 40, xMax = 0.026;
  const { X, Y, out } = psychroFrame({ W, H, L, R, T, B, tMax, xMax, rh: [0.3, 0.6], hs: [], labels: false });
  const t0 = 29, x0 = 0.0085, h0 = hOf(t0, x0);
  const cx = X(t0), cy = Y(x0), r = 88;
  const b = [];
  b.push(text((L + R) / 2, B + 30, "건구온도 t", { size: 13, anchor: "middle", weight: 600 }));
  b.push(text(R + 8, T - 14, "절대습도 x", { size: 13, anchor: "end", weight: 600 }));
  // 단열가습 방향 = 엔탈피(습구온도) 일정선
  const tA = t0 - 9, xA = xOnH(h0, tA);
  const ang = Math.atan2(Y(xA) - cy, X(tA) - cx);
  const dirs = [
    [0, "가열 (현열)", C.red, "red", 0, -8],
    [180, "냉각 (현열)", C.blue, "blue", 0, -8],
    [-90, "가습", C.teal, "teal", 0, -8],
    [90, "감습", C.amber, "amber", 0, 18],
    [-40, "가열가습", C.red, "red", 6, -4],
    [140, "냉각감습 (냉각코일)", C.blue, "blue", -6, 16],
    [40, "가열감습", C.amber, "amber", 0, 4]
  ];
  {
    const a = (40 * Math.PI) / 180;
    b.push(text(cx + r * Math.cos(a) + 6, cy + r * Math.sin(a) + 19, "(화학적 감습)", { size: 11, color: C.amber }));
  }
  dirs.forEach(([deg, label, color, key, dx, dy]) => {
    const a = (deg * Math.PI) / 180, ex = cx + r * Math.cos(a), ey = cy + r * Math.sin(a);
    b.push(arrow(cx, cy, ex, ey, key, 2.2));
    const anchor = Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle";
    b.push(text(ex + (anchor === "start" ? 6 : anchor === "end" ? -6 : 0) + dx, ey + dy, label, { size: 12, color, anchor, weight: 700 }));
  });
  // 단열가습(냉각가습)
  const ex = cx + r * 1.15 * Math.cos(ang), ey = cy + r * 1.15 * Math.sin(ang);
  b.push(arrow(cx, cy, ex, ey, "violet", 2.2));
  b.push(text(ex - 6, ey - 20, "냉각가습 = 단열가습", { size: 12, color: C.violet, anchor: "end", weight: 700 }));
  b.push(text(ex - 6, ey - 5, "(순환수 분무, 엔탈피·습구온도 일정)", { size: 11, color: C.violet, anchor: "end" }));
  b.push(dot(cx, cy, C.ink, 5));
  b.push(text(L + 6, T + 10, "가로 = 온도만 변함(현열) · 세로 = 수분만 변함(잠열)", { size: 12, color: C.mute }));
  b.push(text(L + 6, T + 28, "냉각은 포화곡선(노점)에 닿으면 수평으로 더 못 가고 감습이 시작된다", { size: 12, color: C.mute }));
  fs.writeFileSync(OUT + "psychro-processes.svg", svg(W, H, "습공기선도의 상태변화", out.concat(b).join("\n")));
}

// 3. p-h 선도 읽는 법(냉동사이클)
{
  const W = 680, H = 460, L = 70, R = 620, T = 40, B = 400;
  // 정규화 좌표(u: 0~1 가로=엔탈피, v: 0~1 세로=압력 위쪽 1)
  const X = (u) => L + (R - L) * u, Y = (v) => B - (B - T) * v;
  const crit = [0.47, 0.92];
  const liq = (v) => crit[0] - 0.36 * Math.pow((crit[1] - v) / crit[1], 0.55);
  const vap = (v) => crit[0] + 0.30 * Math.pow((crit[1] - v) / crit[1], 0.45);
  const vs = range(0.02, crit[1], 60);
  const out = [];
  // 습증기 영역 채우기
  const domePts = vs.map((v) => [X(liq(v)), Y(v)]).concat(vs.slice().reverse().map((v) => [X(vap(v)), Y(v)]));
  out.push(`<polygon points="${domePts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")}" fill="#eff6ff"/>`);
  // 건도선
  [0.2, 0.4, 0.6, 0.8].forEach((q) => out.push(poly(range(0.05, crit[1] - 0.02, 30).map((v) => [X(liq(v) + q * (vap(v) - liq(v))), Y(v)]), C.grid, 1, 'stroke-dasharray="3 4"')));
  out.push(poly(vs.map((v) => [X(liq(v)), Y(v)]), C.blue, 2.4), poly(vs.map((v) => [X(vap(v)), Y(v)]), C.blue, 2.4));
  out.push(dot(X(crit[0]), Y(crit[1]), C.blue, 4), text(X(crit[0]), Y(crit[1]) - 10, "임계점", { size: 12, color: C.blue, anchor: "middle", weight: 700 }));
  out.push(line(L, B, R + 10, B, C.ink, 1.4, 'marker-end="url(#m-ink)"'), line(L, B, L, T - 10, C.ink, 1.4, 'marker-end="url(#m-ink)"'));
  out.push(text(R + 6, B + 22, "엔탈피 h [kJ/kg]", { size: 13, anchor: "end", weight: 600 }));
  out.push(text(L + 8, T - 14, "압력 P (로그 눈금)", { size: 13, weight: 600 }));
  // 영역 라벨
  out.push(text(X(0.06), Y(0.62), "과냉각액", { size: 13, color: C.mute, weight: 700 }));
  out.push(text(X(0.44), Y(0.12), "습증기 (포화액 + 포화증기)", { size: 12, color: C.mute, anchor: "middle", weight: 700 }));
  out.push(text(X(0.86), Y(0.14), "과열증기", { size: 13, color: C.mute, weight: 700 }));
  out.push(text(X(liq(0.15)) - 6, Y(0.15), "포화액선", { size: 11, color: C.blue, anchor: "end" }));
  out.push(text(X(vap(0.12)) + 6, Y(0.12), "포화증기선", { size: 11, color: C.blue }));
  // 사이클
  const vE = 0.28, vC = 0.68;
  const p1 = [vap(vE), vE], p3 = [liq(vC), vC], p4 = [liq(vC), vE];
  const p2 = [vap(vE) + 0.17, vC];
  const comp = range(0, 1, 20).map((s) => [X(p1[0] + (p2[0] - p1[0]) * Math.pow(s, 1.25)), Y(vE + (vC - vE) * s)]);
  const cond = [[X(p2[0]), Y(vC)], [X(p3[0]), Y(vC)]];
  const exp = [[X(p3[0]), Y(vC)], [X(p4[0]), Y(vE)]];
  const evap = [[X(p4[0]), Y(vE)], [X(p1[0]), Y(vE)]];
  out.push(poly(comp, C.red, 2.6), midArrow(comp, "red"));
  out.push(poly(cond, C.red, 2.6), midArrow(range(0, 1, 10).map((s) => [cond[0][0] + (cond[1][0] - cond[0][0]) * s, cond[0][1]]), "red"));
  out.push(poly(exp, C.red, 2.6), midArrow(range(0, 1, 10).map((s) => [exp[0][0], exp[0][1] + (exp[1][1] - exp[0][1]) * s]), "red"));
  out.push(poly(evap, C.red, 2.6), midArrow(range(0, 1, 10).map((s) => [evap[0][0] + (evap[1][0] - evap[0][0]) * s, evap[0][1]]), "red"));
  [[p1, "1", 8, 16], [[p2[0], vC], "2", 8, -6], [p3, "3", -16, -6], [p4, "4", -16, 16]].forEach(([[u, v], n, dx, dy]) => out.push(dot(X(u), Y(v), C.red, 4.5), text(X(u) + dx, Y(v) + dy, n, { size: 15, color: C.red, weight: 800 })));
  out.push(text((X(p3[0]) + X(p2[0])) / 2, Y(vC) - 10, "응축기 (등압 · 3 은 포화액)", { size: 12, color: C.red, anchor: "middle", weight: 700 }));
  out.push(text((X(p4[0]) + X(p1[0])) / 2, Y(vE) - 10, "증발기 (등압 · 등온)", { size: 12, color: C.red, anchor: "middle", weight: 700 }));
  out.push(text(X(p3[0]) + 8, Y((vE + vC) / 2), "팽창밸브", { size: 12, color: C.red, weight: 700 }));
  out.push(text(X(p3[0]) + 8, Y((vE + vC) / 2) + 15, "(등엔탈피 = 수직선)", { size: 11, color: C.red }));
  out.push(text(X(p2[0]) + 8, Y((vE + vC) / 2), "압축기", { size: 12, color: C.red, weight: 700 }));
  out.push(text(X(p2[0]) + 8, Y((vE + vC) / 2) + 15, "(등엔트로피)", { size: 11, color: C.red }));
  // 엔탈피 구간 표시(아래)
  const yb = B + 46;
  const seg = (u1, u2, y, label, color) => [line(X(u1), y, X(u2), y, color, 1.6, `marker-start="url(#m-${Object.keys(C).find((k) => C[k] === color)})" marker-end="url(#m-${Object.keys(C).find((k) => C[k] === color)})"`), text((X(u1) + X(u2)) / 2, y - 6, label, { size: 12, color, anchor: "middle", weight: 700 })];
  [p4[0], p1[0], p2[0]].forEach((u) => out.push(line(X(u), Y(vE), X(u), yb + 34, C.grid, 1, 'stroke-dasharray="3 3"')));
  out.push(...seg(p4[0], p1[0], yb, "냉동효과 h₁ − h₄", C.teal));
  out.push(...seg(p1[0], p2[0], yb, "압축일 h₂ − h₁", C.amber));
  out.push(...seg(p4[0], p2[0], yb + 30, "응축열 h₂ − h₃ (= 냉동효과 + 압축일)", C.violet));
  fs.writeFileSync(OUT + "ph-diagram-reading.svg", svg(W, H + 80, "p-h 선도와 냉동사이클", out.join("\n")));
}

// 4. P-v 선도: 폴리트로픽 지수별 과정
{
  const W = 640, H = 440, L = 60, R = 580, T = 40, B = 390;
  const vMin = 0.35, vMax = 3.2, pMax = 3.2;
  const X = (v) => L + ((R - L) * (v - 0)) / vMax, Y = (p) => B - ((B - T) * p) / pMax;
  const v0 = 1.2, p0 = 1.2;
  const out = [];
  out.push(line(L, B, R + 10, B, C.ink, 1.4, 'marker-end="url(#m-ink)"'), line(L, B, L, T - 10, C.ink, 1.4, 'marker-end="url(#m-ink)"'));
  out.push(text(R + 6, B + 22, "비체적 v", { size: 13, anchor: "end", weight: 600 }), text(L + 8, T - 14, "압력 P", { size: 13, weight: 600 }));
  // 등온 팽창 아래 면적 = 일
  const iso = range(v0, 2.6, 40).map((v) => [X(v), Y((p0 * v0) / v)]);
  out.push(`<polygon points="${[[X(v0), Y(0)], ...iso, [X(2.6), Y(0)]].map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")}" fill="#fef3c7"/>`);
  out.push(text(X(1.9), Y(0.1), "면적 = 절대일 W = ∫P dv", { size: 12, color: C.amber, anchor: "middle", weight: 700 }));
  const curve = (n) => range(vMin, vMax - 0.1, 80).map((v) => [X(v), Y(p0 * Math.pow(v0 / v, n))]).filter(([, y]) => y >= T && y <= B);
  const items = [
    [0, "정압 n = 0 (수평)", C.red, ""],
    [1, "등온 n = 1 (Pv = 일정)", C.teal, ""],
    [1.2, "폴리트로픽 1 < n < k", C.violet, 'stroke-dasharray="6 4"'],
    [1.4, "단열 n = k (가장 가파른 곡선)", C.blue, ""]
  ];
  items.forEach(([n, , color, extra]) => out.push(poly(curve(n), color, n === 1.2 ? 1.6 : 2.4, extra)));
  out.push(line(X(v0), T + 10, X(v0), B, C.amber, 2.4));
  out.push(dot(X(v0), Y(p0), C.ink, 5));
  // 범례
  const lx = X(1.6), ly = T + 6;
  out.push(`<rect x="${f1(lx - 10)}" y="${f1(ly - 4)}" width="250" height="132" rx="8" fill="#ffffff" stroke="${C.light}"/>`);
  items.concat([[Infinity, "정적 n = ∞ (수직)", C.amber, ""]]).forEach(([, label, color, extra], i) => {
    const y = ly + 14 + i * 22;
    out.push(line(lx, y, lx + 30, y, color, 2.4, extra), text(lx + 40, y + 4, label, { size: 12, color, weight: 700 }));
  });
  out.push(text(lx - 10, ly + 152, "같은 점에서 출발하면 n 이 클수록 가파르다.", { size: 12, color: C.mute }));
  out.push(text(lx - 10, ly + 170, "단열이 등온보다 가파른 것은 k > 1 이기 때문.", { size: 12, color: C.mute }));
  fs.writeFileSync(OUT + "pv-processes.svg", svg(W, H + 20, "P-v 선도의 과정", out.join("\n")));
}

// 5. T-s 선도: 과정별 선의 모양
{
  const W = 640, H = 440, L = 60, R = 580, T = 40, B = 390;
  const cp = 1.005, cv = 0.718, s0 = 0, T0 = 400;
  const sMin = -0.7, sMax = 0.75, TMin = 150, TMax = 1100;
  const X = (s) => L + ((R - L) * (s - sMin)) / (sMax - sMin), Y = (t) => B - ((B - T) * (t - TMin)) / (TMax - TMin);
  const out = [];
  const tp = range(s0, 0.6, 40).map((s) => [X(s), Y(T0 * Math.exp((s - s0) / cp))]);
  out.push(`<polygon points="${[[X(s0), B], ...tp, [X(0.6), B]].map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")}" fill="#fee2e2" opacity="0.8"/>`);
  out.push(text(X(0.3), B - 12, "면적 = 열량 q = ∫T ds", { size: 12, color: C.red, anchor: "middle", weight: 700 }));
  out.push(line(L, B, R + 10, B, C.ink, 1.4, 'marker-end="url(#m-ink)"'), line(L, B, L, T - 10, C.ink, 1.4, 'marker-end="url(#m-ink)"'));
  out.push(text(R + 6, B + 22, "엔트로피 s", { size: 13, anchor: "end", weight: 600 }), text(L + 8, T - 14, "절대온도 T", { size: 13, weight: 600 }));
  const curve = (c) => range(sMin, sMax, 80).map((s) => [X(s), Y(T0 * Math.exp((s - s0) / c))]).filter(([, y]) => y >= T && y <= B);
  out.push(poly(curve(cp), C.red, 2.4), poly(curve(cv), C.amber, 2.4));
  out.push(line(X(sMin), Y(T0), X(sMax), Y(T0), C.teal, 2.4), line(X(s0), T + 10, X(s0), B, C.blue, 2.4));
  out.push(dot(X(s0), Y(T0), C.ink, 5));
  out.push(text(X(0.68), Y(T0 * Math.exp(0.68 / cp)) + 18, "정압", { size: 13, color: C.red, anchor: "middle", weight: 700 }));
  out.push(text(X(0.44), Y(T0 * Math.exp(0.44 / cv)) - 2, "정적", { size: 13, color: C.amber, anchor: "end", weight: 700 }));
  out.push(text(X(sMin) + 4, Y(T0) - 8, "등온 (수평)", { size: 13, color: C.teal, weight: 700 }));
  out.push(text(X(s0) + 8, T + 22, "가역단열 = 등엔트로피 (수직)", { size: 13, color: C.blue, weight: 700 }));
  out.push(text(X(-0.66), Y(1040), "정적선이 정압선보다 가파르다 (c", { size: 12, color: C.mute }));
  out.push(text(X(-0.66), Y(990), "T-s 기울기 = T / c, c", { size: 12, color: C.mute }));
  // 아래첨자는 tspan 으로
  out[out.length - 2] = `<text x="${f1(X(-0.66))}" y="${f1(Y(1040))}" font-size="12" fill="${C.mute}">정적선이 정압선보다 가파르다 (c<tspan font-size="9" dy="3">v</tspan><tspan dy="-3"> &lt; c</tspan><tspan font-size="9" dy="3">p</tspan><tspan dy="-3">)</tspan></text>`;
  out[out.length - 1] = `<text x="${f1(X(-0.66))}" y="${f1(Y(990))}" font-size="12" fill="${C.mute}">T-s 기울기 = T / c 라 비열이 작을수록 가파르다</text>`;
  fs.writeFileSync(OUT + "ts-processes.svg", svg(W, H + 20, "T-s 선도의 과정", out.join("\n")));
}

// 6. 오토·디젤 사이클 P-v
{
  const W = 700, H = 380, k = 1.3; // 모양이 잘 보이도록 지수·압축비를 줄인 개략도
  const panel = (ox, title, kind) => {
    const L = ox + 40, R = ox + 320, T = 60, B = 320, vMax = 9, pMax = 46;
    const X = (v) => L + ((R - L) * v) / vMax, Y = (p) => B - ((B - T) * p) / pMax;
    const o = [];
    o.push(text((L + R) / 2, 28, title, { size: 15, anchor: "middle", weight: 800 }));
    o.push(line(L, B, R + 6, B, C.ink, 1.3, 'marker-end="url(#m-ink)"'), line(L, B, L, T - 8, C.ink, 1.3, 'marker-end="url(#m-ink)"'));
    o.push(text(R + 2, B + 20, "V", { size: 13, anchor: "end", weight: 600 }), text(L + 6, T - 10, "P", { size: 13, weight: 600 }));
    const v1 = 8, p1 = 3;
    const r = kind === "otto" ? 4 : 6;
    const v2 = v1 / r, p2 = p1 * Math.pow(r, k);
    let v3, p3;
    if (kind === "otto") { v3 = v2; p3 = 40; } else { v3 = 2.5 * v2; p3 = p2; }
    const p4 = p3 * Math.pow(v3 / v1, k);
    const c12 = range(v1, v2, 40).map((v) => [X(v), Y(p1 * Math.pow(v1 / v, k))]);
    const c34 = range(v3, v1, 40).map((v) => [X(v), Y(p3 * Math.pow(v3 / v, k))]);
    o.push(poly(c12, C.blue, 2.4), midArrow(c12, "blue"));
    const heat = [[X(v2), Y(p2)], [X(v3), Y(p3)]];
    o.push(poly(heat, C.red, 2.6), midArrow(range(0, 1, 10).map((s) => [heat[0][0] + (heat[1][0] - heat[0][0]) * s, heat[0][1] + (heat[1][1] - heat[0][1]) * s]), "red"));
    o.push(poly(c34, C.blue, 2.4), midArrow(c34, "blue"));
    const rej = [[X(v1), Y(p4)], [X(v1), Y(p1)]];
    o.push(poly(rej, C.teal, 2.6), midArrow(range(0, 1, 10).map((s) => [rej[0][0], rej[0][1] + (rej[1][1] - rej[0][1]) * s]), "teal"));
    [[v1, p1, "1", 8, 16], [v2, p2, "2", -16, 6], [v3, p3, "3", 8, -6], [v1, p4, "4", 8, -4]].forEach(([v, p, n, dx, dy]) => o.push(dot(X(v), Y(p), C.ink, 4), text(X(v) + dx, Y(p) + dy, n, { size: 14, weight: 800 })));
    o.push(text(X(4.6), Y(p1 * Math.pow(v1 / 4.6, k)) + 20, "단열압축", { size: 12, color: C.blue, anchor: "middle", weight: 700 }));
    o.push(text(X(4.8), Y(p3 * Math.pow(v3 / 4.8, k)) - 10, "단열팽창", { size: 12, color: C.blue, anchor: "start", weight: 700 }));
    o.push(text(X(v1) - 8, Y((p1 + p4) / 2) + 4, "정적방열", { size: 12, color: C.teal, anchor: "end", weight: 700 }));
    if (kind === "otto") o.push(text(X(v2) + 8, Y((p2 + p3) / 2), "정적가열", { size: 12, color: C.red, weight: 700 }));
    else o.push(text((X(v2) + X(v3)) / 2, Y(p3) - 14, "정압가열", { size: 12, color: C.red, anchor: "middle", weight: 700 }));
    return o;
  };
  const body = [
    ...panel(0, "오토 사이클 (가솔린)", "otto"),
    ...panel(350, "디젤 사이클", "diesel"),
    text(350, 356, "다른 것은 가열 과정 하나 — 오토는 수직선(정적), 디젤은 수평선(정압). 곡선은 단열, 오른쪽 수직선은 정적방열", { size: 12, color: C.mute, anchor: "middle" }),
    text(350, 374, "모양이 잘 보이도록 압축비를 줄여 그린 개략도", { size: 11, color: C.mute, anchor: "middle" })
  ];
  fs.writeFileSync(OUT + "otto-diesel-pv.svg", svg(W, H, "오토·디젤 사이클의 P-V 선도", body.join("\n")));
}

// 7. 랭킨 사이클 T-s
{
  const W = 640, H = 440, L = 60, R = 580, T = 40, B = 390;
  const X = (u) => L + (R - L) * u, Y = (v) => B - (B - T) * v;
  const crit = [0.45, 0.8];
  const liq = (v) => 0.08 + (crit[0] - 0.08) * Math.pow(v / crit[1], 1.6);
  const vap = (v) => crit[0] + (0.9 - crit[0]) * Math.pow((crit[1] - v) / crit[1], 0.75);
  const vs = range(0.02, crit[1], 60);
  const out = [];
  const domePts = vs.map((v) => [X(liq(v)), Y(v)]).concat(vs.slice().reverse().map((v) => [X(vap(v)), Y(v)]));
  out.push(`<polygon points="${domePts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")}" fill="#eff6ff"/>`);
  out.push(poly(vs.map((v) => [X(liq(v)), Y(v)]), C.blue, 2.2), poly(vs.map((v) => [X(vap(v)), Y(v)]), C.blue, 2.2));
  out.push(line(L, B, R + 10, B, C.ink, 1.4, 'marker-end="url(#m-ink)"'), line(L, B, L, T - 10, C.ink, 1.4, 'marker-end="url(#m-ink)"'));
  out.push(text(R + 6, B + 22, "엔트로피 s", { size: 13, anchor: "end", weight: 600 }), text(L + 8, T - 14, "온도 T", { size: 13, weight: 600 }));
  const vLo = 0.12, vHi = 0.55;
  const p1 = [liq(vLo), vLo], p2 = [liq(vLo) + 0.004, vLo + 0.03];
  const a = [liq(vHi), vHi], bpt = [vap(vHi), vHi], p3 = [vap(vHi) + 0.08, 0.86];
  const heat1 = range(0, 1, 20).map((s) => { const v = p2[1] + (vHi - p2[1]) * s; return [X(liq(v) + 0.004 * (1 - s)), Y(v)]; });
  const sup = range(0, 1, 20).map((s) => [X(bpt[0] + (p3[0] - bpt[0]) * s), Y(vHi + (p3[1] - vHi) * Math.pow(s, 1.5))]);
  const p4 = [p3[0], vLo];
  out.push(poly([[X(p1[0]), Y(p1[1])], [X(p2[0]), Y(p2[1])]], C.amber, 2.6));
  out.push(poly(heat1, C.red, 2.6), poly([[X(a[0]), Y(vHi)], [X(bpt[0]), Y(vHi)]], C.red, 2.6), midArrow(range(0, 1, 10).map((s) => [X(a[0] + (bpt[0] - a[0]) * s), Y(vHi)]), "red"), poly(sup, C.red, 2.6));
  const exp = [[X(p3[0]), Y(p3[1])], [X(p4[0]), Y(p4[1])]];
  out.push(poly(exp, C.violet, 2.6), midArrow(range(0, 1, 10).map((s) => [exp[0][0], exp[0][1] + (exp[1][1] - exp[0][1]) * s]), "violet"));
  const cond = [[X(p4[0]), Y(vLo)], [X(p1[0]), Y(vLo)]];
  out.push(poly(cond, C.teal, 2.6), midArrow(range(0, 1, 10).map((s) => [cond[0][0] + (cond[1][0] - cond[0][0]) * s, cond[0][1]]), "teal"));
  [[p1, "1", -16, 14], [p2, "2", -16, -4], [p3, "3", 8, -4], [p4, "4", 8, 16]].forEach(([[u, v], n, dx, dy]) => out.push(dot(X(u), Y(v), C.ink, 4.5), text(X(u) + dx, Y(v) + dy, n, { size: 15, weight: 800 })));
  out.push(text(X(p2[0]) - 18, Y(p2[1]) - 16, "펌프", { size: 12, color: C.amber, anchor: "end", weight: 700 }));
  out.push(text(X(0.03), Y(0.92), "펌프(1→2)는 물을 압축하는 단열과정이라 거의 한 점으로 겹친다", { size: 12, color: C.amber }));
  out.push(text(X((a[0] + bpt[0]) / 2), Y(vHi) - 10, "보일러 (정압가열 · 증발)", { size: 12, color: C.red, anchor: "middle", weight: 700 }));
  out.push(text(X(p3[0]) + 8, Y(p3[1]) + 20, "과열기", { size: 12, color: C.red, weight: 700 }));
  out.push(text(X(p3[0]) + 8, Y((p3[1] + vLo) / 2), "터빈", { size: 12, color: C.violet, weight: 700 }));
  out.push(text(X(p3[0]) + 8, Y((p3[1] + vLo) / 2) + 15, "(단열팽창 = 수직선)", { size: 11, color: C.violet }));
  out.push(text(X((p1[0] + p4[0]) / 2), Y(vLo) + 20, "복수기 (정압방열 · 응축)", { size: 12, color: C.teal, anchor: "middle", weight: 700 }));
  out.push(text(X(0.03), Y(0.96), "1 복수기 출구 포화액 → 2 보일러 입구 → 3 터빈 입구 → 4 터빈 출구(습증기)", { size: 12, color: C.mute }));
  fs.writeFileSync(OUT + "rankine-ts.svg", svg(W, H + 20, "랭킨 사이클의 T-s 선도", out.join("\n")));
}
console.log("done");
