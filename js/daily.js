window.addEventListener('load', async () => {
  try {
    const res = await fetch('data/runes64.json');
    const runes = await res.json();
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);
    const index = dayOfYear % runes.length;
    const rune = runes[index];

    const img = document.createElement('img');
    img.src = '64images/' + rune['圖檔名稱'];
    img.alt = rune['符文名稱'];
    document.getElementById('daily-image').appendChild(img);

    const info = `
      <p>今日符文：${rune['符文名稱']}</p>
      <p>所屬分組：${rune['所屬分組']}</p>
      <p>靈魂課題：${rune['靈魂課題']}</p>
      <p>實踐挑戰：${rune['實踐挑戰']}</p>
    `;
    document.getElementById('daily-info').innerHTML = info;
  } catch (err) {
    console.error(err);
    document.getElementById('daily-info').textContent = '⚠️ 無法載入每日符文';
  }
});
