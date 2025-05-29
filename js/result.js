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

    // 設定說明區
    description.innerHTML = `
      <p><strong>${facing}</strong> 的表達意思</p>
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
