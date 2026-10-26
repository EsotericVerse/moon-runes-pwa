import {categoryClassGroupIndex,classificationSearchKey,normalizeClassificationText}
  from '../../../loc/model/class-group-items.mjs';

// Keyword Class/Group/Item navigation is the reused presentation skeleton.
// Trace Item is one named Frame with its own anchor_list; not an anchor.
// Older Frames lacking the top-level category stay visible under 未分類.
export const TRACE_UNCLASSIFIED='未分類';
export const traceCategoryOf=route=>normalizeClassificationText(route?.category);
export const traceClassOf=route=>normalizeClassificationText(route?.class);
export const traceGroupOf=route=>normalizeClassificationText(route?.class_group);
export const traceClassLabel=value=>normalizeClassificationText(value)||TRACE_UNCLASSIFIED;
export const traceCategories=maps=>[...traceClassificationIndex(maps).keys()]
  .sort(compareLabels);
const compareLabels=(a,b)=>a===b?0:!a?1:!b?-1:a.localeCompare(b,'zh-Hant');

export function traceClassificationIndex(maps=[]){
  return categoryClassGroupIndex(maps,{
    categoryOf:traceCategoryOf,classOf:traceClassOf,groupOf:traceGroupOf
  });
}
export function routeClasses(maps=[],category=''){
  return [...(traceClassificationIndex(maps).get(category)||new Map()).keys()].sort(compareLabels);
}
export function routeGroups(maps=[],category='',selectedClass=''){
  const classes=traceClassificationIndex(maps).get(category)||new Map();
  return [...(classes.get(selectedClass)||new Map()).keys()].sort(compareLabels);
}
export function searchTraceRoutes(maps=[],{category,className,group,query=''}={}){
  const needle=classificationSearchKey(query);
  return (Array.isArray(maps)?maps:[]).filter(row=>
    (category===undefined||traceCategoryOf(row)===category)
    &&(className===undefined||traceClassOf(row)===className)
    &&(group===undefined||traceGroupOf(row)===group)
    &&(!needle||[traceCategoryOf(row),traceClassOf(row),traceGroupOf(row),row?.title,row?.description]
      .some(value=>classificationSearchKey(value).includes(needle))));
}
export function validateTraceRouteLabels(category='',className='',group=''){
  const cat=normalizeClassificationText(category);
  const cls=normalizeClassificationText(className);
  const grp=normalizeClassificationText(group);
  if(cat.length>100||cls.length>100||grp.length>100)
    throw Error('大分類、Class 與 Group 名稱最多 100 字。');
  if(cat&&!cls)throw Error('請先填寫 Class，才能建立這個大分類下的痕跡圖。');
  if(!cls&&grp)throw Error('請先填寫 Class，才能設定 Group。');
  // Existing three-level Frames have category='' and must remain editable.
  return {category:cat,class:cls,class_group:grp};
}
