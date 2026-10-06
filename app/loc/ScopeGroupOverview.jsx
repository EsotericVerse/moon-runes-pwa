'use client';

import {useQuery} from '@tanstack/react-query';
import {selectScopeGroupChildren} from './scope-data';
import {scopeOrigin} from '../modular/scope-registry';

const FEATURE_PATH=Object.freeze({search:'search',statics:'statics',culture:'culture',governance:'governance'});
const FEATURE_LABEL=Object.freeze({search:'搜尋',statics:'統計',culture:'文化',governance:'治理'});

function childHref(groupScopeId,row,localPath=''){
  const path=String(localPath||'').split('/').filter(Boolean).join('/');
  const suffix=path?'/'+path+'/':'/';
  if(row.domain)return 'https://'+row.domain+suffix;
  const directory='/' + String(row.directory||'').split('/').filter(Boolean).join('/');
  const base=scopeOrigin(groupScopeId).replace(/\/$/,'');
  return base+(directory==='/'?'':directory)+suffix;
}

export default function ScopeGroupOverview({scopeId='loc',featureId='search',title='Scope Group Overview',description=''}){
  const query=useQuery({
    queryKey:['scope-group-overview',scopeId],
    queryFn:()=>selectScopeGroupChildren(scopeId),
    staleTime:5*60_000
  });
  const scopes=query.data||[];
  const featurePath=FEATURE_PATH[featureId]||'';
  const featureLabel=FEATURE_LABEL[featureId]||'功能';

  return <section className="scope-card scope-group-overview">
    <p className="loc-eyebrow">Scope Group · Overview</p>
    <h2>{title}</h2>
    <p>{description||'Scope Group 只提供成員總覽與導引；實際資料查詢由各 Scope 自己執行。'}</p>
    <p className="scope-status">此頁只讀取 Scope Registry，不跨 Scope 聚合 Galaxy／Galaxy Media／Time，也不執行 Group 級全文搜尋或統計 COUNT。</p>
    {query.error?<p className="scope-status scope-error">{query.error.message}</p>:null}
    {!query.isPending&&!query.error?<p className="scope-status">目前子 Scope：{scopes.length.toLocaleString()} 個。</p>:null}
    <div className="scope-list">
      {scopes.map(row=><article className="scope-inline-card" key={row.scope_id}>
        <strong>{row.display_name||row.scope_id}</strong>
        <span>{row.scope_id} · {row.domain||row.directory||'—'}</span>
        <div className="scope-result-links">
          <a href={childHref(scopeId,row)}>Scope 首頁</a>
          {featurePath?<a href={childHref(scopeId,row,featurePath)}>前往此 Scope 的{featureLabel}</a>:null}
        </div>
      </article>)}
      {!query.isPending&&!query.error&&!scopes.length?<p className="scope-status">目前沒有可導引的子 Scope。</p>:null}
    </div>
  </section>;
}
