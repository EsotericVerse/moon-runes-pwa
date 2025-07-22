import { rune } from './runes64.js';
import { direction } from './direction64.js';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const realPhase = sessionStorage.getItem("realPhase");
  if (!realPhase) {
    window.location.href = "index.html";
    return;
  }
  sessionStorage.removeItem("realPhase");

  const img = document.getElementById("result-image");
  const attr = document.getElementById("result-attributes");
  const desc = document.getElementById("result-description");
  const retry = document.getElementById("retry-button");

  // 生成隨機符文編號（1～64）
  let fateArray = Array.from({ length: 64 }, (_, i) => i + 1);
  shuffleArray(fateArray);
  shuffleArray(fateArray);
  shuffleArray(fateArray);
  const selectedIndex = fateArray[Math.floor(Math.random() * fateArray.length)];

  // 取得符文資料
  const selectedRune = rune[selectedIndex]; 

  // 方向設定
  const directions = ["正位", "半正位", "半逆位", "逆位"];
  const directionMeanings = {
    "正位": "能量順行。主題自然流動、力量顯現、外顯無礙。",
    "半正位": "初生漸顯。潛能正在凝聚、尚未完全流動，代表準備與開始。",
    "半逆位": "釋放收束。能量正在退潮、進入整合期，是轉化與療癒階段。",
    "逆位": "能量阻滯。主題反向顯現、力量扭曲、潛藏或危機感浮現。"
  };
  const orientationFieldMap = {
    "正位": "正向表示",
    "半正位": "半正向表示",
    "半逆位": "半逆向表示",
    "逆位": "逆向表示"
  };

  const directionIndex = Math.floor(Math.random() * 4);
  const orientationNumber = directionIndex + 1;
  
  const directionStr = directions[directionIndex];
  const directionText = directionMeanings[direction];

  const dirInfo = direction[selectedIndex] || { "正向表示": "無對應解釋1", "半正向表示": "無對應解釋2", "半逆向表示": "無對應解釋3", "逆向表示": "無對應解釋4" };
  const directionResult = dirInfo[orientationFieldMap[direction]] || "無對應解釋5";

  // 硬編碼 moon.json
  const moonData = {
    "新月": {
      "新月": "當新月遇上新月卡，萬象初生，一切由零開始。",
      "上弦": "新月時抽到上弦卡，代表你準備行動，但基礎尚未穩固。",
      "滿月": "新月遇滿月卡，顯示你渴望結果，但時機未至。",
      "下弦": "新月對下弦卡，代表回顧與整頓之間的矛盾。"
    },
    "上弦": {
      "新月": "上弦時抽到新月卡，象徵需要重新檢視起點。",
      "上弦": "上弦時遇上弦卡，雙倍的行動力與挑戰！",
      "滿月": "上弦遇滿月卡，事情開始進展，請保持專注。",
      "下弦": "上弦對下弦卡，有一種左右為難的拉扯感。"
    },
    "滿月": {
      "新月": "滿月時抽到新月卡，代表收穫中隱藏著新的開始。",
      "上弦": "滿月時遇上弦卡，事情發展迅速，但你可能忽略了某些細節。",
      "滿月": "滿月遇滿月卡，情緒與能量達到頂峰，小心過度膨脹。",
      "下弦": "滿月對下弦卡，顯示該收手或整理階段已經來臨。"
    },
    "下弦": {
      "新月": "下弦時抽到新月卡，你可能忽略了結束所帶來的禮物。",
      "上弦": "下弦時遇上弦卡，是來自過去與未來的對話。",
      "滿月": "下弦遇滿月卡，象徵你還沉浸在過去的情緒中。",
      "下弦": "下弦遇下弦卡，是讓步、反省、與轉化的重疊時刻。"
    },
    "空亡": {
      "新月": "空亡遇新月卡，萬象沉靜，等待真正的開始。",
      "上弦": "空亡時遇上弦卡，努力或許無法馬上見效。",
      "滿月": "空亡對滿月卡，顯示成果難以預期，須靜待時機。",
      "下弦": "空亡對下弦卡，象徵你在無聲中學會放手與釋懷。"
    }
  };

  const moonComparison = (moonData[realPhase] && moonData[realPhase][selectedRune.月相]) || "無比對結果";

  img.src = "64images/" + selectedRune.圖檔名稱;
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
    <p>介紹：${selectedRune.符文名稱}</p>
    <p>卡牌面向：${directionStr}</p>
    <p>所屬分組：${selectedRune.所屬分組}</p>
    <p>符文月相：${selectedRune.月相}</p>
    <p>真實月相：${realPhase}</p>
  `;

  const detailHTML = `
    <p><strong>歷史：</strong>${selectedRune.符文變化歷史}</p>
    <p><strong>故事：</strong>${selectedRune.神話故事}</p>
    <p><strong>靈魂咒語：</strong>${selectedRune.靈魂咒語}</p>
    <p><strong>分組說明：</strong>${selectedRune.分組說明}</p>
    <p><strong>靈魂課題：</strong>${selectedRune.靈魂課題}</p>
    <p><strong>實踐挑戰：</strong>${selectedRune.實踐挑戰}</p>
    <p><strong>配套儀式：</strong>${selectedRune.配套儀式建議}</p>
    <p><strong>能量調和：</strong>${selectedRune.能量調和建議}</p>
    <hr>
    <p>月相比對趨勢：${moonComparison}</p>
    <p>占卜結論：${selectedRune.符文名稱}，${direction} 表示，${directionResult}</p>
    <hr>
  `;

  desc.innerHTML = detailHTML;

  retry.addEventListener("click", () => {
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  });
});