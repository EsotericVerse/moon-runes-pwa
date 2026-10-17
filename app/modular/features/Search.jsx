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
import {MEDIA_FALLBACK_TITLE,WORK_FALLBACK_TITLE,workDisplayHeading,workDisplayText} from '../work-display-model';
import {requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/list-loading-contract.mjs';
import {applyFilters,selectRows} from '../../loc/db-query.mjs';
import {blocksToPlainText,plainTextToBlocks} from '../../loc/blocknote-content.mjs';
import ScopeGroupOverview from '../../loc/ScopeGroupOverview';


const GALAXY_EDITOR_COLUMNS='uid,title,content,createtime,source_native_id,source_place,searchable,UpdateTime,url,source_id,target_id,ref_id,source_name,media_link,statistics_able,class_id,group_lists';

const GALAXY_ATTR_ORDER=Object.freeze([
  'uid','title','content','createtime','source_native_id','source_place',
  'searchable','UpdateTime','url','source_id','target_id','ref_id','source_name',
  'media_link','statistics_able','class_id','group_lists'
]);

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
function jsonText(value){
  try{return JSON.stringify(value??false,null,2)}catch{return String(value??'')}
}
function parseJsonAttr(value,t){
  const text=String(value??'').trim();
  if(!text)return false;
  try{return JSON.parse(text)}catch{throw new Error(t('uiExtra.searchUI.groupListInvalid'))}
}
function attrDisplayValue(key,value,t){
  if(key==='content')return t('uiExtra.searchUI.attrShown');
  if(Array.isArray(value))return value.length?value.join(', '):'[]';
  if(value&&typeof value==='object')return jsonText(value);
  if(value===null||value===undefined||value==='')return 'null';
  if(typeof value==='boolean')return value?'true':'false';
  return String(value).trim();
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
    group_lists:jsonText(row.group_lists)
  };
  const body=String(row.content??'');
  return {
    title:String(row.title??fallbackTitle??''),
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
  if(differs('group_lists'))changed.group_lists=parseJsonAttr(current.group_lists,t);
  return changed;
}

function GalaxyAttrSummary({row}){
  const t=useUiText();
  if(!row)return null;
  return <details className="scope-search-attr-panel">
    <summary><UiText id="uiExtra.searchUI.attributeTitle"/></summary>
    <dl className="scope-search-attr-grid">
      {GALAXY_ATTR_ORDER.map(key=><div key={key}>
        <dt>{key}</dt>
        <dd>{attrDisplayValue(key,row[key],t)}</dd>
      </div>)}
    </dl>
  </details>;
}

function GalaxyAttrEditor({draft,setDraft}){
  const t=useUiText();
  const attrs=draft?.attrs||{};
  const change=(key,value)=>setDraft(current=>({...current,attrs:{...(current?.attrs||{}),[key]:value}}));
  return <details className="scope-search-attr-panel">
    <summary><UiText id="uiExtra.searchUI.attributeTitle"/></summary>
    <div className="scope-management-fields scope-search-attr-editor">
      <label><span>createtime</span><input type="datetime-local" value={attrs.createtime||''} onChange={event=>change('createtime',event.target.value)}/></label>
      <label><span>source_native_id</span><input value={attrs.source_native_id||''} onChange={event=>change('source_native_id',event.target.value)}/></label>
      <label><span>source_place</span><input value={attrs.source_place||''} onChange={event=>change('source_place',event.target.value)}/></label>
      <label><span>url</span><input value={attrs.url||''} onChange={event=>change('url',event.target.value)}/></label>
      <label><span>source_id</span><input value={attrs.source_id||''} onChange={event=>change('source_id',event.target.value)}/></label>
      <label><span>ref_id</span><input value={attrs.ref_id||''} onChange={event=>change('ref_id',event.target.value)}/></label>
      <label><span>source_name</span><input value={attrs.source_name||''} onChange={event=>change('source_name',event.target.value)}/></label>
      <label><span>class_id</span><input type="number" value={attrs.class_id??''} onChange={event=>change('class_id',event.target.value)}/></label>
      <label><span>statistics_able</span><input type="checkbox" checked={attrs.statistics_able!==false} onChange={event=>change('statistics_able',event.target.checked)}/></label>
      <label className="scope-management-wide-field"><span>target_id[]</span><textarea rows={3} value={attrs.target_id||''} onChange={event=>change('target_id',event.target.value)} placeholder={t('uiExtra.searchUI.uuidHint')}/></label>
      <label className="scope-management-wide-field"><span>media_link[]</span><textarea rows={3} value={attrs.media_link||''} onChange={event=>change('media_link',event.target.value)} placeholder={t('uiExtra.searchUI.mediaUuidHint')}/></label>
      <label className="scope-management-wide-field"><span>group_lists (JSON)</span><textarea rows={5} value={attrs.group_lists||''} onChange={event=>change('group_lists',event.target.value)}/></label>
    </div>
  </details>;
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

async function selectPublicEditableRow(table,idColumn,id,columns){
  const {rows=[]}=await selectRows(table,{
    columns,
    filters:[{column:idColumn,operator:'eq',value:String(id)}],
    limit:1
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

export default function Search(){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const searchParams=useSearchParams();
  const router=useRouter();
  const [query,setQuery]=useState('');
  const [searchMode,setSearchMode]=useState('all');
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

  async function loadGalaxyDetail(result){
    const scopeData=scopeById.get(result.scopeId);
    if(!scopeData)throw new Error(UI_COPY.search.fullTextNotFound);
    const id=result.editResourceId||result.resourceId;
    if(result.editableTable){
      const row=await selectPublicEditableRow(result.editableTable,result.editableIdColumn||'uid',id,GALAXY_EDITOR_COLUMNS);
      if(!row)throw new Error(UI_COPY.search.fullTextNotFound);
      return row;
    }
    return selectGalaxyContent(scopeData,id);
  }

  async function executeSearch(rawQuery,cursor=null,{append=false}={}){
    const q=String(rawQuery||'').trim();
    if(!q)return;
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
      setStatus(searchMode==='media'?UI_COPY.search.searching:UI_COPY.format.searchScope(collectionLabel));
    }
    try{
      if(!append){
        if(scopeId!=='loc'&&matchesScopeAlias(scope,q)){
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
        logSearchKeyword(scopeId,q).catch(()=>{});
      }
      const styleTagMatches=(!append&&searchMode!=='media')
        ?await selectStyleKeywordMatches(targetScopes,q)
        :[];
      const search=await searchGalaxyRows(targetScopes,q,{
        limit:pageSize,
        // Always search article providers, including when the same keyword
        // exactly matches a style tag.
        cursor,
        mediaOnly:searchMode==='media',hiddenScopeIds
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
      if(!append)setStatus(UI_COPY.format.searchResult({label:searchMode==='media'?UI_COPY.search.media:'「'+collectionLabel+'」',query:q,hasMore:search.hasMore,partial}));
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
    if(!q||!hasMore||loadingMore||nextCursor===null)return;
    await executeSearch(q,nextCursor,{append:true});
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
    if(!scopesQuery.isSuccess)return;
    const identity=String(searchParams?.get('identity')||'').trim();
    const value=String(searchParams?.get('q')||'').trim();
    if(identity){setQuery('');executeIdentity(identity);return;}
    if(value){setQuery(value);executeSearch(value);}
  },[searchParams,scopeId,scopesQuery.isSuccess,scopesQuery.data]);



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
      const fullRow=cached||result.editRow||await selectPublicEditableRow(
        result.editableTable,
        result.editableIdColumn,
        result.editResourceId||result.resourceId,
        result.resourceType==='galaxy'?GALAXY_EDITOR_COLUMNS:'media_id,title,meta_tags'
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
      const contentPatch=result.resourceType==='galaxy'?{
        title:nextTitle,
        content:body,
        UpdateTime:new Date().toISOString(),
        ...changedGalaxyAttributes(editDraft,t)
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

  async function runSearch(event){
    event.preventDefault();
    const term=String(query||'').trim();
    if(!term)return;
    // Keep the keyword in the URL and input so a style-to-style link is a
    // reproducible next search, not a transient single-page interaction.
    if(String(searchParams?.get('q')||'').trim()!==term||searchParams?.get('identity')){
      router.push(featureNavigationHref(scopeId,'search',{q:term}));
      return;
    }
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
    {loadMoreError?<p role="alert" className="scope-status scope-error">{loadMoreError} <button type="button" className="loc-button" disabled={loadingMore} onClick={loadNextSearch}><UiText id="uiExtra.cultureView.reloadWorks"/></button></p>:null}
    <IncrementalList
      items={results}
      batchSize={pageSize}
      resetKey={searchMode+'|'+matchedQueryRef.current}
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
        // Public article rows may open the editor. The existing authenticated
        // management_write RPC is the write authorization boundary; a client
        // permission snapshot must not hide an author's own edit action.
        const editable=Boolean(editTarget.resourceType&&editTarget.editableTable&&editTarget.editableIdColumn&&editTarget.editResourceId);
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
          showHidden={row.resourceType==='galaxy'}
          editorExtra={row.resourceType==='galaxy'?<GalaxyAttrEditor draft={draft} setDraft={setEditDraft}/>:null}
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
          {row.resourceType==='galaxy'&&editable&&fullTextKey===row.key&&!fullTextLoading?<GalaxyAttrSummary row={fullTextRow}/>:null}
        </Article>;
      }}
    />
  </FeaturePage>;
}
