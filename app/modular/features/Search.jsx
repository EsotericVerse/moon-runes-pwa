'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useSearchParams} from 'next/navigation';

import {logSearchKeyword,selectAuthRow,updateRows} from '../../loc/db-client.mjs';
import {useAccount} from '../../loc/use-account';
import {ContentEditor,FeaturePage,IncrementalList,WorkFullText,WorkSummaryCard} from '../ui';
import {useScopeRuntime} from '../use-scope-runtime';
import {resolveScopeSearchAlias,scopeHref} from '../scope-registry';
import {galaxyIdentityHref,galaxyRelationLinks} from '../feature-navigation';
import {featureDataErrorMessage} from '../feature-data-state';
import {resolveGalaxyExternalLinks,searchGalaxyRows,selectGalaxyContent,selectGalaxyIdentity,selectStyleKeywordIntroductions} from '../../loc/galaxy-query';
import {selectManagedScopes} from '../../loc/scope-data';
import {MEDIA_FALLBACK_TITLE,WORK_FALLBACK_TITLE,workDisplayHeading,workDisplayText} from '../work-display-model';
import {requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/list-loading-contract.mjs';
import {applyFilters} from '../../loc/db-query.mjs';


function escapeSearchRegExp(value){
  return String(value||'').replace(/[.*+?^\${}()|[\]\\]/g,'\\$&');
}
function highlightSearchText(text='',query=''){
  const source=String(text||''),raw=String(query||'').trim();
  if(!source||!raw)return source;
  const terms=[...new Set([raw,...raw.split(/\s+/g)].map(item=>item.trim()).filter(Boolean))].sort((a,b)=>b.length-a.length);
  const pattern=new RegExp('('+terms.map(escapeSearchRegExp).join('|')+')','giu');
  const normalized=new Set(terms.map(term=>term.normalize('NFKC').toLocaleLowerCase('zh-Hant')));
  return source.split(pattern).map((part,index)=>{
    const key=part.normalize('NFKC').toLocaleLowerCase('zh-Hant');
    return normalized.has(key)?<mark className="scope-search-highlight" key={index}>{part}</mark>:part;
  });
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
    row.media_type?(UI_COPY.search.typePrefix+row.media_type):'',
    row.source_native_id?(UI_COPY.search.sourceIdPrefix+row.source_native_id):''
  ].map(value=>workDisplayText(value||'').trim()).filter(Boolean).join(' · ');
  const body=isMedia
    ?(mediaMetadata||(bodyField?workDisplayText(row[bodyField]):text))
    :(bodyField?workDisplayText(row[bodyField]):(isGalaxy?'':text));
  const identity=row.media_id||row.uid||row.song_id||row.rune_id||row.record_id||row.resource_id||row.id;
  const scope=String(row.scope_id||scopeId||'').trim();
  const resourceType=(row.uid)?'galaxy':row.media_id?'galaxy_media':'';
  const resourceId=row.uid||row.media_id||'';
  const editableTable=resourceType?String(row.__table||''):'';
  const editableIdColumn=resourceType
    ?(resourceType==='galaxy'?'uid':'media_id')
    :'';
  const editResourceId=resourceId;
  const editableField=resourceType==='galaxy'?'content':resourceType==='galaxy_media'?'meta_tags':'';
  const isScopeCard=Boolean(row.scope_card);
  const href=isScopeCard?scopeHref(scope):(row.url||row.href||row.suno_url||'');
  return {
    key:identity?source+'-'+identity:[source,scope,title].join('-'),
    source:displaySource,title:String(title),
    date:row.date||row.createtime||row.time_date||row.record_date||row.UpdateTime||row.updated_at||'',
    snippet:body,scopeId:scope,resourceType,resourceId,
    editableTable,editableIdColumn,editResourceId,editableField,isScopeCard,href,
    relationLinks:resourceType==='galaxy'
      ?galaxyRelationLinks(scope,row)
      :(resourceType==='galaxy_media'&&row.galaxy_link
        ?[{id:'galaxy:'+row.galaxy_link,label:UI_COPY.search.parentText,href:galaxyIdentityHref(scope,row.galaxy_link)}].filter(link=>link.href)
        :[]),
    groupKey:resourceType==='galaxy'&&resourceId
      ?'galaxy:'+resourceId
      :(resourceType==='galaxy_media'&&row.galaxy_link?'galaxy:'+row.galaxy_link:'result:'+(identity||title)),
    links:[...(href?[{id:resourceType||'primary',href,label:resourceType==='galaxy_media'?UI_COPY.search.mediaLink:UI_COPY.search.externalLink}]:[]),...(Array.isArray(row.resolved_links)?row.resolved_links:[])],
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
      .map((link,index)=>({...link,label:(links.length>1&&link.label===UI_COPY.search.mediaLink)?UI_COPY.format.songLink(index+1):link.label}));
    groups.set(key,{
      ...preferRow,
      links:uniqueLinks,
      destinations:[...(current.destinations||[]),...(row.destinations||[])].filter((item,index,all)=>all.findIndex(other=>other.href===item.href&&other.label===item.label)===index),
      relationLinks:[...(current.relationLinks||[]),...(row.relationLinks||[])].filter((item,index,all)=>all.findIndex(other=>other.href===item.href&&other.label===item.label)===index)
    });
  }
  return [...groups.values()];
}

