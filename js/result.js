window.addEventListener("load", async () => {
  const img = document.getElementById("result-image");
  const description = document.getElementById("description");
  const moonText = document.getElementById("moon-phase");

  img.src = "64images/66_命.png"; // 設置圖片為命符文

  // ✅ 1. 計算今日西曆日期
  const today = new Date();
  const solarYear = today.getFullYear();
  const solarMonth = today.getMonth() + 1;
  const solarDay = today.getDate();

  // ✅ 2. 農曆轉換
  const lunar = solarlunar.solar2lunar(solarYear, solarMonth, solarDay);
  const lunarDay = lunar.day;

  // ✅ 3. debug 輸出
  console.log(`今日西曆：${solarYear}/${solarMonth}/${solarDay}`);
  console.log(`轉換農曆：${lunar.lYear}年${lunar.lMonth}月${lunar.day}日`);
  console.log("農曆日數：", lunarDay);

  const realPhase = getLunarPhase(lunarDay);

  // ✅ 4. 月相輸出
  console.log("判定月相為：", realPhase);
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
        window.location.href = "fate.html";
      }, 1000);
    }
  }

  showNext();
});

// ✅ 修正後月相邏輯
function getLunarPhase(day) {
  if (day >= 1 && day <= 7) return "新月";
  if (day >= 8 && day <= 14) return "上弦";
  if (day >= 15 && day <= 21) return "滿月";
  if (day >= 22 && day <= 30) return "下弦"; // 修正此處
  return "未知";
}
