'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {searchNeonRows} from '../../loc/neon-search';
import {neonAuthClient} from '../../loc/neon-client';
import {useNeonAccount} from '../../loc/use-neon-account';
import FeaturePageV2 from '../FeaturePageV2';
import WorkSummaryCardV2 from '../WorkSummaryCardV2';
import WorkFullTextV2 from '../WorkFullTextV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeHrefV2} from '../scope-registry.v2';
import {galaxyIdentityHref,galaxyRelationLinks} from '../feature-navigation.v2';
import {featureDataErrorMessage} from '../feature-data-state.v2';
import ContentEditorV2 from '../ContentEditorV2';
import SearchHighlightV2 from '../SearchHighlightV2';
import {resolveGalaxyExternalLinks,selectGalaxyContent,selectGalaxyIdentity} from '../../loc/aggregate-query';
import {selectManagedScopes} from '../../loc/scope-table-mapping';
import {MEDIA_FALLBACK_TITLE,WORK_FALLBACK_TITLE,workDisplayHeading,workDisplayText} from '../work-display-model.v2';
import {requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';
import IncrementalListV2 from '../IncrementalListV2';
import {DEFAULT_LIST_BATCH_SIZE} from '../list-loading.v2';


function authRelation(table){
  const [schema,name]=String(table).split('.');
  return neonAuthClient.schema(schema).from(name);
}
async function selectNeonRowById(table,{idColumn,id,columns}={}){
  const {data,error}=await authRelation(table).select(columns).eq(idColumn,String(id)).limit(1);
  if(error)throw new Error(error.message||('Neon SELECT '+table+' failed'));
  return data?.[0]||null;
}
async function updateNeonRows(table,values,{filters=[]}={}){
  let query=authRelation(table).update(values);
  for(const filter of filters)query=filter.operator==='in'?query.in(filter.column,filter.value):query[filter.operator](filter.column,filter.value);
  const {error}=await query;
  if(error)throw new Error(error.message||('Neon UPDATE '+table+' failed'));
}

function rowText(row){return Object.values(row||{}).filter(value=>typeof value==='string').join(' ')}
function toResult(row,source,scopeId){
  const text=rowText(row);
  const isGalaxy=Boolean(row.uid);
  const isMedia=Boolean(row.media_id);
  const explicitTitle=workDisplayText(row.title||row.name||row.display_title||row.label||row.rune_name||row.song_id||row.id||'').trim();
  const fallbackTitle=isMedia?MEDIA_FALLBACK_TITLE:WORK_FALLBACK_TITLE;
  const title=(isGalaxy||isMedia)
    ?workDisplayHeading(row,{media:isMedia,fallback:fallbackTitle,limit:80})
    :(explicitTitle||fallbackTitle);
  const bodyField=['summary','display_text','excerpt','content','meta_tags','description','interpretation','ai_summary','retrieval_text','text'].find(field=>typeof row[field]==='string'&&row[field].trim())||'';
  const displaySource=isGalaxy&&row.source_name?String(row.source_name):source;
  const mediaMetadata=[
    row.meta_tags,
    row.media_type?('類型：'+row.media_type):'',
    row.source_native_id?('來源識別：'+row.source_native_id):''
  ].map(value=>workDisplayText(value||'').trim()).filter(Boolean).join(' · ');
  const body=isMedia
    ?(mediaMetadata||(bodyField?workDisplayText(row[bodyField]):text))
    :(bodyField?workDisplayText(row[bodyField]):(isGalaxy?'':text));
  const identity=row.media_id||row.uid||row.song_id||row.rune_id||row.faq_id||row.record_id||row.resource_id||row.id;
  const rawScope=String(row.scope_id||scopeId||'');
  const scope=rawScope==='lrunes'?'lunarunes':rawScope;
  const resourceType=(row.uid)?'galaxy':row.media_id?'galaxy_media':'';
  const resourceId=row.uid||row.media_id||'';
  const editableTable=resourceType?String(row.__table||''):'';
  const editableIdColumn=resourceType
    ?(resourceType==='galaxy'?'uid':'media_id')
    :'';
  const editResourceId=resourceId;
  const editableField=resourceType==='galaxy'?'content':resourceType==='galaxy_media'?'meta_tags':'';
  const isScopeCard=Boolean(row.scope_card);
  const href=isScopeCard?scopeHrefV2(scope):(row.url||row.href||row.suno_url||'');
  return {
    key:identity?source+'-'+identity:[source,scope,title].join('-'),
    source:displaySource,title:String(title),
    date:row.date||row.createtime||row.time_date||row.record_date||row.UpdateTime||row.updated_at||'',
    snippet:body,scopeId:scope,resourceType,resourceId,
    editableTable,editableIdColumn,editResourceId,editableField,isScopeCard,href,
    relationLinks:resourceType==='galaxy'
      ?galaxyRelationLinks(scope,row)
      :(resourceType==='galaxy_media'&&row.galaxy_link
        ?[{id:'galaxy:'+row.galaxy_link,label:'所屬文字',href:galaxyIdentityHref(scope,row.galaxy_link)}].filter(link=>link.href)
        :[]),
    groupKey:resourceType==='galaxy'&&resourceId
      ?'galaxy:'+resourceId
      :(resourceType==='galaxy_media'&&row.galaxy_link?'galaxy:'+row.galaxy_link:'result:'+(identity||title)),
    links:[...(href?[{id:resourceType||'primary',href,label:resourceType==='galaxy_media'?'媒體連結':'外部連結'}]:[]),...(Array.isArray(row.resolved_links)?row.resolved_links:[])],
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
      relationLinks:[...(current.relationLinks||[]),...(row.relationLinks||[])].filter((item,index,all)=>all.findIndex(other=>other.href===item.href&&other.label===item.label)===index)
    });
  }
  return [...groups.values()];
}

