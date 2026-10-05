'use client';

import {useEffect,useRef,useState} from 'react';
import {UI_COPY} from '../i18n/ui-copy';
import {deleteRows,dbAuthRelation,selectAuthRow,updateRows} from './db-client.mjs';
import {useAccount} from './use-account';
import {ContentEditor,WorkSummaryCard} from '../modular/ui';
import {normalizeRelationIds,requireGalaxyContent,resolveGalaxyTitle} from './content-policy';

const PAGE_SIZE=20;
function dateText(value){return String(value||'').slice(0,10)||'—';}
function localDateTime(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}
function idText(row,kind){return String(kind==='media'?row?.media_id:row?.uid||'');}

export default function ManagementDataPanel({scopeId}){
  const account=useAccount();
  const [kind,setKind]=useState('galaxy');
  const [visibility,setVisibility]=useState('all');
  const [page,setPage]=useState(0);
  const [rows,setRows]=useState([]);
  const [total,setTotal]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [revision,setRevision]=useState(0);
  const [selectedId,setSelectedId]=useState('');
  const [draft,setDraft]=useState(null);
  const [editorBusy,setEditorBusy]=useState(false);
  const [editorMessage,setEditorMessage]=useState('');
  const detailRequestRef=useRef(0);

  useEffect(()=>{detailRequestRef.current+=1;setPage(0);setSelectedId('');setDraft(null);setEditorMessage('');},[scopeId,kind,visibility]);

  useEffect(()=>{
    if(!scopeId||!account.canManageScopeSync(scopeId))return;
    let cancelled=false;
    (async()=>{
      setBusy(true);setError('');
      try{
        const scopeData=account.scopeDataFor(scopeId);
        if(!scopeData)throw new Error('Scope data 未解析');
        const table=kind==='media'?scopeData.galaxyMedia:scopeData.galaxy;
        let query=kind==='media'
          ?dbAuthRelation(table).select('media_id,title,media_type,createtime,galaxy_link,url,meta_tags',{count:'exact'})
          :dbAuthRelation(table).select('uid,title,source_name,createtime,UpdateTime,searchable,content_type,url',{count:'exact'});
        if(kind==='galaxy'&&visibility==='hidden')query=query.eq('searchable',false);
        query=query.order('createtime',{ascending:false}).range(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE-1);
        const {data,count,error:queryError}=await query;
        if(queryError)throw new Error(queryError.message||'管理資料讀取失敗');
        if(cancelled)return;
        setRows(data||[]);setTotal(Number(count)||0);
      }catch(exception){
        if(!cancelled){setRows([]);setTotal(0);setError(String(exception?.message||exception||'管理資料讀取失敗'));}
      }finally{if(!cancelled)setBusy(false);}
    })();
    return()=>{cancelled=true;};
  },[scopeId,account.email,account.scopes,kind,visibility,page,revision]);

  if(!account.canManageScopeSync(scopeId))return null;
  const pageCount=Math.max(1,Math.ceil(total/PAGE_SIZE));

  async function selectRow(row){
    const id=idText(row,kind);
    const requestId=++detailRequestRef.current;
    setSelectedId(id);setDraft(null);setEditorMessage('');
    const scopeData=account.scopeDataFor(scopeId);
    if(!scopeData){setEditorMessage('Scope data 未解析');return;}
    try{
      const table=kind==='media'?scopeData.galaxyMedia:scopeData.galaxy;
      const full=await selectAuthRow(table,{
        idColumn:kind==='media'?'media_id':'uid',id,
        columns:kind==='media'
          ?'media_id,title,media_type,createtime,galaxy_link,url,meta_tags,source_native_id,source_place'
          :'uid,title,content_type,content,source_name,createtime,searchable,url,source_id,target_id,ref_id,source_place'
      });
      if(!full)throw new Error('找不到這筆資料。');
      if(requestId!==detailRequestRef.current)return;
      setDraft(kind==='media'?{
        title:String(full.title||''),body:String(full.meta_tags||''),media_type:String(full.media_type||''),
        url:String(full.url||''),galaxy_link:String(full.galaxy_link||''),source_native_id:String(full.source_native_id||''),
        source_place:String(full.source_place||''),createtime:localDateTime(full.createtime),hidden:false
      }:{
        title:String(full.title||''),body:String(full.content||''),content_type:String(full.content_type||'article'),
        source_name:String(full.source_name||''),url:String(full.url||''),source_id:String(full.source_id||''),
        target_id:Array.isArray(full.target_id)?full.target_id.join(','):String(full.target_id||''),
        ref_id:String(full.ref_id||''),source_place:String(full.source_place||''),
        createtime:localDateTime(full.createtime),hidden:full.searchable===false
      });
    }catch(exception){
      if(requestId!==detailRequestRef.current)return;
      setDraft(null);setEditorMessage(String(exception?.message||exception));
    }
  }

  async function saveSelected(){
    if(!selectedId||!draft)return;
    const scopeData=account.scopeDataFor(scopeId);
    if(!scopeData){setEditorMessage('Scope data 未解析');return;}
    setEditorBusy(true);setEditorMessage('');
    try{
      if(kind==='media'){
        const galaxyLink=String(draft.galaxy_link||'').trim().toUpperCase();
        const metaTags=String(draft.body||'').trim();
        if(galaxyLink&&galaxyLink.length!==8)throw new Error('galaxy_link 必須是 8 字 UID，或留空。');
        if(!metaTags)throw new Error('Meta Tags 為必填欄位。');
        await updateRows(scopeData.galaxyMedia,{
          title:String(draft.title||'').trim()||null,
          meta_tags:metaTags,
          media_type:String(draft.media_type||'').trim()||'other',
          url:String(draft.url||'').trim()||null,
          galaxy_link:galaxyLink||null,
          source_native_id:String(draft.source_native_id||'').trim()||null,
          source_place:String(draft.source_place||'').trim()||null,
          createtime:draft.createtime?new Date(draft.createtime).toISOString():null
        },{filters:[{column:'media_id',operator:'eq',value:selectedId}]});
      }else{
        const content=requireGalaxyContent(draft.body);
        const sourceName=String(draft.source_name||'').trim();
        if(!sourceName)throw new Error('來源為必填欄位。');
        await updateRows(scopeData.galaxy,{
          title:resolveGalaxyTitle(draft.title,content),content,
          content_type:String(draft.content_type||'article').trim()||'article',
          source_name:sourceName,
          url:String(draft.url||'').trim()||null,
          source_id:String(draft.source_id||'').trim()||null,
          target_id:normalizeRelationIds(draft.target_id),
          ref_id:String(draft.ref_id||'').trim()||null,
          source_place:String(draft.source_place||'').trim()||null,
          createtime:draft.createtime?new Date(draft.createtime).toISOString():null,
          searchable:!draft.hidden,UpdateTime:new Date().toISOString()
        },{filters:[{column:'uid',operator:'eq',value:selectedId}]});
      }
      setEditorMessage('已儲存。');setRevision(value=>value+1);
    }catch(exception){setEditorMessage(String(exception?.message||exception||'儲存失敗'));}
    finally{setEditorBusy(false);}
  }

  async function removeSelected(){
    if(!selectedId||!window.confirm('確定刪除這筆 canonical record？此操作不能由頁面復原。'))return;
    const scopeData=account.scopeDataFor(scopeId);
    if(!scopeData){setEditorMessage('Scope data 未解析');return;}
    setEditorBusy(true);setEditorMessage('');
    try{
      await deleteRows(kind==='media'?scopeData.galaxyMedia:scopeData.galaxy,{filters:[{
        column:kind==='media'?'media_id':'uid',operator:'eq',value:selectedId
      }]});
      setSelectedId('');setDraft(null);setRevision(value=>value+1);setEditorMessage('已刪除。');
    }catch(exception){setEditorMessage(String(exception?.message||exception||'刪除失敗'));}
    finally{setEditorBusy(false);}
  }

  const extraFields=draft?<div className="scope-management-fields">
    {kind==='galaxy'?<>
      <label><span>Content Type</span><input value={draft.content_type||''} onChange={e=>setDraft(v=>({...v,content_type:e.target.value}))}/></label>
      <label><span>來源</span><input value={draft.source_name||''} onChange={e=>setDraft(v=>({...v,source_name:e.target.value}))}/></label>
      <label><span>URL</span><input value={draft.url||''} onChange={e=>setDraft(v=>({...v,url:e.target.value}))}/></label>
      <label><span>建立時間</span><input type="datetime-local" value={draft.createtime||''} onChange={e=>setDraft(v=>({...v,createtime:e.target.value}))}/></label>
      <label><span>source_id</span><input value={draft.source_id||''} onChange={e=>setDraft(v=>({...v,source_id:e.target.value}))}/></label>
      <label><span>target_id</span><input value={draft.target_id||''} onChange={e=>setDraft(v=>({...v,target_id:e.target.value}))}/></label>
      <label><span>ref_id</span><input value={draft.ref_id||''} onChange={e=>setDraft(v=>({...v,ref_id:e.target.value}))}/></label>
      <label><span>地點</span><input value={draft.source_place||''} onChange={e=>setDraft(v=>({...v,source_place:e.target.value}))}/></label>
    </>:<>
      <label><span>Media Type</span><input value={draft.media_type||''} onChange={e=>setDraft(v=>({...v,media_type:e.target.value}))}/></label>
      <label><span>URL</span><input value={draft.url||''} onChange={e=>setDraft(v=>({...v,url:e.target.value}))}/></label>
      <label><span>Galaxy Link</span><input value={draft.galaxy_link||''} onChange={e=>setDraft(v=>({...v,galaxy_link:e.target.value}))}/></label>
      <label><span>Source Native ID</span><input value={draft.source_native_id||''} onChange={e=>setDraft(v=>({...v,source_native_id:e.target.value}))}/></label>
      <label><span>地點</span><input value={draft.source_place||''} onChange={e=>setDraft(v=>({...v,source_place:e.target.value}))}/></label>
      <label><span>建立時間</span><input type="datetime-local" value={draft.createtime||''} onChange={e=>setDraft(v=>({...v,createtime:e.target.value}))}/></label>
    </>}
  </div>:null;

  return <section className="loc-card scope-feature-card scope-management-workspace">
    <p className="loc-eyebrow">{UI_COPY.management.data}</p><h2>{UI_COPY.management.data}</h2>
    <p>直接管理此 Scope 的 canonical Galaxy / Media。列表只載必要欄位，點選後才讀取完整內容。</p>
    <div className="scope-stat-controls">
      <label><span>{UI_COPY.management.dataType}</span><select className="scope-select" value={kind} onChange={event=>setKind(event.target.value)}><option value="galaxy">{UI_COPY.management.galaxyText}</option><option value="media">Galaxy Media</option></select></label>
      {kind==='galaxy'?<label><span>{UI_COPY.management.searchStatus}</span><select className="scope-select" value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="all">{UI_COPY.management.allData}</option><option value="hidden">{UI_COPY.management.notSearchableData}</option></select></label>:null}
    </div>
    <p className="scope-status">共 {total.toLocaleString()} 筆｜第 {Math.min(page+1,pageCount)} / {pageCount} 頁</p>
    {error?<p className="scope-status scope-error">{error}</p>:null}
    <div className="scope-management-split">
      <div>
        {busy?<p className="scope-status">{UI_COPY.common.loading}</p>:null}
        {!busy&&!error?<div className="scope-management-records">
          {rows.map(row=>{const id=idText(row,kind);return <button type="button" className="scope-inline-card scope-management-record" aria-pressed={selectedId===id} key={id} onClick={()=>selectRow(row)}><strong>{String(row.title||'').trim()||id}</strong><span>{kind==='media'?[row.media_type,row.galaxy_link,dateText(row.createtime)].filter(Boolean).join(' · '):[row.source_name,row.searchable===false?UI_COPY.management.notSearchable:UI_COPY.management.searchable,dateText(row.createtime)].filter(Boolean).join(' · ')}</span></button>;})}
          {!rows.length?<p className="scope-status">{UI_COPY.common.none}</p>:null}
        </div>:null}
        <div className="scope-stat-controls"><button type="button" disabled={busy||page<=0} onClick={()=>setPage(value=>Math.max(0,value-1))}>{UI_COPY.management.previous}</button><button type="button" disabled={busy||page+1>=pageCount} onClick={()=>setPage(value=>value+1)}>{UI_COPY.management.next}</button></div>
      </div>
      <div className="scope-management-editor">
        {!selectedId?<p className="scope-status">選一筆資料後，在這裡直接預覽與編輯。</p>:null}
        {!draft&&editorMessage?<p className={editorMessage==='已刪除。'?'scope-status':'scope-status scope-error'}>{editorMessage}</p>:null}
        {draft?<>
          <WorkSummaryCard title={draft.title||selectedId} scopeId={scopeId} source={kind==='media'?draft.media_type:draft.source_name} date={draft.createtime} body={draft.body} hidden={draft.hidden}/>
          <ContentEditor draft={draft} setDraft={setDraft} onSave={saveSelected} busy={editorBusy} error={editorMessage&&editorMessage!=='已儲存。'&&editorMessage!=='已刪除。'?editorMessage:''} bodyLabel={kind==='media'?'Meta Tags':'正文'} extraFields={extraFields} showVisibility={kind==='galaxy'}/>
          {editorMessage==='已儲存。'?<p className="scope-status">{editorMessage}</p>:null}
          <button type="button" className="loc-button scope-danger-button" disabled={editorBusy} onClick={removeSelected}>刪除此筆</button>
        </>:null}
      </div>
    </div>
  </section>;
}
