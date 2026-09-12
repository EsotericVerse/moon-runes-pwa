import { rune } from "./runes.js";

let direction = {};
let allData = [];

async function ensureLocalData(mode) {
  if (mode === "5card") return;
  if (!Object.keys(direction).length) {
    const mod = await import("./direction64.js");
    direction = mod.direction || {};
  }
  if ((mode === "single" || mode === "daily") && !allData.length) {
    const mod = await import("./rune_all_data_all.js");
    allData = mod.allData || [];
  }
}

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
    console.warn("LunaRunes Lots JSON unavailable; hiding Lots summary.", error);
    lotsMap = new Map();
  }
}

async function loadRuneHints() {
  try {
    const response = await fetch("data/json/core/runes.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.runes) ? payload.runes : []);
    runeHintMap = new Map(items.map(item => [Number(item.編號), item]));
  } catch (error) {
    console.warn("LunaRunes rune hint JSON unavailable; using canonical runtime fallback.", error);
    runeHintMap = new Map();
  }
}

const MODE_CONFIG = {
  single: {
    title: "單卡",
    kicker: "LunaRunes · Single Rune",
    count: 1,
    labels: ["核心"],
    note: "單卡用來回應當下的一個問題或情境，提供一個主要語意切入點。"
  },
  daily: {
    title: "每日符文",
    kicker: "LunaRunes · Daily Rune",
    count: 1,
    labels: ["今日"],
    note: "每日符文回答的是『今天的主題是什麼？』。它不是指示今天一定要做什麼，而是提供一個可觀察、可理解，也可在不知道怎麼做時參考的提示。"
  },
  "2card": {
    title: "雙卡 · 因 → 果",
    kicker: "LunaRunes · Two Cards",
    count: 2,
    labels: ["因", "果"],
    note: "雙卡目前先維持既有的因果結構。"
  },
  "3card": {
    title: "三卡 · 源 → 轉 → 合",
    kicker: "LunaRunes · Three Cards",
    count: 3,
    labels: ["源", "轉", "合"],
    note: "三卡目前先維持既有的源、轉、合結構。"
  },
  "5card": {
    title: "五卡 · 情境展開",
    kicker: "LunaRunes · Five Cards",
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
    Array.from({ length: 66 }, (_, i) => i + 1)
      .filter(id => rune[id]?.符文名稱 && rune[id]?.drawable !== false)
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
  return item?.[DIRECTION_FIELDS[card.direction]] || card.rune?.[DIRECTION_FIELDS[card.direction]] || "目前沒有對應方向說明。";
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

function cardHtml(card, label, realPhase, density = "full", showLots = false) {
  const hint = runeHintMap.get(card.id) || {};
  const minimal = density === "minimal";
  const directionText = minimal ? "" :
    (hint[DIRECTION_FIELDS[card.direction]] || getDirectionText(card));

  const groupText =
    card.rune.分組說明 ||
    "此組目前沒有額外群組說明。";

  const reverseText =
    hint.反向關鍵詞 ||
    card.rune.反向關鍵詞 ||
    "目前沒有額外的反向提醒。";

  const english = hint.英文 || card.rune.英文 || "";

  return `
    <article class="rune-result-card" data-density="${density}">
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
            <span class="rune-result-label">卡片位向</span>
            <span class="rune-result-value">${card.direction}</span>
          </div>
          ${minimal ? "" : `
            <div class="rune-result-field">
              <span class="rune-result-label">所屬分組</span>
              <span class="rune-result-value">${card.rune.所屬分組}</span>
            </div>
            <div class="rune-result-field moon">
              <span class="rune-result-label">卡片月相</span>
              <span class="rune-result-value">${card.rune.月相}</span>
            </div>
          `}
        </div>

        ${minimal ? "" : `
          <div class="rune-result-section">
            <strong>提示句</strong>
            ${directionText}
          </div>
        `}

        ${density === "full" ? `
          <details class="card-details">
            <summary>查看符文詳細資料</summary>
            <div class="card-details-body">
              <div class="rune-result-section group">
                <strong>${card.rune.所屬分組}</strong>
                ${groupText}
              </div>

              <div class="rune-result-section reverse">
                <strong>反向關鍵詞</strong>
                ${reverseText}
              </div>

              ${showLots ? getLotsHtml(card) : ""}
            </div>
          </details>
        ` : ""}
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
    <details class="reading-details">
      <summary>查看五張牌逐張解讀</summary>
      <div class="reading-details-body five-card-details">
        <p><strong>過去：</strong>${fiveCardPositionClause(past, "過去")}</p>
        <p><strong>現在：</strong>${fiveCardPositionClause(present, "現在")}</p>
        <p><strong>未來：</strong>${fiveCardPositionClause(future, "未來")}</p>
        <p><strong>外在：</strong>${fiveCardPositionClause(external, "外在")}</p>
        <p><strong>內在：</strong>${fiveCardPositionClause(internal, "內在")}</p>
      </div>
    </details>
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

async function runRitual(mode) {
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
  const startedAt = Date.now();

  for (let i = 0; i < 5; i++) {
    if (message) message.textContent = messages[i] || "";
    const nextTick = startedAt + ((i + 1) * 1000);
    const wait = Math.max(0, nextTick - Date.now());
    await new Promise(resolve => setTimeout(resolve, wait));
  }

  const remaining = Math.max(0, (startedAt + 5000) - Date.now());
  if (remaining > 0) {
    await new Promise(resolve => setTimeout(resolve, remaining));
  }

  document.body.dataset.drawing = "false";
}

async function requestRenderFive(cards) {
  const payload = {
    mode: "5",
    rune1_id: cards[0].id, rune1_dir: cards[0].directionIndex + 1,
    rune2_id: cards[1].id, rune2_dir: cards[1].directionIndex + 1,
    rune3_id: cards[2].id, rune3_dir: cards[2].directionIndex + 1,
    rune4_id: cards[3].id, rune4_dir: cards[3].directionIndex + 1,
    rune5_id: cards[4].id, rune5_dir: cards[4].directionIndex + 1,
    debug: false
  };
  const response = await fetch("https://moon-runes-pwa.onrender.com/divination", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(data?.detail || "五卡解牌服務暫時無法使用");
  }
  return data.data || {};
}

async function renderResult(mode, config, realPhase) {
  const cards = drawCards(config.count);
  if (cards.length !== config.count) throw new Error("可抽取符文資料不足，請重新整理後再試。");

  const grid = document.getElementById("cards-grid");
  const reading = document.getElementById("reading");
  if (!grid || !reading) throw new Error("抽牌結果區不存在。");

  grid.dataset.count = String(config.count);
  const density = config.count === 1 ? "full" : (config.count === 5 ? "minimal" : "medium");
  grid.innerHTML = cards.map((card, i) =>
    cardHtml(card, config.labels[i], realPhase, density, config.count === 1)
  ).join("");

  const resultRealPhase = document.getElementById("result-real-phase");
  if (resultRealPhase) resultRealPhase.textContent = `真實月相｜${realPhase}`;

  const fiveCardSchema = document.getElementById("five-card-schema");
  if (fiveCardSchema) fiveCardSchema.hidden = config.count !== 5;

  if (mode === "5card") {
    reading.innerHTML = '<div class="reading-lead"><strong>五卡解牌</strong>正在由 Render 進行五個位置的整合判讀…</div>';
    try {
      const remote = await requestRenderFive(cards);
      reading.innerHTML = `
        <div class="reading-lead"><strong>完整現況</strong>${remote["完整現況"] || "—"}</div>
        <p><strong>牌面解說：</strong>${remote["牌面解說"] || "—"}</p>
        <p><strong>占卜結論：</strong>${remote["占卜結論"] || "—"}</p>
      `;
    } catch (error) {
      reading.innerHTML = `<div class="reading-lead"><strong>五卡解牌暫時無法完成</strong>${error.message}</div>`;
    }
  } else {
    reading.innerHTML = config.count === 1
      ? buildSingleReading(cards[0], realPhase, mode === "daily")
      : buildMultiReading(cards, config.labels, realPhase);
  }

  const modeNote = document.getElementById("mode-note");
  if (modeNote) modeNote.textContent = config.note;
  const ritualView = document.getElementById("ritual-view");
  const resultView = document.getElementById("result-view");
  if (ritualView) ritualView.hidden = true;
  if (resultView) resultView.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function executeDraw(mode, config, realPhase) {
  const panel = document.getElementById("draw-result-panel");
  const ritualView = document.getElementById("ritual-view");
  const resultView = document.getElementById("result-view");

  if (!panel) throw new Error("抽牌執行區不存在。");
  panel.hidden = false;
  if (resultView) resultView.hidden = true;
  if (ritualView) ritualView.hidden = false;

  const modeTitle = document.getElementById("mode-title");
  const modeKicker = document.getElementById("mode-kicker");
  if (modeTitle) modeTitle.textContent = config.title;
  if (modeKicker) modeKicker.textContent = config.kicker;

  const ritualPhase = document.getElementById("ritual-phase");
  if (ritualPhase) ritualPhase.textContent = `月相：無 / 真實月相：${realPhase}`;

  panel.scrollIntoView({behavior:"smooth", block:"start"});

  const dataTasks = [];
  if (mode !== "5card") dataTasks.push(ensureLocalData(mode));
  if (mode !== "5card") dataTasks.push(loadRuneHints());
  if (mode === "single" || mode === "daily") dataTasks.push(loadLots());

  await Promise.all([
    runRitual(mode),
    Promise.allSettled(dataTasks).then(results => {
      results.forEach(result => {
        if (result.status === "rejected") console.warn("Optional rune draw data failed to load; continuing with canonical rune data.", result.reason);
      });
    })
  ]);

  await renderResult(mode, config, realPhase);
}

function showDrawError(error) {
  console.error("Rune draw failed", error);
  document.body.dataset.drawing = "false";
  const panel = document.getElementById("draw-result-panel");
  const ritualView = document.getElementById("ritual-view");
  const resultView = document.getElementById("result-view");
  const reading = document.getElementById("reading");
  if (panel) panel.hidden = false;
  if (ritualView) ritualView.hidden = true;
  if (resultView) resultView.hidden = false;
  if (reading) reading.innerHTML = `<div class="reading-lead"><strong>抽牌暫時無法完成</strong>${error?.message || "請重新整理頁面後再試。"}</div>`;
}

async function startDraw(modeValue, updateUrl = false) {
  const mode = normalizeMode(modeValue);
  const config = MODE_CONFIG[mode];
  const realPhase = window.LOCMoonPhase?.getRealPhase() || "未知";
  sessionStorage.setItem("realPhase", realPhase);

  const selector = document.getElementById("draw-mode-selector");
  if (selector) selector.hidden = true;

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    url.hash = "draw";
    history.replaceState(null, "", url);
  }

  try {
    await executeDraw(mode, config, realPhase);
  } catch (error) {
    showDrawError(error);
  }
}

function initRuneDraw() {
  document.querySelectorAll('a.draw-mode-card[href*="mode="]').forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      const url = new URL(link.href, window.location.href);
      startDraw(url.searchParams.get("mode"), true);
    });
  });

  const requestedMode = new URLSearchParams(window.location.search).get("mode");
  if (requestedMode) startDraw(requestedMode, false);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initRuneDraw, { once: true });
} else {
  initRuneDraw();
}
