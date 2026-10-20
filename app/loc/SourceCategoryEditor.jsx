'use client';
import UiText,{useUiText} from '../i18n/UiText';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {dbAuthRelation} from './db-client.mjs';
import {useAccount} from './use-account';

const CATEGORIES='silver.statistics_source_categories';
const ALIASES='silver.statistics_source_aliases';
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
  const t=useUiText();
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
    if(!ID.test(key)||!label||label.length>80)throw Error(t('uiExtra.sourceCategory.badCode'));
    const {error}=await dbAuthRelation(CATEGORIES).insert({category_code:key,display_name:label});
    if(error)throw Error(error.message);
  });
  const map=()=>apply(async()=>{
    const key=normalize(alias);
    if(!SOURCE.test(key)||!key||!items.some(x=>x.category_code===parent&&x.enabled))throw Error(t('uiExtra.sourceCategory.chooseSource'));
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
    <h2><UiText id="uiExtra.sourceCategory.groupTitle"/></h2>
    <p className="scope-status"><UiText id="uiExtra.sourceCategory.groupGuide"/></p>
    <div className="scope-stat-controls">
      <label><UiText id="uiExtra.sourceCategory.code"/><input value={category} onChange={e=>setCategory(e.target.value)} maxLength={64}/></label>
      <label><UiText id="uiExtra.sourceCategory.name"/><input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80}/></label>
      <button className="loc-button" type="button" disabled={busy||!category.trim()||!title.trim()} onClick={add}><UiText id="uiExtra.sourceCategory.createGroup"/></button>
    </div>
    <div className="scope-management-records">
      {items.map(row=><div className="scope-inline-card" key={row.category_code}>
        <label><UiText id="uiExtra.sourceCategory.name"/><input value={labels[row.category_code]??row.display_name} maxLength={80}
          onChange={e=>setLabels(values=>({...values,[row.category_code]:e.target.value}))} disabled={busy}/></label>
        <span>{row.category_code}</span>
        <button type="button" className="loc-button" disabled={busy||!String(labels[row.category_code]??row.display_name).trim()}
          onClick={()=>modify(CATEGORIES,{category_code:row.category_code},{display_name:String(labels[row.category_code]??row.display_name).trim()})}><UiText id="uiExtra.sourceCategory.saveName"/></button>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>modify(CATEGORIES,{category_code:row.category_code},{enabled:!row.enabled})}><UiText id={row.enabled?'uiExtra.sourceCategory.disable':'uiExtra.sourceCategory.enable'}/></button>
      </div>)}
    </div>
    <h3><UiText id="uiExtra.sourceCategory.defaultMap"/></h3>
    <div className="scope-stat-controls">
      <label><UiText id="uiExtra.sourceCategory.rawSource"/><input value={alias} maxLength={120} onChange={e=>setAlias(e.target.value)}/></label>
      <label><UiText id="uiExtra.sourceCategory.groupTitle"/><select className="scope-select" value={parent} onChange={e=>setParent(e.target.value)}>
        {items.filter(x=>x.enabled).map(x=><option key={x.category_code} value={x.category_code}>{x.display_name}</option>)}
      </select></label>
      <button type="button" className="loc-button" disabled={busy||!alias.trim()} onClick={map}><UiText id="uiExtra.sourceCategory.assign"/></button>
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
