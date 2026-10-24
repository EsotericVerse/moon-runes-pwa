'use client';

import {useEffect,useMemo,useState} from 'react';
import Select from 'react-select';
import dynamic from 'next/dynamic';
import {useAsyncResource} from './use-async-resource';
import {selectScopeRegistry,defaultScopeData} from './scope-data';
import {useAccount} from './use-account';

// The importer's schema is an ARTICLE/Galaxy schema: only Galaxy tables may
// be chosen here. Related media always goes to that Scope's Galaxy Media.
// Never accept an arbitrary table identifier typed by the browser.
const ManagementMediaWorkspace=dynamic(()=>import('./ManagementMediaWorkspace'),{loading:()=>null});
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:()=>null});

export default function ManagementContentTarget({scopeId,mode='import',globalAdmin=false}){
  const account=useAccount();
  const list=useAsyncResource(globalAdmin?['admin-article-table-targets']:null,
    async()=>selectScopeRegistry({scopeKind:'scope'}),{enabled:globalAdmin});
  const [targetId,setTargetId]=useState(globalAdmin?'':scopeId);
  const targets=useMemo(()=>{
    const rows=globalAdmin?(list.data||[]):[{scope_id:scopeId,display_name:scopeId}];
    return rows.flatMap(row=>{
      const id=row.scope_id;
      if(!id||id==='loc'||id==='admin'||id==='local'||!account.canManageScopeSync(id))return [];
      const tables=account.scopeDataFor(id)||defaultScopeData(id);
      const table=mode==='media'?tables?.galaxyMedia:tables?.galaxy;
      return table?[{value:id,label:table,table,scopeName:row.display_name||id}]:[];
    });
  },[globalAdmin,list.data,scopeId,account.canManageScopeSync,account.scopeDataFor,mode]);
  useEffect(()=>{
    if(targets.length&&(!targetId||!targets.some(option=>option.value===targetId))){
      const preferred=targets.find(row=>row.value==='lo3rwang')||targets[0];
      setTargetId(preferred.value);
    }
  },[targets,targetId]);
  const selected=targets.find(row=>row.value===targetId)||null;
  return <section className="loc-card admin-workspace">
    <h2>{mode==='media'?'新增多媒體':'文章資料匯入'}</h2>
    <p className="scope-status">指定目標資料表。僅列出具有寫入權限的 Scope {mode==='media'?'多媒體':'文章'}表；其餘表格不得以文章格式匯入。</p>
    <label htmlFor={'management-table-'+mode}>目標 Table</label>
    <Select
      inputId={'management-table-'+mode}
      instanceId={'management-table-'+mode}
      unstyled className="loc-settings-select" classNamePrefix="loc-settings-select"
      isClearable={false} isSearchable={targets.length>8}
      isDisabled={!globalAdmin||list.isPending}
      options={targets}
      value={selected}
      onChange={option=>{
        if(!option||option.value===targetId)return;
        if(!window.confirm('切換目標 Table 會重設目前未儲存的輸入，確定切換嗎？'))return;
        setTargetId(option.value);
      }}
      formatOptionLabel={option=><span>{option.label}（{option.scopeName}）</span>}
    />
    {list.error?<p className="scope-status scope-error" role="alert">{String(list.error.message||list.error)}</p>:null}
    {globalAdmin&&list.isPending?<p className="scope-status" role="status">正在讀取可管理資料表…</p>:null}
    {selected?<div key={selected.value+':'+mode}>
      {mode==='media'?<ManagementMediaWorkspace scopeId={selected.value}/>:
        <ManagementImportPanel scopeId={selected.value}/>}
    </div>:null}
    {!selected&&!list.isPending?<p className="scope-status">目前沒有可匯入的目標 Table。</p>:null}
  </section>;
}
