'use client';

import {useQuery} from '@tanstack/react-query';
import {selectRuneContextCatalog} from '../../loc/neon-context-client';
import {featureDataErrorMessage} from '../feature-data-state.v2';
import RuneContextV2 from './RuneContextV2';
import ContextStyleManager from './ContextStyleManager';

export default function KeywordSettingsV2({scopeId='loc'}){
  const runeQuery=useQuery({
    queryKey:['rune-context-catalog'],
    queryFn:selectRuneContextCatalog,
    enabled:scopeId==='loc'||scopeId==='lunarunes',
    staleTime:5*60_000
  });

  return <div className="scope-v2-keyword-settings">
    {scopeId==='loc'||scopeId==='lunarunes'?<section className="scope-v2-inline-card">
      <h4>符文關鍵詞詞庫（3D）</h4>
      {runeQuery.isPending?<p className="scope-v2-status">載入符文關鍵詞…</p>:null}
      {runeQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error?<RuneContextV2 runes={runeQuery.data?.runes||[]} readOnly={scopeId!=='lunarunes'}/>:null}
    </section>:null}

    {scopeId==='lo3rwang'?<ContextStyleManager scopeId="lo3rwang"/>:null}
  </div>;
}
