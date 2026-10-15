'use client';
import FieldText from '../i18n/FieldText';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';

const CATEGORIES='silver.statistics_source_categories';
const ALIASES='silver.statistics_source_aliases';
const PERSONAL='silver.scope_source_subcategories';
const ID=/^[a-z][a-z0-9_-]{0,63}$/;
const SOURCE=/^.{1,120}$/;
const normalize=value=>String(value||'').trim().toLowerCase();

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
  const account=useAccount(),query=useSourceCategories(),client=useQueryClient();
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
      await client.invalidateQueries({queryKey:['statistics-source-taxonomy']});
      await client.invalidateQueries({queryKey:['own-scope-source-catalog']});
      await client.invalidateQueries({queryKey:['loc-source-categories']});
      setCategory('');setTitle('');setAlias('');
    }catch(error){setNotice(String(error.message||error));}
    finally{setBusy(false);}
  }
  const add=()=>apply(async()=>{
    const key=normalize(category),label=title.trim();
    if(!ID.test(key)||!label||label.length>80)throw Error('分類代碼或名稱無效');
    const {error}=await dbAuthRelation(CATEGORIES).insert({category_code:key,display_name:label});
    if(error)throw Error(error.message);
  });
  const map=()=>apply(async()=>{
    const key=normalize(alias);
    if(!SOURCE.test(key)||!key||!items.some(x=>x.category_code===parent&&x.enabled))throw Error('請選擇來源與群組來源分類');
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
    <h2><FieldText text="群組來源分類"/></h2>
    <p className="scope-status">僅 LOC Admin 設定來源主分類；個別人員的來源命名及歸屬在各自的統計頁管理。</p>
    <div className="scope-stat-controls">
      <label><FieldText text="分類代碼"/><input value={category} onChange={e=>setCategory(e.target.value)} maxLength={64}/></label>
      <label><FieldText text="分類名稱"/><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/></label>
      <button className="loc-button" type="button" disabled={busy||!category.trim()||!title.trim()} onClick={add}><FieldText text="新增群組來源分類"/></button>
    </div>
    <div className="scope-management-records">
      {items.map(row=><div className="scope-inline-card" key={row.category_code}>
        <label><FieldText text="分類名稱"/><input value={labels[row.category_code]??row.display_name} maxLength={80}
          onChange={e=>setLabels(values=>({...values,[row.category_code]:e.target.value}))} disabled={busy}/></label>
        <span>{row.category_code}</span>
        <button type="button" className="loc-button" disabled={busy||!String(labels[row.category_code]??row.display_name).trim()}
          onClick={()=>modify(CATEGORIES,{category_code:row.category_code},{display_name:String(labels[row.category_code]??row.display_name).trim()})}><FieldText text="儲存名稱"/></button>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>modify(CATEGORIES,{category_code:row.category_code},{enabled:!row.enabled})}><FieldText text=<FieldText text={row.enabled?'停用':'啟用'}/>/></button>
      </div>)}
    </div>
    <h3><FieldText text="群組來源預設歸屬"/></h3>
    <div className="scope-stat-controls">
      <label><FieldText text="原始來源"/><input value={alias} maxLength={120} onChange={e=>setAlias(e.target.value)}/></label>
      <label><FieldText text="群組來源分類"/><select className="scope-select" value={parent} onChange={e=>setParent(e.target.value)}>
        {items.filter(x=>x.enabled).map(x=><option key={x.category_code} value={x.category_code}>{x.display_name}</option>)}
      </select></label>
      <button type="button" className="loc-button" disabled={busy||!alias.trim()} onClick={map}><FieldText text="指定歸屬"/></button>
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

export function ScopeCustomSourceCategories({scopeId}){
  const account=useAccount(),client=useQueryClient(),groupQuery=useSourceCategories();
  const [source,setSource]=useState(''),[label,setLabel]=useState(''),[category,setCategory]=useState('others');
  const [labels,setLabels]=useState({}),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const canManage=Boolean(scopeId&&account.canManageScopeSync(scopeId));
  const query=useQuery({
    queryKey:['scope-source-subcategories',scopeId],
    enabled:canManage,
    queryFn:async()=>{
      const {data,error}=await dbAuthRelation(PERSONAL)
        .select('source_key,category_code,display_name,enabled').eq('scope_id',scopeId).order('source_key');
      if(error)throw Error(error.message);
      return data||[];
    },
    staleTime:60_000
  });
  if(!canManage)return null;
  const groups=(groupQuery.data?.categories||[]).filter(row=>row.enabled);
  async function apply(fn){
    setBusy(true);setNotice('');
    try{
      await fn();
      await query.refetch();
      await client.invalidateQueries({queryKey:['statistics-source-taxonomy',scopeId]});
      await client.invalidateQueries({queryKey:['own-scope-source-catalog',scopeId]});
      await client.invalidateQueries({queryKey:['loc-source-categories']});
      setSource('');setLabel('');
    }catch(error){setNotice(String(error.message||error));}
    finally{setBusy(false);}
  }
  const add=()=>apply(async()=>{
    const key=normalize(source),name=label.trim()||source.trim();
    if(!SOURCE.test(key)||!key||!name||name.length>80)throw Error('來源名稱無效');
    if(!groups.some(row=>row.category_code===category))throw Error('請先選擇有效的群組來源分類');
    const {error}=await dbAuthRelation(PERSONAL).upsert({
      scope_id:scopeId,source_key:key,display_name:name,category_code:category,enabled:true
    },{onConflict:'scope_id,source_key'});
    if(error)throw Error(error.message);
  });
  const update=(key,values)=>apply(async()=>{
    const {error}=await dbAuthRelation(PERSONAL).update(values)
      .eq('scope_id',scopeId).eq('source_key',key);
    if(error)throw Error(error.message);
  });
  return <section className="scope-inline-card" aria-label="個人自訂來源分類">
    <h3><FieldText text="個人自訂來源分類"/></h3>
    <p className="scope-status">只管理目前人員的原始來源名稱及群組歸屬，不改動作品正文與其他 Scope。</p>
    <div className="scope-stat-controls">
      <label><FieldText text="原始來源"/><input value={source} maxLength={120} onChange={e=>setSource(e.target.value)} placeholder="source_name"/></label>
      <label><FieldText text="自訂顯示名稱"/><input value={label} maxLength={80} onChange={e=>setLabel(e.target.value)}/></label>
      <label><FieldText text="群組來源分類"/><select className="scope-select" value={groups.some(row=>row.category_code===category)?category:(groups[0]?.category_code||'')} onChange={e=>setCategory(e.target.value)}>
        {groups.map(row=><option key={row.category_code} value={row.category_code}>{row.display_name}</option>)}
      </select></label>
      <button type="button" className="loc-button" disabled={busy||!source.trim()||!groups.length} onClick={add}><FieldText text="儲存個人來源分類"/></button>
    </div>
    <div className="scope-management-records">
      {(query.data||[]).map(row=><div className="scope-inline-card" key={row.source_key}>
        <span>{row.source_key}</span>
        <label><FieldText text="自訂名稱"/><input maxLength={80} disabled={busy}
          value={labels[row.source_key]??row.display_name}
          onChange={e=>setLabels(old=>({...old,[row.source_key]:e.target.value}))}/></label>
        <button type="button" className="loc-button" disabled={busy||!String(labels[row.source_key]??row.display_name).trim()}
          onClick={()=>update(row.source_key,{display_name:String(labels[row.source_key]??row.display_name).trim()})}><FieldText text="儲存名稱"/></button>
        <label><FieldText text="群組來源分類"/><select className="scope-select" value={row.category_code} disabled={busy}
          onChange={e=>update(row.source_key,{category_code:e.target.value})}>
          {(groupQuery.data?.categories||[]).map(item=><option key={item.category_code} value={item.category_code}>{item.display_name}</option>)}
        </select></label>
        <button type="button" className="loc-button" disabled={busy}
          onClick={()=>update(row.source_key,{enabled:!row.enabled})}><FieldText text=<FieldText text={row.enabled?'停用':'啟用'}/>/></button>
      </div>)}
    </div>
    {groupQuery.error||query.error?<p className="scope-status scope-error">{String(groupQuery.error?.message||query.error?.message)}</p>:null}
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}
