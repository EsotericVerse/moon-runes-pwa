// UI dictionaries: one JSON per language. Galaxy/rune/authored content is never translated.
// Traditional Chinese is the default and ships with every page. The other
// three dictionaries are separate chunks, fetched only when that language is
// actually selected (loadUiLocale).
import zhTw from './zh_tw.json' with {type:'json'};

function interpolate(template,values={}){
  return String(template||'').replace(/\{(label|query)\}/g,(_,key)=>String(values[key]??''));
}

function withFormat(content){
  const f=content.formatMessages;
  return Object.freeze({...content,format:Object.freeze({
    searchScope:label=>interpolate(f.searchScope,{label}),
    searchResult:({label,query,hasMore,partial=''})=>
      interpolate(f.result,{label,query})+(hasMore?f.more:f.end)+partial,
    relatedText:index=>f.relatedText+' '+index,
    link:index=>f.link+' '+index,
    songLink:index=>f.songLink+' '+index,
    period:index=>f.period+' '+index,
    selected:value=>f.selected+value
  })});
}

const zhHant=withFormat(zhTw);

export const UI_LOCALE='zh-Hant';
export const UI_LOCALE_OPTIONS=Object.freeze([
  Object.freeze({value:'zh-Hant',label:'繁體中文'}),
  Object.freeze({value:'zh-Hans',label:'简体中文'}),
  Object.freeze({value:'en',label:'English'}),
  Object.freeze({value:'ja',label:'日本語'})
]);
export const UI_COPY=zhHant;
// Filled in by loadUiLocale; until a language is loaded its lookups fall back
// to the default dictionary.
export const UI_DICTIONARIES={'zh-Hant':zhHant};
const LOADERS={
  'zh-Hans':()=>import('./zh_cn.json',{with:{type:'json'}}),
  en:()=>import('./en.json',{with:{type:'json'}}),
  ja:()=>import('./ja.json',{with:{type:'json'}})
};
const pending={};
export function isUiLocaleLoaded(locale){return Boolean(UI_DICTIONARIES[locale]);}
export function loadUiLocale(locale){
  const value=String(locale||'').trim();
  if(UI_DICTIONARIES[value])return Promise.resolve(UI_DICTIONARIES[value]);
  if(!Object.hasOwn(LOADERS,value))return Promise.resolve(zhHant);
  // Japanese interface fields fall back to English wording, so load it too.
  const needs=value==='ja'?['en','ja']:[value];
  pending[value]??=Promise.all(needs.map(id=>UI_DICTIONARIES[id]?null:LOADERS[id]().then(mod=>{
    UI_DICTIONARIES[id]=withFormat(mod.default);
  }))).then(()=>UI_DICTIONARIES[value]);
  return pending[value];
}

// Strings that belong to one lazily loaded feature (keyword library, private
// files, timeline editor, item confluence, daily-rune analytics). They live in
// features.<language>.json and are only imported by those features' own
// chunks, never by the page shell.
const FEATURE_LOADERS={
  'zh-Hans':()=>import('./features.zh_cn.json',{with:{type:'json'}}),
  en:()=>import('./features.en.json',{with:{type:'json'}}),
  ja:()=>import('./features.ja.json',{with:{type:'json'}})
};
const featureCopy={};
const featurePending={};
export function isFeatureCopyLoaded(locale){return Boolean(featureCopy[locale]);}
export function loadFeatureCopy(locale){
  const value=String(locale||'').trim();
  if(featureCopy[value]||!Object.hasOwn(FEATURE_LOADERS,value))return Promise.resolve(featureCopy[value]||null);
  featurePending[value]??=FEATURE_LOADERS[value]().then(mod=>(featureCopy[value]=mod.default));
  return featurePending[value];
}
// defaults = the Traditional Chinese section, imported by the calling feature.
export function featureSection(locale,section,defaults){
  return featureCopy[locale]?.[section]||defaults;
}

export function normalizeUiLocale(locale){
  const value=String(locale||'').trim();
  return Object.hasOwn(LOADERS,value)||value===UI_LOCALE?value:UI_LOCALE;
}

// One authoritative dictionary for both key-based UI copy and authored
// interface labels that still use legacy field names.
export function translateUiField(locale,text){
  const value=String(text??'');
  const translated=UI_DICTIONARIES[locale]?.fields?.[value];
  return translated||(locale==='ja'?UI_DICTIONARIES.en?.fields?.[value]:null)||value;
}

export function uiCopy(locale=UI_LOCALE){
  return UI_DICTIONARIES[normalizeUiLocale(locale)]||zhHant;
}
