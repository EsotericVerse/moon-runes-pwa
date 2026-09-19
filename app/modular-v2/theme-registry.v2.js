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
  '靈魂':'#3F3B8F','連結':'#7DB7E8','生命':'#E67E22','自然':'#4C9A5A',
  '礦物':'#B8C0C8','元素':'#C94B3B','秩序':'#B7C96A','無序':'#6B3E2E'
});

const slots=[
  {id:'theme-1',styleKey:'soul',group:'靈魂',label:'靈魂組',scheme:'dark',tokens:{'--loc-bg':'#090b20','--loc-panel':'#11142c','--loc-panel-2':'#1a1e3d','--loc-text':'#f1f0ff','--loc-accent':'#5d5bc4','--loc-gold':'#c8b8ff','--loc-body-glow':'#173659','--loc-body-mid':'#0a1626','--loc-hero-start':'rgba(21,48,80,.94)','--loc-hero-end':'rgba(7,17,31,.94)'}},
  {id:'theme-2',styleKey:'link',group:'連結',label:'連結組・淺藍',scheme:'light',tokens:{'--loc-bg':'#edf7ff','--loc-panel':'#f9fcff','--loc-panel-2':'#d9efff','--loc-panel-strong':'rgba(249,252,255,.94)','--loc-panel-nav':'rgba(240,249,255,.96)','--loc-panel-tab':'rgba(230,245,255,.94)','--loc-rune-bg':'#f2f9ff','--loc-rune-selected-bg':'#d7edfb','--loc-line':'rgba(38,91,125,.2)','--loc-line-soft':'rgba(38,91,125,.1)','--loc-line-softer':'rgba(38,91,125,.12)','--loc-line-faint':'rgba(38,91,125,.14)','--loc-text':'#17334a','--loc-muted':'#52748d','--loc-heading':'#12304a','--loc-accent':'#5faee3','--loc-gold':'#4d8fb8','--loc-danger':'#a33f50','--loc-surface':'rgba(249,252,255,.9)','--loc-surface-soft':'rgba(31,111,168,.035)','--loc-surface-faint':'rgba(31,111,168,.02)','--loc-surface-status':'rgba(31,111,168,.05)','--loc-accent-surface':'rgba(95,174,227,.08)','--loc-accent-surface-strong':'rgba(95,174,227,.15)','--loc-accent-border':'rgba(65,145,196,.52)','--loc-accent-border-soft':'rgba(65,145,196,.4)','--loc-accent-border-faint':'rgba(65,145,196,.34)','--loc-gold-surface':'rgba(77,143,184,.1)','--loc-gold-surface-soft':'rgba(77,143,184,.07)','--loc-gold-border':'rgba(77,143,184,.55)','--loc-gold-border-soft':'rgba(77,143,184,.42)','--loc-gold-border-faint':'rgba(77,143,184,.34)','--loc-gold-ring':'rgba(77,143,184,.24)','--loc-gold-ring-soft':'rgba(77,143,184,.14)','--loc-danger-border':'rgba(163,63,80,.28)','--loc-primary-start':'#bfe5fa','--loc-primary-end':'#9fd0ee','--loc-body-glow':'#c6e7fb','--loc-body-mid':'#e8f5ff','--loc-hero-start':'rgba(214,240,255,.97)','--loc-hero-end':'rgba(248,252,255,.99)'}},
  {id:'theme-3',styleKey:'life',group:'生命',label:'生命組',scheme:'light',tokens:{'--loc-bg':'#fff5e8','--loc-panel':'#fffaf3','--loc-panel-2':'#ffe4c2','--loc-text':'#402414','--loc-accent':'#f28a2e','--loc-gold':'#c96219','--loc-body-glow':'#ffd5a6','--loc-body-mid':'#fff0dc','--loc-hero-start':'rgba(255,216,168,.97)','--loc-hero-end':'rgba(255,249,241,.98)'}},
  {id:'theme-4',styleKey:'nature',group:'自然',label:'自然組',scheme:'light',tokens:{'--loc-bg':'#eef8ef','--loc-panel':'#fbfdfb','--loc-panel-2':'#dbeedc','--loc-text':'#17351f','--loc-accent':'#3f9d5c','--loc-gold':'#718a42','--loc-body-glow':'#c6e8cb','--loc-body-mid':'#eaf6ec','--loc-hero-start':'rgba(201,235,207,.97)','--loc-hero-end':'rgba(249,253,250,.98)'}},
  {id:'theme-5',styleKey:'mineral',group:'礦物',label:'礦物組・銀白',scheme:'light',tokens:{'--loc-bg':'#e9edf1','--loc-panel':'#f8fafc','--loc-panel-2':'#d5dbe1','--loc-text':'#2b333b','--loc-accent':'#9aa3ad','--loc-gold':'#b8b0aa','--loc-body-glow':'#cfd6dd','--loc-body-mid':'#e7ebef','--loc-hero-start':'rgba(211,218,225,.97)','--loc-hero-end':'rgba(248,250,252,.98)'}},
  {id:'theme-6',styleKey:'element',group:'元素',label:'元素組',scheme:'dark',tokens:{'--loc-bg':'#1a0908','--loc-panel':'#2b100d','--loc-panel-2':'#3b1813','--loc-text':'#fff1ee','--loc-accent':'#e55a45','--loc-gold':'#e09272','--loc-body-glow':'#641d14','--loc-body-mid':'#240c09','--loc-hero-start':'rgba(98,30,21,.95)','--loc-hero-end':'rgba(26,9,8,.95)'}},
  {id:'theme-7',styleKey:'order',group:'秩序',label:'秩序組',scheme:'light',tokens:{'--loc-bg':'#ffffff','--loc-panel':'#ffffff','--loc-panel-2':'#f2f4f6','--loc-text':'#1f252b','--loc-accent':'#b7c96a','--loc-gold':'#b7a16a','--loc-body-glow':'#f1f3f5','--loc-body-mid':'#fafafa','--loc-hero-start':'rgba(255,255,255,.99)','--loc-hero-end':'rgba(246,248,250,.99)'}},
  {id:'theme-8',styleKey:'disorder',group:'無序',label:'無序組・深棕',scheme:'dark',tokens:{'--loc-bg':'#1b100c','--loc-panel':'#2a1812','--loc-panel-2':'#3b2219','--loc-text':'#f4e9e4','--loc-accent':'#9b6048','--loc-gold':'#c28a68','--loc-body-glow':'#5b3022','--loc-body-mid':'#24130e','--loc-hero-start':'rgba(91,48,34,.95)','--loc-hero-end':'rgba(27,16,12,.98)'}}
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
