'use client';
import FieldText from '../../i18n/FieldText';

import {UI_COPY} from '../../i18n/ui-copy';
import {useUiCopy} from '../../i18n/ui-locale';
import UiText,{useUiText} from '../../i18n/UiText';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useRouter,useSearchParams} from 'next/navigation';

import {deleteRows,logSearchKeyword,updateRows} from '../../loc/db-client.mjs';
import {useAccount} from '../../loc/use-account';
import {FeaturePage,IncrementalList,WorkFullText} from '../ui';
import Article from '../Article';
import {useScopeRuntime} from '../use-scope-runtime';
import {scopeHref} from '../scope-registry';
import {featureNavigationHref,galaxyIdentityHref,galaxyRelationLinks} from '../feature-navigation';
import {featureDataErrorMessage} from '../feature-data-state';
import {resolveGalaxyExternalLinks,searchGalaxyRows,selectGalaxyContent,selectGalaxyIdentity,selectStyleKeywordMatches} from '../../loc/galaxy-query';
import {defaultScopeData,selectScopeRegistry} from '../../loc/scope-data';
import {selectCultureTimeRows} from '../../loc/culture-query';
import {MEDIA_FALLBACK_TITLE,WORK_FALLBACK_TITLE,workDisplayHeading,workDisplayText} from '../work-display-model';
import {requireGalaxyContent,resolveGalaxyTitle,assertPlainGalaxyAttributes} from '../../loc/content-policy';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/list-loading-contract.mjs';
import {applyFilters,selectRows} from '../../loc/db-query.mjs';
import {blocksToPlainText,plainTextToBlocks} from '../../loc/blocknote-content.mjs';
import ScopeGroupOverview from '../../loc/ScopeGroupOverview';
import ScopeEditableBlocks from '../../loc/ScopeEditableBlocks';
import {formatGroupLists,parseGroupListsAttr} from '../../loc/group-lists.mjs';


const GALAXY_EDITOR_COLUMNS='uid,title,content,createtime,source_native_id,source_place,searchable,UpdateTime,url,source_id,target_id,ref_id,source_name,media_link,statistics_able,class_id,group_lists';

const GALAXY_ATTR_ORDER=Object.freeze([
  'uid','title','content','createtime','source_native_id','source_place',
  'searchable','UpdateTime','url','source_id','target_id','ref_id','source_name',
  'media_link','statistics_able','class_id','group_lists'
]);
const GALAXY_ATTR_FIELDS=Object.freeze(GALAXY_ATTR_ORDER.map(key=>({
  key,
  readOnly:['uid','title','content','UpdateTime'].includes(key),
  kind:['searchable','statistics_able'].includes(key)?'boolean':
    ['target_id','media_link'].includes(key)?'array':
    key==='group_lists'?'multiline':
    key==='createtime'?'date':key==='class_id'?'number':'text'
})));

function nullableText(value){
  const text=String(value??'').trim();
  return text||null;
}
function listText(value){
  return Array.isArray(value)?value.join('\n'):'';
}
function parseListText(value){
  return [...new Set(String(value||'').split(/[\n,]+/g).map(item=>item.trim()).filter(Boolean))];
}
function datetimeLocalValue(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60_000);
  return local.toISOString().slice(0,16);
}
function isoOrNull(value,t){
  const text=String(value||'').trim();
  if(!text)return null;
  const date=new Date(text);
  if(Number.isNaN(date.getTime()))throw new Error(t('uiExtra.searchUI.articleDateInvalid'));
  return date.toISOString();
}
function parseGroupListsText(value,t){
  try{return parseGroupListsAttr(value)}catch{throw new Error(t('uiExtra.searchUI.groupListInvalid'))}
}
function galaxyDraftFromRow(row={},fallbackTitle=''){
  const attrs={
    uid:String(row.uid||'').trim(),
    createtime:datetimeLocalValue(row.createtime),
    source_native_id:String(row.source_native_id||''),
    source_place:String(row.source_place||''),
    searchable:row.searchable!==false,
    UpdateTime:String(row.UpdateTime||''),
    url:String(row.url||''),
    source_id:String(row.source_id||'').trim(),
    target_id:listText(row.target_id),
    ref_id:String(row.ref_id||'').trim(),
    source_name:String(row.source_name||''),
    media_link:listText(row.media_link),
    statistics_able:row.statistics_able!==false,
    class_id:row.class_id===null||row.class_id===undefined?'':String(row.class_id),
    group_lists:formatGroupLists(row.group_lists)
  };
  const body=String(row.content??'');
  return {
    title:String(row.title??fallbackTitle??''),
    originalTitle:String(row.title??fallbackTitle??''),
    body,
    bodyHtml:body,
    bodyBlocks:plainTextToBlocks(body),
    editorKey:String(row.uid||row.media_id||''),
    hidden:row.searchable===false,
    attrs,
    originalAttrs:{...attrs}
  };
}

