'use client';

import {useQuery} from '@tanstack/react-query';
import {selectScopeGroupChildren} from './scope-data';
import {scopeHref} from '../modular/scope-registry';

const FEATURE_PATH=Object.freeze({search:'search',statics:'statics',culture:'culture',governance:'governance'});
const FEATURE_LABEL=Object.freeze({search:'搜尋',statics:'統計',culture:'文化',governance:'治理'});

export default function ScopeGroupOverview({scopeId='loc',featureId='search',title='成員總覽',description=''}){
  const query=useQuery({
    queryKey:['scope-group-overview',scopeId],
    queryFn:()=>selectScopeGroupChildren(scopeId),
    staleTime:5*60_000
  });
  const scopes=query.data||[];
  const featurePath=FEATURE_PATH[featureId]||'';
  const featureLabel=FEATURE_LABEL[featureId]||'功能';

  return <section className="scope-card scope-group-overview">
    <h2>{title}</h2>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    <div className="scope-list">
      {scopes.map(row=><article className="scope-inline-card" key={row.scope_id}>
        <strong>{row.display_name||row.scope_id}</strong>
        <span>{row.domain||row.directory||'—'}</span>
        <div className="scope-result-links">
          <a href={scopeHref(row.scope_id)}>成員首頁</a>
          {featurePath?<a href={scopeHref(row.scope_id,featurePath)}>前往該成員{featureLabel}</a>:null}
        </div>
      </article>)}
      {!query.isPending&&!query.error&&!scopes.length?<p className="scope-status">目前沒有成員。</p>:null}
    </div>
  </section>;
}
