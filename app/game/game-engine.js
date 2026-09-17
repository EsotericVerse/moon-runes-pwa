import { EVENTS, GROUP_TO_MACRO, RESULT_DE, ROUND_PLAN } from './game-data';

export function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function normalizeRune(raw) {
  return {
    id: Number(raw['編號']),
    name: raw['符文名稱'],
    english: raw['英文'],
    group: raw['所屬分組'],
    macro: GROUP_TO_MACRO[raw['所屬分組']] || null,
    action: raw['角色行動'] || '',
  };
}

export function createPlayer(name, runes) {
  const deck = shuffle(runes.filter((rune) => rune.id >= 1 && rune.id <= 66));
  return { name, de: 0, star: false, deck, hand: deck.slice(0, 8), discard: [], setupDiscardRemaining: 3 };
}

export function finalizeOpeningHand(player, discardIds) {
  if (discardIds.length !== 3) throw new Error('起手必須從 8 張中棄 3 張。');
  const ids = new Set(discardIds);
  if (ids.size !== 3 || discardIds.some((id) => !player.hand.some((card) => card.id === id))) throw new Error('起手棄牌不合法。');
  const discarded = player.hand.filter((card) => ids.has(card.id));
  return { ...player, hand: player.hand.filter((card) => !ids.has(card.id)), discard: [...player.discard, ...discarded], deck: player.deck.slice(8), setupDiscardRemaining: 0 };
}

export function refillToFive(player) {
  const need = Math.max(0, 5 - player.hand.length);
  return { ...player, hand: [...player.hand, ...player.deck.slice(0, need)], deck: player.deck.slice(need) };
}

export function applyDe(player, delta) {
  const de = Math.max(0, Math.min(16, player.de + delta));
  return { ...player, de, star: de === 16 };
}

export function evaluateDualCard(cards, event) {
  if (cards.length !== 2) throw new Error('Current Game Event 回應固定為雙卡。');
  const played = cards.map((card) => card.macro).filter(Boolean);
  const required = [...event.requirements];
  let hits = 0;
  for (const macro of played) {
    const index = required.indexOf(macro);
    if (index >= 0) { hits += 1; required.splice(index, 1); }
  }
  // Alpha adapter: preserves the old requirement-signature coverage idea while
  // making two-card play possible. This is explicitly playtest-tunable, not Canon.
  const full = required.length === 0 && hits === event.requirements.length;
  const result = full ? 'perfect' : hits === 2 ? 'pass' : hits === 1 ? 'fair' : 'fail';
  return { result, delta: RESULT_DE[result], hits, required: event.requirements.length };
}

export function createGame(runes) {
  return {
    stage: 'setup', roundIndex: 0, eventDeck: shuffle(EVENTS), eventIndex: 0,
    players: [createPlayer('玩家 A', runes), createPlayer('玩家 B', runes)], log: [], winner: null,
  };
}

export function currentRound(game) { return ROUND_PLAN[game.roundIndex] || null; }
