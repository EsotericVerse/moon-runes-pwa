export const THEME_STORAGE_KEY_V2='scope-theme-settings-v2-shadow';

export const THEME_TOKEN_KEYS_V2=[
  '--loc-bg','--loc-panel','--loc-panel-2','--loc-text','--loc-accent','--loc-gold',
  '--loc-body-glow','--loc-body-mid','--loc-hero-start','--loc-hero-end'
];

export const THEME_SLOTS_V2=Object.freeze([
  Object.freeze({id:'theme-1',label:'靈魂組・永夜',scheme:'dark',tokens:Object.freeze({'--loc-bg':'#090b20','--loc-panel':'#11142c','--loc-panel-2':'#1a1e3d','--loc-text':'#f1f0ff','--loc-accent':'#5d5bc4','--loc-gold':'#c8b8ff','--loc-body-glow':'#173659','--loc-body-mid':'#0a1626','--loc-hero-start':'rgba(21,48,80,.94)','--loc-hero-end':'rgba(7,17,31,.94)'})}),
  Object.freeze({id:'theme-2',label:'連結組',scheme:'dark',tokens:Object.freeze({'--loc-bg':'#071726','--loc-panel':'#0c2238','--loc-panel-2':'#11304e','--loc-text':'#eef8ff','--loc-accent':'#42b8ff','--loc-gold':'#a8dfff','--loc-body-glow':'#12517f','--loc-body-mid':'#081d31','--loc-hero-start':'rgba(15,76,121,.94)','--loc-hero-end':'rgba(7,23,38,.94)'})}),
  Object.freeze({id:'theme-3',label:'生命組',scheme:'light',tokens:Object.freeze({'--loc-bg':'#fff5e8','--loc-panel':'#fffaf3','--loc-panel-2':'#ffe4c2','--loc-text':'#402414','--loc-accent':'#f28a2e','--loc-gold':'#c96219','--loc-body-glow':'#ffd5a6','--loc-body-mid':'#fff0dc','--loc-hero-start':'rgba(255,216,168,.97)','--loc-hero-end':'rgba(255,249,241,.98)'})}),
  Object.freeze({id:'theme-4',label:'自然組',scheme:'light',tokens:Object.freeze({'--loc-bg':'#eef8ef','--loc-panel':'#fbfdfb','--loc-panel-2':'#dbeedc','--loc-text':'#17351f','--loc-accent':'#3f9d5c','--loc-gold':'#718a42','--loc-body-glow':'#c6e8cb','--loc-body-mid':'#eaf6ec','--loc-hero-start':'rgba(201,235,207,.97)','--loc-hero-end':'rgba(249,253,250,.98)'})}),
  Object.freeze({id:'theme-5',label:'礦物組・銀白',scheme:'light',tokens:Object.freeze({'--loc-bg':'#e9edf1','--loc-panel':'#f8fafc','--loc-panel-2':'#d5dbe1','--loc-text':'#2b333b','--loc-accent':'#9aa3ad','--loc-gold':'#b8b0aa','--loc-body-glow':'#cfd6dd','--loc-body-mid':'#e7ebef','--loc-hero-start':'rgba(211,218,225,.97)','--loc-hero-end':'rgba(248,250,252,.98)'})}),
  Object.freeze({id:'theme-6',label:'元素組',scheme:'dark',tokens:Object.freeze({'--loc-bg':'#1a0908','--loc-panel':'#2b100d','--loc-panel-2':'#3b1813','--loc-text':'#fff1ee','--loc-accent':'#e55a45','--loc-gold':'#e09272','--loc-body-glow':'#641d14','--loc-body-mid':'#240c09','--loc-hero-start':'rgba(98,30,21,.95)','--loc-hero-end':'rgba(26,9,8,.95)'})}),
  Object.freeze({id:'theme-7',label:'秩序組・永日',scheme:'light',tokens:Object.freeze({'--loc-bg':'#ffffff','--loc-panel':'#ffffff','--loc-panel-2':'#f2f4f6','--loc-text':'#1f252b','--loc-accent':'#b7c96a','--loc-gold':'#b7a16a','--loc-body-glow':'#f1f3f5','--loc-body-mid':'#fafafa','--loc-hero-start':'rgba(255,255,255,.99)','--loc-hero-end':'rgba(246,248,250,.99)'})}),
  Object.freeze({id:'theme-8',label:'無序組',scheme:'dark',tokens:Object.freeze({'--loc-bg':'#070809','--loc-panel':'#101113','--loc-panel-2':'#191b1e','--loc-text':'#e7e8ea','--loc-accent':'#777d84','--loc-gold':'#9c978f','--loc-body-glow':'#1d2024','--loc-body-mid':'#0c0d0f','--loc-hero-start':'rgba(25,27,30,.97)','--loc-hero-end':'rgba(7,8,9,.97)'})})
]);

export function themeForHourV2(schedule,hour=new Date().getHours()){
  const ordered=[...(schedule||[])].sort((a,b)=>a.start-b.start);
  return [...ordered].reverse().find(item=>hour>=item.start)?.theme||ordered.at(-1)?.theme||'theme-7';
}

export function getThemeSlotV2(id){
  return THEME_SLOTS_V2.find(slot=>slot.id===id)||THEME_SLOTS_V2.find(slot=>slot.id==='theme-7');
}

export function applyThemeV2(slot,custom={}){
  if(typeof document==='undefined'||!slot)return;
  const root=document.documentElement;
  THEME_TOKEN_KEYS_V2.forEach(key=>root.style.removeProperty(key));
  root.dataset.theme=slot.scheme;
  Object.entries({...slot.tokens,...custom}).forEach(([key,value])=>{if(value)root.style.setProperty(key,value);});
}
