// 해설에 곁들이는 그림. 같은 계열 문항이 같은 그림을 함께 쓴다.
// src 는 engicert 페이지 기준 경로이고, 그림 파일은 이론 노트와 함께 쓰도록 study/HVAC/figures 에 둔다.
(() => {
  const condensingRise = [{
    src: "../figures/ph-condensing-rise.svg",
    alt: "응축압력이 Pc 에서 Pc′ 로 오를 때의 p-h 선도. 2′ 는 2 보다 오른쪽 위, 3′·4′ 는 오른쪽으로 옮겨 냉동효과가 줄고 압축일이 는다",
    caption: "응축온도 상승 — 증발압력 Pe 는 그대로이고 응축압력만 Pc′ 로 오른다. 4 가 4′ 로 밀려 냉동효과(h₁ − h₄)가 줄고 플래시 가스가 늘며, 압축선이 길어져 압축일과 토출가스 온도가 오른다."
  }];
  const evaporatingDrop = [{
    src: "../figures/ph-evaporating-drop.svg",
    alt: "증발압력이 Pe 에서 Pe′ 로 내려갈 때의 p-h 선도. 1′ 은 1 보다 왼쪽 아래, 2′ 는 2 보다 오른쪽이라 냉동효과가 줄고 압축일이 는다",
    caption: "증발온도 저하 — 응축압력 Pc 는 그대로이고 증발압력만 Pe′ 로 내려간다. 1 이 1′ 로 내려가 냉동효과가 줄고, 압축 구간이 길어져 압축일과 토출가스 온도가 오른다. 선도에는 보이지 않지만 흡입가스 비체적이 커져 냉매순환량도 준다."
  }];
  const rows = {};
  [
    "HVAC-20040523-023", "HVAC-20060305-031", "HVAC-20090510-021", "HVAC-20100509-021",
    "HVAC-20140302-033", "HVAC-20150816-040", "HVAC-20170305-032", "HVAC-20170826-038",
    "HVAC-20180304-029", "HVAC-20190427-025", "HVAC-20210515-030"
  ].forEach((id) => { rows[id] = condensingRise; });
  [
    "HVAC-20040523-021", "HVAC-20090301-038", "HVAC-20090726-025", "HVAC-20100509-037",
    "HVAC-20130310-029", "HVAC-20150308-021", "HVAC-20160306-037"
  ].forEach((id) => { rows[id] = evaporatingDrop; });
  window.addHVACExplanationFigures(rows);
})();
