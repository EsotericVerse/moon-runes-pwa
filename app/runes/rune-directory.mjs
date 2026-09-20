import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LOC_DATA } from '../loc/data-paths.mjs';

const sourcePath=resolve(process.cwd(),LOC_DATA.RUNES.replace(/^\//,''));
export const RUNES=JSON.parse(readFileSync(sourcePath,'utf8'));

export const GROUPS=Object.freeze([
  {id:'01',name:'靈魂',english:'Soul',image:'/pics/01.soul.jpg',description:'聚焦精神本源、記憶、內外界線、自我映照與核心。'},
  {id:'02',name:'連結',english:'Connection',image:'/pics/02_connection.jpg',description:'描述方向、連結、切斷、封閉、啟動、分化、理解與誤解。'},
  {id:'03',name:'生命',english:'Life',image:'/pics/03_life.jpg',description:'涵蓋生命歷程，以及情感、語言與韻律形成的人類經驗。'},
  {id:'04',name:'自然',english:'Nature',image:'/pics/04_nature.jpg',description:'以植物生命的根、萌發、生長、展開與結果呈現自然結構。'},
  {id:'05',name:'礦物',english:'Mineral',image:'/pics/07_order.jpg',description:'從地質、材質、結晶與壓力呈現物質形成與凝聚。'},
  {id:'06',name:'元素',english:'Element',image:'/pics/06_element.jpg',description:'呈現不同自然元素各自的性質、力量與交互作用。'},
  {id:'07',name:'秩序',english:'Order',image:'/pics/05_mineral.jpg',description:'描述天體、時序、空間、清晰與因果等可辨識的秩序結構。'},
  {id:'08',name:'無序',english:'Disorder',image:'/pics/08_disorder.jpg',description:'處理偶然、轉折、虛實、緣起與結果等較不穩定的變化。'},
  {id:'09',name:'特殊',english:'Special',image:'/pics/09_specia.jpg',description:'特殊組包含德、玄、命；德為作者治理基準符，不參與 66 枚抽牌牌組。'}
]);

export function runeName(card){return String(card?.符文名稱||'').replace(/之符文$/,'').trim();}
export function runeImage(card){
  const number=String(Number(card?.編號)||0).padStart(2,'0');
  return `/assets/lunarunes/cards/${number}_${runeName(card)}.png`;
}
export function groupById(id){return GROUPS.find(item=>item.id===String(id).padStart(2,'0'))||null;}
export function groupRunes(groupId){
  const group=groupById(groupId);
  if(!group)return [];
  if(group.id==='09'){
    const order=new Map([[0,0],[65,1],[66,2]]);
    return RUNES.filter(row=>[0,65,66].includes(Number(row?.編號))).sort((a,b)=>order.get(Number(a.編號))-order.get(Number(b.編號)));
  }
  const start=(Number(group.id)-1)*8+1;
  return RUNES.filter(row=>Number(row?.編號)>=start&&Number(row?.編號)<=start+7).sort((a,b)=>Number(a.編號)-Number(b.編號));
}
export function localRuneId(groupId,card){
  if(String(groupId).padStart(2,'0')==='09'){
    const map={0:'00',65:'01',66:'02'};
    return map[Number(card?.編號)]||null;
  }
  const start=(Number(groupId)-1)*8+1;
  return String(Number(card?.編號)-start+1).padStart(2,'0');
}
export function runeByRoute(groupId,runeId){
  return groupRunes(groupId).find(card=>localRuneId(groupId,card)===String(runeId).padStart(2,'0'))||null;
}
export function groupParams(){return GROUPS.map(group=>({group:group.id}));}
export function runeParams(){return GROUPS.flatMap(group=>groupRunes(group.id).map(card=>({group:group.id,rune:localRuneId(group.id,card)})));}
