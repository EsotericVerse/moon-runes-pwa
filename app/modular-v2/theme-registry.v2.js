import {SCOPES_V2} from './scope-registry.v2.js';

export const THEME_REGISTRY_SETTING_KEY_V2='theme-registry-overrides-v1';
export const SCOPE_THEME_SETTINGS_KEY_V2='scope-theme-settings-v2';

export const THEME_TOKEN_KEYS_V2=[
  '--loc-bg','--loc-panel','--loc-panel-2','--loc-panel-strong','--loc-panel-nav','--loc-panel-tab','--loc-rune-bg','--loc-rune-selected-bg',
  '--loc-line','--loc-line-soft','--loc-line-softer','--loc-line-faint','--loc-text','--loc-muted','--loc-heading','--loc-accent','--loc-gold','--loc-danger',
  '--loc-surface','--loc-surface-soft','--loc-surface-faint','--loc-surface-status','--loc-accent-surface','--loc-accent-surface-strong','--loc-accent-border','--loc-accent-border-soft','--loc-accent-border-faint',
  '--loc-gold-surface','--loc-gold-surface-soft','--loc-gold-border','--loc-gold-border-soft','--loc-gold-border-faint','--loc-gold-ring','--loc-gold-ring-soft','--loc-danger-border',
  '--loc-primary-start','--loc-primary-end','--loc-body-glow','--loc-body-mid','--loc-hero-start','--loc-hero-end'
];

export const GROUP_IDENTITY_COLORS_V2=Object.freeze({
  '靈魂':'#1d2f8f','連結':'#9bd7ff','生命':'#ff8a00','自然':'#1f6b3a',
  '礦物':'#c7cdd3','元素':'#e53935','秩序':'#ffffff','無序':'#6b3e2e'
});

const slots=[
  {id:'theme-1',styleKey:'soul',group:'靈魂',label:'靈魂',scheme:'dark',tokens:{'--loc-bg':'#090b20','--loc-panel':'#11142c','--loc-panel-2':'#1a1e3d','--loc-text':'#f1f0ff','--loc-accent':'#5d5bc4','--loc-gold':'#c8b8ff','--loc-heading':'#ffffff','--loc-muted':'#c0c3e8','--loc-body-glow':'#173659','--loc-body-mid':'#0a1626','--loc-hero-start':'rgba(21,48,80,.94)','--loc-hero-end':'rgba(7,17,31,.94)'}},
  {id:'theme-2',styleKey:'link',group:'連結',label:'連結',scheme:'light',tokens:{'--loc-bg':'#edf7ff','--loc-panel':'#f8fcff','--loc-panel-2':'#d9efff','--loc-panel-strong':'rgba(249,252,255,.94)','--loc-panel-nav':'rgba(240,249,255,.96)','--loc-panel-tab':'rgba(230,245,255,.94)','--loc-rune-bg':'#f2f9ff','--loc-rune-selected-bg':'#d7edfb','--loc-line':'rgba(38,91,125,.2)','--loc-line-soft':'rgba(38,91,125,.1)','--loc-line-softer':'rgba(38,91,125,.12)','--loc-line-faint':'rgba(38,91,125,.14)','--loc-text':'#17334a','--loc-muted':'#52748d','--loc-heading':'#12304a','--loc-accent':'#78bce8','--loc-gold':'#4d8fb8','--loc-danger':'#a33f50','--loc-surface':'rgba(249,252,255,.9)','--loc-surface-soft':'rgba(31,111,168,.035)','--loc-surface-faint':'rgba(31,111,168,.02)','--loc-surface-status':'rgba(31,111,168,.05)','--loc-accent-surface':'rgba(95,174,227,.08)','--loc-accent-surface-strong':'rgba(95,174,227,.15)','--loc-accent-border':'rgba(65,145,196,.52)','--loc-accent-border-soft':'rgba(65,145,196,.4)','--loc-accent-border-faint':'rgba(65,145,196,.34)','--loc-gold-surface':'rgba(77,143,184,.1)','--loc-gold-surface-soft':'rgba(77,143,184,.07)','--loc-gold-border':'rgba(77,143,184,.55)','--loc-gold-border-soft':'rgba(77,143,184,.42)','--loc-gold-border-faint':'rgba(77,143,184,.34)','--loc-gold-ring':'rgba(77,143,184,.24)','--loc-gold-ring-soft':'rgba(77,143,184,.14)','--loc-danger-border':'rgba(163,63,80,.28)','--loc-primary-start':'#bfe5fa','--loc-primary-end':'#9fd0ee','--loc-body-glow':'#c6e7fb','--loc-body-mid':'#e8f5ff','--loc-hero-start':'rgba(214,240,255,.97)','--loc-hero-end':'rgba(248,252,255,.99)'}},
  {id:'theme-3',styleKey:'life',group:'生命',label:'生命',scheme:'light',tokens:{'--loc-bg':'#ff8a00','--loc-panel':'#fff1dc','--loc-panel-2':'#ffd39a','--loc-text':'#4a2508','--loc-accent':'#ff8a00','--loc-gold':'#d96500','--loc-heading':'#6b2e00','--loc-muted':'#8a5a2b','--loc-body-glow':'#ffd5a6','--loc-body-mid':'#fff0dc','--loc-hero-start':'rgba(255,216,168,.97)','--loc-hero-end':'rgba(255,249,241,.98)'}},
  {id:'theme-4',styleKey:'nature',group:'自然',label:'自然',scheme:'light',tokens:{'--loc-bg':'#4c9a5a','--loc-panel':'#e7f5e9','--loc-panel-2':'#a9d8ae','--loc-text':'#12351f','--loc-accent':'#187a36','--loc-gold':'#126329','--loc-heading':'#0b2b17','--loc-muted':'#2f6b3c','--loc-body-glow':'#c6e8cb','--loc-body-mid':'#eaf6ec','--loc-hero-start':'rgba(201,235,207,.97)','--loc-hero-end':'rgba(249,253,250,.98)'}},
  {id:'theme-5',styleKey:'mineral',group:'礦物',label:'礦物',scheme:'light',tokens:{'--loc-bg':'#e7ebef','--loc-panel':'#fbfcfd','--loc-panel-2':'#d1d7de','--loc-text':'#303840','--loc-accent':'#aeb7c1','--loc-gold':'#7f8a95','--loc-heading':'#1f272e','--loc-muted':'#68737d','--loc-body-glow':'#cfd6dd','--loc-body-mid':'#e7ebef','--loc-hero-start':'rgba(211,218,225,.97)','--loc-hero-end':'rgba(248,250,252,.98)'}},
  {id:'theme-6',styleKey:'element',group:'元素',label:'元素',scheme:'dark',tokens:{'--loc-bg':'#e53935','--loc-panel':'#fff0ef','--loc-panel-2':'#ffaaa5','--loc-text':'#4a0808','--loc-accent':'#e53935','--loc-gold':'#b91c1c','--loc-heading':'#710d0d','--loc-muted':'#8f3a3a','--loc-body-glow':'#641d14','--loc-body-mid':'#240c09','--loc-hero-start':'rgba(98,30,21,.95)','--loc-hero-end':'rgba(26,9,8,.95)'}},
  {id:'theme-7',styleKey:'order',group:'秩序',label:'秩序',scheme:'light',tokens:{'--loc-bg':'#ffffff','--loc-panel':'#ffffff','--loc-panel-2':'#f1f3f5','--loc-text':'#20252b','--loc-accent':'#66707a','--loc-gold':'#87919a','--loc-heading':'#11161b','--loc-muted':'#68727c','--loc-body-glow':'#f1f3f5','--loc-body-mid':'#fafafa','--loc-hero-start':'rgba(255,255,255,.99)','--loc-hero-end':'rgba(246,248,250,.99)'}},
  {id:'theme-8',styleKey:'disorder',group:'無序',label:'無序',scheme:'dark',tokens:{'--loc-bg':'#6b3e2e','--loc-panel':'#fff1eb','--loc-panel-2':'#c98b70','--loc-text':'#3a1f16','--loc-accent':'#7a3f2b','--loc-gold':'#9a6048','--loc-heading':'#24120c','--loc-muted':'#7a4a38','--loc-body-glow':'#5b3022','--loc-body-mid':'#24130e','--loc-hero-start':'rgba(91,48,34,.95)','--loc-hero-end':'rgba(27,16,12,.98)'}}
];

