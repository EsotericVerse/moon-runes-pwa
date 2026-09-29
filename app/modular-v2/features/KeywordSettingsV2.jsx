'use client';

import {useQuery} from '@tanstack/react-query';
import {selectRuneKeywordGroups} from '../../loc/rune-repository';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import RuneKeywordSettingsV2 from './RuneKeywordSettingsV2';

export default function KeywordSettingsV2({scopeId='loc',editable=false}){
  const enabled=scopeId==='lunarunes';
  const runeQuery=useQuery({
    queryKey:['rune-keyword-groups'],
    queryFn:selectRuneKeywordGroups,
    enabled,
    staleTime:5*60_000
  });

  if(!enabled)return null;

  return <div className="scope-v2-keyword-settings">
    <section className="scope-v2-inline-card">
      <h4>符文關鍵詞詞庫</h4>
      {runeQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {runeQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error?<RuneKeywordSettingsV2 groups={runeQuery.data||[]} readOnly={!editable}/>:null}
    </section>
  </div>;
}
