document.addEventListener("DOMContentLoaded", async () => {
  const img = document.getElementById("result-image");
  const attr = document.getElementById("result-attributes");
  const desc = document.getElementById("result-description");
  const groupSelect = document.getElementById("group-select");
  const runeSelect = document.getElementById("rune-select");

  // 定義分組與對應編號
  const groupRanges = {
    靈魂: [1, 8],
    連結: [9, 16],
    生命: [17, 24],
    自然: [25, 32],
    礦物: [33, 40],
    元素: [41, 48],
    秩序: [49, 56],
    無序: [57, 64],
    個人: [65, 66]
  };

  // 載入符文資料
  const runeResponse = await fetch("data/runes64.json");
  const runes = await runeResponse.json();

  // 顯示預設符文（編號 66）
  displayRune(66, runes);

  // 當選擇分組時，動態更新第二層選單
  groupSelect.addEventListener("change", () => {
    const selectedGroup = groupSelect.value;
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
    if (selectedRune) {
      displayRune(selectedRune, runes);
    }
  });

  // 顯示符文資訊的函數
  function displayRune(runeNumber, runes) {
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
    img.src = "64images/" + rune.圖檔名稱;
    img.style.transform = "rotate(0deg)"; // 固定正位，無旋轉

    // 顯示屬性
    attr.innerHTML = `
      <p>介紹：${rune.符文名稱}</p>
      <p>所屬分組：${rune.所屬分組}</p>
      <p>符文月相：${rune.月相}</p>
    `;

    // 詳細解釋
    desc.innerHTML = `
      <p><strong>歷史：</strong>${rune.符文變化歷史}</p>
      <p><strong>故事：</strong>${rune.神話故事}</p>
      <p><strong>靈魂咒語：</strong>${rune.靈魂咒語}</p>
      <p><strong>分組說明：</strong>${rune.分組說明}</p>
      <p><strong>靈魂課題：</strong>${rune.靈魂課題}</p>
      <p><strong>實踐挑戰：</strong>${rune.實踐挑戰}</p>
      <p><strong>配套儀式：</strong>${rune.配套儀式建議}</p>
      <p><strong>能量調和：</strong>${rune.能量調和建議}</p>
    `;
  }