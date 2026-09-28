export const GAME_GROUPS=Object.freeze([
  {name:'靈魂',english:'Soul',image:'/pics/01.soul.jpg'},
  {name:'連結',english:'Connection',image:'/pics/02_connection.jpg'},
  {name:'生命',english:'Life',image:'/pics/03_life.jpg'},
  {name:'自然',english:'Nature',image:'/pics/04_nature.jpg'},
  {name:'礦物',english:'Mineral',image:'/pics/05_mineral.jpg'},
  {name:'元素',english:'Element',image:'/pics/06_element.jpg'},
  {name:'秩序',english:'Order',image:'/pics/07_order.jpg'},
  {name:'無序',english:'Disorder',image:'/pics/08_disorder.jpg'}
]);

export const GAME_EVENT_VISUALS=Object.freeze([
  {id:'soul-link',groups:['靈魂','連結'],title:'靈魂 × 連結',image:'/pics/g1c-soul.link.jpg'},
  {id:'mineral-life',groups:['礦物','生命'],title:'礦物 × 生命',image:'/pics/g2c-mineral.life.jpg'},
  {id:'nature-element',groups:['自然','元素'],title:'自然 × 元素',image:'/pics/g3c-nature.element.jpg'},
  {id:'order-disorder',groups:['秩序','無序'],title:'秩序 × 無序',image:'/pics/g4c-order.disorder.jpg'}
]);

export const GAME_AUTHOR_VISUAL='/pics/aboutme.png';

export function runeCardImage(card){
  const id=Number(card?.id??card?.rune_id??card?.rune_number);
  const number=String(Number.isFinite(id)?id:0).padStart(2,'0');
  const name=String(card?.name??card?.rune_name??'').replace(/之符文$/,'').trim();
  return name?'/assets/lunarunes/cards/'+number+'_'+name+'.png':'';
}

export function groupVisual(groupName){
  return GAME_GROUPS.find(group=>group.name===groupName)||null;
}
