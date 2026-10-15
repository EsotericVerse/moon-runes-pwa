'use client';

import {useUiLocale} from './ui-locale';
import {uiCopy} from './ui-copy';

// Only static interface copy belongs here. Authored works and DB metadata
// must continue to render exactly as stored.
function atPath(source,path){
  return String(path||'').split('.').reduce((value,key)=>value?.[key],source);
}
export function localizedUiText(copy,id,params={}){
  const resolved=atPath(copy,id);
  const fallback=atPath(uiCopy('zh-Hant'),id);
  const text=typeof resolved==='string'?resolved:typeof fallback==='string'?fallback:id;
  return text.replace(/\{([a-zA-Z][\w]*)\}/gu,(match,key)=>
    Object.prototype.hasOwnProperty.call(params,key)?String(params[key]??''):match);
}
export function useUiText(){
  const {copy}=useUiLocale();
  return (id,params)=>localizedUiText(copy,id,params);
}
export default function UiText({id,params}){
  const t=useUiText();
  return t(id,params);
}
