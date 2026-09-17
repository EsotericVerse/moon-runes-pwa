export const SLOT_LABELS = ['源', '轉', '合'];

export function drawEvent(events, previousId) {
  const pool = previousId && events.length > 1 ? events.filter((event) => event.event_id !== previousId) : events;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function drawHand(runes, size = 7) {
  const pool = [...runes];
  const hand = [];
  while (pool.length && hand.length < size) {
    hand.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return hand;
}

export function buildConstruction(cards) {
  if (cards.length !== 3) return null;
  return cards.map((card, index) => ({ slot: SLOT_LABELS[index], card }));
}

export function constructionText(cards) {
  if (cards.length !== 3) return '';
  return `源「${cards[0].符文名稱}」→ 轉「${cards[1].符文名稱}」→ 合「${cards[2].符文名稱}」`;
}

export function runeSemanticText(card) {
  return [card.符文說明, card.正向關鍵詞].filter(Boolean).join('｜');
}
