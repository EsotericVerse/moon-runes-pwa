export const THEME_STORAGE_KEY='loc-theme';
export const THEME_REGISTRY_OVERRIDE_KEY='loc-theme-registry-overrides-v1';
export const SCOPE_THEME_DEFAULTS_KEY='loc-scope-theme-defaults-v1';
export const SCOPE_THEME_SETTINGS_KEY='loc-scope-theme-settings-v1';

export const THEME_TOKEN_KEYS=['--loc-bg','--loc-panel','--loc-panel-2','--loc-text','--loc-heading','--loc-accent','--loc-gold','--loc-body-glow','--loc-body-mid','--loc-hero-start','--loc-hero-end'];
export const SIMPLE_SCOPE_OVERRIDE_KEYS=['--loc-bg','--loc-panel','--loc-heading','--loc-accent'];

// Frozen/group identity colors are semantic references from the card system.
// Website palettes are derived for readability and do not have to reuse these exact dark card colors.
export const GROUP_IDENTITY_COLORS={
  '靈魂':'#3F3B8F','連結':'#6FA8DC','生命':'#E67E22','自然':'#1F4D2B',
  '礦物':'#8A817C','元素':'#A8432E','秩序':'#9DBA3A','無序':'#0B0B0B'
};

export const DEFAULT_THEME_SLOTS=[
  {id:'theme-1',group:'靈魂',identityColor:'#3F3B8F',label:'靈魂組・深靛',scheme:'dark',enabled:true,order:1,tokens:{'--loc-bg':'#090b20','--loc-panel':'#11142c','--loc-panel-2':'#1a1e3d','--loc-text':'#f1f0ff','--loc-accent':'#5d5bc4','--loc-gold':'#c8b8ff','--loc-body-glow':'#173659','--loc-body-mid':'#0a1626','--loc-hero-start':'rgba(21,48,80,.94)','--loc-hero-end':'rgba(7,17,31,.94)'}},
  {id:'theme-2',group:'連結',identityColor:'#6FA8DC',label:'連結組・永夜',scheme:'dark',enabled:true,order:2,tokens:{'--loc-bg':'#071726','--loc-panel':'#0c2238','--loc-panel-2':'#11304e','--loc-text':'#eef8ff','--loc-accent':'#42b8ff','--loc-gold':'#a8dfff','--loc-body-glow':'#12517f','--loc-body-mid':'#081d31','--loc-hero-start':'rgba(15,76,121,.94)','--loc-hero-end':'rgba(7,23,38,.94)'}},
  {id:'theme-3',group:'生命',identityColor:'#E67E22',label:'生命組・亮橘',scheme:'light',enabled:true,order:3,tokens:{'--loc-bg':'#fff5e8','--loc-panel':'#fffaf3','--loc-panel-2':'#ffe4c2','--loc-text':'#402414','--loc-accent':'#f28a2e','--loc-gold':'#c96219','--loc-body-glow':'#ffd5a6','--loc-body-mid':'#fff0dc','--loc-hero-start':'rgba(255,216,168,.97)','--loc-hero-end':'rgba(255,249,241,.98)'}},
  {id:'theme-4',group:'自然',identityColor:'#1F4D2B',label:'自然組・綠意',scheme:'light',enabled:true,order:4,tokens:{'--loc-bg':'#eef8ef','--loc-panel':'#fbfdfb','--loc-panel-2':'#dbeedc','--loc-text':'#17351f','--loc-accent':'#3f9d5c','--loc-gold':'#718a42','--loc-body-glow':'#c6e8cb','--loc-body-mid':'#eaf6ec','--loc-hero-start':'rgba(201,235,207,.97)','--loc-hero-end':'rgba(249,253,250,.98)'}},
  {id:'theme-5',group:'礦物',identityColor:'#8A817C',label:'礦物組・銀白',scheme:'light',enabled:true,order:5,tokens:{'--loc-bg':'#e9edf1','--loc-panel':'#f8fafc','--loc-panel-2':'#d5dbe1','--loc-text':'#2b333b','--loc-accent':'#9aa3ad','--loc-gold':'#b8b0aa','--loc-body-glow':'#cfd6dd','--loc-body-mid':'#e7ebef','--loc-hero-start':'rgba(211,218,225,.97)','--loc-hero-end':'rgba(248,250,252,.98)'}},
  {id:'theme-6',group:'元素',identityColor:'#A8432E',label:'元素組・鮮紅',scheme:'dark',enabled:true,order:6,tokens:{'--loc-bg':'#1a0908','--loc-panel':'#2b100d','--loc-panel-2':'#3b1813','--loc-text':'#fff1ee','--loc-accent':'#e55a45','--loc-gold':'#e09272','--loc-body-glow':'#641d14','--loc-body-mid':'#240c09','--loc-hero-start':'rgba(98,30,21,.95)','--loc-hero-end':'rgba(26,9,8,.95)'}},
  {id:'theme-7',group:'秩序',identityColor:'#9DBA3A',label:'秩序組・永日',scheme:'light',enabled:true,order:7,tokens:{'--loc-bg':'#ffffff','--loc-panel':'#ffffff','--loc-panel-2':'#f2f4f6','--loc-text':'#1f252b','--loc-accent':'#b7c96a','--loc-gold':'#b7a16a','--loc-body-glow':'#f1f3f5','--loc-body-mid':'#fafafa','--loc-hero-start':'rgba(255,255,255,.99)','--loc-hero-end':'rgba(246,248,250,.99)'}},
  {id:'theme-8',group:'無序',identityColor:'#0B0B0B',label:'無序組・暗黑',scheme:'dark',enabled:true,order:8,tokens:{'--loc-bg':'#070809','--loc-panel':'#101113','--loc-panel-2':'#191b1e','--loc-text':'#e7e8ea','--loc-accent':'#777d84','--loc-gold':'#9c978f','--loc-body-glow':'#1d2024','--loc-body-mid':'#0c0d0f','--loc-hero-start':'rgba(25,27,30,.97)','--loc-hero-end':'rgba(7,8,9,.97)'}}
];

