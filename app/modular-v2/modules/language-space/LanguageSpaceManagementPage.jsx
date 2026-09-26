'use client';

import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectScopeCultureData} from '../../../loc/neon-culture-client';
import {selectScopeRankingPage} from '../../../loc/neon-ranking-client';
import {useScopeRuntimeV2} from '../../use-scope-runtime.v2';
import LanguageSpaceWorkspace from './LanguageSpaceWorkspace';
import LanguageSpaceManagementFace from './LanguageSpaceManagementFace';
import {mergeLanguageItems,rankingItems,timelineItems} from './language-space-model';

export default function LanguageSpaceManagementPage(){
  const {scopeId}=useScopeRuntimeV2();
  const culture=useQuery({
    queryKey:['language-space-manage-time',scopeId],
    queryFn:()=>selectScopeCultureData(scopeId),
    staleTime:30000
  });
  const text=useQuery({
    queryKey:['language-space-manage-text',scopeId],
    queryFn:async()=>scopeId==='admin'?[]:(await selectScopeRankingPage(scopeId,{rankingType:scopeId==='lunarunes'?'keyword':'text_type',limit:100,navigation:{}})).rows,
    staleTime:30000
  });
  const media=useQuery({
    queryKey:['language-space-manage-media',scopeId],
    queryFn:async()=>scopeId==='lo3rwang'||scopeId==='loc'?(await selectScopeRankingPage(scopeId,{rankingType:'meta_style',limit:100,navigation:{}})).rows:[],
    staleTime:30000
  });
  const items=useMemo(()=>mergeLanguageItems(
    timelineItems(culture.data?.timelineItems||[]),
    rankingItems(text.data||[],'text'),
    rankingItems(media.data||[],'media')
  ),[culture.data,text.data,media.data]);

  return <LanguageSpaceWorkspace
    items={items}
    title="語言空間管理"
    initialFace="manage"
    management={<LanguageSpaceManagementFace/>}
  />;
}
