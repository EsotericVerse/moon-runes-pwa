'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {searchNeonRows} from '../../loc/neon-search';
import {selectNeonRows,upsertNeonRows,updateNeonRows} from '../../loc/neon-repository';
import {useNeonAccount} from '../../loc/use-neon-account';
import {getSearchCollection} from '../../loc/search-collections';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeHrefV2} from '../scope-registry.v2';
import {buildSearchNavigation,featureNavigationLinks} from '../feature-navigation.v2';
import {featureDataErrorMessage} from '../feature-data-state.v2';

const norm=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
function rowText(row){return Object.values(row||{}).filter(value=>typeof value==='string').join(' ')}
function snippet(text,q){
  const raw=String(text||'').replace(/\s+/g,' ').trim();
  const index=norm(raw).indexOf(norm(q));
  const start=Math.max(0,(index<0?0:index)-70);
  return `${start?'…':''}${raw.slice(start,start+220)}${raw.length>start+220?'…':''}`;
}
function resultKey(scope,type,id){return String(scope)+':'+String(type)+':'+String(id)}
function hasPrivilege(privileges,scopeId){
  const values=Array.isArray(privileges)?privileges:[];
  return values.includes('admin')||values.includes('scope:'+scopeId);
}
function toResult(row,source,q,collectionId,scopeId,settingsMap=new Map()){
  const text=rowText(row);
  if(!norm(text).includes(norm(q)))return null;
  const title=row.title||row.name||row.display_title||row.label||row.rune_name||row.context_name||row.work_id||row.song_id||row.id||source;
  const bodyField=['summary','display_text','content','style_tags','meta_tags','description','interpretation','ai_summary','retrieval_text','text'].find(field=>typeof row[field]==='string'&&row[field].trim())||'';
  const body=bodyField?row[bodyField]:text;
  const navigation=buildSearchNavigation(collectionId,source,row,q,scopeId);
  if(row.scope_id)navigation.targetScope=row.scope_id;
  const identity=row.media_id||row.galaxy_id||row.work_id||row.song_id||row.rune_id||row.id;
  const scope=row.scope_id||scopeId;
  const resourceType=row.galaxy_id?'galaxy':row.media_id?'galaxy_media':'';
  const resourceId=row.galaxy_id||row.media_id||'';
  const settingsKey=resourceType&&resourceId?resultKey(scope,resourceType,resourceId):'';
  const settings=settingsMap.get(settingsKey)||null;
  const editableTable=resourceType==='galaxy'?'silver.lo3rwang_galaxy':resourceType==='galaxy_media'?'silver.lo3rwang_galaxy_media':'';
  const editableIdColumn=resourceType==='galaxy'?'galaxy_id':resourceType==='galaxy_media'?'media_id':'';
  const editableField=resourceType==='galaxy'?'content':resourceType==='galaxy_media'?'meta_tags':'';
  const isScopeCard=Boolean(row.scope_card);
  const href=isScopeCard?scopeHrefV2(scope):(row.url||row.href||row.suno_url||(row.scope_id?scopeHrefV2(row.scope_id,'statics'):''));
  return {key:identity?source+'-'+identity:source+'-'+title+'-'+String(body).slice(0,40),source,title:String(title),date:row.date||row.created_date||row.create_time||row.created_at||row.update_time||row.updated_at||'',snippet:snippet(body,q),bodyText:String(body),styleTags:String(row.style_tags||row.meta_tags||''),display:String(row.display||'summary'),scopeId:scope,resourceType,resourceId,settingsKey,settings,editableTable,editableIdColumn,editableField,isScopeCard,href,destinations:isScopeCard?[]:featureNavigationLinks(navigation)};
}

