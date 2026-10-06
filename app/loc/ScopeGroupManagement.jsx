'use client';

import {useQuery} from '@tanstack/react-query';
import {selectScopeGroupChildren} from './scope-data';
import {scopeHref} from '../modular/scope-registry';

export default function ScopeGroupManagement({scopeId='loc'}){
  const query=useQuery({queryKey:['scope-group-children',scopeId],queryFn:()=>selectScopeGroupChildren(scopeId),staleTime:60_000});
  const scopes=query.data||[];
  return <section className="loc-card scope-feature-card">
    <p className="loc-eyebrow">Scope Group · {scopeId}</p>
    <h2>{scopeId} Scope Group</h2>
    <p>LOC 直接讀取 DB Scope Registry 的上下層關係；Group 只負責總覽與導引，不跨 Scope 聚合 Galaxy／Time。Search、Statistics、Culture 的實際查詢回到各 Scope 執行。</p>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    <div className="scope-list">
      {scopes.map(scope=><article className="scope-inline-card" key={scope.scope_id}>
        <strong>{scope.display_name||scope.scope_id}</strong>
        <span>{scope.scope_id} · {scope.domain||scope.directory} · parent: {scope.parent_scope_id}</span>
        <div className="scope-result-links">
          <a href={scopeHref(scope.scope_id)}>查看首頁</a>
          <a href={scopeHref(scope.scope_id,'governance/manage')}>管理 Scope</a>
        </div>
      </article>)}
      {!query.isPending&&!scopes.length?<p className="scope-status">目前沒有子 Scope。</p>:null}
    </div>
  </section>;
}
