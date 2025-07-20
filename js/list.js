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
    元素: [41, 48],
    秩序: [49, 56],
    無序: [57, 64]
  };

  try {
    // 載入符文資料
    console.log("正在載入 data/runes64.json");
    const runeResponse = await fetch("data/runes64.json");
    if (!runeResponse.ok) {
      throw new Error(`無法載入符文資料，狀態碼：${runeResponse.status}`);
    }
    const runes = await runeResponse.json();
    console.log("符文資料載入成功，總數：", runes.length);

    // 顯示預設符文（編號 66）
    console.log("顯示預設符文：編號 66");
    displayRune(66, runes);

    // 當選擇分組時，動態更新第二層選單
    groupSelect.addEventListener("change", () => {
      const selectedGroup = groupSelect.value;
      console.log("選擇分組：", selectedGroup);
      runeSelect.innerHTML = '<option value="">選擇符文編號</option>';
      runeSelect.disabled = !selectedGroup;

      if (selectedGroup && groupRanges[selectedGroup]) {
        const [start, end] = groupRanges[selectedGroup];
        for (let i = start; i <= end; i++) {
          const option = document.createElement("option");
          option.value = i;
          option.textContent = i;
          runeSelect.appendChild(option);
        }
      }
    });

    // 當選擇符文編號時，顯示對應符文資訊
    runeSelect.addEventListener("change", () => {
      const selectedRune = parseInt(runeSelect.value);
      console.log("選擇符文編號：", selectedRune);
      if (selectedRune) {
        displayRune(selectedRune, runes);
      }
    });

    // 顯示符文資訊的函數
    function displayRune(runeNumber, runes) {
      console.log("顯示符文，編號：", runeNumber);
      const runeKey = runeNumber.toString().padStart(2, "0");
      const rune = runes.find(r => r.編號 === runeNumber);

      if (!rune) {
        console.error("找不到符文資料，編號：", runeNumber);
        attr.innerHTML = "<p>⚠️ 無法載入符文資料</p>";
        desc.innerHTML = "";
        img.src = "";
        return;
      }

      // 顯示圖片
      console.log("載入圖片：", "64images/" + rune.圖檔名稱);
      img.src = "64images/" + rune.圖檔名稱;
      img.style.transform = "rotate(0deg)"; // 固定正位，無旋轉

      // 顯示屬性
      attr.innerHTML = `
        <p><strong>符文名稱：</strong>${rune.符文名稱}</p>
        <p><strong>英文：</strong>${rune.英文}</p>
        <p><strong>圖騰：</strong>${rune.圖騰}</p>
        <p><strong>顯化形式：</strong>${rune.顯化形式}</p>
        <p><strong>所屬分組：</strong>${rune.所屬分組}</p>
        <p><strong>月相：</strong>${rune.月相}</p>
        <p><strong>月相輔助說明：</strong>${rune.月相輔助說明}</p>
      `;

      // 詳細解釋
      desc.innerHTML = `
        <p><strong>靈魂咒語：</strong>${rune.靈魂咒語}</p>
        <p><strong>靈魂課題：</strong>${rune.靈魂課題}</p>
        <p><strong>實踐挑戰：</strong>${rune.實踐挑戰}</p>
        <p><strong>分組說明：</strong>${rune.分組說明}</p>
        <p><strong>符文變化歷史：</strong>${rune.符文變化歷史}</p>
        <p><strong>神話故事：</strong>${rune.神話故事}</p>
        <p><strong>配套儀式建議：</strong>${rune.配套儀式建議}</p>
        <p><strong>能量調和建議：</strong>${rune.能量調和建議}</p>
      `;
    }
  } catch (error) {
    console.error("載入符文資料時發生錯誤：", error);
    attr.innerHTML = "<p>⚠️ 無法載入符文資料，請稍後再試</p>";
    desc.innerHTML = "";
    img.src = "";
  }
});
```