export default function Search(){
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const searchParams=useSearchParams();
  const [query,setQuery]=useState('');
  const [searchMode,setSearchMode]=useState('all');
  const [results,setResults]=useState([]);
  const [status,setStatus]=useState(UI_COPY.search.start);
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
  const scopesQuery=useQuery({
    queryKey:['managed-scopes'],
    queryFn:selectManagedScopes,
    staleTime:5*60_000
  });
  const aggregateScopes=Boolean(scope?.aggregateChildren);
  const targetScopes=useMemo(()=>{
    const scopes=scopesQuery.data||[];
    return aggregateScopes?scopes:scopes.filter(item=>item.id===scopeId);
  },[aggregateScopes,scopeId,scopesQuery.data]);
  const scopeById=useMemo(()=>new Map(targetScopes.map(item=>[item.id,item])),[targetScopes]);
  const hiddenScopeIds=useMemo(
    ()=>targetScopes.filter(item=>account.canManageScopeSync(item.id)).map(item=>item.id),
    [targetScopes,account.authorizer]
  );
  const collectionLabel=aggregateScopes?UI_COPY.search.allContent:String(scope?.label||scopeId);

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
      setStatus(searchMode==='media'?UI_COPY.search.searching:UI_COPY.format.searchScope(collectionLabel));
    }
    try{
      if(!append){
        const scopeShortcut=resolveScopeSearchAlias(q);
        if(scopeShortcut){
          matchedQueryRef.current=q;
          setResults([{
            key:'scope:'+scopeShortcut.id,
            source:'Scope',
            title:scopeShortcut.searchTitle||scopeShortcut.label||scopeShortcut.id,
            date:'',
            snippet:'',
            scopeId:scopeShortcut.id,
            resourceType:'',
            resourceId:'',
            editableTable:'',
            editableIdColumn:'',
            editResourceId:'',
            editableField:'',
            isScopeCard:true,
            href:scopeHref(scopeShortcut.id),
            relationLinks:[],
            groupKey:'scope:'+scopeShortcut.id,
            links:[{id:'scope-home',href:scopeHref(scopeShortcut.id),label:'前往 Scope 首頁'}],
            destinations:[]
          }]);
          setHasMore(false);
          setNextCursor(null);
          setStatus('');
          return;
        }
        logSearchKeyword(scopeId,q).catch(()=>{});
      }
      const styleIntroductions=(!append&&searchMode!=='media')
        ?await selectStyleKeywordIntroductions(targetScopes,q)
        :[];
      const search=await searchGalaxyRows(targetScopes,q,{limit:pageSize,cursor,mediaOnly:searchMode==='media',hiddenScopeIds});
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
        const scopeData=scopeById.get(rowScope);
        if(!scopeData)return;
        const resolved=await resolveGalaxyExternalLinks(scopeData,rows);
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
      for(const {row,source} of [...styleIntroductions,...enrichedRows]){
        const result=toResult(row,source,scopeId);
        if(!result||seen.has(result.key))continue;
        seen.add(result.key);converted.push(result);
      }
      const pageResults=mergeSummaryResults(converted);
      setResults(current=>append?mergeSummaryResults([...current,...pageResults]):pageResults);
            setHasMore(Boolean(search.hasMore));
      setNextCursor(search.nextCursor??null);
      const partial=search.failures?.length?'（部分延伸資料暫時無法查詢）':'';
      if(!append)setStatus(UI_COPY.format.searchResult({label:searchMode==='media'?UI_COPY.search.media:'「'+collectionLabel+'」',query:q,hasMore:search.hasMore,partial}));
    }catch(exception){
      if(id!==searchId.current)return;
      setError(featureDataErrorMessage(exception));
      setStatus(UI_COPY.search.failed);
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
    setStatus(UI_COPY.search.loadingRelation);
    try{
      let detail=null;
      let detailScope=scopeId;
      for(const scopeData of targetScopes){
        detail=await selectGalaxyIdentity(scopeData,identity,{includeHidden:account.canManageScopeSync(scopeData.id)});
        if(detail){detailScope=scopeData.id;break;}
      }
      if(id!==searchId.current)return;
      if(!detail)throw new Error(UI_COPY.search.notFound);
      const result=toResult({...detail,resolved_links:detail.links||[]},detail.source_name||UI_COPY.search.displaySource,detailScope);
      setResults([result]);
      setFullTextKey(result.key);
      setFullText(workDisplayText(detail.content||''));
            setStatus(UI_COPY.search.relationLoaded);
    }catch(exception){
      if(id!==searchId.current)return;
      setResults([]);setError(featureDataErrorMessage(exception));setStatus(UI_COPY.search.relationFailed);
    }
  }

  useEffect(()=>{
    if(!scopesQuery.isSuccess)return;
    const identity=String(searchParams?.get('identity')||'').trim();
    const value=String(searchParams?.get('q')||'').trim();
    if(identity){setQuery('');executeIdentity(identity);return;}
    if(value){setQuery(value);executeSearch(value);}
  },[searchParams,scopeId,scopesQuery.isSuccess,scopesQuery.data]);
  useEffect(()=>{if(scopesQuery.isSuccess&&query.trim()&&!searchParams?.get('identity'))executeSearch(query);},[scopeId,scopesQuery.isSuccess,scopesQuery.data]);



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
      const scopeData=scopeById.get(result.scopeId);
      if(!scopeData)throw new Error(UI_COPY.search.fullTextNotFound);
      const fullRow=await selectGalaxyContent(scopeData,result.editResourceId||result.resourceId);
      if(!fullRow)throw new Error(UI_COPY.search.fullTextNotFound);
      setFullText(workDisplayText(fullRow.content||''));
    }catch(exception){
      setFullTextError(String(exception?.message||exception||UI_COPY.search.fullTextFailed));
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
      const fullRow=await selectAuthRow(result.editableTable,{
        idColumn:result.editableIdColumn,
        id:result.editResourceId||result.resourceId,
        columns:contentColumns
      });
      if(!fullRow)throw new Error(UI_COPY.search.editNotFound);
      setEditDraft({
        title:String(fullRow.title??result.title??''),
        body:String(fullRow[result.editableField]??''),
        hidden:result.resourceType==='galaxy'&&fullRow.searchable===false
      });
    }catch(exception){
      setEditingKey('');
      setEditError(String(exception?.message||exception||UI_COPY.search.editLoadFailed));
    }
  }
  async function saveEditing(result){
    if(!editDraft||!result.editableTable||!result.editableField)return;
    setEditBusy(true);setEditError('');
    try{
      if(!account.canManageScopeSync(result.scopeId))throw new Error(UI_COPY.search.editDenied);
      const body=result.resourceType==='galaxy'?requireGalaxyContent(editDraft.body):editDraft.body;
      const nextTitle=result.resourceType==='galaxy'
        ?resolveGalaxyTitle(editDraft.title,body)
        :(String(editDraft.title||'').trim()||null);
      const contentPatch={
        title:nextTitle,
        [result.editableField]:body,
        ...(result.resourceType==='galaxy'?{searchable:!editDraft.hidden,UpdateTime:new Date().toISOString()}:{})
      };
      const contentFilters=[{column:result.editableIdColumn,operator:'eq',value:result.editResourceId||result.resourceId}];
      await updateRows(result.editableTable,contentPatch,{filters:contentFilters});
      setResults(current=>current.map(item=>item.key!==result.key?item:{...item,title:nextTitle,snippet:result.resourceType==='galaxy'?'':body}));
      if(fullTextKey===result.key)setFullText(editDraft.body);
      setEditingKey('');setEditDraft(null);
    }catch(exception){setEditError(String(exception?.message||exception||UI_COPY.search.saveFailed))}
    finally{setEditBusy(false)}
  }

  async function runSearch(event){event.preventDefault();await executeSearch(query)}


  return <FeaturePage featureId="search">
    <div className="scope-tabs" role="group" aria-label={UI_COPY.search.mode}>
      <button type="button" aria-pressed={searchMode==='all'} onClick={()=>{setSearchMode('all');setResults([]);setHasMore(false);setNextCursor(null);setStatus(UI_COPY.search.start);}}>{UI_COPY.search.allSearch}</button>
      <button type="button" aria-pressed={searchMode==='media'} onClick={()=>{setSearchMode('media');setResults([]);setHasMore(false);setNextCursor(null);setStatus(UI_COPY.search.mediaPrompt);}}>{UI_COPY.search.mediaSearch}</button>
    </div>
    <form className="scope-search-form" onSubmit={runSearch}>
      <label htmlFor="scope-search-query">{searchMode==='media'?UI_COPY.search.mediaPromptLabel:UI_COPY.search.textPromptLabel}</label>
      <input id="scope-search-query" value={query} onChange={event=>setQuery(event.target.value)} placeholder={searchMode==='media'?UI_COPY.search.mediaPlaceholder:UI_COPY.search.textPlaceholder} aria-label={searchMode==='media'?UI_COPY.search.mediaSearch:UI_COPY.search.textPromptLabel}/>
      <button type="submit">{UI_COPY.nav.search}</button>
    </form>
    <p className="scope-status">{status}</p>
    {error?<p className="scope-status scope-error">{error}</p>:null}
    <IncrementalList
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
        return <WorkSummaryCard
          key={row.key}
          title={row.title}
          source={row.source}
          scopeId={row.scopeId}
          date={row.date}
          body={highlightSearchText(row.snippet,matchedQueryRef.current)}
          hidden={false}
          relationLinks={row.relationLinks||[]}
          links={row.links||[]}
          destinations={row.destinations}
          showSource
          showLinks
        >
          {row.resourceType==='galaxy'?<WorkFullText
            open={fullTextKey===row.key}
            loading={fullTextLoading&&fullTextKey===row.key}
            error={fullTextKey===row.key?fullTextError:''}
            content={fullTextKey===row.key?fullText:''}
            onToggle={()=>toggleFullText(row)}
          />:null}
          {editable?<p><button type="button" onClick={()=>startEditing(row)}>{editingKey===row.key?UI_COPY.search.editing:UI_COPY.common.edit}</button></p>:null}
          {draft?<ContentEditor
            draft={draft}
            setDraft={setEditDraft}
            busy={editBusy}
            error={editError}
            showVisibility={row.resourceType==='galaxy'}
            onSave={()=>saveEditing(row)}
            onCancel={()=>{setEditingKey('');setEditDraft(null);setEditError('')}}
          />:null}
        </WorkSummaryCard>;
      }}
    />
  </FeaturePage>;
}
