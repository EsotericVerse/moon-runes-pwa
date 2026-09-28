'use client';

import {decodeCultureText} from './modules/culture-timeline/culture-timeline-model.mjs';

export const WORK_FALLBACK_TITLE='未命名作品';
export const MEDIA_FALLBACK_TITLE='未命名媒體';

export function workDisplayText(value){
  return decodeCultureText(value??'');
}

export function workDisplayPreview(value,{limit=80}={}){
  const text=workDisplayText(value).replace(/\s+/g,' ').trim();
  const size=Math.max(1,Math.floor(Number(limit)||80));
  return text.slice(0,size);
}

export function workDisplayTitle({
  title='',
  preview='',
  content='',
  fallback=WORK_FALLBACK_TITLE,
  limit=80
}={}){
  const explicit=workDisplayText(title).trim();
  if(explicit)return explicit;
  const derived=workDisplayPreview(preview||content,{limit});
  return derived||fallback;
}

export function workDisplaySource(row={},fallback=''){
  return workDisplayText(row?.source_name||row?.group_label||fallback).trim();
}


export function workDisplayHeading(row={},{
  media=null,
  fallback='',
  limit=80
}={}){
  const isMedia=media===null?Boolean(row?.media_id):Boolean(media);
  const explicitTitle=
    row?.title||
    row?.display_title||
    row?.name||
    '';
  const preview=
    row?.excerpt||
    row?.content||
    row?.meta_tags||
    row?.description||
    '';
  return workDisplayTitle({
    title:explicitTitle,
    preview,
    fallback:fallback||(isMedia?MEDIA_FALLBACK_TITLE:WORK_FALLBACK_TITLE),
    limit
  });
}
