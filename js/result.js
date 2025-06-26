window.addEventListener("load", async () => {
  const img = document.getElementById("result-image");
  const description = document.getElementById("description");
  const moonText = document.getElementById("moon-phase");

  // 假設選擇的符文是 "命"
  img.src = "64images/66_命.png"; // 設置圖片為命符文

  // 使用 solarlunar 取得農曆日
  const today = new Date();
  const solarYear = today.getFullYear();
  const solarMonth = today.getMonth() + 1; // 月份從 0 開始，要加 1
  const solarDay = today.getDate();

  const lunar = solarlunar.solar2lunar(solarYear, solarMonth, solarDay);
  const lunarDay = lunar.day; // 真正的農曆日
  const realPhase = getLunarPhase(lunarDay); // 判斷月相

  moonText.textContent = "月相：無 / 真實月相：" + realPhase;
  sessionStorage.setItem("realPhase", realPhase);

  const messages = [
    "占卜中，請稍等................",
    "循著回憶，找尋那命運的規則。",
    "微弱的月光，會在一片漆黑的夜裡，帶領你找到方向。",
    "抓到命運絲線的軌跡了，現在呈現。"
  ];

  let index = 0;
  function showNext() {
    if (index < messages.length) {
      const p = document.createElement("p");
      p.textContent = messages[index];
      description.appendChild(p);
      index++;
      setTimeout(showNext, 2000);
    } else {
      setTimeout(() => {
        window.location.href = "fate.html"; // 等待過場後跳轉到占卜結果頁面
      }, 1000);
    }
  }

  showNext();
});

// 月相計算：依據農曆日判斷
function getLunarPhase(day) {
  if (day >= 1 && day <= 7) return "新月";
  if (day >= 8 && day <= 14) return "上弦";
  if (day >= 15 && day <= 21) return "滿月";
  if (day >= 22 && day <= 28) return "下弦";
  return "空亡";
}
