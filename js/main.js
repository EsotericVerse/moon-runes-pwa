// 工具函數：取得今日農曆日（模擬）
function getLunarDay() {
  const today = new Date();
  const day = today.getDate();
  return (day % 30) || 30; // 模擬：1~30
}

// 工具函數：月相判斷
function getMoonPhase(lunarDay) {
  if (lunarDay >= 1 && lunarDay <= 7) return "新月";
  if (lunarDay >= 8 && lunarDay <= 14) return "上弦";
  if (lunarDay >= 15 && lunarDay <= 21) return "滿月";
  if (lunarDay >= 22 && lunarDay <= 28) return "下弦";
  return "空亡";
}

// 文字逐句顯示動畫
function typeLines(lines, targetId, callback) {
  const el = document.getElementById(targetId);
  el.innerHTML = "";
  let index = 0;

  function showLine() {
    if (index < lines.length) {
      const p = document.createElement("p");
      p.textContent = lines[index++];
      el.appendChild(p);
      setTimeout(showLine, 2000);
    } else {
      callback();
    }
  }
  showLine();
}

// 卡牌點擊行為
function startDivination() {
  const image = document.getElementById("rune-image");
  const cardArea = document.getElementById("card-area");
  const description = document.getElementById("description");
  const orientation = document.getElementById("card-orientation");
  const lunarDay = getLunarDay();
  const realPhase = getMoonPhase(lunarDay);

  // 更新圖片與屬性
  image.src = "images/42_憶.png";
  cardArea.style.pointerEvents = "none";
  orientation.textContent = "正位";
  description.innerHTML = "";

  const lines = [
    "[別急，這還不是占卜結果，請等待一下，畫面會自動跳轉。]",
    "為了能讓占卜更準確，需要充分的洗牌時間。",
    "微弱的月光，會在一片漆黑的夜裡，帶領你找到方向。",
    "來了！抓到命運絲線的軌跡了！現在呈現。"
  ];

  // 顯示文字後執行占卜流程
  typeLines(lines, "description", () => {
    setTimeout(() => {
      performDivination(realPhase);
    }, 500);
  });
}

function performDivination(realPhase) {
  // 生成洗牌陣列
  let fateArray = Array.from({ length: 40 }, (_, i) => i + 1);
  for (let i = 0; i < 3; i++) fateArray.sort(() => Math.random() - 0.5);
  const runeId = fateArray[Math.floor(Math.random() * 40)];
  const facingIndex = Math.floor(Math.random() * 4);
  const facingText = ["正位", "半正位", "半逆位", "逆位"][facingIndex];

  // 導向占卜結果頁（未來會補上）
  window.location.href = `result.html?rune=${runeId}&facing=${facingText}&phase=${realPhase}`;
}

// 綁定事件
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("card-area").addEventListener("click", startDivination);
});
