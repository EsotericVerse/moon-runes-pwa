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

  const img1 = document.getElementById("result-image1");
  const img2 = document.getElementById("result-image2");
  const attr1 = document.getElementById("result-attributes");
  const desc2 = document.getElementById("result-description");
  const apiResultDiv = document.getElementById("api-result");

  // 生成兩個隨機且不同的符文編號（1～64）
  let fateArray = Array.from({ length: 64 }, (_, i) => i + 1);
  shuffleArray(fateArray);
  const rune1Index = fateArray[0];
  const rune2Index = fateArray[1];

  const runes = getRunes64(); // 同步呼叫

  const rune1 = runes[rune1Index];
  const rune2 = runes[rune2Index];

  if (!rune1 || !rune2) {
    console.error("找不到符文資料");
    attr1.innerHTML = "<p>⚠️ 無法載入符文資料</p>";
    return;
  }

  // 方向設定
  const directions = ["正位", "半正位", "半逆位", "逆位"];
  const directionIndex1 = Math.floor(Math.random() * 4);
  const directionIndex2 = Math.floor(Math.random() * 4);
  const orientationNumber1 = directionIndex1 + 1;
  const orientationNumber2 = directionIndex2 + 1;
  const direction1 = directions[directionIndex1];
  const direction2 = directions[directionIndex2];

  // 顯示第一張圖片並旋轉
  img1.src = "64images/" + rune1.圖檔名稱;
  switch (orientationNumber1) {
    case 2: img1.style.transform = "rotate(90deg)"; break;
    case 3: img1.style.transform = "rotate(-90deg)"; break;
    case 4: img1.style.transform = "rotate(180deg)"; break;
    default: img1.style.transform = "rotate(0deg)";
  }

  // 顯示第二張圖片並旋轉
  img2.src = "64images/" + rune2.圖檔名稱;
  switch (orientationNumber2) {
    case 2: img2.style.transform = "rotate(90deg)"; break;
    case 3: img2.style.transform = "rotate(-90deg)"; break;
    case 4: img2.style.transform = "rotate(180deg)"; break;
    default: img2.style.transform = "rotate(0deg)";
  }

  // 第一張屬性
  attr1.innerHTML = `
    <p>介紹：${rune1.符文名稱}</p>
    <p>卡牌面向：${direction1}</p>
    <p>所屬分組：${rune1.所屬分組}</p>
    <p>符文月相：${rune1.月相}</p>
    <p>真實月相：${realPhase}</p>
  `;

  // 第二張屬性
  desc2.innerHTML = `
    <p>介紹：${rune2.符文名稱}</p>
    <p>卡牌面向：${direction2}</p>
    <p>所屬分組：${rune2.所屬分組}</p>
    <p>符文月相：${rune2.月相}</p>
    <p>真實月相：${realPhase}</p>
  `;

  // 呼叫 API
  let apiHtml = '';
  try {
    const apiResponse = await fetch("https://moon-runes-pwa.onrender.com/divination", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "2",
        rune1_id: rune1Index,
        rune1_dir: orientationNumber1,
        rune2_id: rune2Index,
        rune2_dir: orientationNumber2,
        debug: false
      })
    });
    const apiResult = await apiResponse.json();
    if (apiResult.success) {
      const data = apiResult.data;
      apiHtml = `
        <p><strong>完整現況：</strong>${data["完整現況"]}</p>
        <p><strong>牌面解說：</strong>${data["牌面解說"]}</p>
        <p><strong>占卜結論：</strong>${data["占卜結論"]}</p>
        <hr>
      `;
    } else {
      apiHtml = "<p>⚠️ API 呼叫失敗</p>";
    }
  } catch (error) {
    console.error("API 錯誤：", error);
    apiHtml = "<p>⚠️ API 連線錯誤</p>";
  }

  // 添加 API 結果和重新占卜按鈕
  apiResultDiv.innerHTML = apiHtml + '<button id="retry-button">重新占卜</button>';

  // 重新占卜按鈕事件
  const retry = document.getElementById("retry-button");
  if (retry) {
    retry.addEventListener("click", () => {
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    });
  }
});