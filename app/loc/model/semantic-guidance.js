// Shared deterministic guidance engine for LunaRunes spreads.
// No API, no Render, no generated combination database.

export const DIRECTION_FACTOR = Object.freeze({
  '正位': 1,
  '半正位': 0.5,
  '半逆位': -0.5,
  '逆位': -1
});

const POLARITY_SCORE = Object.freeze({
  '正面': 1,
  '正向': 1,
  '中平': 0,
  '中立': 0,
  '負面': -1,
  '反面': -1,
  '負向': -1
});

export const SPREAD_WEIGHTS = Object.freeze({
  1: [1],
  2: [1, 1.25],
  3: [1, 1.5, 1.25],
  5: [1, 1, 1, 1, 1],
  11: [1, 1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5, 1.5]
});

export const GUIDANCE_RANGES = Object.freeze([
  { min: 0.5, key: 'positive', label: '正向' },
  { min: 0, key: 'slightly_positive', label: '微正' },
  { min: -0.5, key: 'slightly_negative', label: '微負' },
  { min: -Infinity, key: 'negative', label: '負向' }
]);

export function polarityScore(value) {
  return POLARITY_SCORE[String(value || '').trim()] ?? 0;
}

export function directionFactor(direction) {
  return DIRECTION_FACTOR[String(direction || '').trim()] ?? 0;
}

export function cardSemanticScore(card, direction) {
  return polarityScore(card?.['卡片屬性']) * directionFactor(direction);
}

export function guidanceRange(score) {
  return GUIDANCE_RANGES.find(range => score >= range.min) || GUIDANCE_RANGES.at(-1);
}

export function evaluateSpread(cards, directions, customWeights) {
  const weights = customWeights || SPREAD_WEIGHTS[cards.length] || Array(cards.length).fill(1);
  const rows = cards.map((card, index) => {
    const semantic = cardSemanticScore(card, directions[index]);
    const weight = Number(weights[index] ?? 1);
    return { card, direction: directions[index], semantic, weight, weighted: semantic * weight };
  });
  const weightTotal = rows.reduce((sum, row) => sum + row.weight, 0) || 1;
  const score = rows.reduce((sum, row) => sum + row.weighted, 0) / weightTotal;
  return { score, range: guidanceRange(score), rows, weights };
}

export function lotFieldForDirection(direction) {
  return ({
    '正位': '正向表示',
    '半正位': '半正向表示',
    '半逆位': '半逆向表示',
    '逆位': '逆向表示'
  })[direction] || '正向表示';
}

export function finalGuidance(lots, card, direction) {
  const id = Number(card?.['編號']);
  const name = card?.['符文名稱'] || card?.['名稱'];
  const lot = (lots || []).find(row => Number(row?.['編號']) === id || row?.['名稱'] === name);
  return lot?.[lotFieldForDirection(direction)] || '';
}

export function splitDomainGuidance(text) {
  return String(text || '')
    .split(/[\n]/)
    .flatMap(line => line.split(/(?=(?:愛情|事業|關係|健康)：)/))
    .map(value => value.trim())
    .filter(Boolean);
}
