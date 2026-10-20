'use client';
import FieldText from '../i18n/FieldText';
import UiText from '../i18n/UiText';

import {useQuery} from '@tanstack/react-query';
import {selectScopeGroupChildren} from './scope-data';
import {scopeHref} from '../modular/scope-registry';
import ScopeLink from '../modular/ScopeLink';

export default function ScopeGroupManagement({scopeId='loc'}){
  const query=useQuery({queryKey:['scope-group-children',scopeId],queryFn:()=>selectScopeGroupChildren(scopeId),staleTime:60_000});
  const scopes=query.data||[];
  return <section className="loc-card scope-feature-card">
    <h2><UiText id="uiExtra.scopeGroup.membersTitle"/></h2>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    <div className="scope-list">
      {scopes.map(scope=><article className="scope-inline-card" key={scope.scope_id}>
        <strong>{scope.display_name||scope.scope_id}</strong>
        <div className="scope-result-links">
          <ScopeLink href={scopeHref(scope.scope_id)}><UiText id="uiExtra.scopeGroup.openHome"/></ScopeLink>
          <ScopeLink href={scopeHref(scope.scope_id,'governance/manage')}><UiText id="uiExtra.scopeGroup.manageMember"/></ScopeLink>
        </div>
      </article>)}
      {!query.isPending&&!scopes.length?<p className="scope-status"><UiText id="uiExtra.scopeGroup.noMembers"/></p>:null}
    </div>
  </section>;
}