export default function SearchV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const searchParams=useSearchParams();
  const [query,setQuery]=useState('');
  const [searchMode,setSearchMode]=useState('all');
  const [results,setResults]=useState([]);
  const [status,setStatus]=useState('輸入關鍵字開始搜尋。');
  const [error,setError]=useState('');
  const [hasMore,setHasMore]=useState(false);
  const [nextCursor,setNextCursor]=useState(null);
  const [loadingMore,setLoadingMore]=useState(false);
  const [editingKey,setEditingKey]=useState('');
  const [editDraft,setEditDraft]=useState(null);
  const [editBusy,setEditBusy]=useState(false);
  const [editError,setEditError]=useState('');
  const [fullTextKey,setFullTextKey]=useState('');
  const [fullText,setFullText]=useState('');
  const [fullTextError,setFullTextError]=useState('');
  const [fullTextLoading,setFullTextLoading]=useState(false);
  const searchId=useRef(0);
  const matchedQueryRef=useRef('');
  const pageSize=DEFAULT_LIST_BATCH_SIZE;
  const collectionLabel=scopeId==='loc'?'全部內容':String(scope?.label||scopeId);

  async function executeSearch(rawQuery,cursor=null,{append=false}={}){
    const q=String(rawQuery||'').trim();
    if(!q)return;
    const id=++searchId.current;
    setError('');
    if(append){
      setLoadingMore(true);
    }else{
      matchedQueryRef.current='';
      setHasMore(false);
      setNextCursor(null);
      setResults([]);
      setStatus(searchMode==='media'?'搜尋多媒體資料…':`搜尋「${collectionLabel}」資料…`);
    }
    try{
      const search=await searchNeonRows(scopeId,q,{limit:pageSize,cursor,mediaOnly:searchMode==='media'});
      if(id!==searchId.current)return;

      const searchRows=[...(search.rows||[])];
      const textByScope=new Map();
      for(const entry of searchRows){
        const row=entry?.row;
        if(!row?.uid)continue;
        const rowScope=String(row.scope_id||scopeId||'').trim();
        if(!rowScope)continue;
        if(!textByScope.has(rowScope))textByScope.set(rowScope,[]);
        textByScope.get(rowScope).push(row);
      }
      const resolvedByKey=new Map();
      await Promise.all([...textByScope.entries()].map(async([rowScope,rows])=>{
        const resolved=await resolveGalaxyExternalLinks(rowScope,rows);
        for(const row of resolved)resolvedByKey.set(rowScope+':'+row.uid,row);
      }));
      const enrichedRows=searchRows.map(entry=>{
        const row=entry?.row;
        if(!row?.uid)return entry;
        const rowScope=String(row.scope_id||scopeId||'').trim();
        return {...entry,row:resolvedByKey.get(rowScope+':'+row.uid)||row};
      });

      if(!append)matchedQueryRef.current=q;
      const converted=[];const seen=new Set();
      for(const {row,source} of enrichedRows){
        const result=toResult(row,source,scopeId);
        if(!result||seen.has(result.key))continue;
        seen.add(result.key);converted.push(result);
      }
      const pageResults=mergeSummaryResults(converted);
      setResults(current=>append?mergeSummaryResults([...current,...pageResults]):pageResults);
            setHasMore(Boolean(search.hasMore));
      setNextCursor(search.nextCursor??null);
      const partial=search.failures?.length?`（部分延伸資料暫時無法查詢）`:'';
      if(!append)setStatus(`${searchMode==='media'?'多媒體':'「'+collectionLabel+'」'}搜尋「${q}」；先顯示本批結果${search.hasMore?'，向下滑動可繼續載入。':'。'}${partial}`);
    }catch(exception){
      if(id!==searchId.current)return;
      setError(featureDataErrorMessage(exception));
      setStatus('搜尋失敗。');
    }finally{
      if(append&&id===searchId.current)setLoadingMore(false);
    }
  }

  async function loadNextSearch(){
    const q=matchedQueryRef.current||query.trim();
    if(!q||!hasMore||loadingMore||nextCursor===null)return;
    await executeSearch(q,nextCursor,{append:true});
  }

  async function executeIdentity(rawIdentity){
    const identity=String(rawIdentity||'').trim();
    if(!identity)return;
    const id=++searchId.current;
    matchedQueryRef.current='';
    setError('');setHasMore(false);setNextCursor(null);setLoadingMore(false);
    setStatus('載入關聯文字…');
    try{
      let detail=null;
      let detailScope=scopeId;
      if(scopeId==='loc'){
        const scopes=await selectManagedScopes();
        for(const managedScope of scopes){
          detail=await selectGalaxyIdentity(managedScope.id,identity);
          if(detail){detailScope=managedScope.id;break;}
        }
      }else{
        detail=await selectGalaxyIdentity(scopeId,identity);
      }
      if(id!==searchId.current)return;
      if(!detail)throw new Error('找不到這筆文字。');
      const result=toResult({...detail,resolved_links:detail.links||[]},detail.source_name||'文字展示',detailScope);
      setResults([result]);
      setFullTextKey(result.key);
      setFullText(workDisplayText(detail.content||''));
            setStatus('已載入關聯文字。');
    }catch(exception){
      if(id!==searchId.current)return;
      setResults([]);setError(featureDataErrorMessage(exception));setStatus('文字載入失敗。');
    }
  }

  useEffect(()=>{
    const identity=String(searchParams?.get('identity')||'').trim();
    const value=String(searchParams?.get('q')||'').trim();
    if(identity){setQuery('');executeIdentity(identity);return;}
    if(value){setQuery(value);executeSearch(value);}
  },[searchParams,scopeId]);
  useEffect(()=>{if(query.trim()&&!searchParams?.get('identity'))executeSearch(query);},[scopeId]);



  async function toggleFullText(result){
    if(fullTextKey===result.key){
      setFullTextKey('');
      setFullText('');
      setFullTextError('');
      return;
    }
    if(result.resourceType!=='galaxy'||!result.editableTable)return;
    setFullTextKey(result.key);
    setFullText('');
    setFullTextError('');
    setFullTextLoading(true);
    try{
      const fullRow=await selectGalaxyContent(result.scopeId,result.editResourceId||result.resourceId);
      if(!fullRow)throw new Error('找不到全文資料。');
      setFullText(workDisplayText(fullRow.content||''));
    }catch(exception){
      setFullTextError(String(exception?.message||exception||'全文載入失敗。'));
    }finally{
      setFullTextLoading(false);
    }
  }

  async function startEditing(result){
    setEditingKey(result.key);setEditError('');
    setEditDraft(null);
    try{
      const contentColumns=result.resourceType==='galaxy'
        ?'uid,title,content,searchable'
        :'media_id,title,meta_tags';
      const fullRow=await selectNeonRowById(result.editableTable,{
        idColumn:result.editableIdColumn,
        id:result.editResourceId||result.resourceId,
        columns:contentColumns
      });
      if(!fullRow)throw new Error('找不到要編輯的資料。');
      setEditDraft({
        title:String(fullRow.title??result.title??''),
        body:String(fullRow[result.editableField]??''),
        hidden:result.resourceType==='galaxy'&&fullRow.searchable===false
      });
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
      const body=result.resourceType==='galaxy'?requireGalaxyContent(editDraft.body):editDraft.body;
      const nextTitle=result.resourceType==='galaxy'
        ?resolveGalaxyTitle(editDraft.title,body)
        :(String(editDraft.title||'').trim()||null);
      const contentPatch={
        title:nextTitle,
        [result.editableField]:body,
        ...(result.resourceType==='galaxy'?{searchable:!editDraft.hidden}:{})
      };
      const contentFilters=[{column:result.editableIdColumn,operator:'eq',value:result.editResourceId||result.resourceId}];
      await updateNeonRows(result.editableTable,contentPatch,{filters:contentFilters});
      setResults(current=>current.map(item=>item.key!==result.key?item:{...item,title:nextTitle,snippet:result.resourceType==='galaxy'?'':body}));
      if(fullTextKey===result.key)setFullText(editDraft.body);
      setEditingKey('');setEditDraft(null);
    }catch(exception){setEditError(String(exception?.message||exception||'儲存失敗。'))}
    finally{setEditBusy(false)}
  }

  async function runSearch(event){event.preventDefault();await executeSearch(query)}


  return <FeaturePageV2 featureId="search">
    <div className="scope-v2-tabs" role="group" aria-label="搜尋模式">
      <button type="button" aria-pressed={searchMode==='all'} onClick={()=>{setSearchMode('all');setResults([]);setHasMore(false);setNextCursor(null);setStatus('輸入關鍵字開始搜尋。');}}>全部搜尋</button>
      <button type="button" aria-pressed={searchMode==='media'} onClick={()=>{setSearchMode('media');setResults([]);setHasMore(false);setNextCursor(null);setStatus('輸入多媒體關鍵字、類型或來源識別。');}}>多媒體搜尋</button>
    </div>
    <form className="scope-v2-search-form" onSubmit={runSearch}>
      <label htmlFor="scope-search-query">{searchMode==='media'?'找多媒體':'你想找什麼？'}</label>
      <input id="scope-search-query" value={query} onChange={event=>setQuery(event.target.value)} placeholder={searchMode==='media'?'搜尋圖片、影音、網址、標籤或來源識別':'輸入關鍵字、作品名稱或文字'} aria-label={searchMode==='media'?'多媒體搜尋':'你想找什麼？'}/>
      <button type="submit">搜尋</button>
    </form>
    <p className="scope-v2-status">{status}</p>
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    <IncrementalListV2
      items={results}
      batchSize={pageSize}
      resetKey={searchMode+'|'+matchedQueryRef.current}
      externalHasMore={hasMore}
      loading={loadingMore}
      error={error}
      onLoadMore={loadNextSearch}
      renderItem={row=>{
        const editable=Boolean(row.editableTable&&row.editableField&&account.canManageScopeSync(row.scopeId));
        const draft=editingKey===row.key?editDraft:null;
        return <WorkSummaryCardV2
          key={row.key}
          title={row.title}
          source={row.source}
          scopeId={row.scopeId}
          date={row.date}
          body={<SearchHighlightV2 text={row.snippet} query={matchedQueryRef.current}/>}
          hidden={false}
          relationLinks={row.relationLinks||[]}
          links={row.links||[]}
          destinations={row.destinations}
          showSource
          showLinks
        >
          {row.resourceType==='galaxy'?<WorkFullTextV2
            open={fullTextKey===row.key}
            loading={fullTextLoading&&fullTextKey===row.key}
            error={fullTextKey===row.key?fullTextError:''}
            content={fullTextKey===row.key?fullText:''}
            onToggle={()=>toggleFullText(row)}
          />:null}
          {editable?<p><button type="button" onClick={()=>startEditing(row)}>{editingKey===row.key?'編輯中':'編輯'}</button></p>:null}
          {draft?<ContentEditorV2
            draft={draft}
            setDraft={setEditDraft}
            busy={editBusy}
            error={editError}
            showVisibility={row.resourceType==='galaxy'}
            onSave={()=>saveEditing(row)}
            onCancel={()=>{setEditingKey('');setEditDraft(null);setEditError('')}}
          />:null}
        </WorkSummaryCardV2>;
      }}
    />
  </FeaturePageV2>;
}
