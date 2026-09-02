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
  const card = document.getElementById("rune-card");
  const moonText = document.getElementById("moon-phase-index");

  if (moonText) {
    moonText.textContent = `月相：無 / 真實月相：${realPhase}`;
  }

  if (card) {
    card.addEventListener("click", () => {
      window.location.href = "result.html";
    });
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        new URL("service-worker.js", document.baseURI)
      );
      console.info("Service Worker registered:", registration.scope);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}