export const DEFAULT_SCOPE_THEME={loc:'theme-7',runes:'theme-1',lo3rwang:'theme-5'};
export const DEFAULT_ROTATION_SCHEDULE=[
  {start:0,theme:'theme-1'},
  {start:6,theme:'theme-7'},
  {start:12,theme:'theme-4'},
  {start:18,theme:'theme-8'}
];
export const DEFAULT_SCOPE_THEME_SETTINGS={
  loc:{mode:'fixed',theme:'theme-7',custom:{},schedule:DEFAULT_ROTATION_SCHEDULE},
  runes:{mode:'fixed',theme:'theme-1',custom:{},schedule:DEFAULT_ROTATION_SCHEDULE},
  lo3rwang:{mode:'fixed',theme:'theme-5',custom:{},schedule:DEFAULT_ROTATION_SCHEDULE}
};

export function detectThemeScope(pathname='/',host=''){
  const h=String(host||'').toLowerCase();
  if(h==='lrunes.lo3rwang.cc') return 'runes';
  if(h==='lo3rwang.lo3rwang.cc') return 'lo3rwang';
  if(h==='loc.lo3rwang.cc') return 'loc';
  if(pathname==='/runes'||pathname.startsWith('/runes/')) return 'runes';
  if(pathname==='/lo3rwang'||pathname.startsWith('/lo3rwang/')) return 'lo3rwang';
  return 'loc';
}

export function scopeThemeStorageKey(scope){return `${THEME_STORAGE_KEY}:${scope}`;}
export function mergeThemeSlots(overrides={}){
  return DEFAULT_THEME_SLOTS.map(slot=>({...slot,...(overrides[slot.id]||{}),identityColor:GROUP_IDENTITY_COLORS[slot.group],tokens:{...slot.tokens,...((overrides[slot.id]||{}).tokens||{})}})).sort((a,b)=>a.order-b.order);
}
export function themeForHour(schedule=DEFAULT_ROTATION_SCHEDULE,hour=new Date().getHours()){
  const ordered=[...schedule].sort((a,b)=>a.start-b.start);
  return [...ordered].reverse().find(item=>hour>=item.start)?.theme||ordered.at(-1)?.theme||'theme-1';
}
export function scopeThemeSettings(scope,stored={}){
  return {...DEFAULT_SCOPE_THEME_SETTINGS[scope],...(stored[scope]||{}),custom:{...(DEFAULT_SCOPE_THEME_SETTINGS[scope]?.custom||{}),...((stored[scope]||{}).custom||{})},schedule:(stored[scope]||{}).schedule||DEFAULT_ROTATION_SCHEDULE};
}
