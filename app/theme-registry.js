export const THEME_STORAGE_KEY='loc-theme';
export const THEME_REGISTRY_OVERRIDE_KEY='loc-theme-registry-overrides-v1';
export const SCOPE_THEME_DEFAULTS_KEY='loc-scope-theme-defaults-v1';

export const DEFAULT_THEME_SLOTS=[
  {id:'theme-1',label:'永日',scheme:'light',enabled:true,order:1,tokens:{}},
  {id:'theme-2',label:'永夜',scheme:'dark',enabled:true,order:2,tokens:{}},
  {id:'theme-3',label:'主題 3',scheme:'dark',enabled:true,order:3,tokens:{'--loc-accent':'#9fd7ff','--loc-gold':'#c9b6ff'}},
  {id:'theme-4',label:'主題 4',scheme:'light',enabled:true,order:4,tokens:{'--loc-accent':'#4a7f6a','--loc-gold':'#92743d'}},
  {id:'theme-5',label:'主題 5',scheme:'dark',enabled:true,order:5,tokens:{'--loc-accent':'#8fd8c8','--loc-gold':'#d6bf77'}},
  {id:'theme-6',label:'主題 6',scheme:'light',enabled:true,order:6,tokens:{'--loc-accent':'#6b6fa8','--loc-gold':'#9a6f3a'}},
  {id:'theme-7',label:'主題 7',scheme:'dark',enabled:true,order:7,tokens:{'--loc-accent':'#d59aaa','--loc-gold':'#e2bd78'}},
  {id:'theme-8',label:'主題 8',scheme:'light',enabled:true,order:8,tokens:{'--loc-accent':'#526b80','--loc-gold':'#7b7467'}}
];

export const DEFAULT_SCOPE_THEME={loc:'theme-2',runes:'theme-2',lo3rwang:'theme-2'};

export function detectThemeScope(pathname='/',host=''){
  const h=String(host||'').toLowerCase();
  if(h==='lrunes.lo3rwang.cc') return 'runes';
  if(h==='lo3rwang.lo3rwang.cc') return 'lo3rwang';
  if(h==='loc.lo3rwang.cc') return 'loc';
  if(pathname==='/runes'||pathname.startsWith('/runes/')) return 'runes';
  if(pathname==='/lo3rwang'||pathname.startsWith('/lo3rwang/')) return 'lo3rwang';
  return 'loc';
}

export function mergeThemeSlots(overrides={}){
  return DEFAULT_THEME_SLOTS.map(slot=>({...slot,...(overrides[slot.id]||{}),tokens:{...slot.tokens,...((overrides[slot.id]||{}).tokens||{})}})).sort((a,b)=>a.order-b.order);
}