function changedGalaxyAttributes(draft,t){
  const current=draft?.attrs||{},initial=draft?.originalAttrs||{};
  const changed={};
  const differs=key=>JSON.stringify(current[key])!==JSON.stringify(initial[key]);
  if(differs('searchable'))changed.searchable=current.searchable!==false;
  if(differs('createtime'))changed.createtime=isoOrNull(current.createtime,t);
  for(const key of ['source_native_id','source_place','url','source_id','ref_id','source_name']){
    if(differs(key))changed[key]=nullableText(current[key]);
  }
  if(differs('statistics_able'))changed.statistics_able=current.statistics_able!==false;
  if(differs('target_id'))changed.target_id=parseListText(current.target_id);
  if(differs('media_link'))changed.media_link=parseListText(current.media_link);
  if(differs('class_id')){
    const value=String(current.class_id??'').trim();
    changed.class_id=value===''?null:Number(value);
    if(value!==''&&!Number.isFinite(changed.class_id))throw new Error(t('uiExtra.searchUI.classIdInvalid'));
  }
  if(differs('group_lists'))changed.group_lists=parseGroupListsText(current.group_lists,t);
  return changed;
}

function normalizeScopeAlias(value=''){
  return String(value||'').normalize('NFKC').trim().toLocaleLowerCase('zh-Hant');
}
function matchesScopeAlias(scope,query){
  const token=normalizeScopeAlias(query);
  if(!token)return false;
  const aliases=[
    scope?.id,scope?.label,scope?.searchTitle,
    ...(Array.isArray(scope?.searchAliases)?scope.searchAliases:[])
  ].filter(Boolean);
  return aliases.some(alias=>normalizeScopeAlias(alias)===token);
}

function canManageSearchScope(account,scopeId){
  const id=String(scopeId||'').trim();
  const normalized=id.toLowerCase();
  const ownScope=Array.isArray(account.scopes)&&account.scopes.some(scope=>String(scope?.id||'').trim().toLowerCase()===normalized);
  return Boolean(account.role==='admin'||account.canManageGlobalSync?.()||ownScope||account.canManageScopeSync(id)||account.canManageScopeSync(normalized));
}

async function selectPublicEditableRow(table,idColumn,id,columns,{authenticated=false}={}){
  const {rows=[]}=await selectRows(table,{
    columns,
    filters:[{column:idColumn,operator:'eq',value:String(id)}],
    limit:1,authenticated
  });
  return rows[0]||null;
}

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
function toResult(row,source,scopeId,copy=UI_COPY){
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
    row.media_type?(copy.search.typePrefix+row.media_type):'',
    row.source_native_id?(copy.search.sourceIdPrefix+row.source_native_id):''
  ].map(value=>workDisplayText(value||'').trim()).filter(Boolean).join(' · ');
  const body=row.style_keyword_tag?'':isMedia
    ?(mediaMetadata||(bodyField?workDisplayText(row[bodyField]):text))
    :(isGalaxy?(row.summary?workDisplayText(row.summary):row.excerpt?workDisplayText(row.excerpt):''):(bodyField?workDisplayText(row[bodyField]):text));
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
    key:identity?[scope,source,identity].join(':'):[source,scope,title].join('-'),
    source:displaySource,title:String(title),
    date:row.date||row.createtime||row.time_date||row.record_date||row.UpdateTime||row.updated_at||'',
    snippet:body,scopeId:scope,resourceType,resourceId,
    styleTagMatch:Boolean(row.style_keyword_tag),
    styleIntroText:row.style_keyword_tag?workDisplayText(row.style_description||''):'',
    editableTable,editableIdColumn,editResourceId,editableField,isScopeCard,href,
    editRow:resourceType?row:null,
    relationLinks:resourceType==='galaxy'
      ?galaxyRelationLinks(scope,row)
      :(resourceType==='galaxy_media'&&row.galaxy_link
        ?[{id:'galaxy:'+row.galaxy_link,label:copy.search.parentText,href:galaxyIdentityHref(scope,row.galaxy_link)}].filter(link=>link.href)
        :[]),
    dedupeKey:resourceType==='galaxy'
      ?'article-copy:'+JSON.stringify([scope,
        String(row.title||'').normalize('NFKC').trim(),
        String(row.content||'').replace(/[\r\n]/g,'').trim(),
        String(row.source_name||'').normalize('NFKC').trim(),
        String(row.createtime||''),String(row.url||'').trim()])
      :'',
    groupKey:row.style_keyword_tag
      ?'style-tag:'+String(title).normalize('NFKC').trim().toLocaleLowerCase('zh-Hant')
      :(resourceType==='galaxy'&&resourceId
      ?'galaxy:'+scope+':'+resourceId
      :(resourceType==='galaxy_media'&&row.galaxy_link?'galaxy:'+scope+':'+row.galaxy_link:'result:'+scope+':'+(identity||title))),
    links:[...(href?[{id:resourceType||'primary',href,label:resourceType==='galaxy_media'?copy.search.mediaLink:copy.search.externalLink}]:[]),...(Array.isArray(row.resolved_links)?row.resolved_links:[])],
    destinations:[]
  };
}


