'use client';

export const SPATIAL_EVENT='loc:spatial-view';
export const SPATIAL_STORAGE_KEY='loc:spatial-selection';

export function normalizeSpatialItem(item,index=0){
  const id=String(item?.id||item?.key||'item-'+index);
  return {
    id,
    label:String(item?.label||item?.title||id),
    kind:String(item?.kind||item?.type||'item'),
    date:String(item?.date||''),
    href:String(item?.href||''),
    group:String(item?.group||item?.source||''),
    relations:Array.isArray(item?.relations)?item.relations.map(String):[]
  };
}

export function openSpatialView(items=[],options={}){
  if(typeof window==='undefined')return;
  const detail={
    items:items.map(normalizeSpatialItem),
    title:String(options.title||'立體檢視'),
    focusId:String(options.focusId||'')
  };
  try{sessionStorage.setItem(SPATIAL_STORAGE_KEY,JSON.stringify(detail));}catch{}
  window.dispatchEvent(new CustomEvent(SPATIAL_EVENT,{detail}));
}

export function readSpatialView(){
  if(typeof window==='undefined')return null;
  try{return JSON.parse(sessionStorage.getItem(SPATIAL_STORAGE_KEY)||'null');}catch{return null}
}
