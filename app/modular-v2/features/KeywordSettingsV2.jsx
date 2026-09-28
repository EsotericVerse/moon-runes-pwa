'use client';

import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectRuneKeywordCatalog} from '../../loc/rune-repository';
import {useNeonAccount} from '../../loc/use-neon-account';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import RuneKeywordSettingsV2 from './RuneKeywordSettingsV2';

export default function KeywordSettingsV2({scopeId='loc'}){
  const account=useNeonAccount();
  const [canEditRunes,setCanEditRunes]=useState(false);
  const enabled=scopeId==='lunarunes';
  const runeQuery=useQuery({
    queryKey:['rune-keyword-catalog'],
    queryFn:selectRuneKeywordCatalog,
    enabled,
    staleTime:5*60_000
  });

  useEffect(()=>{
    let active=true;
    setCanEditRunes(false);
    if(!enabled||account.permissionLoading||!account.user)return()=>{active=false};
    Promise.all([
      account.canManageGlobal(),
      account.canManageScope('lunarunes')
    ]).then(values=>{if(active)setCanEditRunes(values.some(Boolean))})
      .catch(()=>{if(active)setCanEditRunes(false)});
    return()=>{active=false};
  },[enabled,account.user?.email,account.permissionLoading,account.canManageGlobal,account.canManageScope]);

  if(!enabled)return null;

  return <div className="scope-v2-keyword-settings">
    <section className="scope-v2-inline-card">
      <h4>符文關鍵詞詞庫（2D 圓形圖）</h4>
      {runeQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {runeQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error?<RuneKeywordSettingsV2 runes={runeQuery.data?.runes||[]} readOnly={!canEditRunes}/>:null}
    </section>
  </div>;
}
