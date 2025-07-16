
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const realPhase = sessionStorage.getItem("realPhase");
  if (!realPhase) {
    window.location.href = "index.html";
    return;
  }
  sessionStorage.removeItem("realPhase");

  const img = document.getElementById("daily-image");
  const attr = document.getElementById("daily-attributes");
  const desc = document.getElementById("daily-description");
  const retry = document.getElementById("retry-button");

  let fateArray = Array.from({ length: 64 }, (_, i) => i + 1);
  shuffleArray(fateArray);
  shuffleArray(fateArray);
  shuffleArray(fateArray);
  const selectedIndex = fateArray[Math.floor(Math.random() * fateArray.length)];
  const runeKey = selectedIndex.toString().padStart(2, "0");

  const runeResponse = await fetch("data/runes64.json");
  const runes = await runeResponse.json();
  const rune = runes[runeKey];

  if (!rune) {
    attr.innerHTML = "<p>⚠️ 無法載入符文資料</p>";
    return;
  }

  const directions = ["正位", "半正位", "半逆位", "逆位"];
  const directionIndex = Math.floor(Math.random() * 4);
  const orientationNumber = directionIndex + 1;
  const direction = directions[directionIndex];

  img.src = "64images/" + rune.圖檔名稱;
  switch (orientationNumber) {
    case 2:
      img.style.transform = "rotate(90deg)";
      break;
    case 3:
      img.style.transform = "rotate(-90deg)";
      break;
    case 4:
      img.style.transform = "rotate(180deg)";
      break;
    default:
      img.style.transform = "rotate(0deg)";
  }

  attr.innerHTML = `
    <p>介紹：${rune.符文名稱}</p>
    <p>卡牌面向：${direction}</p>
    <p>所屬分組：${rune.所屬分組}</p>
    <p>符文月相：${rune.月相}</p>
    <p>真實月相：${realPhase}</p>
  `;

  const groupMap = {
    "靈魂": "01",
    "連結": "02",
    "生命": "03",
    "自然": "04",
    "礦物": "05",
    "元素": "06",
    "秩序": "07",
    "無序": "08",
  };

  const fileId = groupMap[rune.所屬分組];
  let info;
  if (fileId) {
    const groupData = await fetch(`data/group/${fileId}.json`).then(r => r.json());
    info = groupData.find(
      d => d.符文名稱 === rune.符文名稱 && d.卡牌方向 === direction && d.現在月相 === realPhase
    );
  }

  if (info) {
    desc.innerHTML = `
      <p><strong>狀況形容：</strong>${info.狀況形容}</p>
      <p><strong>狀況表達：</strong>${info.狀況表達}</p>
      <p><strong>每日占卜提醒：</strong>${info.每日占卜提醒}</p>
      <p><strong>每日占卜引導：</strong>${info.每日占卜引導}</p>
      <p><strong>每日占卜祝福：</strong>${info.每日占卜祝福}</p>
    `;
  } else {
    desc.innerHTML = "<p>⚠️ 無法載入每日占卜資料</p>";
  }

  retry.addEventListener("click", () => {
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  });
});
