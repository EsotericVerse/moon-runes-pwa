let runes = [];

fetch('data/runes_full_extended_final.json')
  .then(res => res.json())
  .then(data => runes = data)
  .catch(err => console.error("無法載入符文資料:", err));

function drawCard() {
  if (runes.length === 0) {
    alert("符文資料尚未載入完成，請稍候。");
    return;
  }

  const index = Math.floor(Math.random() * runes.length);
  const rune = runes[index];

  const cardHTML = `
    <img src="${rune.image}" alt="${rune.name}" class="card-img">
    <div class="result">
      <h2>${rune.symbol} ${rune.name} (${rune.english})</h2>
      <p><strong>靈魂咒語：</strong>${rune.meaning}</p>
      <p><strong>插圖描述：</strong>${rune.illustration}</p>
      <p><strong>靈魂課題：</strong>${rune.soulLesson}</p>
      <p><strong>神話背景：</strong>${rune.mythBackground}</p>
      <p><strong>儀式建議：</strong>${rune.ritualSuggestion}</p>
      <p><strong>能量調和：</strong>${rune.harmonyAdvice}</p>
    </div>
  `;

  document.getElementById("cardArea").innerHTML = cardHTML;
}
