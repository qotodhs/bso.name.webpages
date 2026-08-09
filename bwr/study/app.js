const computerKnown = JSON.parse(localStorage.getItem("bwr-computer-known-v1") || "[]").length;
const englishKnown = JSON.parse(localStorage.getItem("bwr-english-known-v1") || "[]").length;

document.querySelectorAll(".track-card").forEach((card) => {
  const isComputer = card.classList.contains("track-computer");
  const count = isComputer ? computerKnown : englishKnown;
  if (!count) return;
  const badge = document.createElement("span");
  badge.className = "progress-badge";
  badge.textContent = `${count}개 학습 완료`;
  card.querySelector(".track-label").append(badge);
});
