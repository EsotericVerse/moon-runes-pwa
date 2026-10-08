'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useRouter,useSearchParams} from 'next/navigation';

import {logSearchKeyword,selectAuthRow,updateRows} from '../../loc/db-client.mjs';
import {useAccount} from '../../loc/use-account';
import {FeaturePage,IncrementalList,WorkFullText,WorkSummaryCard} from '../ui';
import {useScopeRuntime} from '../use-scope-runtime';
import {scopeHref} from '../scope-registry';
import {featureNavigationHref,galaxyIdentityHref,galaxyRelationLinks} from '../feature-navigation';
import {featureDataErrorMessage} from '../feature-data-state';
import {resolveGalaxyExternalLinks,searchGalaxyRows,selectGalaxyContent,selectGalaxyIdentity,selectStyleKeywordIntroductions} from '../../loc/galaxy-query';
import {selectManagedScopes} from '../../loc/scope-data';
import {MEDIA_FALLBACK_TITLE,WORK_FALLBACK_TITLE,workDisplayHeading,workDisplayText} from '../work-display-model';
import {requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/list-loading-contract.mjs';
import {applyFilters} from '../../loc/db-query.mjs';
import BlockNoteEditor from '../../loc/BlockNoteEditor';
import {blocksToPlainText,plainTextToBlocks} from '../../loc/blocknote-content.mjs';
import ScopeGroupOverview from '../../loc/ScopeGroupOverview';


const GALAXY_EDITOR_COLUMNS='uid,content_type,title,content,createtime,source_native_id,source_place,searchable,UpdateTime,url,source_id,target_id,ref_id,source_name,media_link,statistics_able,class_id,group_lists,content_blocks';

const GALAXY_ATTR_ORDER=Object.freeze([
  'uid','content_type','title','content','createtime','source_native_id','source_place',
  'searchable','UpdateTime','url','source_id','target_id','ref_id','source_name',
  'media_link','statistics_able','class_id','group_lists','content_blocks'
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
function isoOrNull(value){
  const text=String(value||'').trim();
  if(!text)return null;
  const date=new Date(text);
  if(Number.isNaN(date.getTime()))throw new Error('文章時間格式無效。');
  return date.toISOString();
}
function jsonText(value){
  try{return JSON.stringify(value??false,null,2)}catch{return String(value??'')}
}
function parseJsonAttr(value){
  const text=String(value??'').trim();
  if(!text)return false;
  try{return JSON.parse(text)}catch{throw new Error('group_lists 必須是有效 JSON。')}
}
function attrDisplayValue(key,value){
  if(key==='content')return '全文已顯示於上方';
  if(key==='content_blocks'){
    if(value===null||value===undefined)return 'null';
    const raw=jsonText(value);
    return 'WYSIWYG 結構 · '+raw.length+' chars';
  }
  if(Array.isArray(value))return value.length?value.join(', '):'[]';
  if(value&&typeof value==='object')return jsonText(value);
  if(value===null||value===undefined||value==='')return 'null';
  if(typeof value==='boolean')return value?'true':'false';
  return String(value).trim();
}
function galaxyDraftFromRow(row={},fallbackTitle=''){
  return {
    title:String(row.title??fallbackTitle??''),
    bodyBlocks:Array.isArray(row.content_blocks)&&row.content_blocks.length
      ?row.content_blocks
      :plainTextToBlocks(String(row.content??'')),
    attrs:{
      uid:String(row.uid||'').trim(),
      content_type:String(row.content_type||'').trim(),
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
    }
  };
}

function GalaxyAttrSummary({row}){
  if(!row)return null;
  return <details className="scope-search-attr-panel">
    <summary>文章 Attr</summary>
    <dl className="scope-search-attr-grid">
      {GALAXY_ATTR_ORDER.map(key=><div key={key}>
        <dt>{key}</dt>
        <dd>{attrDisplayValue(key,row[key])}</dd>
      </div>)}
    </dl>
  </details>;
}

function GalaxyAttrEditor({draft,setDraft}){
  const attrs=draft?.attrs||{};
  const change=(key,value)=>setDraft(current=>({...current,attrs:{...(current?.attrs||{}),[key]:value}}));
  return <details className="scope-search-attr-panel" open>
    <summary>文章 Attr</summary>
    <div className="scope-management-fields scope-search-attr-editor">
      <label><span>uid</span><input value={attrs.uid||''} readOnly/></label>
      <label><span>content_type</span><input value={attrs.content_type||''} onChange={event=>change('content_type',event.target.value)}/></label>
      <label><span>createtime</span><input type="datetime-local" value={attrs.createtime||''} onChange={event=>change('createtime',event.target.value)}/></label>
      <label><span>source_native_id</span><input value={attrs.source_native_id||''} onChange={event=>change('source_native_id',event.target.value)}/></label>
      <label><span>source_place</span><input value={attrs.source_place||''} onChange={event=>change('source_place',event.target.value)}/></label>
      <label><span>url</span><input value={attrs.url||''} onChange={event=>change('url',event.target.value)}/></label>
      <label><span>source_id</span><input value={attrs.source_id||''} onChange={event=>change('source_id',event.target.value)}/></label>
      <label><span>ref_id</span><input value={attrs.ref_id||''} onChange={event=>change('ref_id',event.target.value)}/></label>
      <label><span>source_name</span><input value={attrs.source_name||''} onChange={event=>change('source_name',event.target.value)}/></label>
      <label><span>class_id</span><input type="number" value={attrs.class_id??''} onChange={event=>change('class_id',event.target.value)}/></label>
      <label className="scope-setting-toggle"><input type="checkbox" checked={attrs.searchable!==false} onChange={event=>change('searchable',event.target.checked)}/><span>searchable</span></label>
      <label className="scope-setting-toggle"><input type="checkbox" checked={attrs.statistics_able!==false} onChange={event=>change('statistics_able',event.target.checked)}/><span>statistics_able</span></label>
      <label className="scope-management-wide-field"><span>target_id[]</span><textarea rows={3} value={attrs.target_id||''} onChange={event=>change('target_id',event.target.value)} placeholder="一行一個 UUID／ID"/></label>
      <label className="scope-management-wide-field"><span>media_link[]</span><textarea rows={3} value={attrs.media_link||''} onChange={event=>change('media_link',event.target.value)} placeholder="一行一個 media UUID"/></label>
      <label className="scope-management-wide-field"><span>group_lists (JSON)</span><textarea rows={5} value={attrs.group_lists||''} onChange={event=>change('group_lists',event.target.value)}/></label>
      <label><span>UpdateTime</span><input value={attrs.UpdateTime||''} readOnly/></label>
      <label><span>content</span><input value="由上方全文編輯器管理" readOnly/></label>
      <label><span>content_blocks</span><input value="由上方 WYSIWYG 編輯器管理" readOnly/></label>
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
    key:identity?[scope,source,identity].join(':'):[source,scope,title].join('-'),
    source:displaySource,title:String(title),
    date:row.date||row.createtime||row.time_date||row.record_date||row.UpdateTime||row.updated_at||'',
    snippet:body,scopeId:scope,resourceType,resourceId,
    styleIntro:Boolean(row.style_keyword_intro),
    stylePeriod:String(row.period_label||''),
    styleAnchorStart:String(row.style_anchor_start||''),
    styleAnchorEnd:String(row.style_anchor_end||''),
    relatedStyleTags:Array.isArray(row.related_style_tags)?row.related_style_tags:[],
    editableTable,editableIdColumn,editResourceId,editableField,isScopeCard,href,
    relationLinks:resourceType==='galaxy'
      ?galaxyRelationLinks(scope,row)
      :(resourceType==='galaxy_media'&&row.galaxy_link
        ?[{id:'galaxy:'+row.galaxy_link,label:UI_COPY.search.parentText,href:galaxyIdentityHref(scope,row.galaxy_link)}].filter(link=>link.href)
        :[]),
    groupKey:resourceType==='galaxy'&&resourceId
      ?'galaxy:'+scope+':'+resourceId
      :(resourceType==='galaxy_media'&&row.galaxy_link?'galaxy:'+scope+':'+row.galaxy_link:'result:'+scope+':'+(identity||title)),
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
  const router=useRouter();
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
  const [fullTextBlocks,setFullTextBlocks]=useState(null);
  const [fullTextRow,setFullTextRow]=useState(null);
  const [fullTextError,setFullTextError]=useState('');
  const [fullTextLoading,setFullTextLoading]=useState(false);
  const searchId=useRef(0);
  const matchedQueryRef=useRef('');
  const pageSize=DEFAULT_LIST_BATCH_SIZE;
  // LOC searches all managed Scopes; only other Scope Groups are directory guides.
  const aggregateScopes=Boolean(scope?.aggregateChildren&&scopeId!=='loc');
  const scopesQuery=useQuery({
    queryKey:['managed-scopes',scopeId],
    queryFn:selectManagedScopes,
    enabled:!aggregateScopes,
    staleTime:5*60_000
  });
  const targetScopes=useMemo(()=>{
    const scopes=scopesQuery.data||[];
    return scopeId==='loc'?scopes:scopes.filter(item=>item.id===scopeId);
  },[scopeId,scopesQuery.data]);
  const scopeById=useMemo(()=>new Map(targetScopes.map(item=>[item.id,item])),[targetScopes]);
  const hiddenScopeIds=useMemo(
    ()=>targetScopes.filter(item=>account.canManageScopeSync(item.id)).map(item=>item.id),
    [targetScopes,account.authorizer]
  );
  const collectionLabel=scopeId==='loc'?UI_COPY.search.allContent:String(scope?.label||scopeId);

  async function loadGalaxyDetail(result){
    const scopeData=scopeById.get(result.scopeId);
    if(!scopeData)throw new Error(UI_COPY.search.fullTextNotFound);
    const id=result.editResourceId||result.resourceId;
    if(account.canManageScopeSync(result.scopeId)&&result.editableTable){
      const row=await selectAuthRow(result.editableTable,{
        idColumn:result.editableIdColumn||'uid',
        id,
        columns:GALAXY_EDITOR_COLUMNS
      });
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
        if(scopeId!=='loc'&&matchesScopeAlias(scope,q)){
          matchedQueryRef.current=q;
          setResults([{
            key:'scope:'+scopeId,
            source:'Scope',
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
            links:[{id:'scope-home',href:scopeHref(scopeId),label:'前往 Scope 首頁'}],
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
      const search=await searchGalaxyRows(targetScopes,q,{
        limit:pageSize,
        // Prioritize document results after a recognized Time style introduction.
        // Time records remain available in normal searches without a style hit.
        cursor:!append&&styleIntroductions.length&&scopeId!=='loc'?{stage:2,offset:0,source:'auto'}:cursor,
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
      const fullRow=await loadGalaxyDetail(result);
      setFullText(workDisplayText(fullRow?.content||detail.content||''));
      setFullTextBlocks(Array.isArray(fullRow?.content_blocks)?fullRow.content_blocks:(Array.isArray(detail.content_blocks)?detail.content_blocks:null));
      setFullTextRow(account.canManageScopeSync(detailScope)?fullRow:null);
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
      setFullTextBlocks(null);
      setFullTextRow(null);
      setFullTextError('');
      return;
    }
    if(result.resourceType!=='galaxy'||!result.editableTable)return;
    setFullTextKey(result.key);
    setFullText('');
    setFullTextBlocks(null);
    setFullTextRow(null);
    setFullTextError('');
    setFullTextLoading(true);
    try{
      const fullRow=await loadGalaxyDetail(result);
      if(!fullRow)throw new Error(UI_COPY.search.fullTextNotFound);
      setFullText(workDisplayText(fullRow.content||''));
      setFullTextBlocks(Array.isArray(fullRow.content_blocks)?fullRow.content_blocks:null);
      setFullTextRow(account.canManageScopeSync(result.scopeId)?fullRow:null);
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
        ?GALAXY_EDITOR_COLUMNS
        :'media_id,title,meta_tags,content_blocks';
      const cached=result.resourceType==='galaxy'&&fullTextKey===result.key&&fullTextRow?.uid
        ?fullTextRow
        :null;
      const fullRow=cached||await selectAuthRow(result.editableTable,{
        idColumn:result.editableIdColumn,
        id:result.editResourceId||result.resourceId,
        columns:contentColumns
      });
      if(!fullRow)throw new Error(UI_COPY.search.editNotFound);
      setEditDraft(result.resourceType==='galaxy'
        ?galaxyDraftFromRow(fullRow,result.title)
        :{
          title:String(fullRow.title??result.title??''),
          body:String(fullRow[result.editableField]??''),
          bodyBlocks:Array.isArray(fullRow.content_blocks)&&fullRow.content_blocks.length
            ?fullRow.content_blocks
            :plainTextToBlocks(String(fullRow[result.editableField]??'')),
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
      if(!account.canManageScopeSync(result.scopeId))throw new Error(UI_COPY.search.editDenied);
      const body=result.resourceType==='galaxy'
        ?requireGalaxyContent(blocksToPlainText(editDraft.bodyBlocks))
        :blocksToPlainText(editDraft.bodyBlocks);
      const nextTitle=result.resourceType==='galaxy'
        ?resolveGalaxyTitle(editDraft.title,body)
        :(String(editDraft.title||'').trim()||null);
      const attrs=editDraft.attrs||{};
      const classText=String(attrs.class_id??'').trim();
      const contentPatch=result.resourceType==='galaxy'?{
        content_type:String(attrs.content_type||'').trim()||'article',
        title:nextTitle,
        content:body,
        content_blocks:editDraft.bodyBlocks,
        createtime:isoOrNull(attrs.createtime),
        source_native_id:nullableText(attrs.source_native_id),
        source_place:nullableText(attrs.source_place),
        searchable:attrs.searchable!==false,
        UpdateTime:new Date().toISOString(),
        url:nullableText(attrs.url),
        source_id:nullableText(attrs.source_id),
        target_id:parseListText(attrs.target_id),
        ref_id:nullableText(attrs.ref_id),
        source_name:nullableText(attrs.source_name),
        media_link:parseListText(attrs.media_link),
        statistics_able:attrs.statistics_able!==false,
        class_id:classText===''?null:Number(classText),
        group_lists:parseJsonAttr(attrs.group_lists)
      }:{
        title:nextTitle,
        [result.editableField]:body,
        content_blocks:Array.isArray(editDraft.bodyBlocks)?editDraft.bodyBlocks:null
      };
      if(result.resourceType==='galaxy'&&classText!==''&&!Number.isFinite(contentPatch.class_id))throw new Error('class_id 必須是數字。');
      const contentFilters=[{column:result.editableIdColumn,operator:'eq',value:result.editResourceId||result.resourceId}];
      await updateRows(result.editableTable,contentPatch,{filters:contentFilters});
      setResults(current=>current.map(item=>item.key!==result.key?item:{...item,title:nextTitle,snippet:result.resourceType==='galaxy'?'':body}));
      if(fullTextKey===result.key){
        setFullText(body);
        setFullTextBlocks(result.resourceType==='galaxy'?editDraft.bodyBlocks:null);
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
      title="Scope Group 搜尋導引"
      description="請先選擇要搜尋的 Scope；Group 本身不對所有子 Scope 同時執行全文搜尋。"
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
          {row.styleIntro?<div className="scope-style-search-connections">
            <p className="scope-status"><strong>所屬時期：</strong>{row.stylePeriod||'文化風格'}</p>
            <div className="scope-preview-links">
              <a href={scopeHref(row.scopeId)}>前往 {row.scopeId} Scope 網站</a>
              {(row.styleAnchorStart||row.styleAnchorEnd)?<a href={featureNavigationHref(row.scopeId,'culture',{...(row.styleAnchorStart?{from:row.styleAnchorStart}:{}),...(row.styleAnchorEnd?{to:row.styleAnchorEnd}:{})})}>時間長河與既有定錨點</a>:null}
            </div>
            {row.relatedStyleTags.length?<div className="scope-style-search-related">
              <p className="scope-status"><strong>延伸探索：其他個人風格</strong>（點擊可繼續搜尋）</p>
              {row.relatedStyleTags.some(style=>style.same_period)?<div className="scope-style-search-related-group">
                <span>同時期平行風格</span>
                <div className="scope-style-search-related-links">
                  {row.relatedStyleTags.filter(style=>style.same_period).map(style=><a key={style.name} href={featureNavigationHref(row.scopeId,'search',{q:style.name})}>
                    {style.name} · {style.document_total===null?'統計暫不可用':style.document_total.toLocaleString()+' 篇'}
                  </a>)}
                </div>
              </div>:null}
              {row.relatedStyleTags.some(style=>!style.same_period)?<div className="scope-style-search-related-group">
                <span>其他時期的個人風格</span>
                <div className="scope-style-search-related-links">
                  {row.relatedStyleTags.filter(style=>!style.same_period).map(style=><a key={style.name} href={featureNavigationHref(row.scopeId,'search',{q:style.name})}>
                    {style.name} · {style.document_total===null?'統計暫不可用':style.document_total.toLocaleString()+' 篇'}
                  </a>)}
                </div>
              </div>:null}
              <p className="scope-status">統計為全 Scope 有效作品的標題／正文命中篇數，每篇計一次，不改動 Class 分布。</p>
            </div>:null}
          </div>:null}
          {row.resourceType==='galaxy'?<WorkFullText
            open={fullTextKey===row.key}
            loading={fullTextLoading&&fullTextKey===row.key}
            error={fullTextKey===row.key?fullTextError:''}
            content={fullTextKey===row.key?fullText:''}
            blocks={fullTextKey===row.key?fullTextBlocks:null}
            onToggle={()=>toggleFullText(row)}
          />:null}
          {row.resourceType==='galaxy'&&editable&&fullTextKey===row.key&&!fullTextLoading?<GalaxyAttrSummary row={fullTextRow}/>:null}
          {editable&&(row.resourceType!=='galaxy'||fullTextKey===row.key)?<div className="scope-search-edit-action"><button type="button" className="loc-button" onClick={()=>startEditing(row)}>{editingKey===row.key?UI_COPY.search.editing:UI_COPY.common.edit}</button></div>:null}
          {draft?(row.resourceType==='galaxy'?<div className="scope-editor scope-search-article-editor">
            <label>{UI_COPY.common.title}<input value={draft.title||''} onChange={event=>setEditDraft(current=>({...current,title:event.target.value}))}/></label>
            <BlockNoteEditor
              key={'search-edit:'+row.key}
              initialContent={draft.bodyBlocks}
              onChange={blocks=>setEditDraft(current=>({...current,bodyBlocks:blocks}))}
            />
            <GalaxyAttrEditor draft={draft} setDraft={setEditDraft}/>
            {editError?<p role="alert" className="scope-error">{editError}</p>:null}
            <div className="scope-tabs">
              <button type="button" disabled={editBusy} onClick={()=>saveEditing(row)}>{editBusy?UI_COPY.common.saving:UI_COPY.common.save}</button>
              <button type="button" disabled={editBusy} onClick={()=>{setEditingKey('');setEditDraft(null);setEditError('')}}>{UI_COPY.common.cancel}</button>
            </div>
          </div>:<div className="scope-editor scope-search-media-editor">
            <label>{UI_COPY.common.title}<input value={draft.title||''} onChange={event=>setEditDraft(current=>({...current,title:event.target.value}))}/></label>
            <BlockNoteEditor
              key={'search-media-edit:'+row.key}
              initialContent={draft.bodyBlocks}
              onChange={blocks=>setEditDraft(current=>({...current,bodyBlocks:blocks,body:blocksToPlainText(blocks)}))}
            />
            {editError?<p role="alert" className="scope-error">{editError}</p>:null}
            <div className="scope-tabs">
              <button type="button" disabled={editBusy} onClick={()=>saveEditing(row)}>{editBusy?UI_COPY.common.saving:UI_COPY.common.save}</button>
              <button type="button" disabled={editBusy} onClick={()=>{setEditingKey('');setEditDraft(null);setEditError('')}}>{UI_COPY.common.cancel}</button>
            </div>
          </div>):null}
        </WorkSummaryCard>;
      }}
    />
  </FeaturePage>;
}
