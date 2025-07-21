document.addEventListener("DOMContentLoaded", function () {
  var img = document.getElementById("result-image");
  var attr = document.getElementById("result-attributes");
  var desc = document.getElementById("result-description");
  var groupSelect = document.getElementById("group-select");
  var runeSelect = document.getElementById("rune-select");
  var homeButton = document.getElementById("home-button");

  var runesData = {
    "靈魂": ["靈", "魂", "彩", "憶", "界", "域", "鏡", "核"],
    "連結": ["向", "斷", "封", "鍊", "啟", "分", "悟", "誤"],
    "生命": ["生", "老", "病", "死", "心", "愛", "語", "韻"],
    "自然": ["樹", "花", "葉", "草", "根", "種", "實", "枝"],
    "礦物": ["金", "玉", "晶", "地", "石", "鑽", "礦", "塵"],
    "元素": ["光", "暗", "水", "火", "風", "土", "雷", "氣"],
    "秩序": ["日", "月", "星", "辰", "明", "時", "空", "因"],
    "無序": ["福", "禍", "無", "夢", "幻", "緣", "虛", "果"]
  };

  var runeNumberMap = {
    "靈": 1, "魂": 2, "彩": 3, "憶": 4, "界": 5, "域": 6, "鏡": 7, "核": 8,
    "向": 9, "斷": 10, "封": 11, "鍊": 12, "啟": 13, "分": 14, "悟": 15, "誤": 16,
    "生": 17, "老": 18, "病": 19, "死": 20, "心": 21, "愛": 22, "語": 23, "韻": 24,
    "樹": 25, "花": 26, "葉": 27, "草": 28, "根": 29, "種": 30, "實": 31, "枝": 32,
    "金": 33, "玉": 34, "晶": 35, "地": 36, "石": 37, "鑽": 38, "礦": 39, "塵": 40,
    "光": 41, "暗": 42, "水": 43, "火": 44, "風": 45, "土": 46, "雷": 47, "氣": 48,
    "日": 49, "月": 50, "星": 51, "辰": 52, "明": 53, "時": 54, "空": 55, "因": 56,
    "福": 57, "禍": 58, "無": 59, "夢": 60, "幻": 61, "緣": 62, "虛": 63, "果": 64
  };

  var defaultRune = {
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

  displayRune(defaultRune);

  groupSelect.addEventListener("change", function () {
    var selectedGroup = groupSelect.value;
    runeSelect.innerHTML = "<option value=\"\">請選擇符文</option>";
    runeSelect.disabled = !selectedGroup;

    if (selectedGroup) {
      var groupRunes = runesData[selectedGroup];
      groupRunes.forEach(function (runeName) {
        var option = document.createElement("option");
        option.value = runeNumberMap[runeName];
        option.textContent = runeName;
        runeSelect.appendChild(option);
      });
    }
  });

 runeSelect.addEventListener("change", async function () {
    var selectedRune = parseInt(runeSelect.value);
    if (selectedRune) {
        let runes;
        try {
            runes = await getRunes64();
        } catch (error) {
            console.error("載入符文資料失敗：", error);
            attr.innerHTML = "<p>⚠️ 無法載入符文資料</p>";
            return;
        }

        const rune = runes.find(function (r) {
            return r.編號 === selectedRune;
        });
        displayRune(rune);
    }
});

  img.addEventListener("click", function () {
    let countdown = 5;
    const originalSrc = img.src;
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        window.location.href = "fate.html";
      }
    }, 1000);
    img.addEventListener("click", function cancelCountdown() {
      clearInterval(countdownInterval);
      img.src = originalSrc;
      img.removeEventListener("click", cancelCountdown);
    }, { once: true });
  });

  homeButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  function displayRune(rune) {
    img.src = "64images/" + rune.圖檔名稱;
    img.style.transform = "rotate(0deg)";

    attr.innerHTML = [
      "<p><strong>符文名稱：</strong>" + rune.符文名稱 + "</p>",
      "<p><strong>英文：</strong>" + rune.英文 + "</p>",
      "<p><strong>圖騰：</strong>" + rune.圖騰 + "</p>",
      "<p><strong>顯化形式：</strong>" + rune.顯化形式 + "</p>",
      "<p><strong>所屬分組：</strong>" + rune.所屬分組 + "</p>",
      "<p><strong>月相：</strong>" + rune.月相 + "</p>",
      "<p><strong>月相輔助說明：</strong>" + rune.月相輔助說明 + "</p>"
    ].join("");

    desc.innerHTML = [
      "<p><strong>靈魂咒語：</strong>" + rune.靈魂咒語 + "</p>",
      "<p><strong>靈魂課題：</strong>" + rune.靈魂課題 + "</p>",
      "<p><strong>實踐挑戰：</strong>" + rune.實踐挑戰 + "</p>",
      "<p><strong>分組說明：</strong>" + rune.分組說明 + "</p>",
      "<p><strong>符文變化歷史：</strong>" + rune.符文變化歷史 + "</p>",
      "<p><strong>神話故事：</strong>" + rune.神話故事 + "</p>",
      "<p><strong>配套儀式建議：</strong>" + rune.配套儀式建議 + "</p>",
      "<p><strong>能量調和建議：</strong>" + rune.能量調和建議 + "</p>"
    ].join("");
  }
});