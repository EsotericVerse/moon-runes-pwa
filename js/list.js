```javascript
document.addEventListener("DOMContentLoaded", async () => {
  console.log("list.js 開始執行，時間：", new Date().toISOString());

  const img = document.getElementById("result-image");
  const attr = document.getElementById("result-attributes");
  const desc = document.getElementById("result-description");
  const groupSelect = document.getElementById("group-select");
  const runeSelect = document.getElementById("rune-select");

  // 硬編碼符文資料（編號 1-64）
  const runesData = [
    { 編號: 1, 符文名稱: "靈", 所屬分組: "靈魂" },
    { 編號: 2, 符文名稱: "魂", 所屬分組: "靈魂" },
    { 編號: 3, 符文名稱: "彩", 所屬分組: "靈魂" },
    { 編號: 4, 符文名稱: "憶", 所屬分組: "靈魂" },
    { 編號: 5, 符文名稱: "界", 所屬分組: "靈魂" },
    { 編號: 6, 符文名稱: "域", 所屬分組: "靈魂" },
    { 編號: 7, 符文名稱: "鏡", 所屬分組: "靈魂" },
    { 編號: 8, 符文名稱: "核", 所屬分組: "靈魂" },
    { 編號: 9, 符文名稱: "向", 所屬分組: "連結" },
    { 編號: 10, 符文名稱: "斷", 所屬分組: "連結" },
    { 編號: 11, 符文名稱: "封", 所屬分組: "連結" },
    { 編號: 12, 符文名稱: "鍊", 所屬分組: "連結" },
    { 編號: 13, 符文名稱: "啟", 所屬分組: "連結" },
    { 編號: 14, 符文名稱: "分", 所屬分組: "連結" },
    { 編號: 15, 符文名稱: "悟", 所屬分組: "連結" },
    { 編號: 16, 符文名稱: "誤", 所屬分組: "連結" },
    { 編號: 17, 符文名稱: "生", 所屬分組: "生命" },
    { 編號: 18, 符文名稱: "老", 所屬分組: "生命" },
    { 編號: 19, 符文名稱: "病", 所屬分組: "生命" },
    { 編號: 20, 符文名稱: "死", 所屬分組: "生命" },
    { 編號: 21, 符文名稱: "心", 所屬分組: "生命" },
    { 編號: 22, 符文名稱: "愛", 所屬分組: "生命" },
    { 編號: 23, 符文名稱: "語", 所屬分組: "生命" },
    { 編號: 24, 符文名稱: "韻", 所屬分組: "生命" },
    { 編號: 25, 符文名稱: "樹", 所屬分組: "自然" },
    { 編號: 26, 符文名稱: "花", 所屬分組: "自然" },
    { 編號: 27, 符文名稱: "葉", 所屬分組: "自然" },
    { 編號: 28, 符文名稱: "草", 所屬分組: "自然" },
    { 編號: 29, 符文名稱: "根", 所屬分組: "自然" },
    { 編號: 30, 符文名稱: "種", 所屬分組: "自然" },
    { 編號: 31, 符文名稱: "實", 所屬分組: "自然" },
    { 編號: 32, 符文名稱: "枝", 所屬分組: "自然" },
    { 編號: 33, 符文名稱: "金", 所屬分組: "礦物" },
    { 編號: 34, 符文名稱: "玉", 所屬分組: "礦物" },
    { 編號: 35, 符文名稱: "晶", 所屬分組: "礦物" },
    { 編號: 36, 符文名稱: "地", 所屬分組: "礦物" },
    { 編號: 37, 符文名稱: "石", 所屬分組: "礦物" },
    { 編號: 38, 符文名稱: "鑽", 所屬分組: "礦物" },
    { 編號: 39, 符文名稱: "礦", 所屬分組: "礦物" },
    { 編號: 40, 符文名稱: "塵", 所屬分組: "礦物" },
    { 編號: 41, 符文名稱: "光", 所屬分組: "元素" },
    { 編號: 42, 符文名稱: "暗", 所屬分組: "元素" },
    { 編號: 43, 符文名稱: "水", 所屬分組: "元素" },
    { 編號: 44, 符文名稱: "火", 所屬分組: "元素" },
    { 編號: 45, 符文名稱: "風", 所屬分組: "元素" },
    { 編號: 46, 符文名稱: "土", 所屬分組: "元素" },
    { 編號: 47, 符文名稱: "雷", 所屬分組: "元素" },
    { 編號: 48, 符文名稱: "氣", 所屬分組: "元素" },
    { 編號: 49, 符文名稱: "日", 所屬分組: "秩序" },
    { 編號: 50, 符文名稱: "月", 所屬分組: "秩序" },
    { 編號: 51, 符文名稱: "星", 所屬分組: "秩序" },
    { 編號: 52, 符文名稱: "辰", 所屬分組: "秩序" },
    { 編號: 53, 符文名稱: "明", 所屬分組: "秩序" },
    { 編號: 54, 符文名稱: "時", 所屬分組: "秩序" },
    { 編號: 55, 符文名稱: "空", 所屬分組: "秩序" },
    { 編號: 56, 符文名稱: "因", 所屬分組: "秩序" },
    { 編號: 57, 符文名稱: "福", 所屬分組: "無序" },
    { 編號: 58, 符文名稱: "禍", 所屬分組: "無序" },
    { 編號: 59, 符文名稱: "無", 所屬分組: "無序" },
    { 編號: 60, 符文名稱: "夢", 所屬分組: "無序" },
    { 編號: 61, 符文名稱: "幻", 所屬分組: "無序" },
    { 編號: 62, 符文名稱: "緣", 所屬分組: "無序" },
    { 編號: 63, 符文名稱: "虛", 所屬分組: "無序" },
    { 編號: 64, 符文名稱: "果", 所屬分組: "無序" },
    { 編號: 65, 符文名稱: "玄", 所屬分組: "個人" },
    { 編號: 66, 符文名稱: "命", 所屬分組: "個人" }
  ];

  // 硬編碼編號 66 的完整資料（預設顯示）
  const defaultRune = {
    編號: 66,
    符文名稱: "命",
    英文: "Destiny",
    圖騰: "⟁",
    顯化形式: "交界・引渡・轉生",
    所屬分組: "個人",
    月相: "個人",
    靈魂咒語: "我在命運之中，等待門開啟",
    月相輔助說明: "無專屬月相",
    靈魂課題: "看見命運全圖與當下創造之責",
    實踐挑戰: "寫下今日主動創造的一項行動",
    分組說明: "專屬月語者的內在象徵，映照靈魂深處的獨特印記。",
    符文變化歷史: "由眾符之合所構，象徵萬象歸一、命運流轉與終極秩序的總和。",
    神話故事: "當最後一符落定，命符自虛空中浮現，成為終極總章，連結萬象、統攝全局的靈魂秩序。",
    配套儀式建議: "將所有抽過的符文排成圓圈，靜坐其中觀照全貌。",
    能量調和建議: "使用星芒石與龍涎香，整合命運軌跡與靈魂藍圖。",
    圖檔名稱: "66_命.png"
  };

  // 顯示預設符文（編號 66）
  console.log("顯示預設符文：編號 66");
  displayRune(defaultRune);

  // 當選擇分組時，動態更新第二層選單（顯示符文名稱）
  groupSelect.addEventListener("change", async () => {
    const selectedGroup = groupSelect.value;
    console.log("選擇分組：", selectedGroup);
    runeSelect.innerHTML = '<option value="">請選擇符文</option>';
    runeSelect.disabled = !selectedGroup;

    if (selectedGroup) {
      const groupRunes = runesData.filter(rune => rune.所屬分組 === selectedGroup && rune.編號 <= 64);
      groupRunes.forEach(rune => {
        const option = document.createElement("option");
        option.value = rune.編號;
        option.textContent = rune.符文名稱;
        runeSelect.appendChild(option);
      });
    }
  });

  // 當選擇符文時，載入並顯示對應符文詳細資訊
  runeSelect.addEventListener("change", async () => {
    const selectedRune = parseInt(runeSelect.value);
    console.log("選擇符文編號：", selectedRune);
    if (selectedRune) {
      console.log("正在載入 data/runes64.json 以獲取編號", selectedRune, "的詳細資訊");
      const runeResponse = await fetch("data/runes64.json");
      const runes = await runeResponse.json();
      const rune = runes.find(r => r.編號 === selectedRune);
      displayRune(rune);
    }
  });

  // 顯示符文資訊的函數
  function displayRune(rune) {
    console.log("顯示符文，編號：", rune.編號);
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
});
```