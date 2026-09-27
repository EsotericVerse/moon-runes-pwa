export const RUNE_DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);

// RUNE_DRAW_ALGORITHM_INVARIANT — DO NOT OPTIMIZE INTO SHUFFLE/BATCH RANDOM.
// Drawing N runes means exactly N independent rune-selection random calls.
// Each selected rune is removed before the next call, so a Draw Session cannot repeat a rune.
export function randomInt(max){
  if(max<=1)return 0;
  if(globalThis.crypto?.getRandomValues){
    const limit=Math.floor(0x100000000/max)*max;
    const value=new Uint32Array(1);
    do globalThis.crypto.getRandomValues(value);while(value[0]>=limit);
    return value[0]%max;
  }
  return Math.floor(Math.random()*max);
}

export function drawRunesSequentially(items,count,selectIndex=randomInt){
  if(!Number.isInteger(count)||count<0||count>items.length)throw new Error(`無效的抽牌數量：${count}`);
  const pool=[...items];
  const selected=[];
  for(let drawIndex=0;drawIndex<count;drawIndex+=1){
    const index=selectIndex(pool.length);
    if(!Number.isInteger(index)||index<0||index>=pool.length)throw new Error(`第 ${drawIndex+1} 次符文亂數超出候選池範圍。`);
    const [card]=pool.splice(index,1);
    selected.push(card);
  }
  return selected;
}

export function drawRuneSession(items,count){
  const cards=drawRunesSequentially(items,count);
  const directionIndexes=cards.map(()=>randomInt(4));
  return {
    cards,
    directionIndexes,
    directions:directionIndexes.map(index=>RUNE_DIRECTIONS[index])
  };
}

export function makeRuneDrawId(mode='single'){
  const suffix=globalThis.crypto?.randomUUID?.()||String(randomInt(1000000000));
  return `rune-draw:${mode}:${Date.now()}:${suffix}`;
}
