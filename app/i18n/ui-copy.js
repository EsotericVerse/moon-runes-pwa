// UI dictionaries: one JSON per language. Galaxy/rune/authored content is never translated.
import zhTw from './zh_tw.json' with {type:'json'};
import zhCn from './zh_cn.json' with {type:'json'};
import enJson from './en.json' with {type:'json'};
import jaJson from './ja.json' with {type:'json'};

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
const zhHans=withFormat(zhCn);
const en=withFormat(enJson);
const ja=withFormat(jaJson);

export const UI_LOCALE='zh-Hant';
export const UI_LOCALE_OPTIONS=Object.freeze([
  Object.freeze({value:'zh-Hant',label:'繁體中文'}),
  Object.freeze({value:'zh-Hans',label:'简体中文'}),
  Object.freeze({value:'en',label:'English'}),
  Object.freeze({value:'ja',label:'日本語'})
]);
export const UI_COPY=zhHant;
export const UI_DICTIONARIES=Object.freeze({'zh-Hant':zhHant,'zh-Hans':zhHans,en,ja});

export function normalizeUiLocale(locale){
  const value=String(locale||'').trim();
  return UI_DICTIONARIES[value]?value:UI_LOCALE;
}

export function uiCopy(locale=UI_LOCALE){
  return UI_DICTIONARIES[normalizeUiLocale(locale)];
}
