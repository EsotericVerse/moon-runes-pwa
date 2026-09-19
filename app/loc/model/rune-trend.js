// Deterministic LunaRunes trend grammar.
// This module intentionally uses discrete rules only: no scores, weights, or API calls.

const DIRECTIONS = ['正位', '半正位', '半逆位', '逆位'];

const INVERT_DIRECTION = Object.freeze({
  '正位': '逆位',
  '半正位': '半逆位',
  '半逆位': '半正位',
  '逆位': '正位'
});

const LEVEL = Object.freeze({
  '逆位': -2,
  '半逆位': -1,
  '半正位': 1,
  '正位': 2
});

function normalizeFace(value) {
  const face = String(value || '').trim();
  if (face === '反面' || face === '負向') return '負面';
  if (face === '正向') return '正面';
  if (face === '中立') return '中平';
  return face || '中平';
}

export function runeJudgement(card, direction) {
  const face = normalizeFace(card?.卡片屬性);
  const position = DIRECTIONS.includes(direction) ? direction : '正位';

  if (face === '未知') return '未知';
  if (face === '負面') return INVERT_DIRECTION[position];
  // 正面與中平均保留卡片位置；中平的內容差異由符文本義 / lots 解釋。
  return position;
}

function repeatedTrend(face, position, judgement) {
  if (position === '半正位') return '持續上升';
  if (position === '半逆位') return '持續下降';
  if (judgement === '正位') return face === '負面' ? '穩定改善' : '穩定良好';
  if (judgement === '逆位') return face === '負面' ? '持續不利' : '持續不利';
  return '延續';
}

export function runeTrend(causeCard, causeDirection, resultCard, resultDirection) {
  const causeFace = normalizeFace(causeCard?.卡片屬性);
  const resultFace = normalizeFace(resultCard?.卡片屬性);
  const causeJudgement = runeJudgement(causeCard, causeDirection);
  const resultJudgement = runeJudgement(resultCard, resultDirection);

  if (causeJudgement === '未知' || resultJudgement === '未知') {
    return { trend: '未明', judgement: resultJudgement === '未知' ? '未知' : resultJudgement };
  }

  if (causeFace === resultFace && causeDirection === resultDirection) {
    return {
      trend: repeatedTrend(causeFace, causeDirection, resultJudgement),
      judgement: resultJudgement
    };
  }

  // 面向真正跨越時，先保留「變好 / 變差」的價值。
  // 例：負面逆位 → 正面正位 = 變好。
  if (causeFace === '負面' && resultFace === '正面') {
    if (LEVEL[resultJudgement] >= LEVEL[causeJudgement]) {
      return { trend: '變好', judgement: resultJudgement };
    }
  }
  if (causeFace === '正面' && resultFace === '負面') {
    if (LEVEL[resultJudgement] <= LEVEL[causeJudgement]) {
      return { trend: '變差', judgement: resultJudgement };
    }
  }

  // 中平介入代表條件性質改變；趨勢仍由最後落點呈現。
  if (causeFace !== resultFace && (causeFace === '中平' || resultFace === '中平')) {
    return { trend: '轉折', judgement: resultJudgement };
  }

  const causeLevel = LEVEL[causeJudgement];
  const resultLevel = LEVEL[resultJudgement];

  if (resultLevel > causeLevel) {
    return { trend: '轉好', judgement: resultJudgement };
  }
  if (resultLevel < causeLevel) {
    return { trend: '轉差', judgement: resultJudgement };
  }

  return { trend: causeFace === resultFace ? '延續' : '轉折', judgement: resultJudgement };
}

export function spreadRuneTrend(cards, directions, mode) {
  if (!Array.isArray(cards) || !Array.isArray(directions)) return null;

  if (mode === '2card' && cards.length >= 2) {
    return {
      ...runeTrend(cards[0], directions[0], cards[1], directions[1]),
      sourceIndex: 0,
      resultIndex: 1,
      variableIndex: null
    };
  }

  if (mode === '3card' && cards.length >= 3) {
    // 三卡的「轉」是變數；趨勢只比較「源 → 合」。
    return {
      ...runeTrend(cards[0], directions[0], cards[2], directions[2]),
      sourceIndex: 0,
      resultIndex: 2,
      variableIndex: 1
    };
  }

  return null;
}