export const THEME_SLOTS_V2=Object.freeze(slots.map((slot,index)=>Object.freeze({
  ...slot,
  identityColor:GROUP_IDENTITY_COLORS_V2[slot.group],
  enabled:true,
  order:index+1,
  tokens:Object.freeze(slot.tokens)
})));

export const DEFAULT_ROTATION_SCHEDULE_V2=SCOPES_V2.loc.theme.schedule;
export const DEFAULT_SCOPE_THEME_SETTINGS_V2=Object.freeze(
  Object.fromEntries(Object.entries(SCOPES_V2).map(([id,scope])=>[id,scope.theme]))
);

export function mergeThemeSlotsV2(overrides={}){
  return THEME_SLOTS_V2.map(slot=>({
    ...slot,
    ...(overrides?.[slot.id]||{}),
    identityColor:GROUP_IDENTITY_COLORS_V2[slot.group],
    tokens:{...slot.tokens,...((overrides?.[slot.id]||{}).tokens||{})}
  })).sort((a,b)=>a.order-b.order);
}

export function themeForHourV2(schedule=DEFAULT_ROTATION_SCHEDULE_V2,hour=new Date().getHours()){
  const ordered=[...(schedule||[])].sort((a,b)=>a.start-b.start);
  return [...ordered].reverse().find(item=>hour>=item.start)?.theme||ordered.at(-1)?.theme||'theme-7';
}

export function getThemeSlotV2(id,overrides={}){
  return mergeThemeSlotsV2(overrides).find(slot=>slot.id===id)||THEME_SLOTS_V2.find(slot=>slot.id==='theme-7');
}

export function scopeThemeSettingsV2(scopeId,stored={},managedDefault=null){
  const fallback=DEFAULT_SCOPE_THEME_SETTINGS_V2[scopeId]||DEFAULT_SCOPE_THEME_SETTINGS_V2.loc;
  const base=managedDefault?{
    ...fallback,
    ...managedDefault,
    custom:{...fallback.custom,...(managedDefault.custom||{})},
    schedule:Array.isArray(managedDefault.schedule)&&managedDefault.schedule.length?managedDefault.schedule:fallback.schedule
  }:fallback;
  const override=stored?.[scopeId]||{};
  return {...base,...override,custom:{...base.custom,...(override.custom||{})},schedule:override.schedule||base.schedule};
}

export function applyThemeV2(slot,custom={}){
  if(typeof document==='undefined'||!slot)return;
  const root=document.documentElement;
  THEME_TOKEN_KEYS_V2.forEach(key=>root.style.removeProperty(key));
  root.dataset.theme=slot.scheme;
  Object.entries({...slot.tokens,...custom}).forEach(([key,value])=>{if(value)root.style.setProperty(key,value);});
}