function mergeSummaryResults(rows=[],copy=UI_COPY){
  const groups=new Map();
  for(const row of rows){
    const key=row.dedupeKey||row.groupKey||row.key;
    if(!groups.has(key)){
      groups.set(key,{...row,links:[...(row.links||[])]});
      continue;
    }
    const current=groups.get(key);
    const preferRow=current.resourceType==='galaxy'?current:(row.resourceType==='galaxy'?row:current);
    const links=[...(current.links||[]),...(row.links||[])];
    const uniqueLinks=[...new Map(links.filter(link=>link?.href).map(link=>[link.href,link])).values()]
      .map((link,index)=>({...link,label:(links.length>1&&link.label===copy.search.mediaLink)?copy.format.songLink(index+1):link.label}));
    groups.set(key,{
      ...preferRow,
      links:uniqueLinks,
      destinations:[...(current.destinations||[]),...(row.destinations||[])].filter((item,index,all)=>all.findIndex(other=>other.href===item.href&&other.label===item.label)===index),
      relationLinks:[...(current.relationLinks||[]),...(row.relationLinks||[])].filter((item,index,all)=>all.findIndex(other=>other.href===item.href&&other.label===item.label)===index)
    });
  }
  return [...groups.values()];
}

function prioritizeStyleTagResults(rows=[]){
  return [...rows].sort((left,right)=>Number(Boolean(right.styleTagMatch))-Number(Boolean(left.styleTagMatch)));
}


function searchHref(scopeId,query,filters={}){
  const href=featureNavigationHref(scopeId,'search',{q:query});
  const params=new URLSearchParams();
  for(const [key,value] of Object.entries({
    type:filters.contentType,source:filters.sourceFilter,
    from:filters.startDate,to:filters.endDate,period:filters.selectedPeriod
  })){
    if(value)params.set(key,value);
  }
  return href+(params.size?(href.includes('?')?'&':'?')+params.toString():'');
}


