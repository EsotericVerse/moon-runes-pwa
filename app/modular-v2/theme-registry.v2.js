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
  {id:'theme-1',styleKey:'soul',group:'靈魂',label:'靈魂',scheme:'dark',tokens:{'--loc-bg':'#05060d','--loc-panel':'#0b0d18','--loc-panel-2':'#151827','--loc-panel-strong':'rgba(11,13,24,.96)','--loc-panel-nav':'rgba(5,6,13,.98)','--loc-panel-tab':'rgba(21,24,39,.94)','--loc-rune-bg':'#080a13','--loc-rune-selected-bg':'#25243a','--loc-line':'rgba(180,166,255,.28)','--loc-line-soft':'rgba(180,166,255,.14)','--loc-line-softer':'rgba(180,166,255,.16)','--loc-line-faint':'rgba(180,166,255,.18)','--loc-text':'#f4f1ff','--loc-muted':'#bdb8d2','--loc-heading':'#ffffff','--loc-accent':'#7566b8','--loc-gold':'#b9a7ff','--loc-danger':'#ffb7c8','--loc-surface':'rgba(11,13,24,.92)','--loc-surface-soft':'rgba(180,166,255,.045)','--loc-surface-faint':'rgba(180,166,255,.028)','--loc-surface-status':'rgba(180,166,255,.06)','--loc-accent-surface':'rgba(117,102,184,.16)','--loc-accent-surface-strong':'rgba(117,102,184,.28)','--loc-accent-border':'rgba(185,167,255,.62)','--loc-accent-border-soft':'rgba(185,167,255,.46)','--loc-accent-border-faint':'rgba(185,167,255,.34)','--loc-gold-surface':'rgba(185,167,255,.12)','--loc-gold-surface-soft':'rgba(185,167,255,.08)','--loc-gold-border':'rgba(185,167,255,.64)','--loc-gold-border-soft':'rgba(185,167,255,.48)','--loc-gold-border-faint':'rgba(185,167,255,.36)','--loc-gold-ring':'rgba(185,167,255,.30)','--loc-gold-ring-soft':'rgba(185,167,255,.18)','--loc-danger-border':'rgba(255,183,200,.38)','--loc-primary-start':'#332b68','--loc-primary-end':'#17152f','--loc-body-glow':'#1a1830','--loc-body-mid':'#090b14','--loc-hero-start':'rgba(27,24,48,.96)','--loc-hero-end':'rgba(5,6,13,.98)'}} ,
  {id:'theme-2',styleKey:'link',group:'連結',label:'連結',scheme:'light',tokens:{'--loc-bg':'#edf7ff','--loc-panel':'#f8fcff','--loc-panel-2':'#d9efff','--loc-panel-strong':'rgba(249,252,255,.94)','--loc-panel-nav':'rgba(240,249,255,.96)','--loc-panel-tab':'rgba(230,245,255,.94)','--loc-rune-bg':'#f2f9ff','--loc-rune-selected-bg':'#d7edfb','--loc-line':'rgba(38,91,125,.2)','--loc-line-soft':'rgba(38,91,125,.1)','--loc-line-softer':'rgba(38,91,125,.12)','--loc-line-faint':'rgba(38,91,125,.14)','--loc-text':'#17334a','--loc-muted':'#52748d','--loc-heading':'#12304a','--loc-accent':'#78bce8','--loc-gold':'#4d8fb8','--loc-danger':'#a33f50','--loc-surface':'rgba(249,252,255,.9)','--loc-surface-soft':'rgba(31,111,168,.035)','--loc-surface-faint':'rgba(31,111,168,.02)','--loc-surface-status':'rgba(31,111,168,.05)','--loc-accent-surface':'rgba(95,174,227,.08)','--loc-accent-surface-strong':'rgba(95,174,227,.15)','--loc-accent-border':'rgba(65,145,196,.52)','--loc-accent-border-soft':'rgba(65,145,196,.4)','--loc-accent-border-faint':'rgba(65,145,196,.34)','--loc-gold-surface':'rgba(77,143,184,.1)','--loc-gold-surface-soft':'rgba(77,143,184,.07)','--loc-gold-border':'rgba(77,143,184,.55)','--loc-gold-border-soft':'rgba(77,143,184,.42)','--loc-gold-border-faint':'rgba(77,143,184,.34)','--loc-gold-ring':'rgba(77,143,184,.24)','--loc-gold-ring-soft':'rgba(77,143,184,.14)','--loc-danger-border':'rgba(163,63,80,.28)','--loc-primary-start':'#bfe5fa','--loc-primary-end':'#9fd0ee','--loc-body-glow':'#c6e7fb','--loc-body-mid':'#e8f5ff','--loc-hero-start':'rgba(214,240,255,.97)','--loc-hero-end':'rgba(248,252,255,.99)'}},
  {id:'theme-3',styleKey:'life',group:'生命',label:'生命',scheme:'light',tokens:{'--loc-bg':'#ff8a00','--loc-panel':'#fff1dc','--loc-panel-2':'#ffd39a','--loc-text':'#4a2508','--loc-accent':'#ff8a00','--loc-gold':'#d96500','--loc-heading':'#6b2e00','--loc-muted':'#8a5a2b','--loc-body-glow':'#ffd5a6','--loc-body-mid':'#fff0dc','--loc-hero-start':'rgba(255,216,168,.97)','--loc-hero-end':'rgba(255,249,241,.98)'}},
  {id:'theme-4',styleKey:'nature',group:'自然',label:'自然',scheme:'light',tokens:{'--loc-bg':'#4c9a5a','--loc-panel':'#e7f5e9','--loc-panel-2':'#a9d8ae','--loc-text':'#12351f','--loc-accent':'#187a36','--loc-gold':'#126329','--loc-heading':'#0b2b17','--loc-muted':'#2f6b3c','--loc-body-glow':'#c6e8cb','--loc-body-mid':'#eaf6ec','--loc-hero-start':'rgba(201,235,207,.97)','--loc-hero-end':'rgba(249,253,250,.98)'}},
  {id:'theme-5',styleKey:'mineral',group:'礦物',label:'礦物',scheme:'light',tokens:{'--loc-bg':'#c7cdd3','--loc-panel':'#eef1f4','--loc-panel-2':'#aeb7c1','--loc-text':'#27313a','--loc-accent':'#7f8a95','--loc-gold':'#5f6b75','--loc-heading':'#172028','--loc-muted':'#53616c','--loc-body-glow':'#b8c1ca','--loc-body-mid':'#dfe4e8','--loc-hero-start':'rgba(218,224,229,.98)','--loc-hero-end':'rgba(242,245,247,.99)'}},
  {id:'theme-6',styleKey:'element',group:'元素',label:'元素',scheme:'dark',tokens:{'--loc-bg':'#240606','--loc-panel':'#3a0b0b','--loc-panel-2':'#571010','--loc-panel-strong':'rgba(58,11,11,.94)','--loc-panel-nav':'rgba(36,6,6,.96)','--loc-panel-tab':'rgba(87,16,16,.92)','--loc-rune-bg':'#310909','--loc-rune-selected-bg':'#691b18','--loc-line':'rgba(255,112,107,.30)','--loc-line-soft':'rgba(255,112,107,.15)','--loc-line-softer':'rgba(255,112,107,.18)','--loc-line-faint':'rgba(255,112,107,.20)','--loc-text':'#fff5f5','--loc-muted':'#f0aaa5','--loc-heading':'#ffffff','--loc-accent':'#e53935','--loc-gold':'#ff706b','--loc-danger':'#ffc2bf','--loc-surface':'rgba(58,11,11,.88)','--loc-surface-soft':'rgba(255,112,107,.05)','--loc-surface-faint':'rgba(255,112,107,.03)','--loc-surface-status':'rgba(255,112,107,.07)','--loc-accent-surface':'rgba(229,57,53,.14)','--loc-accent-surface-strong':'rgba(229,57,53,.25)','--loc-accent-border':'rgba(255,112,107,.62)','--loc-accent-border-soft':'rgba(255,112,107,.46)','--loc-accent-border-faint':'rgba(255,112,107,.34)','--loc-gold-surface':'rgba(255,112,107,.12)','--loc-gold-surface-soft':'rgba(255,112,107,.08)','--loc-gold-border':'rgba(255,112,107,.64)','--loc-gold-border-soft':'rgba(255,112,107,.48)','--loc-gold-border-faint':'rgba(255,112,107,.36)','--loc-gold-ring':'rgba(255,112,107,.30)','--loc-gold-ring-soft':'rgba(255,112,107,.18)','--loc-danger-border':'rgba(255,194,191,.38)','--loc-primary-start':'#8d211e','--loc-primary-end':'#57100f','--loc-body-glow':'#641d14','--loc-body-mid':'#240c09','--loc-hero-start':'rgba(98,30,21,.95)','--loc-hero-end':'rgba(26,9,8,.95)'}},
  {id:'theme-7',styleKey:'order',group:'秩序',label:'秩序',scheme:'light',tokens:{'--loc-bg':'#ffffff','--loc-panel':'#ffffff','--loc-panel-2':'#f7f7f7','--loc-panel-strong':'rgba(255,255,255,.98)','--loc-panel-nav':'rgba(255,255,255,.98)','--loc-panel-tab':'rgba(247,247,247,.98)','--loc-rune-bg':'#ffffff','--loc-rune-selected-bg':'#f1f1f1','--loc-line':'rgba(30,30,30,.18)','--loc-line-soft':'rgba(30,30,30,.10)','--loc-line-softer':'rgba(30,30,30,.12)','--loc-line-faint':'rgba(30,30,30,.08)','--loc-text':'#202020','--loc-muted':'#666666','--loc-heading':'#111111','--loc-accent':'#555555','--loc-gold':'#666666','--loc-danger':'#a33f50','--loc-surface':'rgba(255,255,255,.96)','--loc-surface-soft':'rgba(0,0,0,.035)','--loc-surface-faint':'rgba(0,0,0,.02)','--loc-surface-status':'rgba(0,0,0,.05)','--loc-accent-surface':'rgba(0,0,0,.06)','--loc-accent-surface-strong':'rgba(0,0,0,.12)','--loc-accent-border':'rgba(0,0,0,.35)','--loc-accent-border-soft':'rgba(0,0,0,.24)','--loc-accent-border-faint':'rgba(0,0,0,.16)','--loc-gold-surface':'rgba(0,0,0,.06)','--loc-gold-surface-soft':'rgba(0,0,0,.035)','--loc-gold-border':'rgba(0,0,0,.35)','--loc-gold-border-soft':'rgba(0,0,0,.24)','--loc-gold-border-faint':'rgba(0,0,0,.16)','--loc-gold-ring':'rgba(0,0,0,.20)','--loc-gold-ring-soft':'rgba(0,0,0,.12)','--loc-danger-border':'rgba(163,63,80,.28)','--loc-primary-start':'#ffffff','--loc-primary-end':'#f3f3f3','--loc-body-glow':'#ffffff','--loc-body-mid':'#fafafa','--loc-hero-start':'rgba(255,255,255,.99)','--loc-hero-end':'rgba(255,255,255,.99)'}},
  {id:'theme-8',styleKey:'disorder',group:'無序',label:'無序',scheme:'light',tokens:{'--loc-bg':'#6b3e2e','--loc-panel':'#4a281f','--loc-panel-2':'#6f3f2e','--loc-panel-strong':'rgba(74,40,31,.96)','--loc-panel-nav':'rgba(55,29,23,.98)','--loc-panel-tab':'rgba(111,63,46,.94)','--loc-rune-bg':'#3d211a','--loc-rune-selected-bg':'#875039','--loc-line':'rgba(238,190,157,.30)','--loc-line-soft':'rgba(238,190,157,.15)','--loc-text':'#fff3eb','--loc-muted':'#e0b9a5','--loc-heading':'#fffaf6','--loc-accent':'#c47b58','--loc-gold':'#e2a77e','--loc-surface':'rgba(74,40,31,.94)','--loc-surface-soft':'rgba(238,190,157,.06)','--loc-surface-faint':'rgba(238,190,157,.035)','--loc-body-glow':'#754331','--loc-body-mid':'#2b1712','--loc-hero-start':'rgba(112,61,43,.96)','--loc-hero-end':'rgba(43,23,18,.98)'}}
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
