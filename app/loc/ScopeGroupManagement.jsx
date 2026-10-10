'use client';

import {useQuery} from '@tanstack/react-query';
import {selectScopeGroupChildren} from './scope-data';
import {scopeHref} from '../modular/scope-registry';

export default function ScopeGroupManagement({scopeId='loc'}){
  const query=useQuery({queryKey:['scope-group-children',scopeId],queryFn:()=>selectScopeGroupChildren(scopeId),staleTime:60_000});
  const scopes=query.data||[];
  return <section className="loc-card scope-feature-card">
    <h2>所屬人員</h2>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    <div className="scope-list">
      {scopes.map(scope=><article className="scope-inline-card" key={scope.scope_id}>
        <strong>{scope.display_name||scope.scope_id}</strong>
        <div className="scope-result-links">
          <a href={scopeHref(scope.scope_id)}>查看首頁</a>
          <a href={scopeHref(scope.scope_id,'governance/manage')}>管理成員</a>
        </div>
      </article>)}
      {!query.isPending&&!scopes.length?<p className="scope-status">目前沒有成員。</p>:null}
    </div>
  </section>;
}
