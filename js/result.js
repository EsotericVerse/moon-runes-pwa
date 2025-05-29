function getLunarPhase(day) {
  if (day >= 1 && day <= 7) return "新月";
  if (day >= 8 && day <= 14) return "上弦";
  if (day >= 15 && day <= 21) return "滿月";
  if (day >= 22 && day <= 28) return "下弦";
  return "空亡";
}

window.addEventListener("DOMContentLoaded", () => {
  const description = document.getElementById("description");
  const moonText = document.getElementById("moon-phase");

  // 取得真實農曆日
  const today = new Date();
  const lunarDay = today.getDate(); // 簡化處理，實際可接 lunar API
  const realPhase = getLunarPhase(lunarDay);
  moonText.textContent = "月相：無 / 真實月相：" + realPhase;

  const messages = [
    "為了能讓占卜更準確，需要充分的洗牌時間。",
    "稍等一下，快好了。",
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