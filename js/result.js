// 工具：解析 URL 參數
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    rune: parseInt(params.get("rune"), 10),
    facing: params.get("facing"),
    phase: params.get("phase")
  };
}

// DOM 元素
const image = document.getElementById("rune-image");
const property = document.getElementById("property");
const description = document.getElementById("description");
const retryBtn = document.getElementById("retry-btn");

// 牌面方向意義對照表
const facingMeaningMap = {
  "正位": "能量順行。主題自然流動、力量顯現、外顯無礙。",
  "半正位": "初生漸顯。潛能正在凝聚、尚未完全流動，代表準備與開始。",
  "半逆位": "釋放收束。能量正在退潮、進入整合期，是轉化與療癒階段。",
  "逆位": "能量阻滯。主題反向顯現、力量扭曲、潛藏或危機感浮現。"
};

// 主程式：載入 JSON 並顯示資料
fetch("data/runes.json")
  .then(res => res.json())
  .then(data => {
    const { rune, facing, phase } = getQueryParams();
    const runeData = data.find(r => r.編號 === rune);

    if (!runeData) {
      description.textContent = "找不到對應的符文資料。";
      return;
    }

    const meaningText = facingMeaningMap[facing] || "（無法解讀的牌面方向）";

    // 設定圖片
    image.src = `images/${runeData.符文圖檔}`;
    image.alt = runeData.名稱;

    // 設定屬性區
    property.innerHTML = `
      <p>卡牌面向：<strong>${facing}</strong></p>
      <p>介紹：${runeData.圖騰}、「${runeData.名稱}」、${runeData.顯化形式}</p>
      <p>所屬分組：${runeData.所屬分組}</p>
      <p>月相：${runeData.月相} / 真實月相：${phase}</p>
    `;

    // 設定說明區（含方向意義）
    description.innerHTML = `
      <p><strong>${facing}</strong>：${meaningText}</p>
      <p>${runeData.靈魂咒語}</p>
      <p>${runeData.分組說明}</p>
      <p>${runeData.靈魂課題}</p>
      <p>${runeData.實踐挑戰}</p>
      <p>${runeData.符文變化歷史}</p>
    `;
  });

// 重新占卜
retryBtn.addEventListener("click", () => {
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1000);
});
