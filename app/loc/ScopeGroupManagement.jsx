'use client';

import {useQuery} from '@tanstack/react-query';
import {selectScopeGroupChildren} from './scope-data';

function scopeRoute(row,localPath=''){
  const suffix=String(localPath||'').split('/').filter(Boolean).join('/');
  const path=suffix?'/'+suffix+'/':'/';
  if(row.domain)return 'https://'+row.domain+path;
  const directory='/' + String(row.directory||'').split('/').filter(Boolean).join('/');
  return 'https://loc.lo3rwang.cc'+(directory==='/'?'':directory)+path;
}

export default function ScopeGroupManagement(){
  const query=useQuery({queryKey:['scope-group-children','loc'],queryFn:()=>selectScopeGroupChildren('loc'),staleTime:60_000});
  const scopes=query.data||[];
  return <section className="loc-card scope-feature-card">
    <p className="loc-eyebrow">Scope Group · LOC</p>
    <h2>LOC Scope Group</h2>
    <p>LOC 直接讀取 DB Scope Registry 的上下層關係；Search、Statistics、Culture 仍共用同一份 Scope 資料契約，不建立第二套 corpus authority。</p>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    <div className="scope-list">
      {scopes.map(scope=><article className="scope-inline-card" key={scope.scope_id}>
        <strong>{scope.display_name||scope.scope_id}</strong>
        <span>{scope.scope_id} · {scope.domain||scope.directory} · parent: {scope.parent_scope_id}</span>
        <div className="scope-result-links">
          <a href={scopeRoute(scope)}>查看首頁</a>
          <a href={scopeRoute(scope,'governance/manage')}>管理 Scope</a>
        </div>
      </article>)}
      {!query.isPending&&!scopes.length?<p className="scope-status">目前沒有子 Scope。</p>:null}
    </div>
  </section>;
}
