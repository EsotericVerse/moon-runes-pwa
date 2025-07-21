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
    const attr1 = document.getElementById("result-attributes1");
    const attr2 = document.getElementById("result-attributes2");
    const desc3 = document.getElementById("result-description");
    const apiResultDiv = document.getElementById("api-result");

    if (!img1 || !img2 || !img3 || !attr1 || !attr2 || !desc3 || !apiResultDiv) {
        console.error("DOM 元素缺失");
        if (attr1) attr1.innerHTML = "<p>⚠️ 頁面結構錯誤</p>";
        return;
    }

    // 生成三個隨機且不同符文編號（1～64）
    let fateArray = Array.from({ length: 64 }, (_, i) => i + 1);
    shuffleArray(fateArray);
    const rune1Index = fateArray[0];
    const rune2Index = fateArray[1];
    const rune3Index = fateArray[2];
    const rune1Key = rune1Index.toString().padStart(2, "0");
    const rune2Key = rune2Index.toString().padStart(2, "0");
    const rune3Key = rune3Index.toString().padStart(2, "0");

    // 檢查快取並驗證有效性
let runes;
try {
    runes = await getRunes64();
} catch (error) {
    console.error("載入符文資料失敗：", error);
    attr1.innerHTML = `<p>⚠️ 無法載入符文資料：${error.message}</p>`;
    return;
}

    const rune1 = runes[rune1Key] || { "符文名稱": "未知", "月相": "未知", "所屬分組": "未知", "圖檔名稱": "default.png", "顯化形式": "", "關鍵詞": "", "陰暗面": "", "反向關鍵詞": "" };
    const rune2 = runes[rune2Key] || { "符文名稱": "未知", "月相": "未知", "所屬分組": "未知", "圖檔名稱": "default.png", "顯化形式": "", "關鍵詞": "", "陰暗面": "", "反向關鍵詞": "" };
    const rune3 = runes[rune3Key] || { "符文名稱": "未知", "月相": "未知", "所屬分組": "未知", "圖檔名稱": "default.png", "顯化形式": "", "關鍵詞": "", "陰暗面": "", "反向關鍵詞": "" };

    if (!runes[rune1Key] || !runes[rune2Key] || !runes[rune3Key]) {
        console.warn(`缺少符文資料，鍵：${rune1Key}, ${rune2Key}, ${rune3Key} - 使用預設值`);
    }

    // 方向設定
    const directions = ["正位", "半正位", "半逆位", "逆位"];
    const directionIndex1 = Math.floor(Math.random() * 4);
    const directionIndex2 = Math.floor(Math.random() * 4);
    const directionIndex3 = Math.floor(Math.random() * 4);
    const orientationNumber1 = directionIndex1 + 1;
    const orientationNumber2 = directionIndex2 + 1;
	const orientationNumber3 = directionIndex3 + 1;
    const direction1 = directions[directionIndex1];
    const direction2 = directions[directionIndex2];
    const direction3 = directions[directionIndex3];

    // 顯示圖片並旋轉
    try {
        img1.src = "64images/" + rune1.圖檔名稱;
        img2.src = "64images/" + rune2.圖檔名稱;
        img3.src = "64images/" + rune3.圖檔名稱;
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

    // 第一張屬性 (源)
    attr1.innerHTML = `
        <p>介紹：${rune1.符文名稱}</p>
        <p>卡牌面向：${direction1}</p>
        <p>所屬分組：${rune1.所屬分組}</p>
        <p>符文月相：${rune1.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    // 第二張屬性 (轉)
    attr2.innerHTML = `
        <p>介紹：${rune2.符文名稱}</p>
        <p>卡牌面向：${direction2}</p>
        <p>所屬分組：${rune2.所屬分組}</p>
        <p>符文月相：${rune2.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    // 第三張屬性 (合)
    desc3.innerHTML = `
        <p>介紹：${rune3.符文名稱}</p>
        <p>卡牌面向：${direction3}</p>
        <p>所屬分組：${rune3.所屬分組}</p>
        <p>符文月相：${rune3.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    // 呼叫 API
    let apiHtml = '';
    try {
        const apiResponse = await fetch("https://moon-runes-pwa.onrender.com/divination", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: "3",
                rune1_id: rune1Index,
                rune1_dir: orientationNumber1,
                rune2_id: rune2Index,
                rune2_dir: orientationNumber2,
                rune3_id: rune3Index,
                rune3_dir: orientationNumber3,
                debug: false
            })
        });
        if (!apiResponse.ok) {
            throw new Error(`API 呼叫失敗，狀態碼：${apiResponse.status}`);
        }
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