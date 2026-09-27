'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {searchNeonRows} from '../../loc/neon-search';
import {selectNeonRowById,selectNeonRows,updateNeonRows} from '../../loc/neon-repository';
import {listResourceVisibilityFor,saveResourceVisibility,visibilityDraft} from '../../loc/resource-visibility';
import {useNeonAccount} from '../../loc/use-neon-account';
import {getSearchCollection} from '../../loc/search-collections';
import FeaturePageV2 from '../FeaturePageV2';
import WorkSummaryCardV2 from '../WorkSummaryCardV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeHrefV2} from '../scope-registry.v2';
import {featureDataErrorMessage} from '../feature-data-state.v2';
import ContentEditorV2 from '../ContentEditorV2';
import {selectCanonicalWorkSummaries} from '../../loc/aggregate-query';
import {decodeCultureText} from '../modules/culture-timeline/culture-timeline-model.mjs';

const norm=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('zh-Hant').replace(/[\s\u3000]+/g,'');
function rowText(row){return Object.values(row||{}).filter(value=>typeof value==='string').join(' ')}
function snippet(text,q){
  const raw=String(text||'').replace(/\s+/g,' ').trim();
  const index=norm(raw).indexOf(norm(q));
  const start=Math.max(0,(index<0?0:index)-70);
  return `${start?'…':''}${raw.slice(start,start+220)}${raw.length>start+220?'…':''}`;
}
function resultKey(scope,type,id){return String(scope)+':'+String(type)+':'+String(id)}
function toResult(row,source,q,collectionId,scopeId,settingsMap=new Map()){
  const text=rowText(row);
  const excerpt=decodeCultureText(row.excerpt||'').trim();
  const explicitTitle=row.title||row.name||row.display_title||row.label||row.rune_name||row.context_name||row.song_id||row.id||'';
  const title=explicitTitle||snippet(excerpt||source,q)||source;
  const bodyField=['summary','display_text','excerpt','content','style_tags','meta_tags','description','interpretation','ai_summary','retrieval_text','text'].find(field=>typeof row[field]==='string'&&row[field].trim())||'';
  const body=bodyField?decodeCultureText(row[bodyField]):text;
  const identity=row.media_id||row.galaxy_id||row.song_id||row.rune_id||row.id;
  const scope=row.scope_id||scopeId;
  const resourceType=row.galaxy_id?'galaxy':row.media_id?'galaxy_media':'';
  const resourceId=row.galaxy_id||row.media_id||'';
  const settingsKey=resourceType&&resourceId?resultKey(scope,resourceType,resourceId):'';
  const settings=settingsMap.get(settingsKey)||null;
  const runeScope=scope==='lrunes'||scope==='lunarunes';
  const editableTable=resourceType
    ?(runeScope?'silver.lrunes':resourceType==='galaxy'?'silver.lo3rwang_galaxy':'silver.lo3rwang_galaxy_media')
    :'';
  const editableIdColumn=resourceType
    ?(runeScope?'record_id':resourceType==='galaxy'?'galaxy_id':'media_id')
    :'';
  const editResourceId=runeScope?String(row.record_id||''):resourceId;
  const editableField=resourceType==='galaxy'?'content':resourceType==='galaxy_media'?'meta_tags':'';
  const isScopeCard=Boolean(row.scope_card);
  const href=isScopeCard?scopeHrefV2(scope):(row.url||row.href||row.suno_url||'');
  return {
    key:identity?source+'-'+identity:source+'-'+title+'-'+String(body).slice(0,40),
    source,title:String(title),
    date:row.date||row.created_date||row.create_time||row.created_at||row.update_time||row.updated_at||'',
    snippet:explicitTitle?snippet(body,q):'',bodyText:explicitTitle?String(body):'',styleTags:String(row.style_tags||row.meta_tags||''),
    display:String(row.display||'summary'),scopeId:scope,resourceType,resourceId,settingsKey,settings,
    editableTable,editableIdColumn,editResourceId,editableField,isScopeCard,href,
    sourceId:row.source_id||row.media_link||'',
    targetId:row.target_id||'',
    refId:row.ref_id||'',
    groupKey:resourceType==='galaxy'&&resourceId
      ?'galaxy:'+resourceId
      :(resourceType==='galaxy_media'&&row.media_link?'galaxy:'+row.media_link:'result:'+(identity||title)),
    links:href?[{id:resourceType||'primary',href,label:resourceType==='galaxy_media'?'媒體連結':'查看連結'}]:[],
    destinations:[]
  };
}


