'use client';
import FieldText from '../../i18n/FieldText';

import {UI_COPY,registerDefaultSection} from '../../i18n/ui-copy';
import {useUiCopy,useUiSection} from '../../i18n/ui-locale';
import UiText,{useUiText} from '../../i18n/UiText';
import searchZh from '../../i18n/sections/search.zh_tw.js';
import searchUIZh from '../../i18n/sections/uiExtra.searchUI.zh_tw.js';
import editBlocksZh from '../../i18n/sections/uiExtra.editBlocks.zh_tw.js';
import cultureViewZh from '../../i18n/sections/uiExtra.cultureView.zh_tw.js';
import paginationZh from '../../i18n/sections/uiExtra.pagination.zh_tw.js';
registerDefaultSection('search',searchZh);
registerDefaultSection('uiExtra.searchUI',searchUIZh);
registerDefaultSection('uiExtra.editBlocks',editBlocksZh);
registerDefaultSection('uiExtra.cultureView',cultureViewZh);
registerDefaultSection('uiExtra.pagination',paginationZh);

import {Fragment,useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useRouter,useSearchParams} from 'next/navigation';

import {deleteRows,updateRows} from '../../loc/db-client.mjs';
import {useAccount} from '../../loc/use-account';
import {FeaturePage,IncrementalList,WorkFullText} from '../ui';
import ScopeLink from '../ScopeLink';
// Article cards/editing are requested only when results actually render.
const Article=dynamic(()=>import('../Article'),{loading:()=>null});
import {useScopeRuntime} from '../use-scope-runtime';
import {useEditDock} from '../edit-dock';
import {scopeHref} from '../scope-registry';
import {featureNavigationHref,galaxyIdentityHref,galaxyRelationLinks} from '../feature-navigation';
import {featureDataErrorMessage} from '../feature-data-state';
import {parseSearchQuery} from '../../loc/search-query.mjs';
import {resolveGalaxyExternalLinks,searchGalaxyRows,hydrateGalaxySearchRows,selectGalaxyContent,selectGalaxyIdentity,selectStyleKeywordMatches} from '../../loc/galaxy-query';
import {defaultScopeData,selectLocSearchScopes,selectScopeRegistry} from '../../loc/scope-data';

import {MEDIA_FALLBACK_TITLE,WORK_FALLBACK_TITLE,workDisplayHeading,workDisplayText} from '../work-display-model';
import {requireGalaxyContent,resolveGalaxyTitle,assertPlainGalaxyAttributes} from '../../loc/content-policy';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/db-contract.mjs';
import {applyFilters,isAbortError,selectRows} from '../../loc/db-query.mjs';
const ScopeGroupOverview=dynamic(()=>import('../../loc/ScopeGroupOverview'),{loading:()=>null});
const ScopeEditableBlocks=dynamic(()=>import('../../loc/ScopeEditableBlocks'),{loading:()=>null});


const MEDIA_EDITOR_COLUMNS='media_id,galaxy_link,source_place,media_type,title,url,meta_tags,createtime,rune_references';
const MEDIA_ATTR_ORDER=['media_id','galaxy_link','source_place','media_type','url','meta_tags','createtime','rune_references'];
const MEDIA_ATTR_FIELDS=MEDIA_ATTR_ORDER.map(key=>({key,readOnly:key==='media_id',kind:key==='createtime'?'date':key==='rune_references'?'multiline':'text'}));

const GALAXY_EDITOR_COLUMNS='uid,title,content,createtime,source_place,searchable,UpdateTime,url,source_id,target_id,ref_id,source_name,media_link,statistics_able,class_id,group_lists';

const GALAXY_ATTR_ORDER=Object.freeze([
  'uid','title','content','createtime','source_place',
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
  const terms=[...new Set([parseSearchQuery(raw).exact,...parseSearchQuery(raw).terms].filter(Boolean))].sort((a,b)=>b.length-a.length);if(!terms.length)return source;
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
    row.media_type?(copy.search.typePrefix+row.media_type):''
  ].map(value=>workDisplayText(value||'').trim()).filter(Boolean).join(' · ');
  const body=row.style_keyword_tag?'':isMedia
    ?(mediaMetadata||(bodyField?workDisplayText(row[bodyField]):text))
    :(isGalaxy?Array.from(String(workDisplayText(row.summary||row.excerpt||title)||'').replace(/\s+/g,' ').trim()).slice(0,96).join(''):(bodyField?workDisplayText(row[bodyField]):text));
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
    dedupeKey:resourceType==='galaxy'&&typeof row.content==='string'
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
    links:uniqueExternalLinks([...(href?[{id:resourceType||'primary',href,label:resourceType==='galaxy_media'?copy.search.mediaLink:copy.search.externalLink}]:[]),...(Array.isArray(row.resolved_links)?row.resolved_links:[])]),
    destinations:[]
  };
}


