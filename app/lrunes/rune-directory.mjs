const GROUP_IMAGE_BY_ID=Object.freeze({
  '01':'/pics/01.soul.jpg','02':'/pics/02_connection.jpg','03':'/pics/03_life.jpg',
  '04':'/pics/04_nature.jpg','05':'/pics/05_mineral.jpg','06':'/pics/06_element.jpg',
  '07':'/pics/07_order.jpg','08':'/pics/08_disorder.jpg','09':'/pics/09_specia.jpg'
});

export function groupImage(id){return GROUP_IMAGE_BY_ID[String(id).padStart(2,'0')]||'';}
export function runeName(card){return String(card?.rune_name||'').replace(/之符文$/,'').trim();}
export function runeImage(card){
  const number=String(Number(card?.rune_number)||0).padStart(2,'0');
  return `/assets/lunarunes/cards/${number}_${runeName(card)}.png`;
}
export function runeNumbersForGroup(groupId){
  const id=Number(groupId);
  if(!Number.isInteger(id)||id<1||id>9)return [];
  if(id===9)return [0,65,66];
  const start=(id-1)*8+1;
  return Array.from({length:8},(_,index)=>start+index);
}
export function runeNumberForRoute(groupId,runeId){
  const group=Number(groupId),local=Number(runeId);
  if(!Number.isInteger(group)||group<1||group>9||!Number.isInteger(local))return null;
  if(group===9)return ({0:0,1:65,2:66})[local]??null;
  if(local<1||local>8)return null;
  return (group-1)*8+local;
}
export function localRuneId(groupId,card){
  if(String(groupId).padStart(2,'0')==='09')return ({0:'00',65:'01',66:'02'})[Number(card?.rune_number)]||null;
  const start=(Number(groupId)-1)*8+1;
  return String(Number(card?.rune_number)-start+1).padStart(2,'0');
}
export function groupParams(){return Array.from({length:9},(_,index)=>({group:String(index+1).padStart(2,'0')}));}
export function runeParams(){
  return groupParams().flatMap(({group})=>group==='09'
    ?['00','01','02'].map(rune=>({group,rune}))
    :Array.from({length:8},(_,index)=>({group,rune:String(index+1).padStart(2,'0')}))
  );
}
