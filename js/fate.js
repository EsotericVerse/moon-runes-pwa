function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const realPhase = sessionStorage.getItem("realPhase");
  if (!realPhase) {
    window.location.href = "index.html";
    return;
  }
  sessionStorage.removeItem("realPhase");
  const img = document.getElementById("result-image");
  const attr = document.getElementById("result-attributes");
  const desc = document.getElementById("result-description");
  const retry = document.getElementById("retry-button");

  // 隨機抽取符文
  let fateArray = Array.from({ length: 40 }, (_, i) => i + 1);
  shuffleArray(fateArray);
  shuffleArray(fateArray);
  shuffleArray(fateArray);
  const selectedIndex = fateArray[Math.floor(Math.random() * fateArray.length)];

  // 從 JSON 獲取符文資料
  const response = await fetch("data/runes.json");
  const runes = await response.json();
  const dirResponse = await fetch("data/direction.json");
  const dirData = await dirResponse.json();

  const rune = Object.values(runes).find(r => r.編號 === selectedIndex);
  const dirInfo = dirData.find(d => d.編號 === selectedIndex);

  // 根據所屬分組設定背景顏色
  const groupColorMap = {
    "靈魂連結": "#00008B",
    "自然生命": "#006400",
    "元素力量": "#8B7500",
    "時空循環": "#8B0000",
    "宇宙無常": "#2F2F2F",
  };
  const bgColor = groupColorMap[rune.所屬分組] || "#ffffff";
  document.body.style.backgroundColor = bgColor;
  const directionIndex = Math.floor(Math.random() * 4);
  const directions = ["正位", "半正位", "半逆位", "逆位"];
  const directionMeanings = {
    "正位": "能量順行。主題自然流動、力量顯現、外顯無礙。",
    "半正位": "初生漸顯。潛能正在凝聚、尚未完全流動，代表準備與開始。",
    "半逆位": "釋放收束。能量正在退潮、進入整合期，是轉化與療癒階段。",
    "逆位": "能量阻滯。主題反向顯現、力量扭曲、潛藏或危機感浮現。"
  };
  
  const direction = directions[directionIndex];
  const directionText = directionMeanings[direction];
  const orientationFieldMap = {
    "正位": "正向表示",
    "半正位": "半正向表示",
    "半逆位": "半逆向表示",
    "逆位": "逆向表示"
  };
  const directionResult = dirInfo ? dirInfo[orientationFieldMap[direction]] : "";

  // 顯示符文圖片與屬性
  img.src = "images/" + rune.圖檔名稱;
  attr.innerHTML = `
    <p>介紹：${rune.符文名稱}</p>
    <p>卡牌面向：${direction}</p>
    <p>所屬分組：${rune.所屬分組}</p>
    <p>月相：${rune.月相}</p>
    <p>真實月相：${realPhase}</p>
  `;

  // 顯示解釋
  desc.innerHTML = `
    <p><strong>歷史：</strong>${rune.符文變化歷史}</p>
    <p><strong>故事：</strong>${rune.神話故事}</p>
    <p>${rune.靈魂咒語}</p>
    <p>${rune.分組說明}</p>
    <p><strong>靈魂課題：</strong>${rune.靈魂課題}</p>
    <p><strong>實踐挑戰：</strong>${rune.實踐挑戰}</p>
    <p><strong>配套儀式：</strong>${rune.配套儀式建議}</p>
    <p><strong>能量調和：</strong>${rune.能量調和建議}</p>
        <HR><p>占卜結論： ${rune.符文名稱} ，${direction} 表示，${directionResult}</p><HR>
	
  `;

  // 重新占卜
  retry.addEventListener("click", () => {
    setTimeout(() => {
      window.location.href = "index.html"; // 返回占卜開始頁面
    }, 1000);
  });
});
