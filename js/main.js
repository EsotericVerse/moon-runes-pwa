function getLunarPhase(day) {
  if (day >= 1 && day <= 7) return "新月";
  if (day >= 8 && day <= 14) return "上弦";
  if (day >= 15 && day <= 21) return "滿月";
  if (day >= 22 && day <= 28) return "下弦";
   if (day >= 29 && day <= 30) return "空亡";
  return "未知";
}

function detectRealPhase() {
  const today = new Date();
  const solarYear = today.getFullYear();
  const solarMonth = today.getMonth() + 1;
  const solarDay = today.getDate();
  const lunarInfo = solarlunar.solar2lunar(solarYear, solarMonth, solarDay);
  const lunarDay = lunarInfo.lDay;
  return getLunarPhase(lunarDay);
}

const realPhase = detectRealPhase();
sessionStorage.setItem("realPhase", realPhase);

window.addEventListener("DOMContentLoaded", () => {
  const image = document.getElementById("rune-image");
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) {
    moonText.textContent = `月相：無 / 真實月相：${realPhase}`;
  }

  // 點擊事件：跳轉到占卜結果頁面
  card.addEventListener("click", () => {
    window.location.href = "result.html"; // 當前頁面跳轉到 result.html
  });
});
