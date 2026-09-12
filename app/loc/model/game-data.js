import runes from '../../../data/json/core/runes.json';
import eventRegistry from '../../../data/json/registries/LOC2_EVENT_REGISTRY.json';

const ASPECT = Object.freeze({
  靈魂: 'SL',
  生命: 'SL',
  連結: 'ML',
  礦物: 'ML',
  自然: 'NE',
  元素: 'NE',
  秩序: 'OC',
  無序: 'OC'
});

export const EVENTS = Object.freeze((eventRegistry.records || []).map(record => ({
  id: record.event_id,
  name: record.title,
  req: String(record.requirement_signature || '')
    .split('+')
    .map(value => value.trim())
    .filter(Boolean),
  desc: record.description || ''
})));

export const CARDS = Object.freeze(runes
  .filter(rune => rune['編號'] >= 1 && rune['編號'] <= 64)
  .map(rune => ({
    id: rune['編號'],
    name: rune['符文名稱'],
    group: rune['所屬分組'],
    aspect: ASPECT[rune['所屬分組']] || 'OC'
  })));

export function shuffle(list) {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export function drawToFive(player) {
  const next = { ...player, deck: [...player.deck], hand: [...player.hand] };
  while (next.hand.length < 5 && next.deck.length) next.hand.push(next.deck.pop());
  return next;
}

export function coverage(selected, requirement) {
  const pool = selected.map(card => card.aspect);
  let hits = 0;
  for (const aspect of requirement) {
    const index = pool.indexOf(aspect);
    if (index >= 0) {
      hits += 1;
      pool.splice(index, 1);
    }
  }
  return { hits, total: requirement.length };
}

export function deltaFor(hits, total) {
  const ratio = total ? hits / total : 0;
  if (ratio === 1) return { label: '完美', delta: 2 };
  if (ratio >= 0.75) return { label: '成功', delta: 1 };
  if (ratio >= 0.5) return { label: '普通', delta: 0 };
  if (ratio > 0) return { label: '補牌', delta: 0 };
  return { label: '失敗', delta: -2 };
}