function uniqueExternalLinks(links=[]){
  const byHref=new Map();
  for(const link of links){
    const href=String(link?.href||'').trim();
    if(!/^https?:\/\//i.test(href))continue;
    const prior=byHref.get(href);
    if(!prior||([UI_COPY.search.externalLink,UI_COPY.search.mediaLink].includes(prior.label)&&![UI_COPY.search.externalLink,UI_COPY.search.mediaLink].includes(link.label)))byHref.set(href,link);
  }
  return [...byHref.values()];
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
      links:uniqueExternalLinks(uniqueLinks),
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
    from:filters.startDate,to:filters.endDate,period:filters.selectedPeriod,scope:filters.scopeFilter
  })){
    if(value)params.set(key,value);
  }
  return href+(params.size?(href.includes('?')?'&':'?')+params.toString():'');
}


export default function Search({managementMode=false}){
  useUiSection('search');
  useUiSection('uiExtra.searchUI');
  useUiSection('uiExtra.editBlocks');
  useUiSection('uiExtra.cultureView');
  useUiSection('uiExtra.pagination');
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const {scopeId,scope}=useScopeRuntime();
  const editDock=useEditDock();
  const account=useAccount({enabled:managementMode});
  const managementAuthorized=Boolean(managementMode&&account.user&&!account.loading&&!account.permissionLoading&&
    (scopeId==='loc'?(account.canManageGlobalSync()||account.scopes.length>0):canManageSearchScope(account,scopeId)));
  const searchParams=useSearchParams();
  const router=useRouter();
  const queryClient=useQueryClient();
  const [query,setQuery]=useState('');
  const [advancedOpen,setAdvancedOpen]=useState(false);
  const [advancedTab,setAdvancedTab]=useState('type');
  const [contentType,setContentType]=useState('');
  const [sourceFilter,setSourceFilter]=useState('');
  const [scopeFilter,setScopeFilter]=useState('');
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
  const editTargetRef=useRef(null);
  const dockActions=useRef({save:null,discard:null});
  const [editDraft,setEditDraft]=useState(null);
  const [editBusy,setEditBusy]=useState(false);
  const [editError,setEditError]=useState('');
  const [fullTextKey,setFullTextKey]=useState('');
  const [fullText,setFullText]=useState('');
  const [fullTextRow,setFullTextRow]=useState(null);
  // A guest can see Edit; authorization is requested only after the click.
  const [authorizedEditingKey,setAuthorizedEditingKey]=useState('');
  const [fullTextError,setFullTextError]=useState('');
  const [fullTextLoading,setFullTextLoading]=useState(false);
  const searchId=useRef(0);
  // Anchors the status/results block so a fresh search can scroll the
  // results into view instead of leaving the viewport on the search form.
  const resultsRef=useRef(null);
  const scrollPending=useRef(false);
  // The results list is not rendered yet when a search resolves, so the page is
  // still too short to scroll; flag it and scroll once the new results are committed.
  function scrollToResults(){scrollPending.current=true;}
  // Every search owns an AbortController; a newer search, a reset or unmount
  // cancels the previous one so superseded requests stop instead of piling up.
  const abortRef=useRef(null);
  const beginRequest=()=>{
    abortRef.current?.abort();
    const controller=new AbortController();
    abortRef.current=controller;
    return controller;
  };
  useEffect(()=>()=>{abortRef.current?.abort();},[]);
  useEffect(()=>{
    if(!scrollPending.current)return;
    scrollPending.current=false;
    resultsRef.current?.scrollIntoView({block:'start',behavior:'smooth'});
  },[results,status,error]);
  const loadMoreInFlight=useRef(false);
  const matchedQueryRef=useRef('');
  const pageSize=DEFAULT_LIST_BATCH_SIZE;
  // LOC searches only active content trees with search_able enabled.
  // A tree's own Search page stays separate from LOC's aggregate scope filter.
  const aggregateScopes=Boolean(scope?.aggregateChildren&&scopeId!=='loc');
  const scopesQuery=useQuery({
    queryKey:managementMode?['management-search-scopes',account.email]:['loc-searchable-scopes'],
    queryFn:managementMode?()=>selectScopeRegistry({scopeKind:'scope'}):selectLocSearchScopes,
    enabled:scopeId==='loc'&&!aggregateScopes&&(!managementMode||managementAuthorized),
    staleTime:5*60_000
  });
  const availableScopes=useMemo(()=>{
    if(scopeId!=='loc')return [account.scopeDataFor(scopeId)||defaultScopeData(scopeId)].filter(Boolean);
    if(!managementMode)return scopesQuery.data||[];
    return (scopesQuery.data||[])
      .filter(item=>item.active&&item.scope_kind==='scope'&&canManageSearchScope(account,item.scope_id))
      .map(item=>{
        const data=account.scopeDataFor(item.scope_id)||defaultScopeData(item.scope_id);
        return data?{...data,display_name:String(item.display_name||item.scope_id)}:null;
      }).filter(Boolean);
  },[scopeId,scopesQuery.data,managementMode,account.authorizer]);
  const targetScopes=useMemo(()=>scopeId==='loc'&&scopeFilter
    ?availableScopes.filter(item=>item.id===scopeFilter)
    :availableScopes,[scopeId,scopeFilter,availableScopes]);
  const scopeById=useMemo(()=>new Map(availableScopes.map(item=>[item.id,item])),[availableScopes]);
  const scopeLabel=id=>{
    const item=scopeById.get(id);
    return item?`${item.display_name||id}(${id})`:id;
  };
  // Results are displayed per tree, while preserving the existing per-tree
  // result order and the incremental database pagination.
  const orderedResults=useMemo(()=>{
    if(scopeId!=='loc')return results;
    const order=new Map(availableScopes.map((item,index)=>[item.id,index]));
    return results.map((row,index)=>({row,index}))
      .sort((a,b)=>(order.get(a.row.scopeId)??Infinity)-(order.get(b.row.scopeId)??Infinity)||a.index-b.index)
      .map(item=>item.row);
  },[results,scopeId,availableScopes]);
  const collectionLabel=scopeId==='loc'?UI_COPY.search.allContent:String(scope?.label||scopeId);
  const periodScope=scopeId==='loc'
    ?targetScopes.find(item=>item.id==='lo3rwang')||targetScopes[0]
    :targetScopes[0];
  const periodsQuery=useQuery({
    queryKey:['search-period-options',periodScope?.id],
    enabled:advancedOpen&&advancedTab==='time'&&!aggregateScopes&&Boolean(periodScope?.time),
    queryFn:async()=>{
      // The Culture/Time query module is needed only when advanced time filtering opens.
      const {selectCultureTimeRows}=await import('../../loc/culture-query');
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
      :(overrideOptions||{contentType,sourceFilter,startDate,endDate,scopeFilter,mediaOnly:false,browse});
    if(!q&&!options.browse)return;
    const searchScopes=scopeId==='loc'&&options.scopeFilter
      ?availableScopes.filter(item=>item.id===options.scopeFilter)
      :availableScopes;
    if(scopeId==='loc'&&options.scopeFilter&&!searchScopes.length){
      setError(t('uiExtra.searchUI.scopeUnavailable'));return;
    }
    const searchCollectionLabel=scopeId==='loc'&&options.scopeFilter
      ?scopeLabel(options.scopeFilter):collectionLabel;
    if(options.startDate&&options.endDate&&options.startDate>options.endDate){
      setError(t('uiExtra.searchUI.invalidDateRange'));return;
    }
    if(!append){activeSearchOptionsRef.current=options;setBrowseResults(options.browse);}

    const id=++searchId.current;
    const controller=beginRequest();
    const {signal}=controller;
    // A fresh search supersedes any in-flight style-keyword fetch for the same key.
    if(!append)queryClient.cancelQueries({queryKey:['search-style-keyword']});
    setError('');
    if(append){
      setLoadMoreError('');
      setLoadingMore(true);
    }else{
      // A fresh query must clear any pagination state left by the previous one.
      loadMoreInFlight.current=false;
      setLoadingMore(false);
      setLoadMoreError('');
      setEditingKey('');setEditDraft(null);
      setFullTextKey('');setFullText('');setFullTextRow(null);setFullTextError('');
      matchedQueryRef.current='';
      setHasMore(false);
      setNextCursor(null);
      setResults([]);
      setStatus(UI_COPY.format.searchScope(searchCollectionLabel));
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
          scrollToResults();
          return;
        }
      }
      const wantsStyleTags=!managementMode&&!append&&!options.browse&&!options.mediaOnly&&!options.contentType&&!options.sourceFilter&&!options.startDate&&!options.endDate;
      // Start the primary search first so it takes the first connection slot, then
      // run the cross-Scope style-tag lookup alongside it instead of in front of it.
      const searchPromise=searchGalaxyRows(searchScopes,q,{
        limit:pageSize,
        // Always search article providers, including when the same keyword
        // exactly matches a style tag.
        cursor,
        mediaOnly:options.mediaOnly,hiddenScopeIds:managementMode?searchScopes.map(item=>item.id):[],
        contentType:options.contentType,sourceFilter:options.sourceFilter,
        startDate:options.startDate,endDate:options.endDate,browse:options.browse,
        signal
      });
      const stylePromise=wantsStyleTags
        ?queryClient.fetchQuery({
          queryKey:['search-style-keyword',searchScopes.map(scope=>scope.id).join('|'),q.normalize('NFKC').trim()],
          queryFn:()=>selectStyleKeywordMatches(searchScopes,q,{signal}),
          staleTime:60_000
        })
        :Promise.resolve([]);
      const [styleTagMatches,search]=await Promise.all([stylePromise,searchPromise]);
      if(id!==searchId.current)return;

      const searchRows=await hydrateGalaxySearchRows(search.rows||[],searchScopes,managementMode?searchScopes.map(item=>item.id):[],{signal});
      if(id!==searchId.current)return;
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
        const resolved=await resolveGalaxyExternalLinks(scopeData,rows,{signal});
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
      if(!append){
        setStatus(options.browse?t('uiExtra.searchUI.browsingResults'):UI_COPY.format.searchResult({label:'「'+searchCollectionLabel+'」',query:q,hasMore:search.hasMore,partial}));
        scrollToResults();
      }
    }catch(exception){
      if(id!==searchId.current||isAbortError(exception))return;
      if(append){
        setLoadMoreError(featureDataErrorMessage(exception,UI_COPY));
      }else{
        setError(featureDataErrorMessage(exception,UI_COPY));
        setStatus(UI_COPY.search.failed);
        scrollToResults();
      }
    }finally{
      if(append&&id===searchId.current)setLoadingMore(false);
    }
  }

  async function loadNextSearch(){
    const q=matchedQueryRef.current||query.trim();
    if((!q&&!activeSearchOptionsRef.current?.browse)||!hasMore||loadMoreInFlight.current||nextCursor===null)return;
    loadMoreInFlight.current=true;
    try{await executeSearch(q,nextCursor,{append:true,browse:activeSearchOptionsRef.current?.browse});}
    finally{loadMoreInFlight.current=false;}
  }

  async function executeIdentity(rawIdentity){
    const identity=String(rawIdentity||'').trim();
    if(!identity)return;
    const id=++searchId.current;
    beginRequest();
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
      setStatus('');
    }catch(exception){
      if(id!==searchId.current)return;
      setResults([]);setError(featureDataErrorMessage(exception,UI_COPY));setStatus(UI_COPY.search.relationFailed);
    }finally{
      if(id===searchId.current)setFullTextLoading(false);
    }
  }

  async function executeMediaIdentity(rawMediaId){
    const mediaId=String(rawMediaId||'').trim(),id=++searchId.current;
    beginRequest();
    setError('');setStatus('');setResults([]);setEditDraft(null);setEditingKey('');
    setHasMore(false);setNextCursor(null);setFullText('');setFullTextRow(null);
    try{
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaId))throw new Error(t('uiExtra.searchUI.invalidMediaId'));
      const mediaScopeId=managementMode&&scopeId==='loc'?String(searchParams?.get('scope')||'').trim():scopeId;
      if(!managementMode||!mediaScopeId||!canManageSearchScope(account,mediaScopeId))throw new Error(t('uiExtra.searchUI.mediaManageDenied'));
      const scopeData=account.scopeDataFor(mediaScopeId)||defaultScopeData(mediaScopeId);
      if(!scopeData?.galaxyMedia)throw new Error(UI_COPY.search.notFound);
      const row=await selectPublicEditableRow(scopeData.galaxyMedia,'media_id',mediaId,MEDIA_EDITOR_COLUMNS,{authenticated:true});
      if(id!==searchId.current)return;
      if(!row)throw new Error(UI_COPY.search.notFound);
      const item=toResult({...row,scope_id:mediaScopeId,__table:scopeData.galaxyMedia},'Galaxy Media',mediaScopeId);
      const {SearchEditDraft}=await import('./search-edit-draft');
      setResults([item]);setEditingKey(item.key);setEditDraft(SearchEditDraft.fromRow('media',row,item.title));
    }catch(exception){if(id===searchId.current)setError(String(exception?.message||exception||UI_COPY.search.editLoadFailed))}
  }

  useEffect(()=>{
    if(managementMode&&!managementAuthorized)return;
    if(scopeId==='loc'&&!scopesQuery.isSuccess)return;
    const identity=String(searchParams?.get('identity')||'').trim();
    const media=String(searchParams?.get('media')||'').trim();
    if(media){setQuery('');executeMediaIdentity(media);return;}
    const value=String(searchParams?.get('q')||'').trim();
    if(identity){setQuery('');executeIdentity(identity);return;}
    const filters={
      contentType:String(searchParams?.get('type')||''),
      sourceFilter:String(searchParams?.get('source')||''),
      startDate:String(searchParams?.get('from')||''),
      endDate:String(searchParams?.get('to')||''),
      selectedPeriod:String(searchParams?.get('period')||''),
      scopeFilter:String(searchParams?.get('scope')||'')
    };
    setContentType(filters.contentType);setSourceFilter(filters.sourceFilter);
    setStartDate(filters.startDate);setEndDate(filters.endDate);setSelectedPeriod(filters.selectedPeriod);setScopeFilter(filters.scopeFilter);
    if(value){setQuery(value);executeSearch(value,null,{overrideOptions:{...filters,mediaOnly:false,browse:false}});}
  },[searchParams,scopeId,scopesQuery.isSuccess,scopesQuery.data,managementMode,managementAuthorized]);



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
      // The public Search/正文 view never probes silver.loc just to show Edit.
      // Management Search already checks its entrance. Public readers are
      // verified on the actual Edit action, never on opening article text.
      if(!managementMode){
        const verified=await account.refresh();
        if(!verified?.authorizer?.canManageScopeSync(result.scopeId)){
          throw new Error('請先登入具有此 Scope 編輯權限的帳號。');
        }
        setAuthorizedEditingKey(result.key);
      }
      const cached=result.resourceType==='galaxy'&&fullTextKey===result.key&&fullTextRow?.uid
        ?fullTextRow
        :null;
      const fullRow=cached||await selectPublicEditableRow(
        result.editableTable,
        result.editableIdColumn,
        result.editResourceId||result.resourceId,
        result.resourceType==='galaxy'?GALAXY_EDITOR_COLUMNS:MEDIA_EDITOR_COLUMNS,
        {authenticated:result.resourceType==='galaxy'}
      );
      if(!fullRow)throw new Error(UI_COPY.search.editNotFound);
      const {SearchEditDraft}=await import('./search-edit-draft');
      editTargetRef.current=result;
      setEditDraft(SearchEditDraft.fromRow(result.resourceType,fullRow,result.title));
      if(managementMode)editDock?.begin(scopeId);
    }catch(exception){
      setEditingKey('');
      setAuthorizedEditingKey('');
      const message=String(exception?.message||exception||UI_COPY.search.editLoadFailed);
      setEditError(message);
      if(!managementMode)setFullTextError(message);
    }
  }
  async function saveEditing(result){
    if(!editDraft||!result?.editableTable||!result.editableField||editBusy)return;
    setEditBusy(true);setEditError('');
    try{
      const isGalaxy=result.resourceType==='galaxy';
      const {SearchEditDraft}=await import('./search-edit-draft');
      const {blocksToPlainText}=isGalaxy?await import('../../loc/blocknote-content.mjs'):{blocksToPlainText:null};
      const body=isGalaxy?await requireGalaxyContent(editDraft.bodyHtml??blocksToPlainText(editDraft.bodyBlocks)):'';
      const nextTitle=isGalaxy?resolveGalaxyTitle(editDraft.title,blocksToPlainText(editDraft.bodyHtml??editDraft.bodyBlocks)):SearchEditDraft.nullableText(editDraft.title);
      const titleChanged=editDraft.title!==editDraft.originalTitle;
      let contentPatch;
      if(isGalaxy){
        const rawEdits=Object.fromEntries(Object.entries(editDraft.attrs||{})
          .filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(editDraft.originalAttrs?.[key])));
        assertPlainGalaxyAttributes({...rawEdits,...(titleChanged?{title:editDraft.title}:{})});
        const attrs=SearchEditDraft.changedAttributes('galaxy',editDraft,t);
        assertPlainGalaxyAttributes({...attrs,...(titleChanged?{title:nextTitle}:{})});
        contentPatch={...(titleChanged?{title:nextTitle}:{}),content:body,UpdateTime:new Date().toISOString(),...attrs};
      }else{
        const attrs=SearchEditDraft.changedAttributes('media',editDraft,t);
        const {rune_references,...plainAttrs}=attrs;
        assertPlainGalaxyAttributes({...plainAttrs,...(titleChanged?{title:nextTitle}:{})});
        contentPatch={...(titleChanged?{title:nextTitle}:{}),...attrs};
        if(!Object.keys(contentPatch).length){
          setEditingKey('');setEditDraft(null);editDock?.end();return;
        }
      }
      await updateRows(result.editableTable,contentPatch,{filters:[{column:result.editableIdColumn,operator:'eq',value:result.editResourceId||result.resourceId}]});
      setResults(current=>current.map(item=>{
        if(item.key!==result.key)return item;
        const updatedUrl=Object.hasOwn(contentPatch,'url')?contentPatch.url:item.editRow?.url;
        const links=!isGalaxy&&Object.hasOwn(contentPatch,'url')?uniqueExternalLinks(updatedUrl?[{id:'media-url',href:updatedUrl,label:UI_COPY.search.mediaLink}]:[]):item.links;
        return {...item,title:nextTitle||item.title,snippet:isGalaxy?'':item.snippet,links,
          editRow:{...(item.editRow||{}),title:nextTitle,...contentPatch}};
      }));
      if(isGalaxy&&fullTextKey===result.key){
        setFullText(body);
        setFullTextRow(current=>({...current,...contentPatch,uid:current?.uid||result.editResourceId||result.resourceId}));
      }
      setEditingKey('');setEditDraft(null);setAuthorizedEditingKey('');setStatus('');
      // Article save stays on the management-search workspace.
      if(managementMode)editDock?.end();
    }catch(exception){
      const message=String(exception?.message||exception||UI_COPY.search.saveFailed);
      setEditError(message);
      if(editDock?.active)editDock.setNotice(message);
    }
    finally{setEditBusy(false)}
  }
  async function deleteEditing(result){
    if(!result?.editableTable||!result?.editableIdColumn||!result?.editResourceId)return;
    setEditBusy(true);setEditError('');
    try{
      await deleteRows(result.editableTable,{filters:[{column:result.editableIdColumn,operator:'eq',value:result.editResourceId}]});
      setResults(current=>current.filter(item=>item.key!==result.key));
      if(fullTextKey===result.key){setFullTextKey('');setFullText('');setFullTextRow(null);}
      setEditingKey('');setEditDraft(null);setAuthorizedEditingKey('');
      setStatus(t('uiExtra.editBlocks.deleted'));
    }catch(exception){
      setEditError(String(exception?.message||exception||t('uiExtra.editBlocks.deleteFailed')));
    }finally{setEditBusy(false)}
  }

  function resetSearchState(){
    ++searchId.current;
    abortRef.current?.abort();
    loadMoreInFlight.current=false;
    setLoadingMore(false);
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
    setQuery('');setContentType('');setSourceFilter('');setScopeFilter('');
    setStartDate('');setEndDate('');setSelectedPeriod('');setAdvancedOpen(false);
    resetSearchState();
    router.replace(managementMode?scopeHref(scopeId,'governance/manage/search'):featureNavigationHref(scopeId,'search'));
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
    scopeId==='loc'&&scopeFilter&&scopeLabel(scopeFilter),
    contentType&&filterTypes.find(([value])=>value===contentType)?.[1],
    sourceFilter&&filterSources.find(([value])=>value===sourceFilter)?.[1],
    startDate&&t('uiExtra.searchUI.startDate')+': '+startDate,
    endDate&&t('uiExtra.searchUI.endDate')+': '+endDate,
    selectedPeriod&&periodsQuery.data?.find(item=>item.id===selectedPeriod)?.title
  ].filter(Boolean);
  function workspaceSearchHref(term,filters={}){
    const href=searchHref(scopeId,term,filters);
    if(!managementMode)return href;
    const normal=new URL(href);
    const manager=new URL(scopeHref(scopeId,'governance/manage/search'));
    for(const [key,value] of normal.searchParams){
      if(key!=='scopeid')manager.searchParams.set(key,value);
    }
    return manager.href;
  }
  async function runSearch(event){
    event.preventDefault();
    const term=String(query||'').trim();
    if(!term)return;
    // Keep the keyword in the URL and input so a style-to-style link is a
    // reproducible next search, not a transient single-page interaction.
    const url=workspaceSearchHref(term,{contentType,sourceFilter,startDate,endDate,selectedPeriod,scopeFilter});
    const current=workspaceSearchHref(String(searchParams?.get('q')||'').trim(),{
      contentType:searchParams?.get('type'),sourceFilter:searchParams?.get('source'),
      startDate:searchParams?.get('from'),endDate:searchParams?.get('to'),selectedPeriod:searchParams?.get('period'),scopeFilter:searchParams?.get('scope')
    });
    if(url!==current||searchParams?.get('identity')){router.push(url,{scroll:false});return;}
    await executeSearch(term);
  }

  dockActions.current={
    save:()=>saveEditing(editTargetRef.current),
    discard:()=>{setEditingKey('');setEditDraft(null);setEditError('')}
  };
  useEffect(()=>{
    if(!managementMode||!editingKey||!editDraft||!editDock?.active)return undefined;
    return editDock.register({
      save:()=>dockActions.current.save(),
      discard:()=>dockActions.current.discard()
    });
  },[managementMode,editingKey,Boolean(editDraft),editDock?.active,editDock?.register]);

  if(managementMode&&!managementAuthorized)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card">
      {account.loading||account.permissionLoading
        ?<p role="status">正在確認管理權限…</p>
        :!account.user
          ?<><p>搜尋管理需要登入。</p><ScopeLink className="loc-button primary" href="/local/settings/?section=account">前往登入</ScopeLink></>
          :<p>目前帳號沒有這個 Scope 的搜尋管理權限。</p>}
    </section>
  </FeaturePage>;
  if(aggregateScopes)return <FeaturePage featureId="search">
    <ScopeGroupOverview
      scopeId={scopeId}
      featureId="search"
      title={t('uiExtra.searchUI.memberSearch')}
      description=""
    />
  </FeaturePage>;

  const pageContent=<>
    <section className="scope-search-workspace" aria-label={t('uiExtra.searchUI.searchWorkspace')}>
      <form className="scope-search-form" onSubmit={runSearch}>
        {!managementMode?<label htmlFor="scope-search-query">{UI_COPY.search.textPromptLabel}</label>:null}
        <input id="scope-search-query" value={query} onChange={event=>setQuery(event.target.value)}
          placeholder={managementMode?'':UI_COPY.search.textPlaceholder} aria-label={UI_COPY.search.textPromptLabel}/>
        <button type="submit" disabled={scopeId==='loc'&&!scopesQuery.isSuccess}>{UI_COPY.nav.search}</button>
        <button type="button" className="loc-button" onClick={clearSearchFilters}>{t('uiExtra.searchUI.clearAll')}</button>
      </form>
      {scopeId==='loc'?<div className="scope-search-scope-filter">
        <label htmlFor="scope-search-scope">{t('uiExtra.searchUI.scopeFilter')}</label>
        <select id="scope-search-scope" value={scopeFilter}
          disabled={!scopesQuery.isSuccess}
          onChange={event=>{setSelectedPeriod('');updateSearchFilter(setScopeFilter,event.target.value);}}>
          <option value="">{t('uiExtra.searchUI.allScopes')}</option>
          {availableScopes.map(item=><option key={item.id} value={item.id}>{scopeLabel(item.id)}</option>)}
        </select>
        {scopesQuery.isError?<span role="alert" className="scope-status scope-error">{t('uiExtra.searchUI.scopeUnavailable')}</span>:null}
      </div>:null}
      <div className="scope-search-advanced">
        <button type="button" className="scope-search-advanced-toggle" aria-expanded={advancedOpen} aria-controls="scope-search-filter-panel" onClick={()=>setAdvancedOpen(value=>!value)}>
          <span><strong>{t('uiExtra.searchUI.advancedFilters')}</strong>{!managementMode?<small>{t('uiExtra.searchUI.advancedHelp')}</small>:null}</span>
          <span aria-hidden="true">{advancedOpen?'▴':'▾'}</span>
        </button>
        <div className="scope-search-active-filters" aria-live="polite">
          {chips.length?chips.map((chip,index)=><span className="scope-search-chip" key={index}>{chip}</span>):!managementMode?<span className="scope-search-chip is-muted">{t('uiExtra.searchUI.noFilters')}</span>:null}
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
    {!managementMode&&scopeId!=='loc'?<div className="scope-search-reference-editor">
      <ScopeEditableBlocks
        scopeId={scopeId}
        page="search"
        orders={[1]}
        className="scope-search-reference-grid"
        slotClassName="scope-search-reference-block"
        editSlotClassName="scope-search-reference-block"
        headingLevel={2}
        allowEditing={false}
        allowDelete={false}
        allowInlineChildAdd
        explicitEditButton
        onSuggestionClick={term=>router.push(searchHref(scopeId,term,{scopeFilter}))}
      />
    </div>:null}
    </section>
    <div ref={resultsRef} className="scope-search-results">
    {status&&(!managementMode||status!==UI_COPY.search.start)?<p className="scope-status">{status}</p>:null}
    {error?<p className="scope-status scope-error">{error}</p>:null}
    {loadMoreError?<p role="alert" className="scope-status scope-error">{loadMoreError} <button type="button" className="loc-button" disabled={loadingMore} onClick={loadNextSearch}><UiText id="uiExtra.cultureView.reloadWorks"/></button></p>:null}
    <IncrementalList
      items={orderedResults}
      batchSize={pageSize}
      resetKey={matchedQueryRef.current+'|'+String(browseResults)+'|'+scopeFilter}
      externalHasMore={hasMore}
      loading={loadingMore}
      error={error||loadMoreError}
      onLoadMore={loadNextSearch}
      renderItem={(row,index)=>{
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
        const canOfferEdit=Boolean(editTarget.resourceType==='galaxy'&&editTarget.editableTable&&
          editTarget.editableIdColumn&&editTarget.editResourceId);
        const editable=Boolean(
          (managementMode&&canManageSearchScope(account,row.scopeId)&&editTarget.resourceType&&editTarget.editableTable&&editTarget.editableIdColumn&&editTarget.editResourceId)
          ||(canOfferEdit&&authorizedEditingKey===row.key)
        );
        const draft=editingKey===row.key?editDraft:null;
        return <Fragment key={row.key}>
          {scopeId==='loc'&&(index===0||orderedResults[index-1]?.scopeId!==row.scopeId)
            ?<h2 className="scope-search-scope-heading">{scopeLabel(row.scopeId)}</h2>:null}
        <Article
          key={row.key}
          editOnCardClick={!managementMode}
          managerMode={managementMode}
          uid={editTarget.editResourceId}
          title={row.title}
          source={row.styleTagMatch?'':row.source}
          scopeId={row.scopeId}
          date={row.date}
          body={draft?'':row.resourceType==='galaxy_media'?'':/<[a-z][^>]*>/i.test(String(row.snippet||''))?String(row.snippet):highlightSearchText(row.snippet,matchedQueryRef.current)}
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
          onCancel={()=>{setEditingKey('');setEditDraft(null);setAuthorizedEditingKey('');setEditError('')}}
          editBusy={editBusy}
          editError={editError}
          showInlineEditorActions={!editDock?.active}
          showHidden={managementMode}
          attributeFields={editable?(row.resourceType==='galaxy'?GALAXY_ATTR_FIELDS:row.resourceType==='galaxy_media'?MEDIA_ATTR_FIELDS:null):null}
          mediaScopeId={editable&&row.resourceType==='galaxy'?row.scopeId:''}
          attributeTitle={row.resourceType==='galaxy_media'?t('uiExtra.searchUI.mediaAttributes'):t('uiExtra.searchUI.attributeTitle')}
          showBodyEditor={row.resourceType==='galaxy'}
          styleTag={row.styleTagMatch}
          styleTagKicker={row.styleTagMatch?<UiText id="uiExtra.searchUI.styleRecommendations"/>:null}
          styleIntroText={row.styleIntroText}
        >
          {managementMode&&editable&&editingKey!==row.key?<div className="scope-work-fulltext-row">
            <button type="button" className="loc-button scope-work-edit-button" onClick={()=>startEditing(editTarget)}>
              {row.resourceType==='galaxy'?'展開內文並編輯':'編輯媒體連結'}
            </button>
          </div>:!managementMode&&row.resourceType==='galaxy'&&editingKey!==row.key?<div className="scope-work-fulltext-row">
            <WorkFullText
              open={fullTextKey===row.key}
              loading={fullTextLoading&&fullTextKey===row.key}
              error={fullTextKey===row.key?fullTextError:''}
              content={fullTextKey===row.key?fullText:''}
              onToggle={()=>toggleFullText(row)}
              showToggle={!searchParams?.get('identity')}
            />
            {fullTextKey===row.key&&canOfferEdit?<button type="button" className="loc-button scope-work-edit-button"
              onClick={()=>startEditing(editTarget)}>
              <UiText id="uiExtra.editBlocks.edit"/>
            </button>:null}
          </div>:null}

        </Article>
        </Fragment>;
      }}
    />
    </div>
  </>;
  return managementMode?pageContent:<FeaturePage featureId="search">{pageContent}</FeaturePage>;
}