export default function SearchV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const searchParams=useSearchParams();
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [status,setStatus]=useState('輸入關鍵字開始搜尋。');
  const [error,setError]=useState('');
  const [hasMore,setHasMore]=useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const [editingKey,setEditingKey]=useState('');
  const [editDraft,setEditDraft]=useState(null);
  const [editAudit,setEditAudit]=useState([]);
  const [editBusy,setEditBusy]=useState(false);
  const [editError,setEditError]=useState('');
  const searchId=useRef(0);
  const offsetRef=useRef(0);
  const matchedRowsRef=useRef([]);
  const matchedQueryRef=useRef('');
  const sentinelRef=useRef(null);
  const loadingRef=useRef(false);
  const visibilityRef=useRef(new Map());
  const pageSize=scopeId==='lunarunes'?8:10;
  const collection=useMemo(()=>getSearchCollection(scope.searchCollection),[scope.searchCollection]);

  async function executeSearch(rawQuery){
    const q=String(rawQuery||'').trim();
    if(!q)return;
    const id=++searchId.current;
    loadingRef.current=true;
    offsetRef.current=0;
    matchedRowsRef.current=[];
    matchedQueryRef.current='';
    setError('');
    setHasMore(false);
    setLoadingMore(false);
    setResults([]);
    setStatus(`搜尋「${collection.label}」資料…`);
    try{
      const search=await searchNeonRows(collection.id,q,{limit:5000,offset:0});
      if(id!==searchId.current)return;

      matchedRowsRef.current=search.rows;
      matchedQueryRef.current=q;
      let visibilityRows=[];
      try{
        const visibility=await selectNeonRows('silver.resource_visibility',{columns:'scope,resource_type,resource_id,visibility,projection_level,statistics_included,show_link,show_source',limit:5000});
        visibilityRows=visibility.rows;
      }catch{}
      const visibilityMap=new Map();
      for(const item of visibilityRows){
        visibilityMap.set(resultKey(item.scope,item.resource_type,item.resource_id),item);
        if(item.resource_type==='work'){
          const legacyId=String(item.resource_id||'');
          const galaxyId=legacyId.startsWith('work:')?legacyId:'work:'+legacyId;
          visibilityMap.set(resultKey(item.scope,'galaxy',galaxyId),item);
        }
      }
      visibilityRef.current=visibilityMap;
      const consumed=matchedRowsRef.current.slice(0,pageSize);
      offsetRef.current=consumed.length;
      const converted=[];const seen=new Set();
      for(const {row,source} of consumed){
        const result=toResult(row,source,q,collection.id,scopeId,visibilityMap);
        if(!result||seen.has(result.key))continue;
        if(result.display==='hidden'&&!hasPrivilege(account.privileges,result.scopeId))continue;
        if(result.settings&&result.settings.visibility!=='public'&&!hasPrivilege(account.privileges,result.scopeId))continue;
        seen.add(result.key);converted.push(result);
      }
      setResults(converted);
      setHasMore(matchedRowsRef.current.length>pageSize);
      const partial=search.failures?.length?`（${search.failures.length} 張非必要資料表暫時無法查詢）`:'';
      setStatus(`「${collection.label}」搜尋「${q}」。${partial}`);
    }catch(exception){
      if(id!==searchId.current)return;
      setError(featureDataErrorMessage(exception));
      setStatus('搜尋失敗。');
    }finally{
      if(id===searchId.current)loadingRef.current=false;
    }
  }

  function loadMore(){
    const q=matchedQueryRef.current;
    if(!q||!hasMore||loadingRef.current)return;
    loadingRef.current=true;
    setLoadingMore(true);
    try{
      const consumed=matchedRowsRef.current.slice(offsetRef.current,offsetRef.current+pageSize);
      offsetRef.current+=consumed.length;
      setResults(current=>{
        const seen=new Set(current.map(item=>item.key));
        const appended=[];
        for(const {row,source} of consumed){
          const result=toResult(row,source,q,collection.id,scopeId,visibilityRef.current);
          if(!result||seen.has(result.key))continue;
          if(result.display==='hidden'&&!hasPrivilege(account.privileges,result.scopeId))continue;
          if(result.settings&&result.settings.visibility!=='public'&&!hasPrivilege(account.privileges,result.scopeId))continue;
          seen.add(result.key);appended.push(result);
        }
        return [...current,...appended];
      });
      setHasMore(matchedRowsRef.current.length>offsetRef.current);
    }catch(exception){
      setError(String(exception?.message||exception||'載入下一批搜尋結果失敗。'));
      setHasMore(false);
    }finally{
      loadingRef.current=false;
      setLoadingMore(false);
    }
  }

  useEffect(()=>{
    const value=String(searchParams?.get('q')||'').trim();
    if(value){setQuery(value);executeSearch(value);}
  },[searchParams]);
  useEffect(()=>{if(query.trim())executeSearch(query);},[scopeId]);

  useEffect(()=>{
    const node=sentinelRef.current;
    if(!node||!hasMore)return;
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))loadMore();
    },{root:null,rootMargin:'160px 0px',threshold:0.01});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[hasMore,query,scopeId,pageSize,results.length]);

  async function startEditing(result){
    setEditingKey(result.key);setEditError('');
    setEditDraft({title:result.title,body:result.bodyText,styleTags:result.styleTags||'',includeStatistics:result.settings?.statistics_included??true,fullText:result.settings?.projection_level==='full',hidden:result.settings?.visibility==='private',showLink:result.settings?.show_link??true,showSource:result.settings?.show_source??true});
    setEditAudit([]);
    try{
      const {rows}=await selectNeonRows('silver.manage',{columns:'actor_id,actor_name,actor_email,changed_at,field_name,old_value,new_value',filters:[{column:'record_type',operator:'eq',value:'content_audit'},{column:'scope_id',operator:'eq',value:result.scopeId},{column:'resource_type',operator:'eq',value:result.resourceType},{column:'resource_id',operator:'eq',value:result.resourceId}],orders:[{column:'changed_at',ascending:false}],limit:10});
      setEditAudit(rows);
    }catch{}
  }
  async function saveEditing(result){
    if(!editDraft||!result.editableTable||!result.editableField)return;
    setEditBusy(true);setEditError('');
    try{
      if(!hasPrivilege(account.privileges,result.scopeId))throw new Error('沒有修改此內容的權限。');
      const contentPatch={title:editDraft.title,[result.editableField]:editDraft.body};
      if(result.resourceType==='galaxy_media')contentPatch.style_tags=String(editDraft.styleTags||'').trim()||'風格未知';
      await updateNeonRows(result.editableTable,contentPatch,{filters:[{column:result.editableIdColumn,operator:'eq',value:result.resourceId},{column:'scope_id',operator:'eq',value:result.scopeId}]});
      let settings=result.settings||null;
      if(hasPrivilege(account.privileges,result.scopeId)){
        const record={scope:result.scopeId,resource_type:result.resourceType,resource_id:result.resourceId,visibility:editDraft.hidden?'private':'public',projection_level:editDraft.fullText?'full':'summary',statistics_included:editDraft.includeStatistics,show_link:editDraft.showLink,show_source:editDraft.showSource};
        await upsertNeonRows('silver.resource_visibility',record,{conflict:'scope,resource_type,resource_id'});
        visibilityRef.current.set(result.settingsKey,record);
        settings=record;
      }
      setResults(current=>current.map(item=>item.key!==result.key?item:{...item,title:editDraft.title,bodyText:editDraft.body,styleTags:result.resourceType==='galaxy_media'?(String(editDraft.styleTags||'').trim()||'風格未知'):item.styleTags,snippet:snippet(editDraft.body,matchedQueryRef.current),settings}));
      setEditingKey('');setEditDraft(null);
    }catch(exception){setEditError(String(exception?.message||exception||'儲存失敗。'))}
    finally{setEditBusy(false)}
  }

  async function runSearch(event){event.preventDefault();await executeSearch(query)}


  return <FeaturePageV2
    featureId="search"
    subtitle="跨文字、音樂、多媒體、符文、脈絡與知識搜尋。"
    description={<p>輸入關鍵字，從文字、音樂、圖片、影音、符文與文件中找出相關內容。</p>}
  >
    <form className="scope-v2-search-form" onSubmit={runSearch}>
      <label htmlFor="scope-search-query">你想找什麼？</label>
      <input id="scope-search-query" value={query} onChange={event=>setQuery(event.target.value)} placeholder="輸入關鍵字、作品名稱或文字" aria-label="你想找什麼？"/>
      <button type="submit">搜尋</button>
    </form>
    <p className="scope-v2-status">{status}</p>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    <div className="scope-v2-list">
      {results.map(row=>{
        const editable=Boolean(row.editableTable&&row.editableField&&hasPrivilege(account.privileges,row.scopeId));
        const canSearchSettings=hasPrivilege(account.privileges,row.scopeId);
        const settings=row.settings||{};
        const draft=editingKey===row.key?editDraft:null;
        return <ScopeCardV2 key={row.key} eyebrow={settings.show_source===false?'':row.source} title={row.title}>
          {row.date?<p className="scope-v2-meta">{row.date}</p>:null}
          {settings.visibility&&settings.visibility!=='public'?<p className="scope-v2-status">此項目目前隱藏（僅管理者可見）</p>:null}
          <p>{settings.projection_level==='full'?row.bodyText:row.snippet}</p>
          {settings.show_link!==false&&row.href?<p><a href={row.href} target={row.isScopeCard?undefined:(/^https?:/.test(row.href)?'_blank':undefined)} rel={row.isScopeCard?undefined:(/^https?:/.test(row.href)?'noreferrer':undefined)}>{row.isScopeCard?'進入 Scope':'查看連結'}</a></p>:null}
          {row.destinations?.length?<p className="scope-v2-result-links">{row.destinations.map(destination=><a key={destination.id} href={destination.href}>{destination.label}</a>)}</p>:null}
          {editable?<p>
            {editable?<button type="button" onClick={()=>startEditing(row)}>{editingKey===row.key?'編輯中':'編輯'}</button>:null}
          </p>:null}
          {draft?<div className="scope-v2-editor" aria-label="搜尋結果編輯器">
            <label>標題<input value={draft.title} onChange={event=>setEditDraft(current=>({...current,title:event.target.value}))}/></label>
            <label>全文<textarea rows={10} value={draft.body} onChange={event=>setEditDraft(current=>({...current,body:event.target.value}))}/></label>
            {row.resourceType==='galaxy_media'?<label>媒體曲風分類<input value={draft.styleTags||''} onChange={event=>setEditDraft(current=>({...current,styleTags:event.target.value}))} placeholder="例如 Mandopop, 男聲, 希望向, 主題曲"/></label>:null}
            {canSearchSettings?<div className="scope-v2-editor-options">
              <label><input type="checkbox" checked={draft.includeStatistics} onChange={event=>setEditDraft(current=>({...current,includeStatistics:event.target.checked}))}/>列入統計</label>
              <label><input type="checkbox" checked={draft.fullText} onChange={event=>setEditDraft(current=>({...current,fullText:event.target.checked}))}/>全文顯示（未勾選時顯示節錄）</label>
              <label><input type="checkbox" checked={draft.hidden} onChange={event=>setEditDraft(current=>({...current,hidden:event.target.checked}))}/>隱藏搜尋結果</label>
              <label><input type="checkbox" checked={draft.showLink} onChange={event=>setEditDraft(current=>({...current,showLink:event.target.checked}))}/>顯示連結</label>
              <label><input type="checkbox" checked={draft.showSource} onChange={event=>setEditDraft(current=>({...current,showSource:event.target.checked}))}/>顯示來源</label>
            </div>:null}
            {editAudit.length?<details><summary>近期修改紀錄</summary><ol>{editAudit.map((entry,index)=><li key={String(entry.changed_at)+entry.field_name+index}>
              <p>{entry.field_name}｜操作者 {entry.actor_name||entry.actor_email||entry.actor_id}（{entry.actor_id}）｜{new Date(entry.changed_at).toLocaleString('zh-TW')}</p>
              <details><summary>查看前後內容</summary><p>修改前：{entry.old_value??'（空）'}</p><p>修改後：{entry.new_value??'（空）'}</p></details>
            </li>)}</ol></details>:null}
            {editError?<p role="alert" className="scope-v2-error">{editError}</p>:null}
            <button type="button" disabled={editBusy} onClick={()=>saveEditing(row)}>{editBusy?'儲存中…':'儲存'}</button>
            <button type="button" disabled={editBusy} onClick={()=>{setEditingKey('');setEditDraft(null);setEditError('')}}>取消</button>
          </div>:null}
        </ScopeCardV2>;
      })}
    </div>
    {hasMore?<div ref={sentinelRef} className="scope-v2-load-sentinel" aria-live="polite">
      &lt; {loadingMore?'載入中…':'…'} &gt;
    </div>:null}
  </FeaturePageV2>;
}
