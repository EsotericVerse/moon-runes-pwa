document.addEventListener("DOMContentLoaded", function () {
  var img = document.getElementById("result-image");
  var attr = document.getElementById("result-attributes");
  var desc = document.getElementById("result-description");
  var groupSelect = document.getElementById("group-select");
  var runeSelect = document.getElementById("rune-select");
  var homeButton = document.getElementById("home-button");

// 取得 rune 陣列
  const rune = getRunes64();

  // 從 rune 陣列生成 runesData 和 runeNumberMap
  const runesData = {};
  const runeNumberMap = {};
  rune.slice(1, 65).forEach(r => { // 只處理 1-64
    if (r && r.所屬分組 && r.符文名稱 && r.編號) {
      if (!runesData[r.所屬分組]) runesData[r.所屬分組] = [];
      runesData[r.所屬分組].push(r.符文名稱);
      runeNumberMap[r.符文名稱] = r.編號;
    }
  });

  // 預設顯示 rune[66]（編號 66，"命"）
  displayRune(rune[66]);
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

  runeSelect.addEventListener("change", function () { // 移除 async
    var selectedRune = parseInt(runeSelect.value);
    if (selectedRune) {
      const selected = rune.find(r => r && r.編號 === selectedRune); // 直接用 rune
      if (selected) {
        displayRune(selected);
      } else {
        console.error("找不到符文資料", { selectedRune });
        attr.innerHTML = "<p>⚠️ 無法載入符文資料</p>";
      }
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