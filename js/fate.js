function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getMoonPhase(day) {
  if (day >= 1 && day <= 7) return "新月";
  if (day >= 8 && day <= 14) return "上弦";
  if (day >= 15 && day <= 21) return "滿月";
  if (day >= 22 && day <= 28) return "下弦";
  return "空亡";
}

const directions = ["正位", "半正位", "半逆位", "逆位"];
const directionMeanings = {
  "正位": "能量順行。主題自然流動、力量顯現、外顯無礙。",
  "半正位": "初生漸顯。潛能正在凝聚、尚未完全流動，代表準備與開始。",
  "半逆位": "釋放收束。能量正在退潮、進入整合期，是轉化與療癒階段。",
  "逆位": "能量阻滯 主題反向顯現、力量扭曲、潛藏或危機感浮現。"
};

window.addEventListener("DOMContentLoaded", async () => {
  const img = document.getElementById("result-image");
  const attr = document.getElementById("result-attributes");
  const desc = document.getElementById("result-description");
  const retry = document.getElementById("retry-button");

  // 抽牌邏輯
  let fateArray = Array.from({ length: 40 }, (_, i) => i + 1);
  shuffleArray(fateArray);
  shuffleArray(fateArray);
  shuffleArray(fateArray);
  const selectedIndex = fateArray[Math.floor(Math.random() * fateArray.length)];

  const response = await fetch("data/runes.json");
  const runes = await response.json();

  const rune = Object.values(runes).find(r => r.編號 === selectedIndex);
  const directionIndex = Math.floor(Math.random() * 4);
  const direction = directions[directionIndex];
  const directionText = directionMeanings[direction];

  const today = new Date();
  const lunarDay = today.getDate(); // 模擬
  const realMoon = getMoonPhase(lunarDay);

  img.src = "images/" + rune.符文圖檔;

  attr.innerHTML = `
    <p>卡牌面向：${direction}</p>
    <p>介紹：${rune.圖騰}、「${rune.名稱}」、${rune.顯化形式}</p>
    <p>所屬分組：${rune.所屬分組}</p>
    <p>月相：${rune.月相} / 真實月相：${realMoon}</p>
  `;

  desc.innerHTML = `
    <p>${directionText}</p>
    <p>${rune.靈魂咒語}</p>
    <p>${rune.分組說明}</p>
    <p><strong>靈魂課題：</strong>${rune.靈魂課題}</p>
    <p><strong>實踐挑戰：</strong>${rune.實踐挑戰}</p>
    <p><strong>歷史：</strong>${rune.符文變化歷史}</p>
    <p><strong>故事：</strong>${rune.神話故事}</p>
    <p><strong>配套儀式：</strong>${rune.配套儀式建議}</p>
    <p><strong>能量調和：</strong>${rune.能量調和建議}</p>
  `;

  retry.addEventListener("click", () => {
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  });
});