export default function Search(){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const searchParams=useSearchParams();
  const router=useRouter();
  const [query,setQuery]=useState('');
  const [advancedOpen,setAdvancedOpen]=useState(false);
  const [advancedTab,setAdvancedTab]=useState('type');
  const [contentType,setContentType]=useState('');
  const [sourceFilter,setSourceFilter]=useState('');
  const [startDate,setStartDate]=useState('');
  const [endDate,setEndDate]=useState('');
  const [selectedPeriod,setSelectedPeriod]=useState('');
  const [browseResults,setBrowseResults]=useState(false);
  const activeSearchOptionsRef=useRef(null);
  const [results,setResults]=useState([]);
  const [status,setStatus]=useState(UI_COPY.search.start);
  const [error,setError]=useState('');
  const [loadMoreError,setLoadMoreError]=useState('');
  const [hasMore,setHasMore]=useState(false);
  const [nextCursor,setNextCursor]=useState(null);
  const [loadingMore,setLoadingMore]=useState(false);
  const [editingKey,setEditingKey]=useState('');
  const [editDraft,setEditDraft]=useState(null);
  const [editBusy,setEditBusy]=useState(false);
  const [editError,setEditError]=useState('');
  const [fullTextKey,setFullTextKey]=useState('');
  const [fullText,setFullText]=useState('');
  const [fullTextRow,setFullTextRow]=useState(null);
  const [fullTextError,setFullTextError]=useState('');
  const [fullTextLoading,setFullTextLoading]=useState(false);
  const searchId=useRef(0);
  const matchedQueryRef=useRef('');
  const pageSize=DEFAULT_LIST_BATCH_SIZE;
  // LOC searches all managed Scopes; only other Scope Groups are directory guides.
  const aggregateScopes=Boolean(scope?.aggregateChildren&&scopeId!=='loc');
  const scopesQuery=useQuery({
    queryKey:['search-scope-registry'],
    queryFn:selectScopeRegistry,
    enabled:!aggregateScopes,
    staleTime:5*60_000
  });
  const targetScopes=useMemo(()=>{
    if(scopeId!=='loc')return [defaultScopeData(scopeId)].filter(Boolean);
    return (scopesQuery.data||[])
      .filter(item=>item.active&&item.scope_kind==='scope')
      .map(item=>defaultScopeData(item.scope_id))
      .filter(Boolean);
  },[scopeId,scopesQuery.data]);
  const scopeById=useMemo(()=>new Map(targetScopes.map(item=>[item.id,item])),[targetScopes]);
  const hiddenScopeIds=useMemo(
    ()=>targetScopes.filter(item=>canManageSearchScope(account,item.id)).map(item=>item.id),
    [targetScopes,account.authorizer]
  );
  const collectionLabel=scopeId==='loc'?UI_COPY.search.allContent:String(scope?.label||scopeId);
  const periodScope=scopeId==='loc'
    ?targetScopes.find(item=>item.id==='lo3rwang')||targetScopes[0]
    :targetScopes[0];
  const periodsQuery=useQuery({
    queryKey:['search-period-options',periodScope?.id],
    enabled:advancedOpen&&advancedTab==='time'&&!aggregateScopes&&Boolean(periodScope?.time),
    queryFn:async()=>{
      const rows=await selectCultureTimeRows(periodScope,periodScope?.birthday);
      return rows.filter(row=>row.entry_type==='period'&&row.start_date)
        .map(row=>({id:row.entry_key,title:row.title,startDate:row.start_date,endDate:row.end_date||''}));
    },
    staleTime:5*60_000
  });

  async function loadGalaxyDetail(result){
    const scopeData=scopeById.get(result.scopeId);
    if(!scopeData)throw new Error(UI_COPY.search.fullTextNotFound);
    const id=result.editResourceId||result.resourceId;
    if(result.editableTable){
      const row=await selectPublicEditableRow(result.editableTable,result.editableIdColumn||'uid',id,GALAXY_EDITOR_COLUMNS,{authenticated:canManageSearchScope(account,result.scopeId)});
      if(!row)throw new Error(UI_COPY.search.fullTextNotFound);
      return row;
    }
    return selectGalaxyContent(scopeData,id,{authenticated:canManageSearchScope(account,result.scopeId)});
  }

  async function executeSearch(rawQuery,cursor=null,{append=false,browse=false,overrideOptions=null}={}){
    const q=String(rawQuery||'').trim();
    const options=append&&activeSearchOptionsRef.current
      ?activeSearchOptionsRef.current
      :(overrideOptions||{contentType,sourceFilter,startDate,endDate,mediaOnly:false,browse});
    if(!q&&!options.browse)return;
    if(options.startDate&&options.endDate&&options.startDate>options.endDate){
      setError(t('uiExtra.searchUI.invalidDateRange'));return;
    }
    if(!append){activeSearchOptionsRef.current=options;setBrowseResults(options.browse);}

    const id=++searchId.current;
    setError('');
    if(append){
      setLoadMoreError('');
      setLoadingMore(true);
    }else{
      setLoadMoreError('');
      setEditingKey('');setEditDraft(null);
      setFullTextKey('');setFullText('');setFullTextRow(null);setFullTextError('');
      matchedQueryRef.current='';
      setHasMore(false);
      setNextCursor(null);
      setResults([]);
      setStatus(UI_COPY.format.searchScope(collectionLabel));
    }
    try{
      if(!append){
        if(!options.browse&&!options.sourceFilter&&!options.contentType&&!options.startDate&&!options.endDate&&scopeId!=='loc'&&matchesScopeAlias(scope,q)){
          matchedQueryRef.current=q;
          setResults([{
            key:'scope:'+scopeId,
            source:t('uiExtra.searchUI.memberSource'),
            title:scope.searchTitle||scope.label||scopeId,
            date:'',
            snippet:scope.searchIntro||'',
            scopeId,
            resourceType:'',
            resourceId:'',
            editableTable:'',
            editableIdColumn:'',
            editResourceId:'',
            editableField:'',
            isScopeCard:true,
            href:scopeHref(scopeId),
            relationLinks:[],
            groupKey:'scope:'+scopeId,
            links:[{id:'scope-home',href:scopeHref(scopeId),label:t('uiExtra.searchUI.memberHomeLink')}],
            destinations:[]
          }]);
          setHasMore(false);
          setNextCursor(null);
          setStatus('');
          return;
        }
        if(q)logSearchKeyword(scopeId,q).catch(()=>{});
      }
      const styleTagMatches=(!append&&!options.browse&&!options.mediaOnly&&!options.contentType&&!options.sourceFilter&&!options.startDate&&!options.endDate)
        ?await selectStyleKeywordMatches(targetScopes,q)
        :[];
      const search=await searchGalaxyRows(targetScopes,q,{
        limit:pageSize,
        // Always search article providers, including when the same keyword
        // exactly matches a style tag.
        cursor,
        mediaOnly:options.mediaOnly,hiddenScopeIds,
        contentType:options.contentType,sourceFilter:options.sourceFilter,
        startDate:options.startDate,endDate:options.endDate,browse:options.browse
      });
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
      for(const {row,source} of [...styleTagMatches,...enrichedRows]){
        const result=toResult(row,source,scopeId,UI_COPY);
        if(!result||seen.has(result.key))continue;
        seen.add(result.key);converted.push(result);
      }
      const pageResults=prioritizeStyleTagResults(mergeSummaryResults(converted,UI_COPY));
      setResults(current=>append?mergeSummaryResults([...current,...pageResults],UI_COPY):pageResults);
            setHasMore(Boolean(search.hasMore));
      setNextCursor(search.nextCursor??null);
      const partial=search.failures?.length?t('uiExtra.searchUI.partialExtendedData'):'';
      if(!append)setStatus(options.browse?t('uiExtra.searchUI.browsingResults'):UI_COPY.format.searchResult({label:'「'+collectionLabel+'」',query:q,hasMore:search.hasMore,partial}));
    }catch(exception){
      if(id!==searchId.current)return;
      if(append){
        setLoadMoreError(featureDataErrorMessage(exception,UI_COPY));
      }else{
        setError(featureDataErrorMessage(exception,UI_COPY));
        setStatus(UI_COPY.search.failed);
      }
    }finally{
      if(append&&id===searchId.current)setLoadingMore(false);
    }
  }

  async function loadNextSearch(){
    const q=matchedQueryRef.current||query.trim();
    if((!q&&!activeSearchOptionsRef.current?.browse)||!hasMore||loadingMore||nextCursor===null)return;
    await executeSearch(q,nextCursor,{append:true,browse:activeSearchOptionsRef.current?.browse});
  }

  async function executeIdentity(rawIdentity){
    const identity=String(rawIdentity||'').trim();
    if(!identity)return;
    const id=++searchId.current;
    matchedQueryRef.current='';
    setError('');setLoadMoreError('');setHasMore(false);setNextCursor(null);setLoadingMore(false);
    setFullText('');setFullTextRow(null);setFullTextError('');setFullTextLoading(true);
    setStatus(UI_COPY.search.loadingRelation);
    try{
      let detail=null;
      let detailScope=scopeId;
      for(const scopeData of targetScopes){
        detail=await selectGalaxyIdentity(scopeData,identity,{includeHidden:canManageSearchScope(account,scopeData.id)});
        if(detail){detailScope=scopeData.id;break;}
      }
      if(id!==searchId.current)return;
      if(!detail)throw new Error(UI_COPY.search.notFound);
      const result=toResult({...detail,resolved_links:detail.links||[]},detail.source_name||UI_COPY.search.displaySource,detailScope);
      setResults([result]);
      setFullTextKey(result.key);
      const fullRow=await loadGalaxyDetail(result);
      setFullText(workDisplayText(fullRow?.content||detail.content||''));
      setFullTextRow(canManageSearchScope(account,detailScope)?fullRow:null);
      setStatus(UI_COPY.search.relationLoaded);
    }catch(exception){
      if(id!==searchId.current)return;
      setResults([]);setError(featureDataErrorMessage(exception,UI_COPY));setStatus(UI_COPY.search.relationFailed);
    }finally{
      if(id===searchId.current)setFullTextLoading(false);
    }
  }

  useEffect(()=>{
    if(!scopesQuery.isSuccess||account.permissionLoading)return;
    const identity=String(searchParams?.get('identity')||'').trim();
    const value=String(searchParams?.get('q')||'').trim();
    if(identity){setQuery('');executeIdentity(identity);return;}
    const filters={
      contentType:String(searchParams?.get('type')||''),
      sourceFilter:String(searchParams?.get('source')||''),
      startDate:String(searchParams?.get('from')||''),
      endDate:String(searchParams?.get('to')||''),
      selectedPeriod:String(searchParams?.get('period')||'')
    };
    setContentType(filters.contentType);setSourceFilter(filters.sourceFilter);
    setStartDate(filters.startDate);setEndDate(filters.endDate);setSelectedPeriod(filters.selectedPeriod);
    if(value){setQuery(value);executeSearch(value,null,{overrideOptions:{...filters,mediaOnly:false,browse:false}});}
  },[searchParams,scopeId,scopesQuery.isSuccess,scopesQuery.data,account.permissionLoading,account.authorizer]);



  async function toggleFullText(result){
    if(fullTextKey===result.key){
      setFullTextKey('');
      setFullText('');
      setFullTextRow(null);
      setFullTextError('');
      return;
    }
    if(result.resourceType!=='galaxy'||!result.editableTable)return;
    setFullTextKey(result.key);
    setFullText('');
    setFullTextRow(null);
    setFullTextError('');
    setFullTextLoading(true);
    try{
      const fullRow=await loadGalaxyDetail(result);
      if(!fullRow)throw new Error(UI_COPY.search.fullTextNotFound);
      setFullText(workDisplayText(fullRow.content||''));
      setFullTextRow(canManageSearchScope(account,result.scopeId)?fullRow:null);
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
      const cached=result.resourceType==='galaxy'&&fullTextKey===result.key&&fullTextRow?.uid
        ?fullTextRow
        :null;
      const fullRow=cached||await selectPublicEditableRow(
        result.editableTable,
        result.editableIdColumn,
        result.editResourceId||result.resourceId,
        result.resourceType==='galaxy'?GALAXY_EDITOR_COLUMNS:'media_id,title,meta_tags',
        {authenticated:result.resourceType==='galaxy'&&canManageSearchScope(account,result.scopeId)}
      );
      if(!fullRow)throw new Error(UI_COPY.search.editNotFound);
      setEditDraft(result.resourceType==='galaxy'
        ?galaxyDraftFromRow(fullRow,result.title)
        :{
          title:String(fullRow.title??result.title??''),
          body:String(fullRow[result.editableField]??''),
          bodyHtml:String(fullRow[result.editableField]??''),
          bodyBlocks:plainTextToBlocks(String(fullRow[result.editableField]??'')),
          editorKey:String(fullRow.media_id||result.resourceId||'media'),
          hidden:false
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
      const body=result.resourceType==='galaxy'
        ?requireGalaxyContent(editDraft.bodyHtml??blocksToPlainText(editDraft.bodyBlocks))
        :(editDraft.bodyHtml??blocksToPlainText(editDraft.bodyBlocks));
      const plainBody=blocksToPlainText(editDraft.bodyHtml??editDraft.bodyBlocks);
      const nextTitle=result.resourceType==='galaxy'
        ?resolveGalaxyTitle(editDraft.title,plainBody)
        :(String(editDraft.title||'').trim()||null);
      const metadataTitleChanged=result.resourceType==='galaxy'&&editDraft.title!==editDraft.originalTitle;
      // Validate the raw edits before converting arrays, dates and group lists:
      // even malformed markup must be rejected with its field name, never
      // normalized away or silently saved into the database.
      if(result.resourceType==='galaxy'){
        const rawEdits=Object.fromEntries(Object.entries(editDraft.attrs||{})
          .filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(editDraft.originalAttrs?.[key])));
        assertPlainGalaxyAttributes({
          ...rawEdits,
          ...(metadataTitleChanged?{title:editDraft.title}:{})
        });
      }
      const attrChanges=result.resourceType==='galaxy'?changedGalaxyAttributes(editDraft,t):{};
      if(result.resourceType==='galaxy'){
        assertPlainGalaxyAttributes({
          ...attrChanges,
          ...(metadataTitleChanged?{title:nextTitle}:{})
        });
      }
      const contentPatch=result.resourceType==='galaxy'?{
        ...(metadataTitleChanged?{title:nextTitle}:{}),
        content:body,
        UpdateTime:new Date().toISOString(),
        ...attrChanges
      }:{
        title:nextTitle,
        [result.editableField]:body,
      };
      const contentFilters=[{column:result.editableIdColumn,operator:'eq',value:result.editResourceId||result.resourceId}];
      await updateRows(result.editableTable,contentPatch,{filters:contentFilters});
      setResults(current=>current.map(item=>item.key!==result.key?item:{...item,title:nextTitle,snippet:result.resourceType==='galaxy'?'':body,editRow:{...(item.editRow||{}),title:nextTitle,[result.editableField]:body,...contentPatch}}));
      if(fullTextKey===result.key){
        setFullText(body);
        if(result.resourceType==='galaxy'){
          setFullTextRow(current=>({
            ...(current||{}),
            ...contentPatch,
            uid:current?.uid||result.editResourceId||result.resourceId
          }));
        }
      }
      setEditingKey('');setEditDraft(null);
    }catch(exception){setEditError(String(exception?.message||exception||UI_COPY.search.saveFailed))}
    finally{setEditBusy(false)}
  }
  async function deleteEditing(result){
    if(!result?.editableTable||!result?.editableIdColumn||!result?.editResourceId)return;
    setEditBusy(true);setEditError('');
    try{
      await deleteRows(result.editableTable,{filters:[{column:result.editableIdColumn,operator:'eq',value:result.editResourceId}]});
      setResults(current=>current.filter(item=>item.key!==result.key));
      if(fullTextKey===result.key){setFullTextKey('');setFullText('');setFullTextRow(null);}
      setEditingKey('');setEditDraft(null);
      setStatus(t('uiExtra.editBlocks.deleted'));
    }catch(exception){
      setEditError(String(exception?.message||exception||t('uiExtra.editBlocks.deleteFailed')));
    }finally{setEditBusy(false)}
  }

  function resetSearchState(){
    ++searchId.current;
    matchedQueryRef.current='';
    activeSearchOptionsRef.current=null;
    setResults([]);setHasMore(false);setNextCursor(null);setBrowseResults(false);
    setLoadMoreError('');setError('');setStatus(UI_COPY.search.start);
  }
  function updateSearchFilter(setter,value){
    setter(value);resetSearchState();
  }
  async function browseSelectedType(){
    await executeSearch('',null,{browse:true});
  }
  function clearSearchFilters(){
    setQuery('');setContentType('');setSourceFilter('');
    setStartDate('');setEndDate('');setSelectedPeriod('');setAdvancedOpen(false);
    resetSearchState();
    router.replace(featureNavigationHref(scopeId,'search'));
  }
  const filterTypes=[
    ['',t('uiExtra.searchUI.allTypes')],
    ['lyrics_work',t('uiExtra.searchUI.lyricsType')],
    ['text_work',t('uiExtra.searchUI.textType')],
    ['multimedia',t('uiExtra.searchUI.mediaType')],
    ['timeline',t('uiExtra.searchUI.timelineType')]
  ];
  const filterSources=[
    ['',t('uiExtra.searchUI.allSources')],
    ['suno','Suno'],['threads','Threads'],['instagram','Instagram'],
    ['facebook','Facebook'],['vocus','Vocus'],['x','X']
  ];
  const chips=[
    contentType&&filterTypes.find(([value])=>value===contentType)?.[1],
    sourceFilter&&filterSources.find(([value])=>value===sourceFilter)?.[1],
    startDate&&t('uiExtra.searchUI.startDate')+': '+startDate,
    endDate&&t('uiExtra.searchUI.endDate')+': '+endDate,
    selectedPeriod&&periodsQuery.data?.find(item=>item.id===selectedPeriod)?.title
  ].filter(Boolean);
  async function runSearch(event){
    event.preventDefault();
    const term=String(query||'').trim();
    if(!term)return;
    // Keep the keyword in the URL and input so a style-to-style link is a
    // reproducible next search, not a transient single-page interaction.
    const url=searchHref(scopeId,term,{contentType,sourceFilter,startDate,endDate,selectedPeriod});
    const current=searchHref(scopeId,String(searchParams?.get('q')||'').trim(),{
      contentType:searchParams?.get('type'),sourceFilter:searchParams?.get('source'),
      startDate:searchParams?.get('from'),endDate:searchParams?.get('to'),selectedPeriod:searchParams?.get('period')
    });
    if(url!==current||searchParams?.get('identity')){router.push(url);return;}
    await executeSearch(term);
  }

  if(aggregateScopes)return <FeaturePage featureId="search">
    <ScopeGroupOverview
      scopeId={scopeId}
      featureId="search"
      title={t('uiExtra.searchUI.memberSearch')}
      description=""
    />
  </FeaturePage>;

  return <FeaturePage featureId="search">
    <section className="scope-search-workspace" aria-label={t('uiExtra.searchUI.searchWorkspace')}>
      <form className="scope-search-form" onSubmit={runSearch}>
        <label htmlFor="scope-search-query">{UI_COPY.search.textPromptLabel}</label>
        <input id="scope-search-query" value={query} onChange={event=>setQuery(event.target.value)} placeholder={UI_COPY.search.textPlaceholder} aria-label={UI_COPY.search.textPromptLabel}/>
        <button type="submit">{UI_COPY.nav.search}</button>
        <button type="button" className="loc-button" onClick={clearSearchFilters}>{t('uiExtra.searchUI.clearAll')}</button>
      </form>
      <div className="scope-search-advanced">
        <button type="button" className="scope-search-advanced-toggle" aria-expanded={advancedOpen} aria-controls="scope-search-filter-panel" onClick={()=>setAdvancedOpen(value=>!value)}>
          <span><strong>{t('uiExtra.searchUI.advancedFilters')}</strong><small>{t('uiExtra.searchUI.advancedHelp')}</small></span>
          <span aria-hidden="true">{advancedOpen?'▴':'▾'}</span>
        </button>
        <div className="scope-search-active-filters" aria-live="polite">
          {chips.length?chips.map((chip,index)=><span className="scope-search-chip" key={index}>{chip}</span>):<span className="scope-search-chip is-muted">{t('uiExtra.searchUI.noFilters')}</span>}
        </div>
        {advancedOpen?<div id="scope-search-filter-panel" className="scope-search-filter-panel">
          <div role="tablist" className="scope-search-filter-tabs" aria-label={t('uiExtra.searchUI.advancedFilters')}>
            {['type','source','time'].map(tab=><button type="button" role="tab" key={tab} aria-selected={advancedTab===tab} className={advancedTab===tab?'is-active':''} onClick={()=>setAdvancedTab(tab)}>{t('uiExtra.searchUI.filter'+tab[0].toUpperCase()+tab.slice(1))}</button>)}
          </div>
          {advancedTab==='type'?<div role="tabpanel" className="scope-search-filter-body">
            <label htmlFor="scope-search-content-type">{t('uiExtra.searchUI.filterType')}</label>
            <select id="scope-search-content-type" value={contentType} onChange={event=>updateSearchFilter(setContentType,event.target.value)}>
              {filterTypes.map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
            <button type="button" className="loc-button" onClick={browseSelectedType}>{t('uiExtra.searchUI.browseType')}</button>
          </div>:null}
          {advancedTab==='source'?<div role="tabpanel" className="scope-search-filter-body">
            <label htmlFor="scope-search-source">{t('uiExtra.searchUI.filterSource')}</label>
            <select id="scope-search-source" value={sourceFilter} onChange={event=>updateSearchFilter(setSourceFilter,event.target.value)}>
              {filterSources.map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </div>:null}
          {advancedTab==='time'?<div role="tabpanel" className="scope-search-filter-body scope-search-date-fields">
            <label htmlFor="scope-search-start-date">{t('uiExtra.searchUI.startDate')}
              <input id="scope-search-start-date" type="date" value={startDate} onChange={event=>{setSelectedPeriod('');updateSearchFilter(setStartDate,event.target.value);}}/></label>
            <label htmlFor="scope-search-end-date">{t('uiExtra.searchUI.endDate')}
              <input id="scope-search-end-date" type="date" min={startDate||undefined} value={endDate} onChange={event=>{setSelectedPeriod('');updateSearchFilter(setEndDate,event.target.value);}}/></label>
            <label className="scope-search-period-field" htmlFor="scope-search-period">{t('uiExtra.searchUI.periodLabel')}
              <select id="scope-search-period" value={selectedPeriod} onChange={event=>{
                const id=event.target.value;
                const period=periodsQuery.data?.find(row=>row.id===id);
                setSelectedPeriod(id);setStartDate(period?.startDate||'');
                setEndDate(period?.endDate||'');resetSearchState();
              }}>
                <option value="">{t('uiExtra.searchUI.allPeriods')}</option>
                {(periodsQuery.data||[]).map(period=><option key={period.id} value={period.id}>{period.title}</option>)}
              </select>
            </label>
            {periodsQuery.isError?<span className="scope-status">{t('uiExtra.searchUI.periodUnavailable')}</span>:null}
          </div>:null}
        </div>:null}
      </div>
      <div className="scope-search-reference-editor">
        <ScopeEditableBlocks
          scopeId={scopeId}
          page="search"
          className="scope-search-reference-grid"
          slotClassName="loc-card scope-search-reference-block"
          editSlotClassName="loc-card scope-search-reference-block"
          headingLevel={2}
          allowEditing
        />
      </div>
    </section>
    <p className="scope-status">{status}</p>
    {error?<p className="scope-status scope-error">{error}</p>:null}
    {loadMoreError?<p role="alert" className="scope-status scope-error">{loadMoreError} <button type="button" className="loc-button" disabled={loadingMore} onClick={loadNextSearch}><UiText id="uiExtra.cultureView.reloadWorks"/></button></p>:null}
    <IncrementalList
      items={results}
      batchSize={pageSize}
      resetKey={matchedQueryRef.current+'|'+String(browseResults)}
      externalHasMore={hasMore}
      loading={loadingMore}
      error={error||loadMoreError}
      onLoadMore={loadNextSearch}
      renderItem={row=>{
        const rowScopeData=account.scopeDataFor(row.scopeId)||defaultScopeData(row.scopeId);
        const editableTable=row.editableTable||(
          row.resourceType==='galaxy'?rowScopeData?.galaxy:
          row.resourceType==='galaxy_media'?rowScopeData?.galaxyMedia:''
        );
        const editTarget={
          ...row,
          editableTable,
          editableIdColumn:row.editableIdColumn||(row.resourceType==='galaxy'?'uid':row.resourceType==='galaxy_media'?'media_id':''),
          editResourceId:row.editResourceId||row.resourceId,
          editableField:row.editableField||(row.resourceType==='galaxy'?'content':row.resourceType==='galaxy_media'?'meta_tags':'')
        };
        // Page blocks have no Galaxy attributes. Article editing and typed
        // metadata are available only to authorized Scope managers; guest
        // search and article reading cannot reveal metadata controls.
        const editable=Boolean(canManageSearchScope(account,row.scopeId)&&
          editTarget.resourceType&&editTarget.editableTable&&editTarget.editableIdColumn&&editTarget.editResourceId);
        const draft=editingKey===row.key?editDraft:null;
        return <Article
          key={row.key}
          uid={editTarget.editResourceId}
          title={row.title}
          source={row.styleTagMatch?'':row.source}
          scopeId={row.scopeId}
          date={row.date}
          body={draft?'':/<[a-z][^>]*>/i.test(String(row.snippet||''))?String(row.snippet):highlightSearchText(row.snippet,matchedQueryRef.current)}
          hidden={false}
          relationLinks={row.relationLinks||[]}
          links={row.links||[]}
          destinations={row.destinations}
          editable={editable}
          editing={editingKey===row.key}
          onEdit={uid=>startEditing({...editTarget,editResourceId:uid})}
          editorDraft={draft}
          onDraftChange={setEditDraft}
          onSave={()=>saveEditing(editTarget)}
          onDelete={()=>deleteEditing(editTarget)}
          onCancel={()=>{setEditingKey('');setEditDraft(null);setEditError('')}}
          editBusy={editBusy}
          editError={editError}
          showHidden={false}
          attributeFields={editable&&row.resourceType==='galaxy'?GALAXY_ATTR_FIELDS:null}
          styleTag={row.styleTagMatch}
          styleTagKicker={row.styleTagMatch?<UiText id="uiExtra.searchUI.styleRecommendations"/>:null}
          styleIntroText={row.styleIntroText}
        >
          {row.resourceType==='galaxy'&&editingKey!==row.key?<WorkFullText
            open={fullTextKey===row.key}
            loading={fullTextLoading&&fullTextKey===row.key}
            error={fullTextKey===row.key?fullTextError:''}
            content={fullTextKey===row.key?fullText:''}
            onToggle={()=>toggleFullText(row)}
            showToggle={!searchParams?.get('identity')}
          />:null}

        </Article>;
      }}
    />
  </FeaturePage>;
}
