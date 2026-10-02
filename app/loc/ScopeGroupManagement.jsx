'use client';

import {useQuery} from '@tanstack/react-query';
import {selectManagedScopes} from './scope-data';
import {scopeHref} from '../modular/scope-registry';

export default function ScopeGroupManagement(){
  const query=useQuery({queryKey:['managed-scopes'],queryFn:selectManagedScopes,staleTime:60_000});
  const scopes=query.data||[];
  return <section className="loc-card scope-feature-card">
    <p className="loc-eyebrow">Scope Group · LOC</p>
    <h2>LOC Scope Group</h2>
    <p>LOC 直接聚合 Current managed Scopes；Search、Statistics、Culture 共用同一份 Scope resolver，不建立第二套 corpus registry。</p>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    <div className="scope-list">
      {scopes.map(scope=><article className="scope-inline-card" key={scope.id}>
        <strong>{scope.id}</strong><span>{scope.galaxy} · {scope.time}</span>
        <div className="scope-result-links"><a href={scopeHref(scope.id)}>查看首頁</a><a href={scopeHref(scope.id,'governance/manage')}>管理 Scope</a></div>
      </article>)}
    </div>
  </section>;
}
