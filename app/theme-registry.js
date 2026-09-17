export const THEME_STORAGE_KEY='loc-theme';
export const THEME_REGISTRY_OVERRIDE_KEY='loc-theme-registry-overrides-v1';
export const SCOPE_THEME_DEFAULTS_KEY='loc-scope-theme-defaults-v1';
export const SCOPE_THEME_SETTINGS_KEY='loc-scope-theme-settings-v1';

export const THEME_TOKEN_KEYS=['--loc-bg','--loc-panel','--loc-panel-2','--loc-text','--loc-accent','--loc-gold','--loc-body-glow','--loc-body-mid','--loc-hero-start','--loc-hero-end'];
export const SIMPLE_SCOPE_OVERRIDE_KEYS=['--loc-bg','--loc-panel','--loc-text','--loc-accent'];
export const GROUP_IDENTITY_COLORS={
  '靈魂':'#6FA8DC','連結':'#6A3FA0','生命':'#E67E22','自然':'#1F4D2B',
  '礦物':'#8A817C','元素':'#A8432E','秩序':'#9DBA3A','無序':'#0B0B0B'
};

export const DEFAULT_THEME_SLOTS=[
  {id:'theme-1',group:'靈魂',groupColor:'#6FA8DC',label:'靈魂組・永夜',scheme:'dark',enabled:true,order:1,tokens:{'--loc-bg':'#050912','--loc-panel':'#0b1220','--loc-panel-2':'#111c2e','--loc-text':'#eef2ff','--loc-accent':'#6FA8DC','--loc-gold':'#c9b6ff','--loc-body-glow':'#151d43','--loc-body-mid':'#080d18','--loc-hero-start':'rgba(21,29,67,.94)','--loc-hero-end':'rgba(5,9,18,.94)'}},
  {id:'theme-2',group:'連結',groupColor:'#6A3FA0',label:'連結組・亮藍',scheme:'dark',enabled:true,order:2,tokens:{'--loc-bg':'#0b1021','--loc-panel':'#171633','--loc-panel-2':'#22204a','--loc-text':'#f5efff','--loc-accent':'#6A3FA0','--loc-gold':'#9ccfff','--loc-body-glow':'#222d66','--loc-body-mid':'#101529','--loc-hero-start':'rgba(36,44,96,.94)','--loc-hero-end':'rgba(11,16,33,.94)'}},
  {id:'theme-3',group:'生命',groupColor:'#E67E22',label:'生命組・亮橘',scheme:'light',enabled:true,order:3,tokens:{'--loc-bg':'#fff5e8','--loc-panel':'#fffaf3','--loc-panel-2':'#ffe8ca','--loc-text':'#402414','--loc-accent':'#E67E22','--loc-gold':'#c95c14','--loc-body-glow':'#ffd7ab','--loc-body-mid':'#fff0dd','--loc-hero-start':'rgba(255,219,178,.97)','--loc-hero-end':'rgba(255,248,239,.98)'}},
  {id:'theme-4',group:'自然',groupColor:'#1F4D2B',label:'自然組・綠意',scheme:'light',enabled:true,order:4,tokens:{'--loc-bg':'#edf7ef','--loc-panel':'#f8fcf8','--loc-panel-2':'#dceedd','--loc-text':'#183623','--loc-accent':'#1F4D2B','--loc-gold':'#6d8a3d','--loc-body-glow':'#c9e8ce','--loc-body-mid':'#e9f5eb','--loc-hero-start':'rgba(204,235,210,.97)','--loc-hero-end':'rgba(247,252,248,.98)'}},
  {id:'theme-5',group:'礦物',groupColor:'#8A817C',label:'礦物組・銀白',scheme:'light',enabled:true,order:5,tokens:{'--loc-bg':'#eef1f4','--loc-panel':'#fbfcfd','--loc-panel-2':'#dde2e7','--loc-text':'#26313c','--loc-accent':'#8A817C','--loc-gold':'#a39a94','--loc-body-glow':'#d8dee5','--loc-body-mid':'#edf0f3','--loc-hero-start':'rgba(221,227,233,.97)','--loc-hero-end':'rgba(251,252,253,.98)'}},
  {id:'theme-6',group:'元素',groupColor:'#A8432E',label:'元素組・鮮紅',scheme:'dark',enabled:true,order:6,tokens:{'--loc-bg':'#190706','--loc-panel':'#2a0d0a','--loc-panel-2':'#3a1510','--loc-text':'#fff0ed','--loc-accent':'#A8432E','--loc-gold':'#d78869','--loc-body-glow':'#5b1810','--loc-body-mid':'#220b08','--loc-hero-start':'rgba(92,28,20,.95)','--loc-hero-end':'rgba(25,7,6,.95)'}},
  {id:'theme-7',group:'秩序',groupColor:'#9DBA3A',label:'秩序組・永日',scheme:'light',enabled:true,order:7,tokens:{'--loc-bg':'#f7faee','--loc-panel':'#ffffff','--loc-panel-2':'#edf3d6','--loc-text':'#2b3514','--loc-accent':'#9DBA3A','--loc-gold':'#a88d2d','--loc-body-glow':'#e7efc7','--loc-body-mid':'#f5f8ed','--loc-hero-start':'rgba(237,245,209,.98)','--loc-hero-end':'rgba(255,255,255,.98)'}},
  {id:'theme-8',group:'無序',groupColor:'#0B0B0B',label:'無序組・灰暗',scheme:'dark',enabled:true,order:8,tokens:{'--loc-bg':'#0B0B0B','--loc-panel':'#181818','--loc-panel-2':'#242424','--loc-text':'#e3e3e3','--loc-accent':'#0B0B0B','--loc-gold':'#aaa49a','--loc-body-glow':'#2a2a2a','--loc-body-mid':'#141414','--loc-hero-start':'rgba(43,43,43,.95)','--loc-hero-end':'rgba(11,11,11,.95)'}}
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
  return DEFAULT_THEME_SLOTS.map(slot=>({...slot,...(overrides[slot.id]||{}),groupColor:GROUP_IDENTITY_COLORS[slot.group],tokens:{...slot.tokens,...((overrides[slot.id]||{}).tokens||{}),'--loc-accent':GROUP_IDENTITY_COLORS[slot.group]}})).sort((a,b)=>a.order-b.order);
}
export function themeForHour(schedule=DEFAULT_ROTATION_SCHEDULE,hour=new Date().getHours()){
  const ordered=[...schedule].sort((a,b)=>a.start-b.start);
  return [...ordered].reverse().find(item=>hour>=item.start)?.theme||ordered.at(-1)?.theme||'theme-1';
}
export function scopeThemeSettings(scope,stored={}){
  return {...DEFAULT_SCOPE_THEME_SETTINGS[scope],...(stored[scope]||{}),custom:{...(DEFAULT_SCOPE_THEME_SETTINGS[scope]?.custom||{}),...((stored[scope]||{}).custom||{})},schedule:(stored[scope]||{}).schedule||DEFAULT_ROTATION_SCHEDULE};
}
