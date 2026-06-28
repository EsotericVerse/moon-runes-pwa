function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function buildLocalDivination(cards, realPhase) {
    const names = cards.map(card => `「${card.rune.符文名稱}」${card.direction}`).join('、');
    const flow = cards.map(card => `${card.label}：${card.rune.符文名稱}`).join(' / ');
    const explanation = cards.map(card => {
        const base = `${card.label}位的「${card.rune.符文名稱}」屬於${card.rune.所屬分組}，以${card.direction}呈現。`;
        const task = card.rune.靈魂課題 || card.rune.實踐挑戰 || card.rune.分組說明 || '此牌提醒你回到當下，觀察事情真正的流向。';
        return `${base}${task}`;
    }).join('<br>');

    return `
        <p><strong>完整現況：</strong>${flow}。目前真實月相為${realPhase}。上方三張代表過去、現在、未來，下面兩張代表周圍環境與補充影響。</p>
        <p><strong>牌面解說：</strong>${explanation}</p>
        <p><strong>占卜結論：</strong>${names}。先整理主線，再看環境如何推動或干擾；重點不是一次解決全部，而是找出最值得先處理的節點。</p>
        <hr>
        <p><small>目前使用本地解讀模式。</small></p>
    `;
}

async function requestApiOrFallback(payload, fallbackHtml) {
    try {
        const apiResponse = await fetch('https://moon-runes-pwa.onrender.com/divination', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!apiResponse.ok) {
            throw new Error(`API 呼叫失敗，狀態碼：${apiResponse.status}`);
        }
        const data = await apiResponse.json();
        if (data.success) {
            return `
                <p><strong>完整現況：</strong>${data.data['完整現況']}</p>
                <p><strong>牌面解說：</strong>${data.data['牌面解說']}</p>
                <p><strong>占卜結論：</strong>${data.data['占卜結論']}</p>
                <hr>
            `;
        }
        return fallbackHtml;
    } catch (error) {
        console.warn('API unavailable, using local divination:', error);
        return fallbackHtml;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    const realPhase = sessionStorage.getItem('realPhase');
    if (!realPhase) {
        window.location.href = 'index.html';
        return;
    }
    sessionStorage.removeItem('realPhase');

    const img1 = document.getElementById('result-image1');
    const img2 = document.getElementById('result-image2');
    const img3 = document.getElementById('result-image3');
    const img4 = document.getElementById('result-image4');
    const img5 = document.getElementById('result-image5');
    const attr1 = document.getElementById('result-attributes1');
    const attr2 = document.getElementById('result-attributes2');
    const attr3 = document.getElementById('result-attributes3');
    const attr4 = document.getElementById('result-attributes4');
    const attr5 = document.getElementById('result-attributes5');
    const apiResultDiv = document.getElementById('api-result');

    if (!img1 || !img2 || !img3 || !img4 || !img5 || !attr1 || !attr2 || !attr3 || !attr4 || !attr5 || !apiResultDiv) {
        console.error('DOM 元素缺失');
        if (attr1) attr1.innerHTML = '<p>⚠️ 頁面結構錯誤</p>';
        return;
    }

    let fateArray = Array.from({ length: 64 }, (_, i) => i + 1);
    shuffleArray(fateArray);
    const rune1Index = fateArray[0];
    const rune2Index = fateArray[1];
    const rune3Index = fateArray[2];
    const rune4Index = fateArray[3];
    const rune5Index = fateArray[4];

    const runes = getRunes64();
    const rune1 = runes[rune1Index];
    const rune2 = runes[rune2Index];
    const rune3 = runes[rune3Index];
    const rune4 = runes[rune4Index];
    const rune5 = runes[rune5Index];

    const directions = ['正位', '半正位', '半逆位', '逆位'];
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

    try {
        img1.src = '64images/' + rune1.圖檔名稱;
        img2.src = '64images/' + rune2.圖檔名稱;
        img3.src = '64images/' + rune3.圖檔名稱;
        img4.src = '64images/' + rune4.圖檔名稱;
        img5.src = '64images/' + rune5.圖檔名稱;
    } catch (error) {
        console.error('圖片載入失敗：', error);
        attr1.innerHTML = '<p>⚠️ 圖片檔案缺失</p>';
        return;
    }

    const rotateMap = ['rotate(0deg)', 'rotate(90deg)', 'rotate(-90deg)', 'rotate(180deg)'];
    img1.style.transform = rotateMap[orientationNumber1 - 1];
    img2.style.transform = rotateMap[orientationNumber2 - 1];
    img3.style.transform = rotateMap[orientationNumber3 - 1];
    img4.style.transform = rotateMap[orientationNumber4 - 1];
    img5.style.transform = rotateMap[orientationNumber5 - 1];

    attr1.innerHTML = `
        <p>介紹：${rune1.符文名稱}</p>
        <p>卡牌面向：${direction1}</p>
        <p>所屬分組：${rune1.所屬分組}</p>
        <p>符文月相：${rune1.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    attr2.innerHTML = `
        <p>介紹：${rune2.符文名稱}</p>
        <p>卡牌面向：${direction2}</p>
        <p>所屬分組：${rune2.所屬分組}</p>
        <p>符文月相：${rune2.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    attr3.innerHTML = `
        <p>介紹：${rune3.符文名稱}</p>
        <p>卡牌面向：${direction3}</p>
        <p>所屬分組：${rune3.所屬分組}</p>
        <p>符文月相：${rune3.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    attr4.innerHTML = `
        <p>介紹：${rune4.符文名稱}</p>
        <p>卡牌面向：${direction4}</p>
        <p>所屬分組：${rune4.所屬分組}</p>
        <p>符文月相：${rune4.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    attr5.innerHTML = `
        <p>介紹：${rune5.符文名稱}</p>
        <p>卡牌面向：${direction5}</p>
        <p>所屬分組：${rune5.所屬分組}</p>
        <p>符文月相：${rune5.月相}</p>
        <p>真實月相：${realPhase}</p>
    `;

    apiResultDiv.innerHTML = '<p>占卜結果分析中...</p>';

    const fallbackHtml = buildLocalDivination([
        { label: '過去', rune: rune1, direction: direction1 },
        { label: '現在', rune: rune2, direction: direction2 },
        { label: '未來', rune: rune3, direction: direction3 },
        { label: '環境一', rune: rune4, direction: direction4 },
        { label: '環境二', rune: rune5, direction: direction5 }
    ], realPhase);

    const apiHtml = await requestApiOrFallback({
        mode: '5',
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
    }, fallbackHtml);

    apiResultDiv.innerHTML = apiHtml + '<button id="retry-button">重新占卜</button>';

    const retry = document.getElementById('retry-button');
    if (retry) {
        retry.addEventListener('click', () => {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }
});
