/** Portable LunaRunes Realtime snapshots: serialized IDs, never runtime objects. */
export const validState=G=>Boolean(G&&typeof G==='object'&&
  Array.isArray(G.players)&&G.players.length>=2&&G.players.length<=4&&
  G.players.every(p=>Array.isArray(p.hand)&&Array.isArray(p.deck)&&Array.isArray(p.discard)&&Array.isArray(p.selected))&&
  Array.isArray(G.eventDeck)&&G.eventDeck.length>0&&
  Array.isArray(G.history)&&Array.isArray(G.logs)&&
  Number.isInteger(G.round)&&Number.isInteger(G.active)&&
  (['opening','event','resonance','duel','finished'].includes(G.stage)||
    (typeof G.stage==='string'&&G.stage.includes('resonance'))));

// Only IDs travel over Realtime; large rune descriptions stay in each client's
// shared rule catalog. This keeps every turn below the 256 KB Free-tier limit.
export function packTabletopState(G){
  return {...G,players:G.players.map(p=>({
    ...p,hand:p.hand.map(c=>c.id),deck:p.deck.map(c=>c.id),
    discard:p.discard.map(c=>c.id)
  }))};
}
export function unpackTabletopState(G,cards){
  const byId=new Map(cards.map(c=>[c.id,c]));
  const players=G.players.map(p=>{
    const expand=list=>list.map(id=>byId.get(id));
    return {...p,hand:expand(p.hand),deck:expand(p.deck),discard:expand(p.discard)};
  });
  if(players.some(p=>[...p.hand,...p.deck,...p.discard].some(card=>!card)))return null;
  return {...G,players};
}

