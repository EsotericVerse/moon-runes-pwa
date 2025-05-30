fetch('data/runes.json')
  .then(response => response.json())
  .then(data => {
    const rune = data[Math.floor(Math.random() * data.length)];
    const app = document.getElementById('app');
    app.innerHTML = `
      <h1>您抽到的符文是：${rune.name}</h1>
      <p>關鍵詞：${rune.keywords}</p>
      <p>顯化形式：${rune.meaning}</p>
      <p>月相：${rune.moon_phase}</p>
      <p>靈魂課題：${rune.lesson}</p>
      <p>神話風格背景故事：${rune.myth}</p>
      <p>配套儀式建議：${rune.ritual}</p>
      <p>能量調和建議：${rune.healing}</p>
      <img src="${rune.image}" alt="${rune.name}" style="max-width: 80vw; height: auto; margin-top: 1rem;">
    `;
  })
  .catch(error => {
    console.error("載入 runes.json 失敗：", error);
  });
