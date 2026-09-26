export const RUNES=Object.freeze([]);

export const GROUPS=Object.freeze([
  {id:'01',name:'靈魂',english:'Soul',image:'/pics/01.soul.jpg',description:'聚焦精神本源、記憶、內外界線、自我映照與核心。'},
  {id:'02',name:'連結',english:'Connection',image:'/pics/02_connection.jpg',description:'描述方向、連結、切斷、封閉、啟動、分化、理解與誤解。'},
  {id:'03',name:'生命',english:'Life',image:'/pics/03_life.jpg',description:'涵蓋生命歷程，以及情感、語言與韻律形成的人類經驗。'},
  {id:'04',name:'自然',english:'Nature',image:'/pics/04_nature.jpg',description:'以植物生命的根、萌發、生長、展開與結果呈現自然結構。'},
  {id:'05',name:'礦物',english:'Mineral',image:'/pics/05_mineral.jpg',description:'從地質、材質、結晶與壓力呈現物質形成與凝聚。'},
  {id:'06',name:'元素',english:'Element',image:'/pics/06_element.jpg',description:'呈現不同自然元素各自的性質、力量與交互作用。'},
  {id:'07',name:'秩序',english:'Order',image:'/pics/07_order.jpg',description:'描述天體、時序、空間、清晰與因果等可辨識的秩序結構。'},
  {id:'08',name:'無序',english:'Disorder',image:'/pics/08_disorder.jpg',description:'處理偶然、轉折、虛實、緣起與結果等較不穩定的變化。'},
  {id:'09',name:'特殊',english:'Special',image:'/pics/09_specia.jpg',description:'特殊組包含德、玄、命；德為作者治理基準符，不參與 66 枚抽牌牌組。'}
]);

export function runeName(card){return String(card?.符文名稱||'').replace(/之符文$/,'').trim();}
export function runeImage(card){
  const number=String(Number(card?.編號)||0).padStart(2,'0');
  return `/assets/lunarunes/cards/${number}_${runeName(card)}.png`;
}
export function groupById(id){return GROUPS.find(item=>item.id===String(id).padStart(2,'0'))||null;}
export function groupRunes(){return [];}
export function localRuneId(groupId,card){
  if(String(groupId).padStart(2,'0')==='09'){
    const map={0:'00',65:'01',66:'02'};
    return map[Number(card?.編號)]||null;
  }
  const start=(Number(groupId)-1)*8+1;
  return String(Number(card?.編號)-start+1).padStart(2,'0');
}
export function runeByRoute(){return null;}
export function groupParams(){return GROUPS.map(group=>({group:group.id}));}
export function runeParams(){
  return GROUPS.flatMap(group=>{
    if(group.id==='09')return ['00','01','02'].map(rune=>({group:group.id,rune}));
    return Array.from({length:8},(_,index)=>({group:group.id,rune:String(index+1).padStart(2,'0')}));
  });
}
