'use client';

import {searchNeonRows} from '../../../loc/neon-search';
import {selectScopeCultureData} from '../../../loc/neon-culture-client';
import {selectScopeRankingPage} from '../../../loc/neon-ranking-client';
import {mergeLanguageItems,neonSearchItems,rankingItems,timelineItems} from './language-space-model';

function rankingPlan(scopeId){
  if(scopeId==='lunarunes')return [['group','keyword'],['keyword','keyword']];
  if(scopeId==='loc')return [['group','keyword'],['keyword','keyword'],['text_type','text'],['text_category','text'],['meta_type','media'],['meta_style','media'],['meta_source','media']];
  return [['text_type','text'],['text_category','text'],['text_source','text'],['meta_type','media'],['meta_style','media'],['meta_source','media']];
}

export async function loadLanguageSpaceTime(scopeId){
  const data=await selectScopeCultureData(scopeId);
  return {
    raw:data,
    items:timelineItems(data?.timelineItems||[])
  };
}

export async function loadLanguageSpaceAnalysis(scopeId){
  const groups=await Promise.all(rankingPlan(scopeId)
    .filter(([,kind])=>kind!=='media')
    .map(async([type,kind])=>({
      type,kind,
      rows:(await selectScopeRankingPage(scopeId,{rankingType:type,limit:100,navigation:{}})).rows
    })));
  return {
    groups,
    items:mergeLanguageItems(...groups.map(group=>rankingItems(group.rows,group.kind)))
  };
}

export async function loadLanguageSpaceExtension(scopeId){
  const groups=await Promise.all(rankingPlan(scopeId)
    .filter(([,kind])=>kind==='media')
    .map(async([type,kind])=>({
      type,kind,
      rows:(await selectScopeRankingPage(scopeId,{rankingType:type,limit:100,navigation:{}})).rows
    })));
  return {
    groups,
    items:mergeLanguageItems(...groups.map(group=>rankingItems(group.rows,group.kind)))
  };
}

export async function searchLanguageSpace(collectionId,query){
  const text=String(query||'').trim();
  if(!text)return {query:'',raw:null,items:[]};
  const raw=await searchNeonRows(collectionId,text,{limit:5000,offset:0});
  return {query:text,raw,items:neonSearchItems(raw?.rows||[])};
}

export function composeLanguageSpace({time=[],analysis=[],extension=[],search=[]}={}){
  return mergeLanguageItems(time,analysis,extension,search);
}
