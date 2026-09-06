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

let runeHintMap = new Map();
let lotsMap = new Map();

async function loadLots() {
  try {
    const response = await fetch("data/json/core/lots.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    lotsMap = new Map(items.map(item => [Number(item.編號), item]));
  } catch (error) {
    console.warn("LOC1 Lots JSON unavailable; hiding Lots summary.", error);
    lotsMap = new Map();
  }
}

async function loadRuneHints() {
  try {
    const response = await fetch("data/json/core/runes64.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.runes) ? payload.runes : []);
    runeHintMap = new Map(items.map(item => [Number(item.編號), item]));
  } catch (error) {
    console.warn("LOC1 rune hint JSON unavailable; using local JS fallback.", error);
    runeHintMap = new Map();
  }
}

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
    labels: ["過去", "現在", "未來", "外在", "內在"],
    note: "五卡以「過去 → 現在 → 未來」為時間主線，外在與內在作為同時作用的兩個條件層。"
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

function getLotsHtml(card) {
  const item = lotsMap.get(card.id);
  const lots = item?.方向?.[card.direction];
  if (!lots) return "";

  const categories = ["愛情", "事業", "關係", "健康"];
  const rows = categories
    .filter(category => lots[category])
    .map(category => `
      <div class="rune-lots-item">
        <span>${category}</span>
        <strong>${lots[category]}</strong>
      </div>
    `)
    .join("");

  if (!rows) return "";

  return `
    <div class="rune-result-section lots">
      <strong>籤詩分類</strong>
      <div class="rune-lots-grid">${rows}</div>
    </div>
  `;
}

function cardHtml(card, label, realPhase, showLots = false) {
  const hint = runeHintMap.get(card.id) || {};
  const directionText =
    hint[DIRECTION_FIELDS[card.direction]] ||
    getDirectionText(card);

  const groupText =
    card.rune.分組說明 ||
    "此組目前沒有額外群組說明。";

  const reverseText =
    hint.反向含義 ||
    "目前沒有額外的反向提醒。";

  const english = hint.英文 || card.rune.英文 || "";

  return `
    <article class="rune-result-card">
      <span class="rune-result-position">${label}</span>

      <div class="rune-result-image">
        <img
          src="64images/${card.rune.圖檔名稱}"
          alt="${card.rune.符文名稱}之符文"
          style="transform:${ROTATIONS[card.directionIndex]}"
        />
      </div>

      <div class="rune-result-body">
        <h2 class="rune-result-name">
          ${card.rune.符文名稱}
          ${english ? `<small>${english}</small>` : ""}
        </h2>

        <div class="rune-result-grid">
          <div class="rune-result-field">
            <span class="rune-result-label">卡片方向</span>
            <span class="rune-result-value">${card.direction}</span>
          </div>
          <div class="rune-result-field">
            <span class="rune-result-label">所屬分組</span>
            <span class="rune-result-value">${card.rune.所屬分組}組</span>
          </div>
          <div class="rune-result-field moon">
            <span class="rune-result-label">卡片月相</span>
            <span class="rune-result-value">${card.rune.月相}</span>
          </div>
          <div class="rune-result-field moon">
            <span class="rune-result-label">真實月相</span>
            <span class="rune-result-value">${realPhase}</span>
          </div>
        </div>

        <div class="rune-result-section">
          <strong>提示句</strong>
          ${directionText}
        </div>

        <details class="card-details">
          <summary>查看符文詳細資料</summary>
          <div class="card-details-body">
            <div class="rune-result-section group">
              <strong>${card.rune.所屬分組}組</strong>
              ${groupText}
            </div>

            <div class="rune-result-section reverse">
              <strong>另一面／反向提醒</strong>
              ${reverseText}
            </div>

            ${showLots ? getLotsHtml(card) : ""}
          </div>
        </details>
      </div>
    </article>
  `;
}

function buildSingleReading(card, realPhase, daily = false) {
  const directionText = getDirectionText(card);
  const info = getPhaseInfo(card, realPhase);

  if (daily) {
    if (!info) {
      return `
        <div class="reading-lead">
          <strong>今日提示</strong>
          目前無法載入今日月相對應資料。
        </div>
      `;
    }

    return `
      <div class="reading-lead">
        <strong>今日核心</strong>
        ${info.每日占卜提醒 || info.狀況表達 || info.狀況形容}
      </div>
      <div class="advice-grid">
        <div class="advice-item"><strong>狀況</strong><span>${info.狀況形容}</span></div>
        <div class="advice-item"><strong>表達</strong><span>${info.狀況表達}</span></div>
        <div class="advice-item"><strong>引導</strong><span>${info.每日占卜引導}</span></div>
        <div class="advice-item"><strong>祝福</strong><span>${info.每日占卜祝福}</span></div>
      </div>
    `;
  }

  return `
    <div class="reading-lead">
      <strong>占卜結論｜${card.rune.符文名稱}・${card.direction}</strong>
      ${directionText}
    </div>

    ${info ? `
      <div class="advice-grid">
        <div class="advice-item"><strong>愛情</strong><span>${info.愛情建議}</span></div>
        <div class="advice-item"><strong>事業</strong><span>${info.事業建議}</span></div>
        <div class="advice-item"><strong>心理</strong><span>${info.心理建議}</span></div>
        <div class="advice-item"><strong>健康</strong><span>${info.健康建議}</span></div>
        <div class="advice-item"><strong>生活</strong><span>${info.生活建議}</span></div>
      </div>
    ` : ""}

    <details class="reading-details">
      <summary>查看符文背景資料</summary>
      <div class="reading-details-body">
        <p><strong>歷史：</strong>${card.rune.符文變化歷史 || "—"}</p>
        <p><strong>故事：</strong>${card.rune.神話故事 || "—"}</p>
        <p><strong>靈魂咒語：</strong>${card.rune.靈魂咒語 || "—"}</p>
        <p><strong>靈魂課題：</strong>${card.rune.靈魂課題 || "—"}</p>
        <p><strong>實踐挑戰：</strong>${card.rune.實踐挑戰 || "—"}</p>
      </div>
    </details>
  `;
}

function toNarrativeCore(card) {
  const raw = getDirectionText(card)
    .replace(/[。！？]+$/g, "")
    .trim();

  return raw
    .replace(/^我(?=與|在|正|開始|逐漸|感|看|聽|覺|願|能|會|已|仍|將|對|被|把|讓|從|以|失|逃|拒|壓|忽|迷|清|珍|擁|接|學|勇|專|持|面|承|順|相|回|找|守|展|放|斬|保|選|領|接納)/, "")
    .replace(/我的/g, "自身的")
    .replace(/我自己/g, "自身")
    .replace(/自己/g, "自身")
    .replace(/讓我/g, "讓自身")
    .replace(/^正在/, "正處於")
    .replace(/^開始/, "開始")
    .replace(/^逐漸/, "逐漸");
}

function fiveCardPositionClause(card, position) {
  const name = card.rune.符文名稱;
  const core = toNarrativeCore(card);

  switch (position) {
    case "過去":
      return `過去以「${name}」${card.direction}為背景，曾呈現出「${core}」的狀態；它構成了現在局勢的一部分前因。`;
    case "現在":
      return `現在的核心落在「${name}」${card.direction}：${core}。這是此刻最需要辨認與處理的主題。`;
    case "未來":
      return `若目前走勢延續，「${name}」${card.direction}顯示接下來可能朝「${core}」的方向發展；它描述的是趨勢，而不是固定結果。`;
    case "外在":
      return `外在條件由「${name}」${card.direction}呈現：${core}。這股力量來自環境、他人或現實條件，會影響時間主線如何展開。`;
    case "內在":
      return `內在狀態由「${name}」${card.direction}呈現：${core}。它反映自身目前的態度、需求或心理位置，也會改變對外在局勢的回應方式。`;
    default:
      return `「${name}」${card.direction}：${core}。`;
  }
}

function buildFiveCardReading(cards, realPhase) {
  const [past, present, future, external, internal] = cards;
  const pastCore = toNarrativeCore(past);
  const presentCore = toNarrativeCore(present);
  const futureCore = toNarrativeCore(future);
  const externalCore = toNarrativeCore(external);
  const internalCore = toNarrativeCore(internal);

  return `
    
    <p><strong>時間主線：</strong>
      過去的「${past.rune.符文名稱}」${past.direction}指出，曾有「${pastCore}」的背景；
      到了現在，「${present.rune.符文名稱}」${present.direction}把重點帶到「${presentCore}」。
      若目前走勢延續，未來的「${future.rune.符文名稱}」${future.direction}則顯示局勢可能朝「${futureCore}」發展。
    </p>
    <p><strong>內外作用：</strong>
      外在的「${external.rune.符文名稱}」${external.direction}顯示「${externalCore}」；
      內在的「${internal.rune.符文名稱}」${internal.direction}則顯示「${internalCore}」。
      前者描述環境與他人的作用，後者描述自身如何承接與回應，因此兩者會共同改變前三張時間主線的實際走向。
    </p>
    <p><strong>閱讀原則：</strong>
      先處理現在牌所指出的核心，再觀察外在與內在是否彼此拉扯或互相支持；未來牌視為延續目前條件後的趨勢，不作絕對斷定。本次真實月相為${realPhase}。
    </p>
    <div class="five-card-details">
      <p><strong>過去：</strong>${fiveCardPositionClause(past, "過去")}</p>
      <p><strong>現在：</strong>${fiveCardPositionClause(present, "現在")}</p>
      <p><strong>未來：</strong>${fiveCardPositionClause(future, "未來")}</p>
      <p><strong>外在：</strong>${fiveCardPositionClause(external, "外在")}</p>
      <p><strong>內在：</strong>${fiveCardPositionClause(internal, "內在")}</p>
    </div>
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
    structure = "多卡依既定位置閱讀。";
  }

  return `
    
    <p><strong>完整現況：</strong>${names}。目前真實月相為${realPhase}。</p>
    <p><strong>閱讀方式：</strong>${structure}</p>
    ${details}
  `;
}

async function runRitual(mode, config) {
  document.body.dataset.drawing = "true";

  const messagesByMode = {
    single: [
      "您目前使用的是「單卡占卜模式」。",
      "占卜中，請稍等片刻，馬上就好……",
      "正在找尋那命運之線……",
      "微弱的月光，會在漆黑的夜裡，帶領你找到方向。",
      "抓到命運絲線的軌跡了，現在呈現。"
    ],
    daily: [
      "您目前使用的是「單卡每日抽牌模式」。",
      "抽牌中，請稍等片刻，馬上就好……",
      "這是一張屬於今日節奏與提醒的指引牌。",
      "微弱的月光，會在漆黑的夜裡，帶領你找到方向。",
      "今日月符已經抽取完成。"
    ],
    "2card": [
      "您目前使用的是「雙卡占卜模式」。",
      "占卜中，請稍等片刻，馬上就好……",
      "第一張卡牌為「因」，第二張卡牌為「果」。",
      "正在整理兩張牌之間的前後關係。",
      "抓到命運絲線的軌跡了，現在呈現。"
    ],
    "3card": [
      "您目前使用的是「三卡占卜模式」。",
      "占卜中，請稍等片刻，馬上就好……",
      "第一張為「源」，第二張為「轉」，第三張為「合」。",
      "正在整理這次抽取的變化路徑。",
      "抓到命運絲線的軌跡了，現在呈現。"
    ],
    "5card": [
      "您目前使用的是「五卡占卜模式」。",
      "占卜中，請稍等片刻，馬上就好……",
      "前三張依序觀看過去、現在與未來。",
      "第四張看外在條件，第五張看內在狀態。",
      "正在把時間主線與內外條件整合成完整解讀。"
    ]
  };

  const messages = messagesByMode[mode] || messagesByMode.single;
  const message = document.getElementById("ritual-message");
  for (let i = 0; i < messages.length; i++) {
    const secondsLeft = Math.max(1, messages.length - i);
    message.textContent = `${messages[i]}（約 ${secondsLeft} 秒）`;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  document.body.dataset.drawing = "false";
}

function renderResult(mode, config, realPhase) {
  const cards = drawCards(config.count);
  const grid = document.getElementById("cards-grid");
  const reading = document.getElementById("reading");

  grid.dataset.count = String(config.count);
  grid.innerHTML = cards.map((card, i) => cardHtml(card, config.labels[i], realPhase, config.count === 1)).join("");

  reading.innerHTML = config.count === 1
    ? buildSingleReading(cards[0], realPhase, mode === "daily")
    : config.count === 5
      ? buildFiveCardReading(cards, realPhase)
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
  const moonPhase = document.getElementById("moon-phase");
  if (moonPhase) {
    moonPhase.textContent = `本次真實月相｜${realPhase}`;
  }
  const ritualPhase = document.getElementById("ritual-phase");
  if (ritualPhase) {
    ritualPhase.textContent = `月相：無 / 真實月相：${realPhase}`;
  }

  await Promise.all([
    runRitual(mode, config),
    loadRuneHints(),
    loadLots()
  ]);
  renderResult(mode, config, realPhase);

  document.getElementById("retry-button").addEventListener("click", () => {
    window.location.reload();
  });
});
