'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';

const CATEGORIES='silver.statistics_source_categories';
const ALIASES='silver.statistics_source_aliases';
const OTHERS='silver.scope_other_sources';
const ID=/^[a-z][a-z0-9_-]{0,63}$/;
const SOURCE=/^.{1,120}$/;

export function useSourceCategories(){
  return useQuery({
    queryKey:['statistics-source-categories'],
    queryFn:async()=>{
      const [categories,aliases]=await Promise.all([
        dbAuthRelation(CATEGORIES).select('category_code,display_name,sort_order,enabled').order('sort_order'),
        dbAuthRelation(ALIASES).select('source_key,category_code').order('source_key')
      ]);
      if(categories.error||aliases.error)throw new Error(categories.error?.message||aliases.error?.message);
      return {categories:categories.data||[],aliases:aliases.data||[]};
    },
    staleTime:60_000
  });
}

export function AdminSourceCategories(){
  const account=useAccount(),query=useSourceCategories();
  const [category,setCategory]=useState(''),[title,setTitle]=useState('');
  const [labels,setLabels]=useState({});
  const [alias,setAlias]=useState(''),[parent,setParent]=useState('others');
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  if(!account.canManageGlobalSync())return null;
  const items=query.data?.categories||[],aliases=query.data?.aliases||[];
  async function apply(operation){
    setNotice('');setBusy(true);
    try{
      await operation();
      await query.refetch();
      setCategory('');setTitle('');setAlias('');
    }catch(error){setNotice(String(error.message||error));}
    finally{setBusy(false);}
  }
  const add=()=>apply(async()=>{
    const key=category.trim().toLowerCase(),label=title.trim();
    if(!ID.test(key)||!label||label.length>80)throw Error('分類代碼或名稱無效');
    const {error}=await dbAuthRelation(CATEGORIES).insert({category_code:key,display_name:label});
    if(error)throw Error(error.message);
  });
  const map=()=>apply(async()=>{
    const key=alias.trim().toLowerCase();
    if(!SOURCE.test(key)||!key||!items.some(x=>x.category_code===parent))throw Error('請選擇來源與分類');
    const {error}=await dbAuthRelation(ALIASES).upsert({source_key:key,category_code:parent},{onConflict:'source_key'});
    if(error)throw Error(error.message);
  });
  const modify=(table,filters,values)=>apply(async()=>{
    let q=dbAuthRelation(table).update(values);
    for(const [key,value] of Object.entries(filters))q=q.eq(key,value);
    const {error}=await q;
    if(error)throw Error(error.message);
  });
  return <section className="loc-card admin-workspace">
    <h2>總來源分類</h2>
    <div className="scope-stat-controls">
      <label>分類代碼<input value={category} onChange={e=>setCategory(e.target.value)} maxLength={64}/></label>
      <label>分類名稱<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/></label>
      <button className="loc-button" type="button" disabled={busy||!category.trim()||!title.trim()} onClick={add}>新增分類</button>
    </div>
    <div className="scope-management-records">
      {items.map(row=><div className="scope-inline-card" key={row.category_code}>
        <label>分類名稱<input value={labels[row.category_code]??row.display_name} maxLength={80}
          onChange={e=>setLabels(values=>({...values,[row.category_code]:e.target.value}))} disabled={busy}/></label>
        <span>{row.category_code}</span>
        <button type="button" className="loc-button" disabled={busy||!String(labels[row.category_code]??row.display_name).trim()}
          onClick={()=>modify(CATEGORIES,{category_code:row.category_code},{display_name:String(labels[row.category_code]??row.display_name).trim()})}>儲存名稱</button>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>modify(CATEGORIES,{category_code:row.category_code},{enabled:!row.enabled})}>{row.enabled?'停用':'啟用'}</button>
      </div>)}
    </div>
    <h3>來源歸屬</h3>
    <div className="scope-stat-controls">
      <label>原始來源<input value={alias} maxLength={120} onChange={e=>setAlias(e.target.value)}/></label>
      <label>總來源<select className="scope-select" value={parent} onChange={e=>setParent(e.target.value)}>
        {items.filter(x=>x.enabled).map(x=><option key={x.category_code} value={x.category_code}>{x.display_name}</option>)}
      </select></label>
      <button type="button" className="loc-button" disabled={busy||!alias.trim()} onClick={map}>指定歸屬</button>
    </div>
    <div className="scope-management-records">
      {aliases.map(row=><div className="scope-inline-card" key={row.source_key}>
        <strong>{row.source_key}</strong>
        <select className="scope-select" value={row.category_code} disabled={busy} onChange={e=>modify(ALIASES,{source_key:row.source_key},{category_code:e.target.value})}>
          {items.map(x=><option key={x.category_code} value={x.category_code}>{x.display_name}</option>)}
        </select>
      </div>)}
    </div>
    {query.error?<p className="scope-status scope-error">{String(query.error.message||query.error)}</p>:null}
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}
export function ScopeOtherSources({scopeId}){
  const account=useAccount();
  const [source,setSource]=useState(''),[label,setLabel]=useState('');
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const query=useQuery({
    queryKey:['statistics-others',scopeId],
    enabled:Boolean(scopeId&&account.canManageScopeSync(scopeId)),
    queryFn:async()=>{
      const {data,error}=await dbAuthRelation(OTHERS)
        .select('source_key,display_name,enabled').eq('scope_id',scopeId).order('source_key');
      if(error)throw Error(error.message);
      return data||[];
    },
    staleTime:60_000
  });
  if(!account.canManageScopeSync(scopeId))return null;
  const apply=async(fn)=>{
    setBusy(true);setNotice('');
    try{await fn();await query.refetch();setSource('');setLabel('');}
    catch(error){setNotice(String(error.message||error));}
    finally{setBusy(false);}
  };
  const add=()=>apply(async()=>{
    const key=source.trim().toLowerCase(),name=label.trim()||source.trim();
    if(!SOURCE.test(key)||!key||!name||name.length>80)throw Error('來源名稱無效');
    const {error}=await dbAuthRelation(OTHERS)
      .upsert({scope_id:scopeId,source_key:key,display_name:name,enabled:true},{onConflict:'scope_id,source_key'});
    if(error)throw Error(error.message);
  });
  return <section className="scope-inline-card">
    <h3>Others 來源</h3>
    <div className="scope-stat-controls">
      <label>原始來源<input value={source} maxLength={120} onChange={e=>setSource(e.target.value)}/></label>
      <label>名稱<input value={label} maxLength={80} onChange={e=>setLabel(e.target.value)}/></label>
      <button type="button" className="loc-button" disabled={busy||!source.trim()} onClick={add}>儲存來源</button>
    </div>
    <div className="scope-management-records">
      {(query.data||[]).map(row=><div className="scope-inline-card" key={row.source_key}>
        <strong>{row.display_name}</strong><span>{row.source_key}</span>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>apply(async()=>{
          const {error}=await dbAuthRelation(OTHERS).update({enabled:!row.enabled})
            .eq('scope_id',scopeId).eq('source_key',row.source_key);
          if(error)throw Error(error.message);
        })}>{row.enabled?'停用':'啟用'}</button>
      </div>)}
    </div>
    {query.error?<p className="scope-status scope-error">{String(query.error.message||query.error)}</p>:null}
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}
