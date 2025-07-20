```javascript
document.addEventListener("DOMContentLoaded", async () => {
  console.log("list.js 開始執行");

  const img = document.getElementById("result-image");
  const attr = document.getElementById("result-attributes");
  const desc = document.getElementById("result-description");
  const groupSelect = document.getElementById("group-select");
  const runeSelect = document.getElementById("rune-select");

  // 檢查 DOM 元素
  if (!img || !attr || !desc || !groupSelect || !runeSelect) {
    console.error("DOM 元素未找到，請檢查 HTML 是否包含以下 ID：result-image, result-attributes, result-description, group-select, rune-select");
    return;
  }

  // 定義分組與對應編號
  const groupRanges = {
    靈魂: [1, 8],
    連結: [9, 16],
    生命: [17, 24],
    自然: [25, 32],
    礦物: [33, 40],
    元素: [41,