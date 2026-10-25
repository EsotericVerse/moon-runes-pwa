import {classGroupIndex,classificationSearchKey,normalizeClassificationText}
  from '../../../loc/model/class-group-items.mjs';

// Same Class/Group/Item shape as keyword navigation; Trace items are saved
// route objects, with anchor_uids carrying their ordered spatial stop sequence.
export const TRACE_UNCLASSIFIED='未分類';
export const traceClassOf=route=>normalizeClassificationText(route?.class);
export const traceGroupOf=route=>normalizeClassificationText(route?.class_group);
export const traceClassLabel=value=>normalizeClassificationText(value)||TRACE_UNCLASSIFIED;
export function traceClassGroups(maps=[]){
  return classGroupIndex(maps,{classOf:traceClassOf,groupOf:traceGroupOf});
}
export function routeClasses(maps=[]){
  return [...traceClassGroups(maps).keys()].sort((a,b)=>
    a===b?0:!a?1:!b?-1:a.localeCompare(b,'zh-Hant'));
}
export function routeGroups(maps=[],selectedClass=''){
  const groups=traceClassGroups(maps).get(selectedClass)||new Map();
  return [...groups.keys()].sort((a,b)=>
    a===b?0:!a?1:!b?-1:a.localeCompare(b,'zh-Hant'));
}
export function searchTraceRoutes(maps=[],{className,group,query=''}={}){
  const needle=classificationSearchKey(query);
  return (Array.isArray(maps)?maps:[]).filter(row=>
    (className===undefined||traceClassOf(row)===className)
    &&(group===undefined||traceGroupOf(row)===group)
    &&(!needle||[traceClassOf(row),traceGroupOf(row),row?.title,row?.description]
      .some(value=>classificationSearchKey(value).includes(needle))));
}
export function validateTraceRouteLabels(className='',group=''){
  const cls=normalizeClassificationText(className);
  const grp=normalizeClassificationText(group);
  if(cls.length>100||grp.length>100)throw Error('Class 和領域名稱最多 100 字。');
  if(!cls&&grp)throw Error('請先填寫 Class，才能設定領域。');
  return {class:cls,class_group:grp};
}
