export const THEME_STORAGE_KEY='loc-theme';
export const THEME_REGISTRY_OVERRIDE_KEY='loc-theme-registry-overrides-v1';
export const SCOPE_THEME_DEFAULTS_KEY='loc-scope-theme-defaults-v1';

export const THEME_TOKEN_KEYS=['--loc-bg','--loc-panel','--loc-panel-2','--loc-accent','--loc-gold','--loc-body-glow','--loc-body-mid','--loc-hero-start','--loc-hero-end'];

export const DEFAULT_THEME_SLOTS=[
  {id:'theme-1',group:'靈魂',label:'靈魂組・永夜',scheme:'dark',enabled:true,order:1,tokens:{'--loc-bg':'#050912','--loc-panel':'#0b1220','--loc-panel-2':'#111c2e','--loc-accent':'#889cff','--loc-gold':'#c9b6ff','--loc-body-glow':'#151d43','--loc-body-mid':'#080d18','--loc-hero-start':'rgba(21,29,67,.94)','--loc-hero-end':'rgba(5,9,18,.94)'}},
  {id:'theme-2',group:'連結',label:'連結組・亮藍',scheme:'dark',enabled:true,order:2,tokens:{'--loc-bg':'#061525','--loc-panel':'#0a2038','--loc-panel-2':'#0e2b49','--loc-accent':'#42b8ff','--loc-gold':'#93dcff','--loc-body-glow':'#0e4775','--loc-body-mid':'#071a2d','--loc-hero-start':'rgba(10,66,108,.94)','--loc-hero-end':'rgba(6,21,37,.94)'}},
  {id:'theme-3',group:'生命',label:'生命組・亮橘',scheme:'light',enabled:true,order:3,tokens:{'--loc-bg':'#fff5e8','--loc-panel':'#fffaf3','--loc-panel-2':'#ffe8ca','--loc-accent':'#f47b20','--loc-gold':'#c95c14','--loc-body-glow':'#ffd7ab','--loc-body-mid':'#fff0dd','--loc-hero-start':'rgba(255,219,178,.97)','--loc-hero-end':'rgba(255,248,239,.98)'}},
  {id:'theme-4',group:'自然',label:'自然組・綠意',scheme:'light',enabled:true,order:4,tokens:{'--loc-bg':'#edf7ef','--loc-panel':'#f8fcf8','--loc-panel-2':'#dceedd','--loc-accent':'#2f8f52','--loc-gold':'#6d8a3d','--loc-body-glow':'#c9e8ce','--loc-body-mid':'#e9f5eb','--loc-hero-start':'rgba(204,235,210,.97)','--loc-hero-end':'rgba(247,252,248,.98)'}},
  {id:'theme-5',group:'礦物',label:'礦物組・銀白',scheme:'light',enabled:true,order:5,tokens:{'--loc-bg':'#eef1f4','--loc-panel':'#fbfcfd','--loc-panel-2':'#dde2e7','--loc-accent':'#718194','--loc-gold':'#9aa3ad','--loc-body-glow':'#d8dee5','--loc-body-mid':'#edf0f3','--loc-hero-start':'rgba(221,227,233,.97)','--loc-hero-end':'rgba(251,252,253,.98)'}},
  {id:'theme-6',group:'元素',label:'元素組・鮮紅',scheme:'dark',enabled:true,order:6,tokens:{'--loc-bg':'#190607','--loc-panel':'#2a0c0e','--loc-panel-2':'#3a1114','--loc-accent':'#ff4d4f','--loc-gold':'#ff9a76','--loc-body-glow':'#5b1116','--loc-body-mid':'#22090b','--loc-hero-start':'rgba(92,18,24,.95)','--loc-hero-end':'rgba(25,6,7,.95)'}},
  {id:'theme-7',group:'秩序',label:'秩序組・永日',scheme:'light',enabled:true,order:7,tokens:{'--loc-bg':'#f5f9fd','--loc-panel':'#ffffff','--loc-panel-2':'#e6f0f8','--loc-accent':'#2c78b8','--loc-gold':'#b18a32','--loc-body-glow':'#d7eafa','--loc-body-mid':'#f1f7fb','--loc-hero-start':'rgba(225,240,251,.98)','--loc-hero-end':'rgba(255,255,255,.98)'}},
  {id:'theme-8',group:'無序',label:'無序組・灰暗',scheme:'dark',enabled:true,order:8,tokens:{'--loc-bg':'#111214','--loc-panel':'#1a1c1f','--loc-panel-2':'#24272b','--loc-accent':'#858b93','--loc-gold':'#aaa49a','--loc-body-glow':'#2a2d31','--loc-body-mid':'#161719','--loc-hero-start':'rgba(45,48,52,.95)','--loc-hero-end':'rgba(17,18,20,.95)'}}
];

// Initial differentiation only; Admin may reassign these at any time.
export const DEFAULT_SCOPE_THEME={loc:'theme-7',runes:'theme-1',lo3rwang:'theme-5'};

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
  return DEFAULT_THEME_SLOTS.map(slot=>({...slot,...(overrides[slot.id]||{}),tokens:{...slot.tokens,...((overrides[slot.id]||{}).tokens||{})}})).sort((a,b)=>a.order-b.order);
}
