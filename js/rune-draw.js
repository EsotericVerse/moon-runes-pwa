import { rune } from "./runes66.js";

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
    const response = await fetch("data/json/core/runes66.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.runes) ? payload.runes : []);
    runeHintMap = new Map(items.map(item => [Number(item.編號), item]));
  } catch (error) {
    console.warn("LunaRunes rune hint JSON unavailable; using local JS fallback.", error);
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
