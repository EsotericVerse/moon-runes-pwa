window.addEventListener("load", async () => {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");

  const img = document.getElementById("result-image");
  const description = document.getElementById("description");
  const moonText = document.getElementById("moon-phase");

  // 設置圖片為命符文
  img.src = "64images/66_命.png";

  let realPhase = sessionStorage.getItem("realPhase");
  if (!realPhase) {
    const today = new Date();
    const solarYear = today.getFullYear();
    const solarMonth = today.getMonth() + 1;
    const solarDay = today.getDate();
    const lunarInfo = solarlunar.solar2lunar(solarYear, solarMonth, solarDay);
    const lunarDay = lunarInfo.lDay;
    console.log(`今日西曆：${solarYear}/${solarMonth}/${solarDay}`);
    console.log("農曆轉換資訊：", lunarInfo);
    console.log("農曆日數：", lunarDay);
    realPhase = getLunarPhase(lunarDay);
  }

  moonText.textContent = "月相：無 / 真實月相：" + realPhase;
  sessionStorage.setItem("realPhase", realPhase);

  const messages = [
    "占卜中，請稍等片刻，馬上就好...... ",
    "正在找尋那命運之線..... ",
    "微弱的月光，會在漆黑的夜裡，帶領你找到方向。",
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
    } else {// 修改這裡：根據 mode 決定 target
      let target = "fate.html"; // 預設
      if (mode === "daily") {
        target = "daily.html";
      } else if (mode === "2card") {
        target = "2card.html";
      }
      setTimeout(() => {
        window.location.href = target;
      }, 1000);
    }
  }

  showNext();
});

// 根據農曆日判斷月相
function getLunarPhase(day) {
  if (day >= 1 && day <= 7) return "新月";
  if (day >= 8 && day <= 14) return "上弦";
  if (day >= 15 && day <= 21) return "滿月";
  if (day >= 22 && day <= 30) return "下弦";
  return "未知";
}
