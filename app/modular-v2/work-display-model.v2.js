'use client';

import {decodeCultureText} from './modules/culture-timeline/culture-timeline-model.mjs';

export const WORK_FALLBACK_TITLE='未命名作品';
export const MEDIA_FALLBACK_TITLE='未命名媒體';

export function workDisplayText(value){
  return decodeCultureText(value??'');
}

export function workDisplayTitle({
  title='',
  fallback=WORK_FALLBACK_TITLE
}={}){
  const explicit=decodeCultureText(title??'').trim();
  return explicit||fallback;
}

export function workDisplaySource(row={},fallback=''){
  return workDisplayText(row?.source_name||row?.group_label||fallback).trim();
}


export function workDisplayHeading(row={},{
  media=null,
  fallback=''
}={}){
  const isMedia=media===null?Boolean(row?.media_id):Boolean(media);
  const explicitTitle=
    row?.title||
    row?.display_title||
    row?.name||
    '';
  return workDisplayTitle({
    title:explicitTitle,
    fallback:fallback||(isMedia?MEDIA_FALLBACK_TITLE:WORK_FALLBACK_TITLE)
  });
}