function mergeSummaryResults(rows=[]){
  const groups=new Map();
  for(const row of rows){
    const key=row.groupKey||row.key;
    if(!groups.has(key)){
      groups.set(key,{...row,links:[...(row.links||[])]});
      continue;
    }
    const current=groups.get(key);
    const preferRow=current.resourceType==='galaxy'?current:(row.resourceType==='galaxy'?row:current);
    const links=[...(current.links||[]),...(row.links||[])];
    const uniqueLinks=[...new Map(links.filter(link=>link?.href).map(link=>[link.href,link])).values()]
      .map((link,index)=>({...link,label:(links.length>1&&link.label==='媒體連結')?('歌曲連結 '+(index+1)):link.label}));
    groups.set(key,{
      ...preferRow,
      links:uniqueLinks,
      destinations:[...(current.destinations||[]),...(row.destinations||[])].filter((item,index,all)=>all.findIndex(other=>other.href===item.href&&other.label===item.label)===index),
      sourceId:preferRow.sourceId||current.sourceId||row.sourceId||'',
      targetId:preferRow.targetId||current.targetId||row.targetId||'',
      refId:preferRow.refId||current.refId||row.refId||''
    });
  }
  return [...groups.values()];
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
  const [totalCount,setTotalCount]=useState(0);
  const [pageOffset,setPageOffset]=useState(0);
  const [editingKey,setEditingKey]=useState('');
  const [editDraft,setEditDraft]=useState(null);
  const [editAudit,setEditAudit]=useState([]);
  const [editBusy,setEditBusy]=useState(false);
  const [editError,setEditError]=useState('');
  const searchId=useRef(0);
  const matchedQueryRef=useRef('');
  const visibilityRef=useRef(new Map());
  const pageSize=20;
  const collection=useMemo(()=>getSearchCollection(scope.searchCollection),[scope.searchCollection]);

  async function executeSearch(rawQuery,offset=0){
    const q=String(rawQuery||'').trim();
    if(!q)return;
    const id=++searchId.current;
    setPageOffset(offset);
    matchedQueryRef.current='';
    setError('');
    setHasMore(false);
    setResults([]);
    setStatus(`搜尋「${collection.label}」資料…`);
    try{
      const search=await searchNeonRows(collection.id,q,{limit:pageSize,offset});
      if(id!==searchId.current)return;

      const authorIds=search.rows
        .map(({row})=>row?.scope_id==='lo3rwang'&&row?.galaxy_id?String(row.galaxy_id):'')
        .filter(Boolean);
      let summaries=[];
      try{summaries=await selectCanonicalWorkSummaries(authorIds);}catch{}
      const summaryMap=new Map(summaries.map(item=>[String(item.work_id),item]));
      const searchRows=search.rows.map(item=>{
        const row=item.row||{};
        const summary=row.galaxy_id?summaryMap.get(String(row.galaxy_id)):null;
        return summary?{...item,row:{...row,title:row.title||summary.title||'',excerpt:summary.excerpt||''}}:item;
      });

      matchedQueryRef.current=q;
      const pageResources=searchRows.map(({row})=>{
        const resourceType=row.galaxy_id?'galaxy':row.media_id?'galaxy_media':'';
        const resourceId=row.galaxy_id||row.media_id||'';
        return {scope:row.scope_id||scopeId,resourceType,resourceId};
      }).filter(item=>item.resourceType&&item.resourceId);
      let visibilityRows=[];
      try{visibilityRows=await listResourceVisibilityFor(pageResources);}catch{}
      const visibilityMap=new Map();
      for(const item of visibilityRows){
        visibilityMap.set(resultKey(item.scope,item.resource_type,item.resource_id),item);
      }
      visibilityRef.current=visibilityMap;
      const converted=[];const seen=new Set();
      for(const {row,source} of searchRows){
        const result=toResult(row,source,q,collection.id,scopeId,visibilityMap);
        if(!result||seen.has(result.key))continue;
        if(result.display==='hidden'&&!account.canManageScopeSync(result.scopeId))continue;
        if(result.settings&&result.settings.visibility!=='public'&&!account.canManageScopeSync(result.scopeId))continue;
        seen.add(result.key);converted.push(result);
      }
      setResults(mergeSummaryResults(converted));
      setTotalCount(Number(search.totalCount||0));
      setHasMore(Boolean(search.hasMore));
      const partial=search.failures?.length?`（${search.failures.length} 張非必要資料表暫時無法查詢）`:'';
      setStatus(`「${collection.label}」搜尋「${q}」，共 ${Number(search.totalCount||0).toLocaleString()} 筆。${partial}`);
    }catch(exception){
      if(id!==searchId.current)return;
      setError(featureDataErrorMessage(exception));
      setStatus('搜尋失敗。');
    }finally{
    }
  }

  async function goToPage(offset){
    const q=matchedQueryRef.current||query.trim();
    if(!q)return;
    await executeSearch(q,Math.max(0,offset));
  }

  useEffect(()=>{
    const value=String(searchParams?.get('q')||'').trim();
    if(value){setQuery(value);executeSearch(value);}
  },[searchParams]);
  useEffect(()=>{if(query.trim())executeSearch(query);},[scopeId]);



  async function startEditing(result){
    setEditingKey(result.key);setEditError('');setEditAudit([]);
    setEditDraft(null);
    try{
      const contentColumns=result.resourceType==='galaxy'
        ?'galaxy_id,scope_id,title,content'
        :'media_id,scope_id,title,meta_tags,style_tags';
      const [fullRow,auditResult]=await Promise.all([
        selectNeonRowById(result.editableTable,{
          idColumn:result.editableIdColumn,
          id:result.editResourceId||result.resourceId,
          columns:contentColumns
        }),
        selectNeonRows('silver.manage',{
          columns:'actor_name,actor_email,changed_at,field_name,old_value,new_value',
          filters:[
            {column:'record_type',operator:'eq',value:'content_audit'},
            {column:'scope_id',operator:'eq',value:result.scopeId},
            {column:'resource_type',operator:'eq',value:result.resourceType},
            {column:'resource_id',operator:'eq',value:result.resourceId}
          ],
          orders:[{column:'changed_at',ascending:false}],
          limit:10
        })
      ]);
      if(!fullRow)throw new Error('找不到要編輯的資料。');
      if(fullRow.scope_id&&String(fullRow.scope_id)!==String(result.scopeId))throw new Error('Scope 與資料不一致。');
      setEditDraft({
        title:String(fullRow.title??result.title??''),
        body:String(fullRow[result.editableField]??''),
        styleTags:String(fullRow.style_tags??result.styleTags??''),
        ...visibilityDraft(result.settings||{})
      });
      setEditAudit(auditResult.rows);
    }catch(exception){
      setEditingKey('');
      setEditError(String(exception?.message||exception||'無法載入編輯內容。'));
    }
  }
  async function saveEditing(result){
    if(!editDraft||!result.editableTable||!result.editableField)return;
    setEditBusy(true);setEditError('');
    try{
      if(!account.canManageScopeSync(result.scopeId))throw new Error('沒有修改此內容的權限。');
      const contentPatch={title:editDraft.title,[result.editableField]:editDraft.body};
      if(result.resourceType==='galaxy_media')contentPatch.style_tags=String(editDraft.styleTags||'').trim()||'風格未知';
      await updateNeonRows(result.editableTable,contentPatch,{filters:[{column:result.editableIdColumn,operator:'eq',value:result.editResourceId||result.resourceId},{column:'scope_id',operator:'eq',value:result.scopeId}]});
      let settings=result.settings||null;
      if(account.canManageScopeSync(result.scopeId)){
        const record=await saveResourceVisibility({
          scope:result.scopeId,resourceType:result.resourceType,resourceId:result.resourceId,draft:editDraft
        });
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
        const editable=Boolean(row.editableTable&&row.editableField&&account.canManageScopeSync(row.scopeId));
        const canSearchSettings=account.canManageScopeSync(row.scopeId);
        const settings=row.settings||{};
        const draft=editingKey===row.key?editDraft:null;
        return <WorkSummaryCardV2
          key={row.key}
          title={row.title}
          source={row.source}
          date={row.date}
          body={settings.projection_level==='full'?row.bodyText:row.snippet}
          hidden={Boolean(settings.visibility&&settings.visibility!=='public')}
          sourceId={row.sourceId}
          targetId={row.targetId}
          refId={row.refId}
          links={settings.show_link!==false?(row.links||[]):[]}
          destinations={row.destinations}
          showSource={settings.show_source!==false}
          showLinks={settings.show_link!==false}
        >
          {editable?<p><button type="button" onClick={()=>startEditing(row)}>{editingKey===row.key?'編輯中':'編輯'}</button></p>:null}
          {draft?<ContentEditorV2
            draft={draft}
            setDraft={setEditDraft}
            busy={editBusy}
            error={editError}
            showVisibility={canSearchSettings}
            extraFields={row.resourceType==='galaxy_media'?<label>媒體曲風分類<input value={draft.styleTags||''} onChange={event=>setEditDraft(current=>({...current,styleTags:event.target.value}))} placeholder="例如 Mandopop, 男聲, 希望向, 主題曲"/></label>:null}
            onSave={()=>saveEditing(row)}
            onCancel={()=>{setEditingKey('');setEditDraft(null);setEditError('')}}
          />:null}
          {draft&&editAudit.length?<details><summary>近期修改紀錄</summary><ol>{editAudit.map((entry,index)=><li key={String(entry.changed_at)+entry.field_name+index}>
            <p>{entry.field_name}｜操作者 {entry.actor_name||entry.actor_email}（{entry.actor_email}）｜{new Date(entry.changed_at).toLocaleString('zh-TW')}</p>
            <details><summary>查看前後內容</summary><p>修改前：{entry.old_value??'（空）'}</p><p>修改後：{entry.new_value??'（空）'}</p></details>
          </li>)}</ol></details>:null}
        </WorkSummaryCardV2>;
      })}
    </div>
    {totalCount>pageSize?<nav className="scope-v2-pagination" aria-label="搜尋結果分頁">
      <button type="button" disabled={pageOffset<=0} onClick={()=>goToPage(pageOffset-pageSize)}>上一頁</button>
      <span>{Math.floor(pageOffset/pageSize)+1} / {Math.max(1,Math.ceil(totalCount/pageSize))}</span>
      <button type="button" disabled={!hasMore} onClick={()=>goToPage(pageOffset+pageSize)}>下一頁</button>
    </nav>:null}
  </FeaturePageV2>;
}
