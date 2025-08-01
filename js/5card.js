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
    const img3 = document.getElementById("result-image3");
    const img4 = document.getElementById("result-image4");
    const img5 = document.getElementById("result-image5");
    const attr1 = document.getElementById("result-attributes1");
    const attr2 = document.getElementById("result-attributes2");
    const attr3 = document.getElementById("result-attributes3");
    const attr4 = document.getElementById("result-attributes4");
    const attr5 = document.getElementById("result-attributes5");
    const apiResultDiv = document.getElementById("api-result");

    if (!img1 || !img2 || !img3 || !img4 || !img5 || !attr1 || !attr2 || !attr3 || !attr4 || !attr5 || !apiResultDiv) {
        console.error("DOM 元素缺失");
        if (attr1) attr1.innerHTML = "<p>⚠️ 頁面結構錯誤</p>";
        return;
    }

    // 生成五個隨機且不同符文編號（1～64）
    let fateArray = Array.from({ length: 64 }, (_, i) => i + 1);
    shuffleArray(fateArray);
    const rune1Index = fateArray[0];
    const rune2Index = fateArray[1];
    const rune3Index = fateArray[2];
    const rune4Index = fateArray[3];
    const rune5Index = fateArray[4];

    const runes = getRunes64(); // 同步呼叫

    // 使用數字索引直接訪問符文資料
    const rune1 = runes[rune1Index];
    const rune2 = runes[rune2Index];
    const rune3 = runes[rune3Index];
    const rune4 = runes[rune4Index];
    const rune5 = runes[rune5Index];

    // 方向設定
    const directions = ["正位", "半正位", "半逆位", "逆位"];
    const directionIndex1 = Math.floor(Math.random() * 4);
    const directionIndex2 = Math.floor(Math.random() * 4);
    const directionIndex3 = Math.floor(Math.random() * 4);
    const directionIndex4 = Math.floor(Math.random() * 4);
    const directionIndex5 = Math.floor(Math.random() * 4);
    const orientationNumber1 = directionIndex1 + 1;
    const orientationNumber2 = directionIndex2 + 1;
    const orientationNumber3 = directionIndex3 + 1;
    const orientationNumber4 = directionIndex4 + 1;
    const orientationNumber5 = directionIndex5 + 1;
    const direction1 = directions[directionIndex1];
    const direction2 = directions[directionIndex2];
    const direction3 = directions[directionIndex3];
    const direction4 = directions[directionIndex4];
    const direction5 = directions[directionIndex5];

    // 顯示圖片並旋轉
    try {
        img1.src = "64images/" + rune1.圖檔名稱;
        img2.src = "64images/" + rune2.圖檔名稱;
        img3.src = "64images/" + rune3.圖檔名稱;
        img4.src = "64images/" + rune4.圖檔名稱;
        img5.src = "64images/" + rune5.圖檔名稱;
    } catch (error) {
        console.error("圖片載入失敗：", error);
        attr1.innerHTML = "<p>⚠️ 圖片檔案缺失</p>";
        return;
    }

    switch (orientationNumber1) {
        case 2: img1.style.transform = "rotate(90deg)"; break;
        case 3: img1.style.transform = "rotate(-90deg)"; break;
        case 4: img1.style.transform = "rotate(180deg)"; break;
        default: img1.style.transform = "rotate(0deg)";
    }
    switch (orientationNumber2) {
        case 2: img2.style.transform = "rotate(90deg)"; break;
        case 3: img2.style.transform = "rotate(-90deg)"; break;
        case 4: img2.style.transform = "rotate(180deg)"; break;
        default: img2.style.transform = "rotate(0deg)";
    }
    switch (orientationNumber3) {
        case 2: img3.style.transform = "rotate(90deg)"; break;
        case 3: img3.style.transform = "rotate(-90deg)"; break;
        case 4: img3.style.transform = "rotate(180deg)"; break;
        default: img3.style.transform = "rotate(0deg)";
    }
    switch (orientationNumber4) {
        case 2: img4.style.transform = "rotate(90deg)"; break;
        case 3: img4.style.transform = "rotate(-90deg)"; break;
        case 4: img4.style.transform = "rotate(180deg)"; break;
        default: img4.style.transform = "rotate(0deg)";
    }
    switch (orientationNumber5) {
        case 2: img5.style.transform = "rotate(90deg)"; break;
        case 3: img5.style.transform = "rotate(-90deg)"; break;
        case 4: img5.style.transform = "rotate(180deg)"; break;
        default: img5.style.transform = "rotate(0deg)";
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
    attr2.innerHTML = `
        <p>介紹：${rune2.符文名稱}</p>
        <p>卡牌面向：${direction2}</p>
        <p>所屬分組：${rune2.所屬分組}</p>
        <p>符文月相：${rune2.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    // 第三張屬性
    attr3.innerHTML = `
        <p>介紹：${rune3.符文名稱}</p>
        <p>卡牌面向：${direction3}</p>
        <p>所屬分組：${rune3.所屬分組}</p>
        <p>符文月相：${rune3.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    // 第四張屬性
    attr4.innerHTML = `
        <p>介紹：${rune4.符文名稱}</p>
        <p>卡牌面向：${direction4}</p>
        <p>所屬分組：${rune4.所屬分組}</p>
        <p>符文月相：${rune4.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    // 第五張屬性
    attr5.innerHTML = `
        <p>介紹：${rune5.符文名稱}</p>
        <p>卡牌面向：${direction5}</p>
        <p>所屬分組：${rune5.所屬分組}</p>
        <p>符文月相：${rune5.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    // 先顯示載入訊息
    apiResultDiv.innerHTML = '<p>占卜結果分析中...</p>';

    // 呼叫 API
    let apiHtml = '';
    try {
        const apiResponse = await fetch("https://moon-runes-pwa.onrender.com/divination", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: "5",
                rune1_id: rune1Index,
                rune1_dir: orientationNumber1,
                rune2_id: rune2Index,
                rune2_dir: orientationNumber2,
                rune3_id: rune3Index,
                rune3_dir: orientationNumber3,
                rune4_id: rune4Index,
                rune4_dir: orientationNumber4,
                rune5_id: rune5Index,
                rune5_dir: orientationNumber5,
                debug: false
            })
        });
        if (!apiResponse.ok) {
            throw new Error(`API 呼叫失敗，狀態碼：${apiResponse.status}`);
        }
        const data = await apiResponse.json();
        if (data.success) {
            apiHtml = `
                <p><strong>完整現況：</strong>${data.data["完整現況"]}</p>
                <p><strong>牌面解說：</strong>${data.data["牌面解說"]}</p>
                <p><strong>占卜結論：</strong>${data.data["占卜結論"]}</p>
                <hr>
            `;
        } else {
            apiHtml = "<p>⚠️ API 回應失敗</p>";
        }
    } catch (error) {
        console.error("API 錯誤：", error);
        apiHtml = `<p>⚠️ API 連線錯誤：${error.message}</p>`;
    }

    // 添加 API 結果和重新占卜
    apiResultDiv.innerHTML = apiHtml + '<button id="retry-button">重新占卜</button>';

    // 重新占卜按鈕
    const retry = document.getElementById("retry-button");
    if (retry) {
        retry.addEventListener("click", () => {
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        });
    }
});