const ASPECT = Object.freeze({
  靈魂: 'SL', 連結: 'SL',
  礦物: 'ML', 生命: 'ML',
  自然: 'NE', 元素: 'NE',
  秩序: 'OD', 無序: 'OD'
});

export const RESULT_DE = Object.freeze({ perfect: 2, pass: 1, fair: 0, replenish: 0, fail: -1 });
export const HAND_RULE = Object.freeze({ base: 5, tempCap: 8, eventDraw: 2, failDraw: 1 });
export const TWO_PLAYER_ROUNDS = Object.freeze(['event','event','event','resonance','event','event','event','final-resonance']);
export const MULTI_PLAYER_ROUNDS = Object.freeze(['event','battle','event','battle','event','battle','event','final-battle']);

export function createEvents(eventRegistry) {
  return (eventRegistry?.records || []).map(record => ({
    id: record.event_id,
    name: record.title,
    req: String(record.requirement_signature || '').replaceAll('OC','OD').split('+').map(v => v.trim()).filter(Boolean),
    desc: record.description || ''
  }));
}

export function createCards(runes) {
  return (runes || []).filter(r => r['編號'] >= 1 && r['編號'] <= 66).map(r => ({
    id: r['編號'], name: r['符文名稱'], group: r['所屬分組'],
    aspect: ASPECT[r['所屬分組']] || null,
    action: r['角色行動'] || ''
  }));
}

export function shuffle(list) {
  const next=[...list];
  for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]];}
  return next;
}

export function draw(player,count) {
  const room=Math.max(0,HAND_RULE.tempCap-player.hand.length);
  const n=Math.min(count,room,player.deck.length);
  return {...player,hand:[...player.hand,...player.deck.slice(0,n)],deck:player.deck.slice(n)};
}

export function freshPlayer(cards,name) {
  const deck=shuffle(cards);
  return {name,de:0,deck:deck.slice(8),hand:deck.slice(0,8),discard:[],selected:[],opening:true};
}

export function finishOpening(player,ids) {
  if(ids.length!==3) throw new Error('起手必須從 8 張中棄 3 張。');
  const set=new Set(ids); if(set.size!==3) throw new Error('起手棄牌不可重複。');
  const discarded=player.hand.filter(c=>set.has(c.id));
  if(discarded.length!==3) throw new Error('起手棄牌不合法。');
  return {...player,hand:player.hand.filter(c=>!set.has(c.id)),discard:[...player.discard,...discarded],selected:[],opening:false};
}

export function evaluateEvent(cards,event) {
  if(cards.length!==2) throw new Error('Event 回應固定使用兩張符文。');
  const pool=[...event.req]; let macroHits=0;
  for(const card of cards){const i=pool.indexOf(card.aspect);if(i>=0){macroHits++;pool.splice(i,1);}}
  const diversity=new Set(cards.map(c=>c.group)).size;
  const coverage=Math.min(4,macroHits+Math.min(2,diversity));
  const result=coverage===4?'perfect':coverage===3?'pass':coverage===2?'fair':coverage===1?'replenish':'fail';
  return {coverage,result,delta:RESULT_DE[result]};
}

export function applyDe(player,delta){return {...player,de:Math.max(0,Math.min(8,player.de+delta))};}
