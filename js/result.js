import { rune } from "./runes64.js";
import { direction } from "./direction64.js";
import { allData } from "./rune_all_data_all.js";

const DIRECTIONS = ["正位", "半正位", "半逆位", "逆位"];
const ROTATIONS = ["rotate(0deg)", "rotate(90deg)", "rotate(-90deg)", "rotate(180deg)"];
const DIRECTION_FIELDS = {
  "正位": "正向表示",
  "半正位": "半正向表示",
  "半逆位": "半逆向表示",
  "逆位": "逆向表示"
};

const MODE_CONFIG = {
  single: {
    title: "單卡",
    kicker: "LOC1 · Single Rune",
    count: 1,
    labels: ["核心"],
    note: "目前以單卡既有資料進行基礎解讀。"
  },
  daily: {
    title: "每日抽牌",
    kicker: "LOC1 · Daily Rune",
    count: 1,
    labels: ["今日"],
    note: "每日模式沿用現有的每日提醒資料。"
  },
  "2card": {
    title: "雙卡 · 因 → 果",
    kicker: "LOC1 · Two Cards",
    count: 2,
    labels: ["因", "果"],
    note: "雙卡目前先維持既有的因果結構。"
  },
  "3card": {
    title: "三卡 · 源 → 轉 → 合",
    kicker: "LOC1 · Three Cards",
    count: 3,
    labels: ["源", "轉", "合"],
    note: "三卡目前先維持既有的源、轉、合結構。"
  },
  "5card": {
    title: "五卡 · 情境展開",
    kicker: "LOC1 · Five Cards",
    count: 5,
    labels: ["過去", "現在", "未來", "環境一", "環境二"],
    note: "五卡目前先使用既有的過去／現在／未來＋兩張環境牌排列；完整五卡 RAG 完成後再更新語意模型。"
  }
};

function normalizeMode(value) {
  if (value === "daily" || value === "2card" || value === "3card" || value === "5card") return value;
  return "single";
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function drawCards(count) {
  const ids = shuffle(
    Array.from({ length: 64 }, (_, i) => i + 1)
      .filter(id => rune[id]?.符文名稱)
  ).slice(0, count);

  return ids.map(id => {
    const directionIndex = Math.floor(Math.random() * 4);
    return {
      id,
      rune: rune[id],
      direction: DIRECTIONS[directionIndex],
      directionIndex
    };
  });
}

function getDirectionText(card) {
  const item = direction[card.id];
  return item?.[DIRECTION_FIELDS[card.direction]] || "目前沒有對應方向說明。";
}

function getPhaseInfo(card, realPhase) {
  const data = allData.find(item => item.符文名稱 === card.rune.符文名稱);
  const directionData = data?.卡牌方向?.find(item => item.方向 === card.direction);
  return directionData?.現況?.find(item => item.現在月相 === realPhase) || null;
}

function cardHtml(card, label) {
  return `
    <article class="rune-card">
      <span class="position">${label}</span>
      <div class="card-image">
        <img src="64images/${card.rune.圖檔名稱}" alt="${card.rune.符文名稱}之符文" style="transform:${ROTATIONS[card.directionIndex]}" />
      </div>
      <div class="card-meta">
        <strong>${card.rune.符文名稱}</strong><br>
        ${card.direction} · ${card.rune.所屬分組}<br>
        卡片月相：${card.rune.月相}
      </div>
    </article>
  `;
}

function buildSingleReading(card, realPhase, daily = false) {
  const directionText = getDirectionText(card);
  const info = getPhaseInfo(card, realPhase);

  if (daily && info) {
    return `
      <h2>今日語意</h2>
      <p><strong>狀況：</strong>${info.狀況形容}</p>
      <p><strong>提醒：</strong>${info.每日占卜提醒}</p>
      <p><strong>引導：</strong>${info.每日占卜引導}</p>
      <p><strong>祝福：</strong>${info.每日占卜祝福}</p>
    `;
  }

  return `
    <h2>單卡解讀</h2>
    <p><strong>占卜結論：</strong>${card.rune.符文名稱}・${card.direction}：${directionText}</p>
    <p><strong>靈魂課題：</strong>${card.rune.靈魂課題 || "—"}</p>
    <p><strong>實踐挑戰：</strong>${card.rune.實踐挑戰 || "—"}</p>
    ${info ? `<p><strong>當下提醒：</strong>${info.狀況形容}</p>` : ""}
  `;
}

function buildMultiReading(cards, labels, realPhase) {
  const count = cards.length;
  const names = cards.map((card, i) => `${labels[i]}「${card.rune.符文名稱}」${card.direction}`).join("、");
  const details = cards.map((card, i) => {
    const text = getDirectionText(card);
    return `<p><strong>${labels[i]}：</strong>「${card.rune.符文名稱}」${card.direction}。 ${text}</p>`;
  }).join("");

  let structure = "";
  if (count === 2) {
    structure = "先看造成現況的「因」，再看它導向的「果」。";
  } else if (count === 3) {
    structure = "依序閱讀「源 → 轉 → 合」，先找起點，再看轉化，最後看收束。";
  } else {
    structure = "目前先以「過去／現在／未來」作主線，再由兩張環境牌補充外部影響；此版先求排列清楚，不做新的五卡 RAG 推論。";
  }

  return `
    <h2>牌面解讀</h2>
    <p><strong>完整現況：</strong>${names}。目前真實月相為${realPhase}。</p>
    <p><strong>閱讀方式：</strong>${structure}</p>
    ${details}
  `;
}

async function runRitual(config) {
  const messages = [
    `目前使用「${config.title}」模式。`,
    "請把注意力放在現在真正想問的事情。",
    "月符正在建立這次抽取的語意位置。",
    "讓答案先出現，再決定要怎麼理解。",
    "抽取完成。"
  ];

  const message = document.getElementById("ritual-message");
  for (const text of messages) {
    message.textContent = text;
    await new Promise(resolve => setTimeout(resolve, 900));
  }
}

function renderResult(mode, config, realPhase) {
  const cards = drawCards(config.count);
  const grid = document.getElementById("cards-grid");
  const reading = document.getElementById("reading");

  grid.dataset.count = String(config.count);
  grid.innerHTML = cards.map((card, i) => cardHtml(card, config.labels[i])).join("");

  reading.innerHTML = config.count === 1
    ? buildSingleReading(cards[0], realPhase, mode === "daily")
    : buildMultiReading(cards, config.labels, realPhase);

  document.getElementById("mode-note").textContent = config.note;
  document.getElementById("ritual-view").hidden = true;
  document.getElementById("result-view").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const mode = normalizeMode(params.get("mode"));
  const config = MODE_CONFIG[mode];
  const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";

  sessionStorage.setItem("realPhase", realPhase);

  document.title = `LOC1｜${config.title}`;
  document.getElementById("mode-title").textContent = config.title;
  document.getElementById("mode-kicker").textContent = config.kicker;
  document.getElementById("moon-phase").textContent = `真實月相：${realPhase}`;

  await runRitual(config);
  renderResult(mode, config, realPhase);

  document.getElementById("retry-button").addEventListener("click", () => {
    window.location.reload();
  });
});
