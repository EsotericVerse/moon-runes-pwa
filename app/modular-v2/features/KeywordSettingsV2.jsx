'use client';

import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectRuneKeywordCatalog} from '../../loc/neon-context-client';
import {useNeonAccount} from '../../loc/use-neon-account';
import {featureDataErrorMessage} from '../feature-data-state.v2';
import RuneContextV2 from './RuneContextV2';
import ContextStyleManager from './ContextStyleManager';

export default function KeywordSettingsV2({scopeId='loc'}){
  const account=useNeonAccount();
  const [canEditRunes,setCanEditRunes]=useState(false);
  const runeQuery=useQuery({
    queryKey:['rune-keyword-catalog'],
    queryFn:selectRuneKeywordCatalog,
    enabled:scopeId==='loc'||scopeId==='lunarunes',
    staleTime:5*60_000
  });

  useEffect(()=>{
    let active=true;
    setCanEditRunes(false);
    if(scopeId!=='lunarunes'||account.permissionLoading||!account.user)return()=>{active=false};
    Promise.all([
      account.canManageGlobal(),
      account.canManageScope('lunarunes')
    ]).then(values=>{if(active)setCanEditRunes(values.some(Boolean))})
      .catch(()=>{if(active)setCanEditRunes(false)});
    return()=>{active=false};
  },[scopeId,account.user?.email,account.permissionLoading,account.canManageGlobal,account.canManageScope]);

  return <div className="scope-v2-keyword-settings">
    {scopeId==='loc'||scopeId==='lunarunes'?<section className="scope-v2-inline-card">
      <h4>符文關鍵詞詞庫（2D 圓形圖）</h4>
      {runeQuery.isPending?<p className="scope-v2-status">載入符文關鍵詞…</p>:null}
      {runeQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error?<RuneContextV2 runes={runeQuery.data?.runes||[]} readOnly={scopeId!=='lunarunes'||!canEditRunes}/>:null}
    </section>:null}

    {scopeId==='lo3rwang'?<ContextStyleManager scopeId="lo3rwang"/>:null}
  </div>;
}
