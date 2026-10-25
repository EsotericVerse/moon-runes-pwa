'use client';
import UiText from '../../i18n/UiText';
import FieldText from '../../i18n/FieldText';

import {translateUiField,UI_COPY,registerDefaultSection} from '../../i18n/ui-copy';
import {useUiCopy,useUiLocale,useUiSection} from '../../i18n/ui-locale';
import cultureZh from '../../i18n/sections/culture.zh_tw.js';
import cultureViewZh from '../../i18n/sections/uiExtra.cultureView.zh_tw.js';
import dataErrorsZh from '../../i18n/sections/uiExtra.dataErrors.zh_tw.js';
import paginationZh from '../../i18n/sections/uiExtra.pagination.zh_tw.js';
registerDefaultSection('culture',cultureZh);
registerDefaultSection('uiExtra.cultureView',cultureViewZh);
registerDefaultSection('uiExtra.dataErrors',dataErrorsZh);
registerDefaultSection('uiExtra.pagination',paginationZh);

import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
import {useAsyncResource,useAsyncInfiniteResource,useResourceCache} from '../../loc/use-async-resource';
import {featureNavigationHref,galaxyRelationLinks,readFeatureNavigation} from '../feature-navigation';
import ScopeLink from '../ScopeLink';
import ManagementSectionNav,{useManagementSection} from '../ManagementSectionNav';
import {useEditDock} from '../edit-dock';
import {featureDataErrorMessage} from '../feature-data-state';
const CultureTimeline=dynamic(()=>import('../modules/culture-timeline/CultureTimeline'),{loading:()=>null});
import {CultureTimelineModel} from '../modules/culture-timeline/culture-timeline-model';

import {selectGalaxyContent} from '../../loc/galaxy-query';
import {revalidateServerMetadata} from '../../loc/scope-data';

import {deleteRows,insertRows,updateRows} from '../../loc/db-client.mjs';
import {selectAllRows,selectRows} from '../../loc/db-query.mjs';
import {parseGroupLists} from '../../loc/group-lists.mjs';
import {assignedSource} from '../../loc/member-intersection-model.mjs';
import {sourceTaxonomyFromArrays} from '../../loc/source-classification.mjs';
import {publishedSourceTaxonomy} from '../published-source-taxonomy.js';
import {summarizeCultureRiverRoots,selectCultureRiverChildren} from '../../loc/culture-river-roots.mjs';
import {readNumericIsr,usesNumericIsr} from '../../loc/numeric-isr-client';
import {mediaDay} from '../../loc/statistics-facets';
import {useAccount} from '../../loc/use-account';
import {useScopeRuntime} from '../use-scope-runtime';
import {ArticleSortSelect,FeaturePage,IncrementalList,WorkFullText} from '../ui';
// Article cards/editing are requested only when results actually render.
const Article=dynamic(()=>import('../Article'),{loading:()=>null});
const CultureTimelineEditor=dynamic(()=>import('./CultureTimelineEditor'),{loading:()=>null});
import {workDisplayHeading,workDisplayText} from '../work-display-model';
import {DEFAULT_LIST_BATCH_SIZE} from '../../loc/db-contract.mjs';
import {publicContentFilters,requireGalaxyContent,resolveGalaxyTitle} from '../../loc/content-policy';
const LrunesDailyCulturePanel=dynamic(()=>import('../../lrunes/DailyRuneAnalytics').then(m=>m.LrunesDailyCulturePanel),{loading:()=>null});
const LocItemConfluence=dynamic(()=>import('./LocItemConfluence'),{loading:()=>null});

function isInteractiveTarget(target){
  return Boolean(target?.closest?.('a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]'));
}

// Preserve timeline instances while editor dialogs, suggested points and
// density suggestions update around them.
const TIME_EDITOR_SECTIONS=Object.freeze([
  {value:'anchor-style',label:'定錨點／風格標籤',shortLabel:'定錨／風格',description:'編輯日期定錨點與依附定錨點的風格標籤。'},
  {value:'event',label:'事件',description:'編輯以正式定錨點界定的事件。'},
  {value:'period',label:'時期',description:'編輯時期與起訖定錨點。'}
]);
const EMPTY_RIVER_FOCUS=Object.freeze({});
const EMPTY_CULTURE_GROUPS=Object.freeze([]);
const EMPTY_RIVER_ANALYSIS=Object.freeze({density:[],changepoints:[],hiddenDates:[],suggestions:[],totalCount:0});
function emptyRiverLabel(){return '';}
function classificationRiverLabel(item){
  return item?.entry_type==='virtual_anchor'?(item.display_label||'◇'):'';
}
function labelOf(item,index,periodName=UI_COPY.format.period(index+1)){
  return item?.display_label||item?.name||item?.title||item?.period||periodName;
}
function sortPeriods(rows=[]){
  return [...rows].filter(item=>item?.start_date||item?.end_date).sort((a,b)=>
    String(a.start_date||a.end_date||'').localeCompare(String(b.start_date||b.end_date||''))||
    Number(a.order||0)-Number(b.order||0)
  );
}
function periodRange(rows=[],scope='',allTime=UI_COPY.culture.allTime){
  const starts=rows.map(row=>row.start_date||row.end_date).filter(Boolean).sort();
  const ends=rows.map(row=>row.end_date||row.start_date).filter(Boolean).sort();
  const openEnded=rows.some(row=>Boolean(row?.open_end)||!row?.end_date);
  return {
    period:'all',title:allTime,display_label:allTime,
    start_date:starts[0]||'',end_date:openEnded?null:(ends.at(-1)||null),scope_id:scope
  };
}
function periodKey(item){
  return String(item?.period||item?.era_id||item?.id||'').trim();
}
function classLabel(value){
  const text=String(value||'').trim();
  return !text?'':text.endsWith('群組')?text:text+' 群組';
}
// Render Class density first. After selecting a Class, show the distribution
// of its Group items from saved group_lists, never the underlying keywords.
function keywordDrillRiverItems(rows,{source='',groupId='',meta={},groupItems=[]}={}){
  const classes=meta?.classes||{};
  const className=String(meta?.class_name||'').trim();
  const knownGroups=new Map(groupItems.map(item=>[String(Number(item.item_no)),item]));
  const buckets=new Map(),maximum=new Map();
  const add=(key,label,day,count,order=0)=>{
    if(!key||!label||!count)return;
    const id=key+'\u0000'+day;
    buckets.set(id,{key,label,day,count:(buckets.get(id)?.count||0)+count,order});
    maximum.set(key,Math.max(maximum.get(key)||0,buckets.get(id).count));
  };
  for(const row of rows||[]){
    // Unfiltered class density is already aggregated by read_rune66_summary.
    // Do not download Galaxy attributes just to reproduce these exact counts.
    if(!source&&!groupId&&row?.kind==='galaxy'&&row?.classification_group){
      const day=String(row.date||'').slice(0,10);
      const rowGroup=String(row.class_id??'').trim();
      const groupLabel=String(classes[rowGroup]||row.classification_group||'').trim();
      const count=Number(row.count)||0;
      if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&groupLabel&&count>0)
        add(rowGroup,[className,groupLabel,'群組'].filter(Boolean).join(' '),day,count,Number(rowGroup)||0);
      continue;
    }
    // Match PostgreSQL's Asia/Taipei calendar day rather than UTC prefixes.
    const day=mediaDay(row.createtime);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
    const hits=parseGroupLists(row.group_lists);
    if(hits===false)continue;
    const rowSource=String(row.source_name||'').trim()||'未分類';
    if(source&&rowSource!==source)continue;
    const rowGroup=String(row.class_id||'').trim();
    if(groupId){
      if(rowGroup!==String(groupId))continue;
      for(const [id,rawCount] of Object.entries(hits)){
        const group=knownGroups.get(id);
        const count=Number(rawCount)||0;
        if(group&&count>0)add(id,String(group.item_name||id),day,count,Number(group.order_no)||Number(id));
      }
    }else{
      const label=String(classes[rowGroup]||'').trim();
      if(label)add(rowGroup,[className,label,'群組'].filter(Boolean).join(' '),day,1,Number(rowGroup)||0);
    }
  }
  return [...buckets.values()].map(({key,label,day,count,order})=>({
    id:'keyword-density:'+(groupId?'item':'class')+':'+key+':'+day,
    entry_id:'keyword-density:'+(groupId?'item':'class')+':'+key+':'+day,
    entry_type:'keyword_density',
    drill_key:key,
    group_label:label,
    category:label,
    display_label:'',
    title:day+' · '+label+' · '+count.toLocaleString()+(groupId?' 次':' 篇'),
    start_date:day,end_date:nextRiverDay(day),
    item_count:count,group_order:order,
    density_ratio:count/Math.max(1,maximum.get(key)||1)
  })).sort((a,b)=>a.start_date.localeCompare(b.start_date)
    ||Number(a.group_order)-Number(b.group_order)||a.group_label.localeCompare(b.group_label));
}
function formatCultureUi(template,values={}){
  return String(template||'').replace(/\{([a-zA-Z][\w]*)\}/gu,(match,key)=>
    Object.prototype.hasOwnProperty.call(values,key)?String(values[key]??''):match);
}
function nextRiverDay(value){
  const key=String(value||'').slice(0,10);
  if(!key)return '';
  const date=new Date(key+'T00:00:00Z');
  if(Number.isNaN(date.getTime()))return '';
  date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString().slice(0,10);
}
function dayKeyFromTimelineValue(value){
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return date.toISOString().slice(0,10);
}
function periodPositionRatio(date,start,end){
  const a=Date.parse(String(start||'').slice(0,10));
  const b=Date.parse(String(end||'').slice(0,10));
  const x=Date.parse(String(date||'').slice(0,10));
  if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(x)||b<=a)return 0;
  return Math.max(0,Math.min(1,(x-a)/(b-a)));
}
export default function Culture(){
  useUiSection('culture');
  useUiSection('uiExtra.cultureView');
  useUiSection('uiExtra.dataErrors');
  useUiSection('uiExtra.pagination');
  const UI_COPY=useUiCopy();
  const l=UI_COPY.uiExtra.cultureView;
  const localizedLabelOf=useMemo(()=> (item,index)=>labelOf(item,index,UI_COPY.format.period(index+1)),[UI_COPY]);
  const {locale}=useUiLocale();
  const {scopeId,scope}=useScopeRuntime();
  const searchParams=useSearchParams();
  const isTimeEditingView=searchParams?.get('edit')==='1';
  // Public Culture does not load management grants; editing must verify them.
  const account=useAccount({enabled:isTimeEditingView});
  const editDock=useEditDock();
  const [timeEditorSection,setTimeEditorSection]=useManagementSection(TIME_EDITOR_SECTIONS,'anchor-style');
  const [lrunesView,setLrunesView]=useState('daily');
  const [locCultureView,setLocCultureView]=useState('period');
  const isLrunesDaily=!isTimeEditingView&&scopeId==='lrunes'&&lrunesView==='daily';
  const isLocItemView=scopeId==='loc'&&locCultureView==='item';
  const resourceCache=useResourceCache();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const query=useAsyncResource({
    queryKey:['culture-timeline',scopeId],
    queryFn:async()=>{
      const {selectScopeCultureData}=await import('../../loc/culture-query');
      return selectScopeCultureData(scopeId);
    },
    enabled:!isLrunesDaily&&!isLocItemView,
  });

  const [selectedPeriodKey,setSelectedPeriodKey]=useState('');
  const periodSelectionScopeRef=useRef('');
  const [selectedCategory,setSelectedCategory]=useState('');
  const [worksOpen,setWorksOpen]=useState(false);
  const [articleSort,setArticleSort]=useState('desc');
  // Keyword Class is optional; ordinary Time River views must not scan the whole article corpus.
  const [styleFilter,setStyleFilter]=useState('none');
  const [keywordOptionsScope,setKeywordOptionsScope]=useState('');
  const [keywordDrillSource,setKeywordDrillSource]=useState('');
  const [keywordDrillGroup,setKeywordDrillGroup]=useState('');
  const [keywordPeriodKey,setKeywordPeriodKey]=useState('latest');
  const [cultureTimeKind,setCultureTimeKind]=useState('period');
  const [keywordCustomStart,setKeywordCustomStart]=useState('');
  const [keywordCustomEnd,setKeywordCustomEnd]=useState('');
  const [selectedVirtualAnchorDates,setSelectedVirtualAnchorDates]=useState([]);
  const [focusedAnchorDate,setFocusedAnchorDate]=useState('');
  const [openCultureRoots,setOpenCultureRoots]=useState([]);
  const [selectedRiverGroup,setSelectedRiverGroup]=useState('');
  const [creatingSuggestedAnchors,setCreatingSuggestedAnchors]=useState(false);
  const workScrollRef=useRef(null);
  const [fullTextKey,setFullTextKey]=useState('');
  const [fullText,setFullText]=useState('');
  const [fullTextLoading,setFullTextLoading]=useState(false);
  const [fullTextError,setFullTextError]=useState('');
  const [editingWorkKey,setEditingWorkKey]=useState('');
  const [authorizedWorkKey,setAuthorizedWorkKey]=useState('');
  const [selectedTimelineRecordId,setSelectedTimelineRecordId]=useState('');
  const [selectedTimelineInfo,setSelectedTimelineInfo]=useState(null);
  const [selectedTimelineDate,setSelectedTimelineDate]=useState('');
  const [timelineEditorRevision,setTimelineEditorRevision]=useState(0);
  // Opening the time editor is a UI action, not an authorization check.
  // Verify the active user only when a write is actually requested.
  useEffect(()=>{
    if(isTimeEditingView&&scopeId&&scopeId!=='loc')editDock?.begin(scopeId);
  },[isTimeEditingView,scopeId,editDock?.begin]);
  const [suggestedRecordType,setSuggestedRecordType]=useState('anchor');
  const [suggestedRequestNonce,setSuggestedRequestNonce]=useState(0);
  const [editDraft,setEditDraft]=useState(null);
  const [editBusy,setEditBusy]=useState(false);
  const [editError,setEditError]=useState('');

  useEffect(()=>{
    setStyleFilter('none');
    setKeywordOptionsScope('');
    setKeywordPeriodKey('latest');
    setCultureTimeKind('period');
    setKeywordCustomStart('');
    setKeywordCustomEnd('');
    setOpenCultureRoots([]);
    setSelectedRiverGroup('');
    setFocusedAnchorDate('');
  },[scopeId]);

  const isAggregateScope=Boolean(scope?.aggregateChildren);
  const openRows=useMemo(()=>(query.data?.openRanges||[])
    .filter(item=>isAggregateScope||String(item?.scope_id||'')===scopeId),[isAggregateScope,scopeId,query.data]);
  const openByScope=useMemo(()=>new Map(openRows.map(item=>[String(item.scope_id||''),item])),[openRows]);

  const allPeriods=useMemo(()=>sortPeriods(query.data?.eras?.eras||[]),[query.data]);
  const classificationScope=scopeId;
  const scopeData=query.data?.scope||null;
  // Use a stable periods array: date-navigation effects must not re-run just
  // because a different Culture panel or query refreshed the page.
  const primaryPeriods=useMemo(()=>isAggregateScope?[]:allPeriods.filter(item=>String(item?.scope_id||'')===scopeId),[isAggregateScope,allPeriods,scopeId]);
  const openPeriod=isAggregateScope?null:(openByScope.get(scopeId)||null);
  // The newest recorded period, not the open/current flag, is the default.
  const latestPeriod=primaryPeriods.at(-1)||null;
  const allTimePeriod=useMemo(()=>periodRange(primaryPeriods,classificationScope,UI_COPY.culture.allTime),[primaryPeriods,classificationScope,UI_COPY.culture.allTime]);
  useEffect(()=>{
    if(isAggregateScope||!query.data)return;
    const preferred=periodKey(latestPeriod)||'all';
    const scopeChanged=periodSelectionScopeRef.current!==scopeId;
    periodSelectionScopeRef.current=scopeId;
    // A new Scope always starts at its own latest period; manual selections
    // within the same Scope are preserved across query refreshes.
    setSelectedPeriodKey(current=>scopeChanged?preferred:
      (current==='all'||primaryPeriods.some(period=>periodKey(period)===current))?current:preferred);
  },[scopeId,isAggregateScope,query.data,latestPeriod,primaryPeriods]);
  const selectedWorkPeriod=selectedPeriodKey==='all'
    ?allTimePeriod
    :(primaryPeriods.find(item=>periodKey(item)===selectedPeriodKey)||latestPeriod||allTimePeriod);
  // Without a current period, the first effect selects the latest saved period.
  // Do not scan all-time metadata only to immediately scan that period again.
  // The latest period is already derived synchronously from loaded records.
  // Do not hold up the source snapshot waiting for a separate UI selection effect.
  const selectedWindowStart=String(selectedWorkPeriod?.start_date||'');
  const selectedWindowEnd=String(selectedWorkPeriod?.end_date||new Date().toISOString().slice(0,10));
  // The lower Culture panel shares one selected interval across the source
  // classification river, keyword-density river, suggestions, and work list.
  // The upper Time structure river keeps its own period navigation.
  const cultureEventOptions=useMemo(()=>(query.data?.timelineItems||[])
    .filter(item=>item.entry_type==='event'&&item.start_date),[query.data]);
  // The first selector chooses Period or Event. The second selector shows
  // records only from that kind; their date windows must stay distinct.
  const keywordPeriod=cultureTimeKind==='event'
    ?cultureEventOptions.find(item=>'event:'+String(item.id||item.entry_id||item.record_id)===keywordPeriodKey)||null
    :keywordPeriodKey==='all'?allTimePeriod
    :keywordPeriodKey==='latest'?(latestPeriod||selectedWorkPeriod)
    :keywordPeriodKey==='current'?selectedWorkPeriod
    :primaryPeriods.find(period=>periodKey(period)===keywordPeriodKey)||latestPeriod||selectedWorkPeriod;
  const keywordWindowStart=keywordPeriodKey==='custom'&&cultureTimeKind==='period'
    ?keywordCustomStart:String(keywordPeriod?.start_date||'').slice(0,10);
  const keywordWindowEnd=keywordPeriodKey==='custom'&&cultureTimeKind==='period'
    ?keywordCustomEnd:String(keywordPeriod?.end_date||(cultureTimeKind==='event'?keywordPeriod?.start_date:'')||new Date().toISOString().slice(0,10)).slice(0,10);
  const keywordWindowValid=/^\d{4}-\d{2}-\d{2}$/.test(keywordWindowStart)
    &&/^\d{4}-\d{2}-\d{2}$/.test(keywordWindowEnd)
    &&keywordWindowStart<=keywordWindowEnd;
  const classificationWindowStart=keywordWindowStart;
  const classificationWindowEnd=keywordWindowEnd;
  const classificationWindowValid=keywordWindowValid;
  const classificationPeriodLabel=keywordPeriodKey==='custom'&&cultureTimeKind==='period'
    ?l.customPeriod:keywordPeriod?localizedLabelOf(keywordPeriod,0):l.eventOption;
  const requestedWindowStart=String(navigation.from||'').slice(0,10);
  const requestedWindowEnd=String(navigation.to||'').slice(0,10);
  const appliedDateNavigationRef=useRef('');
  useEffect(()=>{
    if(!requestedWindowStart){
      appliedDateNavigationRef.current='';
      return;
    }
    if(isAggregateScope||!primaryPeriods.length)return;
    const navigationKey=[scopeId,requestedWindowStart,requestedWindowEnd].join('|');
    if(appliedDateNavigationRef.current===navigationKey)return;
    const matched=primaryPeriods.find(item=>{
      const start=String(item?.start_date||'').slice(0,10);
      const end=String(item?.end_date||'9999-12-31').slice(0,10);
      return (!start||requestedWindowStart>=start)&&requestedWindowStart<=end;
    });
    if(matched){
      appliedDateNavigationRef.current=navigationKey;
      setSelectedPeriodKey(periodKey(matched));
      setCultureTimeKind('period');
      setKeywordPeriodKey(periodKey(matched));
    }
  },[scopeId,isAggregateScope,requestedWindowStart,requestedWindowEnd,primaryPeriods]);

  const sourceTaxonomy=useAsyncResource({
    queryKey:['culture-source-classification',scopeId],
    enabled:!isAggregateScope&&!isLrunesDaily&&!isLocItemView&&scopeId!=='local'&&Boolean(scopeData),
    queryFn:async()=>{
      const published=publishedSourceTaxonomy(scopeId);
      if(published)return published; // Known public Scopes: no four classification SQL calls.
      const scopes=scopeId==='loc'?['loc']:['loc',scopeId];
      const [global,personal]=await Promise.all(scopes.map(id=>selectRows('silver.'+id,{
        columns:'txt_class',filters:[{column:'id',operator:'eq',value:id}],limit:1,source:'primary'
      })));
      return sourceTaxonomyFromArrays(global.rows?.[0]?.txt_class||[],
        scopeId==='loc'?[]:personal?.rows?.[0]?.txt_class||[]);
    }
  });
  const stagedSourceRiver=usesNumericIsr(scopeId)&&Boolean(publishedSourceTaxonomy(scopeId));
  const expandedSourceRoots=['system','custom','media'].filter(id=>openCultureRoots.includes(id));
  const sourceRootQuery=useAsyncResource({
    queryKey:['culture-period-roots','v1',classificationScope,classificationWindowStart,classificationWindowEnd],
    enabled:stagedSourceRiver&&!isLrunesDaily&&!isLocItemView&&!isAggregateScope
      &&Boolean(scopeData)&&classificationWindowValid,
    queryFn:async()=>{
      const args={startDate:classificationWindowStart,endDate:classificationWindowEnd,includeUndated:true};
      try{return await readNumericIsr(scopeId,'culture-roots',args);}
      catch(error){
        // Static Pages can precede a manually updated Cloudflare Worker.
        if(!/HTTP (400|404)\b/.test(String(error?.message||'')))throw error;
        const legacyRows=await readNumericIsr(scopeId,'culture',args);
        return {...summarizeCultureRiverRoots(legacyRows,publishedSourceTaxonomy(scopeId)||{}),legacyRows};
      }
    }
  });
  // Each clicked parent owns a separate SWR key. Opening another parent does
  // not refetch the first one's detail; closing a parent only hides its rows.
  const sourceChildrenEnabled=stagedSourceRiver&&!isLrunesDaily&&!isLocItemView
    &&!isAggregateScope&&Boolean(scopeData)&&classificationWindowValid&&Boolean(sourceRootQuery.data);
  const loadSourceChildren=async root=>{
    const range={startDate:classificationWindowStart,endDate:classificationWindowEnd,includeUndated:true};
    const taxonomy=publishedSourceTaxonomy(scopeId)||{};
    if(sourceRootQuery.data?.legacyRows)
      return selectCultureRiverChildren(sourceRootQuery.data.legacyRows,taxonomy,[root]);
    try{return await readNumericIsr(scopeId,'culture-children',{...range,roots:[root]});}
    catch(error){
      if(!/HTTP (400|404)\b/.test(String(error?.message||'')))throw error;
      const full=await readNumericIsr(scopeId,'culture',range);
      return selectCultureRiverChildren(full,taxonomy,[root]);
    }
  };
  const systemChildrenQuery=useAsyncResource({
    queryKey:['culture-period-children','v1',scopeId,classificationWindowStart,classificationWindowEnd,'system'],
    enabled:sourceChildrenEnabled&&openCultureRoots.includes('system'),
    queryFn:()=>loadSourceChildren('system')
  });
  const customChildrenQuery=useAsyncResource({
    queryKey:['culture-period-children','v1',scopeId,classificationWindowStart,classificationWindowEnd,'custom'],
    enabled:sourceChildrenEnabled&&openCultureRoots.includes('custom'),
    queryFn:()=>loadSourceChildren('custom')
  });
  const mediaChildrenQuery=useAsyncResource({
    queryKey:['culture-period-children','v1',scopeId,classificationWindowStart,classificationWindowEnd,'media'],
    enabled:sourceChildrenEnabled&&openCultureRoots.includes('media'),
    queryFn:()=>loadSourceChildren('media')
  });
  const requestedChildren=useMemo(()=>[
    ...(openCultureRoots.includes('system')?[systemChildrenQuery.data]:[]),
    ...(openCultureRoots.includes('custom')?[customChildrenQuery.data]:[]),
    ...(openCultureRoots.includes('media')?[mediaChildrenQuery.data]:[])
  ],[openCultureRoots,systemChildrenQuery.data,customChildrenQuery.data,mediaChildrenQuery.data]);
  const expandedSourceReady=requestedChildren.length>0&&requestedChildren.every(Array.isArray);
  // This SWR step only formats the already-fetched numeric rows locally.
  // The initial overview never depends on it.
  const sourceSnapshotQuery=useAsyncResource({
    queryKey:['culture-period-source-snapshot','v5',classificationScope,classificationWindowStart,classificationWindowEnd,stagedSourceRiver?expandedSourceRoots.join(','):'all'],
    enabled:!isLrunesDaily&&!isLocItemView&&!isAggregateScope&&Boolean(scopeData)&&classificationWindowValid
      &&(!stagedSourceRiver||expandedSourceReady),
    queryFn:async()=>{
      const {selectScopePeriodSourceSnapshot}=await import('../../loc/culture-query');
      const range={startDate:classificationWindowStart,endDate:classificationWindowEnd};
      return selectScopePeriodSourceSnapshot(scopeData,stagedSourceRiver
        ?{...range,numericRows:requestedChildren.flat()}:range);
    }
  });
  const keywordClassQuery=useAsyncResource({
    queryKey:['scope-active-keyword-class-name',scopeId],
    // Opening/focusing the style selector is the first reason to look up
    // the active Class. Ordinary Time River viewing performs no keyword SQL.
    enabled:keywordOptionsScope===scopeId&&!isAggregateScope&&!isLrunesDaily&&!isLocItemView,
    queryFn:async()=>{
      const {selectActiveKeywordClassName}=await import('../../loc/keyword-analysis');
      return selectActiveKeywordClassName(scopeId);
    },
  });
  const keywordClassLabel=keywordClassQuery.data?'關鍵詞組：'+keywordClassQuery.data
    :keywordClassQuery.isPending?'關鍵詞組（讀取中）':'關鍵詞組（尚未設定）';
  const styleQuery=useAsyncResource({
    queryKey:['culture-style-filter','rune66',classificationScope,keywordWindowStart,keywordWindowEnd],
    queryFn:async()=>{
      const {selectKeywordAnalysisSummary}=await import('../../loc/keyword-analysis');
      return selectKeywordAnalysisSummary({scopeId,startDate:keywordWindowStart,endDate:keywordWindowEnd});
    },
    enabled:!isAggregateScope&&!isLrunesDaily&&styleFilter==='rune66'&&Boolean(keywordClassQuery.data)&&keywordWindowValid,
  });
  // The original source-classification river must not wait for (or disappear
  // when) a separate keyword-density query runs.
  const riverRangeLoading=classificationWindowValid&&(stagedSourceRiver
    ?sourceRootQuery.isPending||sourceRootQuery.isFetching
    :sourceSnapshotQuery.isPending||sourceSnapshotQuery.isFetching);
  // Existing SQL summary covers the overview. Drill-down fetches only the
  // requested source and/or class, without eagerly reading all Galaxy attrs.
  // Expanding a Rune group reads only its catalog, not all Galaxy attributes.
  const keywordDetailRequested=Boolean(keywordDrillSource);
  const keywordDensityQuery=useAsyncResource({
    queryKey:['culture-keyword-attributes',scopeId,keywordWindowStart,keywordWindowEnd,keywordDrillSource,keywordDrillGroup],
    enabled:styleFilter==='rune66'&&keywordDetailRequested&&!isAggregateScope&&!isLrunesDaily&&!isLocItemView
      &&Boolean(scopeData)&&keywordWindowValid&&Boolean(styleQuery.data?.statisticsEnabled),
    queryFn:async()=>{
      const {rows}=await selectAllRows(scopeData.galaxy,{
        columns:'createtime,source_name,class_id,group_lists',
        filters:publicContentFilters([
          {column:'statistics_able',operator:'eq',value:true},
          {column:'createtime',operator:'gte',value:keywordWindowStart+'T00:00:00+08:00'},
          {column:'createtime',operator:'lte',value:keywordWindowEnd+'T23:59:59.999+08:00'},
          ...(keywordDrillSource?[{column:'source_name',operator:'eq',value:keywordDrillSource}]:[]),
          ...(keywordDrillGroup?[{column:'class_id',operator:'eq',value:Number(keywordDrillGroup)}]:[])
        ]),
        orders:[{column:'createtime',ascending:true}]
      });
      return rows;
    },
  });
  const keywordRiverPending=keywordDetailRequested?keywordDensityQuery.isPending:styleQuery.isPending;
  const keywordRiverError=keywordDetailRequested?keywordDensityQuery.error:null;
  useEffect(()=>{
    setKeywordDrillSource('');
    setKeywordDrillGroup('');
  },[scopeId]);
  // Second-river source choices come from the exact Scope source snapshot.
  // These must be available before choosing a keyword style.
  const keywordSourceOptions=useMemo(()=>sourceRootQuery.data?.groups||sourceSnapshotQuery.data?.groups||[],[sourceRootQuery.data,sourceSnapshotQuery.data]);
  // Keep raw source values intact for river filtering; simply separate text
  // platforms from media and sort each group instead of ranking by volume.
  const sourceOptionGroups=useMemo(()=>[
    {label:'文字來源',items:keywordSourceOptions.filter(item=>item.category_type!=='media')},
    {label:'多媒體類型',items:keywordSourceOptions.filter(item=>item.category_type==='media')}
  ].map(group=>({...group,items:[...group.items].sort((a,b)=>String(a.display_label||'').localeCompare(String(b.display_label||''),locale))}))
    .filter(group=>group.items.length>0),[keywordSourceOptions,locale]);
  const keywordGroupOptions=useMemo(()=>Object.entries(styleQuery.data?.keywordMeta?.classes||{})
    .map(([id,name])=>({id,label:String(name||'').trim()}))
    .filter(item=>item.label).sort((a,b)=>Number(a.id)-Number(b.id)),
  [styleQuery.data?.keywordMeta?.classes]);
  // Fetch Group names/membership only after the user opens a specific Class.
  // The initial Class-density river never downloads the Group catalog.
  const keywordGroupCatalogQuery=useAsyncResource({
    queryKey:['culture-keyword-group-catalog',scopeId,styleQuery.data?.keywordMeta?.class_id||'',keywordDrillGroup],
    enabled:styleFilter==='rune66'&&Boolean(keywordDrillGroup)
      &&Boolean(styleQuery.data?.keywordMeta?.class_id)&&Boolean(scopeData?.keywords),
    queryFn:async()=>{
      const groupName=String(styleQuery.data?.keywordMeta?.classes?.[keywordDrillGroup]||'').trim();
      if(!groupName)return [];
      const {rows}=await selectRows(scopeData.keywords,{
        columns:'item_no,item_name,order_no,class_group',
        filters:[
          {column:'class_id',operator:'eq',value:String(styleQuery.data.keywordMeta.class_id)},
          {column:'class_group',operator:'eq',value:groupName}
        ],
        orders:[{column:'order_no',ascending:true},{column:'item_no',ascending:true}],
        limit:16
      });
      return rows;
    },
    revalidateOnFocus:false,
    revalidateOnReconnect:false,
    revalidateIfStale:false
  });
  const keywordDrillItems=useMemo(()=>{
    if(keywordDetailRequested&&!keywordDensityQuery.data)return [];
    // Expanding a group preserves the Class density; no guessed per-day Rune bars.
    return keywordDrillRiverItems(keywordDetailRequested
      ?keywordDensityQuery.data:styleQuery.data?.classifications,{
      source:keywordDrillSource,groupId:keywordDetailRequested?keywordDrillGroup:'',
      meta:styleQuery.data?.keywordMeta,groupItems:keywordGroupCatalogQuery.data||[]
    });
  },[keywordDetailRequested,keywordDensityQuery.data,styleQuery.data?.classifications,keywordDrillSource,keywordDrillGroup,styleQuery.data?.keywordMeta,keywordGroupCatalogQuery.data]);

  const categoryGroups=sourceRootQuery.data?.groups||sourceSnapshotQuery.data?.groups||EMPTY_CULTURE_GROUPS;
  const groupedSources=useMemo(()=>{
    const catalog=sourceTaxonomy.data||publishedSourceTaxonomy(scopeId)||{categories:[],aliases:[],groups:[],groupAliases:[]};
    const system=new Map(catalog.categories.filter(row=>row.enabled!==false)
      .map(row=>[String(row.category_code),String(row.display_name||row.category_code)]));
    const custom=new Map(catalog.groups.filter(row=>row.enabled!==false)
      .map(row=>[String(row.group_code),String(row.display_name||row.group_code)]));
    const mapped=new Map(catalog.groupAliases.map(row=>[String(row.source_key||'').trim().toLowerCase(),String(row.group_code||'')]));
    const index=new Map();
    for(const source of categoryGroups){
      const raw=String(source.source_name||'');
      let root='media',code=raw,label=raw.replace(/^媒體 · /u,'');
      const type=label.toLowerCase();
      if(type==='music'||type==='audio')label=l.mediaMusic;
      else if(type==='image'||type==='photo')label=l.mediaImage;
      else if(type==='video'||type==='movie')label=l.mediaVideo;
      if(source.category_type!=='media'){
        const systemCode=assignedSource(raw,catalog.aliases,catalog.categories);
        root=systemCode==='unclassified'?'custom':'system';
        code=root==='system'?systemCode:mapped.get(raw.toLowerCase())||'unclassified';
        label=root==='system'?system.get(code)||code:custom.get(code)||l.other;
      }
      const key=root+':'+code;
      if(!index.has(key))index.set(key,{key,root,label,source_name:label,source_names:[],media_types:[],item_count:0});
      const group=index.get(key);
      group.item_count+=Number(source.item_count)||0;
      group.source_names.push(...(source.source_names||[]));
      group.media_types.push(...(source.media_types||[]));
    }
    return [...index.values()].map(group=>({...group,source_names:[...new Set(group.source_names)],media_types:[...new Set(group.media_types)]}));
  },[categoryGroups,sourceTaxonomy.data,scopeId,l.other,l.mediaMusic,l.mediaImage,l.mediaVideo]);
  const selectedGroup=groupedSources.find(item=>item.key===selectedRiverGroup)
    ||categoryGroups.find(item=>item.category_key===(keywordDrillSource?'source:'+keywordDrillSource:selectedCategory))
    ||null;
  const effectiveCategoryKey=selectedGroup?.category_key||selectedGroup?.key||'';
  const periodWorksQuery=useAsyncInfiniteResource({
    queryKey:['culture-period-works',classificationScope,classificationWindowStart,classificationWindowEnd,effectiveCategoryKey||'all',articleSort],
    initialPageParam:null,
    getNextPageParam:lastPage=>lastPage.hasMore?lastPage.nextCursor:undefined,
    enabled:worksOpen&&!isLrunesDaily&&!isAggregateScope&&Boolean(scopeData)&&Boolean(selectedWorkPeriod)&&classificationWindowValid,
    queryFn:async({pageParam})=>{
      const {selectScopePeriodWorkIndex,selectScopePeriodWorkDetails}=await import('../../loc/culture-query');
      const indexPage=await selectScopePeriodWorkIndex(scopeData,{
        startDate:classificationWindowStart,
        endDate:classificationWindowEnd,
        sourceName:selectedGroup?.source_name||'',
        sourceNames:selectedGroup?.source_names||[],
        mediaTypes:selectedGroup?.media_types||[],
        limit:DEFAULT_LIST_BATCH_SIZE,
        sortDirection:articleSort,
        cursor:pageParam&&typeof pageParam==='object'?pageParam:null
      });
      const details=await selectScopePeriodWorkDetails(scopeData,{items:indexPage.rows||[]});
      return {
        rows:details.rows||[],
        totalCount:Number(indexPage.totalCount)||0,
        hasMore:Number(indexPage.nextCursor?.galaxyOffset||0)+Number(indexPage.nextCursor?.mediaOffset||0)<Number(indexPage.totalCount||0),
        nextCursor:indexPage.nextCursor
      };
    }
  });
  const periodWorksPages=periodWorksQuery.data?.pages||[];
  const visibleWorkRows=useMemo(()=>{
    const map=new Map();
    periodWorksPages.forEach((page,pageIndex)=>(page.rows||[]).forEach((row,index)=>{
      map.set(String(row?.key||row?.uid||row?.entry_id||'')||(pageIndex+':'+index),row);
    }));
    return [...map.values()];
  },[periodWorksPages]);
  const periodWorksPage={
    rows:visibleWorkRows,
    totalCount:periodWorksPages[periodWorksPages.length-1]?.totalCount,
    loading:periodWorksQuery.isLoading||periodWorksQuery.isFetchingNextPage,
    error:periodWorksQuery.error,
    hasMore:Boolean(periodWorksQuery.hasNextPage),
    loadNext:periodWorksQuery.fetchNextPage,
    reload:periodWorksQuery.refetch
  };
  const selectedCount=Number(periodWorksPage.totalCount??selectedGroup?.item_count)||0;

  useEffect(()=>{
    setSelectedCategory('');
    setWorksOpen(false);
  },[scopeId]);

  useEffect(()=>{
    setSelectedCategory('');
    setWorksOpen(false);
    setFullTextKey('');
    setFullText('');
    setFullTextError('');
    if(workScrollRef.current)workScrollRef.current.scrollTop=0;
  },[classificationWindowStart,classificationWindowEnd]);

  useEffect(()=>{
    setFullTextKey('');
    setFullText('');
    setFullTextError('');
    if(workScrollRef.current)workScrollRef.current.scrollTop=0;
  },[selectedCategory,selectedRiverGroup]);


  const timelineItems=useMemo(()=>
    (query.data?.timelineItems||[]).filter(item=>isAggregateScope||item.scope_id===scopeId)
  ,[query.data,scopeId]);
  const timeEditorItems=useMemo(()=>timelineItems.filter(item=>
    timeEditorSection==='anchor-style'
      ?['anchor','style_comment'].includes(item.entry_type)
      :item.entry_type===timeEditorSection
  ),[timelineItems,timeEditorSection]);
  const currentStructurePeriod=selectedPeriodKey==='all'
    ?allTimePeriod
    :(!isAggregateScope&&selectedWorkPeriod&&selectedWorkPeriod.period!=='all')
      ?selectedWorkPeriod
      :(openPeriod||primaryPeriods.find(item=>String(item?.status||'').toLowerCase()==='current')||primaryPeriods.at(-1)||null);
  const currentStructureStart=String(currentStructurePeriod?.start_date||'').slice(0,10);
  const currentStructureEnd=String(currentStructurePeriod?.end_date||new Date().toISOString().slice(0,10)).slice(0,10);
  // Keep every Time record in the first river. The selected period controls
  // the initial camera window, not which historic anchors are accessible.
  const anchorRecords=useMemo(()=>timelineItems
    .filter(item=>item.entry_type==='anchor'&&item.record_id)
    .sort((a,b)=>String(a.start_date||'').localeCompare(String(b.start_date||''))||String(a.display_label||'').localeCompare(String(b.display_label||''))),[timelineItems]);
  const locSourceRiverItems=useMemo(()=>query.data?.sourceRiverItems||[],[query.data]);
  const locSourceGroups=useMemo(()=>query.data?.sourceGroups||[],[query.data]);
  const locCombinedSourceTotal=useMemo(()=>locSourceGroups.reduce((sum,item)=>sum+Number(item?.item_count||0),0),[locSourceGroups]);
  const locSourceGroupLabel=useMemo(()=>{
    const labels=new Map();
    for(const group of locSourceGroups){
      const count=Number(group?.item_count)||0;
      const ratio=locCombinedSourceTotal>0?(count/locCombinedSourceTotal)*100:0;
      labels.set(String(group?.source_name||group?.display_label||''),String(group?.display_label||group?.source_name||'')+' '+formatCultureUi(l.sourceGroupCount,{count:count.toLocaleString(locale),ratio:ratio.toFixed(1)}));
    }
    return labels;
  },[locSourceGroups,locCombinedSourceTotal,l,locale]);
  const locCombinedSourceRiverItems=useMemo(()=>locSourceRiverItems.map(item=>({
    ...item,
    end_date:nextRiverDay(item?.start_date),
    group_label:locSourceGroupLabel.get(String(item?.category||item?.group_label||''))||String(item?.group_label||'')
  })),[locSourceRiverItems,locSourceGroupLabel]);
  const locScopeDistributionItems=useMemo(()=>query.data?.scopeRanges||[],[query.data]);
  const locIntersectionScopeIds=useMemo(()=>query.data?.intersectionScopeIds||[],[query.data]);
  const locDistributionStart=String(query.data?.intersectionStart||'');
  const locDistributionEnd=String(query.data?.intersectionEnd||new Date().toISOString().slice(0,10));
  const locScopeRiverItems=useMemo(()=>{
    const perScopeMax=new Map();
    let globalMax=0;
    for(const item of locScopeDistributionItems){
      const scope=String(item?.scope_id||'').trim();
      const count=Number(item?.item_count)||0;
      if(!scope)continue;
      perScopeMax.set(scope,Math.max(perScopeMax.get(scope)||0,count));
      globalMax=Math.max(globalMax,count);
    }
    const rows=locScopeDistributionItems.map((item,index)=>{
      const scope=String(item?.scope_id||'').trim();
      const day=String(item?.start_date||'').slice(0,10);
      const count=Number(item?.item_count)||0;
      return {
        ...item,
        id:item?.id||('loc-scope:'+scope+':'+day+':'+index),
        entry_id:item?.entry_id||('loc-scope:'+scope+':'+day+':'+index),
        entry_type:'scope_density',
        group_label:scope,
        category:scope,
        display_label:'',
        title:formatCultureUi(l.scopeDensityTitle,{date:day,scope,count:count.toLocaleString(locale)}),
        end_date:nextRiverDay(day),
        density_ratio:count/Math.max(1,perScopeMax.get(scope)||1),
        global_density_ratio:count/Math.max(1,globalMax)
      };
    }).filter(item=>item.group_label&&item.start_date);
    const represented=new Set(rows.map(item=>String(item.group_label||'')));
    for(const scopeId of locIntersectionScopeIds){
      const scope=String(scopeId||'').trim();
      if(!scope||represented.has(scope)||!locDistributionStart)continue;
      rows.push({
        id:'loc-scope-empty:'+scope,
        entry_id:'loc-scope-empty:'+scope,
        entry_type:'scope_density',
        scope_id:scope,
        group_label:scope,
        category:scope,
        display_label:'',
        title:formatCultureUi(l.scopeDensityTitle,{date:locDistributionStart,scope,count:'0'}),
        start_date:locDistributionStart,
        end_date:nextRiverDay(locDistributionStart),
        item_count:0,
        density_ratio:0,
        global_density_ratio:0
      });
    }
    return rows;
  },[locScopeDistributionItems,locIntersectionScopeIds,locDistributionStart,l,locale]);
  const hasTimelineSurface=isAggregateScope?Boolean(locSourceRiverItems.length||query.data?.scopes?.length):Boolean(timelineItems.length||selectedWorkPeriod?.start_date);

  function switchTimelineEditor(target,apply){
    // Reuse the edit dock's Save / Discard / Cancel safeguard when the
    // current inline form has unsaved changes. No navigation is involved.
    if(editDock?.active&&editDock.scopeId===scopeId){
      editDock.switchSection('time-record:'+target,apply);
    }else apply();
  }

  function beginTimelineCreation(type,date){
    switchTimelineEditor('new-'+type,()=>{
      // Creation must work even for periods without an exact Gregorian start day.
      const creationDate=/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))?String(date):new Date().toISOString().slice(0,10);
      setSelectedTimelineRecordId('');
      setSelectedTimelineInfo(null);
      setSuggestedRecordType(type);
      setSelectedTimelineDate(type==='anchor'?creationDate:'');
      setSuggestedRequestNonce(value=>value+1);
      setTimelineEditorRevision(value=>value+1);
    });
  }

  function beginTimelineRecordEdit(item,recordId){
    const id=String(recordId||item?.recordId||'').trim();
    if(!id)return;
    switchTimelineEditor('edit-'+id,()=>{
      const recordType=String(item?.entryType||item?.raw?.entry_type||'');
      if(recordType==='anchor'||recordType==='style_comment')setSuggestedRecordType(recordType);
      setSelectedTimelineInfo(item||null);
      setSelectedTimelineRecordId(id);
      setSelectedTimelineDate('');
      setSuggestedRequestNonce(0);
      setTimelineEditorRevision(value=>value+1);
    });
  }

  async function refreshTimelineData(){
    // An authorized Time edit invalidates the server-side numeric cache before
    // SWR retries. The SQL fallback is deliberately not used for public ISR.
    if(scopeId!=='local'&&scopeId!=='lrunes')await revalidateServerMetadata();
    await Promise.all([
      resourceCache.invalidate({queryKey:['culture-timeline',scopeId]}),
      resourceCache.invalidate({queryKey:['culture-period-settings',scopeId]}),
      resourceCache.invalidate({queryKey:['search-style-keyword']})
    ]);
  }
  async function moveTimelineRecord(item,row){
    // Dates on Time periods/events are derived exclusively from existing
    // anchor_ids. Only a real anchor point can be moved on the river.
    if(row?.entryType!=='anchor'||!row.recordId||!scopeData?.time)return null;
    try{
      // Scope permissions are enforced by the database write RPC.
      const date=dayKeyFromTimelineValue(item?.start);
      if(!date)throw new Error(l.invalidAnchorDate);
      await updateRows(scopeData.time,{
        time_date:date,
        date_status:'exact',
        year_value:null,
        updated_at:new Date().toISOString()
      },{filters:[{column:'record_id',operator:'eq',value:row.recordId}]});
      await refreshTimelineData();
      setEditError('');
      return {...item,start:date};
    }catch(error){
      setEditError(error?.message||l.moveAnchorFailed);
      return null;
    }
  }
  async function removeTimelineRecord(item,row){
    if(!row?.recordId||!scopeData?.time)return null;
    const source=row?.raw||{};
    if(row.entryType==='anchor'){
      const anchorId=String(source?.resource_id||row.resourceId||'').trim();
      const referenced=[...timelineItems,...(query.data?.styleComments||[])].some(candidate=>
        String(candidate?.entry_type||'')!=='anchor'&&
        Array.isArray(candidate?.anchor_ids)&&candidate.anchor_ids.map(String).includes(anchorId)
      );
      if(referenced){
        setEditError(l.anchorReferenced);
        return null;
      }
    }
    try{
      // Scope permissions are enforced by the database write RPC.
      await deleteRows(scopeData.time,{filters:[{column:'record_id',operator:'eq',value:row.recordId}]});
      setSelectedTimelineRecordId('');
      setSelectedTimelineDate('');
      setEditError('');
      await refreshTimelineData();
      return item;
    }catch(error){
      setEditError(error?.message||l.deleteFailed);
      return null;
    }
  }

  // The source selector drives the SECOND river, whether or not a keyword
  // style is active. LOC aggregate's own source river is separate.
  const classificationBuckets=useMemo(()=>(
    sourceSnapshotQuery.data?.buckets||[]
  ).filter(item=>!keywordDrillSource||String(item.category||'')===keywordDrillSource),
  [sourceSnapshotQuery.data,keywordDrillSource]);
  const secondRiverBuckets=classificationBuckets;
  const initialRootBuckets=sourceRootQuery.data?.rootBuckets||EMPTY_CULTURE_GROUPS;
  const densityInputBuckets=stagedSourceRiver?initialRootBuckets:secondRiverBuckets;

  const existingAnchorDates=useMemo(()=>
    timelineItems
      .filter(item=>String(item?.entry_type||'')==='anchor')
      .map(item=>String(item?.start_date||item?.date||'').slice(0,10))
      .filter(Boolean)
  ,[timelineItems]);
  // Unselected modes must not execute the density-change algorithm.
  // Import the changepoint analysis only when a visible river has data.
  // Basic timeline modes must not download the karaul detection engine eagerly.
  const [riverDensityAnalyzer,setRiverDensityAnalyzer]=useState(null);
  const needsRiverDensity=Boolean(
    isAggregateScope?locCombinedSourceRiverItems.length:
      !isLrunesDaily&&!isLocItemView&&densityInputBuckets.length
  );
  useEffect(()=>{
    if(!needsRiverDensity||riverDensityAnalyzer)return undefined;
    let active=true;
    import('../modules/culture-timeline/river-density-analysis.mjs')
      .then(module=>{
        if(active)setRiverDensityAnalyzer(()=>module.analyzeRiverDensity);
      })
      .catch(error=>{if(active)console.error('Culture river-density module failed to load',error);});
    return ()=>{active=false;};
  },[needsRiverDensity,riverDensityAnalyzer]);
  const riverAnalysis=useMemo(
    ()=>riverDensityAnalyzer&&!isAggregateScope&&!isLrunesDaily&&!isLocItemView&&densityInputBuckets.length
      ?riverDensityAnalyzer(densityInputBuckets,existingAnchorDates):EMPTY_RIVER_ANALYSIS,
    [riverDensityAnalyzer,isAggregateScope,isLrunesDaily,isLocItemView,densityInputBuckets,existingAnchorDates]
  );
  const styleRiverAnalysis=useMemo(
    ()=>riverDensityAnalyzer&&styleFilter==='rune66'&&keywordDrillItems.length
      ?riverDensityAnalyzer(keywordDrillItems,existingAnchorDates):EMPTY_RIVER_ANALYSIS,
    [riverDensityAnalyzer,styleFilter,keywordDrillItems,existingAnchorDates]
  );
  const locRiverAnalysis=useMemo(
    ()=>riverDensityAnalyzer&&isAggregateScope&&locCombinedSourceRiverItems.length
      ?riverDensityAnalyzer(locCombinedSourceRiverItems,[]):EMPTY_RIVER_ANALYSIS,
    [riverDensityAnalyzer,isAggregateScope,locCombinedSourceRiverItems]
  );
  const virtualAnchorItems=useMemo(()=>{
    const total=Math.max(1,Number(riverAnalysis.totalCount)||0);
    return riverAnalysis.suggestions.map(item=>{
      const selected=selectedVirtualAnchorDates.includes(item.date);
      const beforeCount=Number(item.beforeCount||0);
      const afterCount=Number(item.afterCount||0);
      const strength=Math.min(1,Math.abs(Number(item.afterMean||0)-Number(item.beforeMean||0))/Math.max(1,Number(item.afterMean||0),Number(item.beforeMean||0)));
      const position=periodPositionRatio(item.date,classificationWindowStart,classificationWindowEnd);
      return {
        id:'virtual-anchor:'+item.date,
        entry_id:'virtual-anchor:'+item.date,
        entry_type:'virtual_anchor',
        start_date:item.date,
        title:formatCultureUi(l.candidateTitle,{date:item.date,position:(position*100).toFixed(1),before:beforeCount.toLocaleString(locale),beforeRatio:((beforeCount/total)*100).toFixed(1),after:afterCount.toLocaleString(locale),afterRatio:((afterCount/total)*100).toFixed(1),analysis:(item.analysis||[]).join(' ')}),
        display_label:'◇',
        group_label:l.candidateAnchor,
        item_count:0,
        className:'scope-virtual-anchor'+(selected?' is-selected':''),
        style:'--virtual-anchor-strength:'+strength+';',
        virtual_anchor:{...item,position_ratio:position,before_ratio:beforeCount/total,after_ratio:afterCount/total,strength_ratio:strength}
      };
    });
  },[riverAnalysis.suggestions,riverAnalysis.totalCount,selectedVirtualAnchorDates,classificationWindowStart,classificationWindowEnd,l,locale]);
  // Three true parent lanes always exist; children are mounted inside the same
  // vis-timeline chart only when their parent is expanded.
  const showKeywordRiver=styleFilter==='rune66';
  const cultureRiver=useMemo(()=>{
    const roots=[
      {id:'system',label:l.system,order:0},
      {id:'custom',label:l.custom,order:300},
      {id:'media',label:l.media,order:600}
    ];
    const bySource=new Map();
    for(const group of groupedSources){
      for(const name of group.source_names)bySource.set(name,group);
      for(const name of group.media_types)bySource.set('媒體 · '+name,group);
    }
    const totals=new Map(),subtotals=new Map();
    const add=(map,key,count)=>map.set(key,(map.get(key)||0)+count);
    // The first paint uses compact root summaries; child data is requested on expand.
    for(const item of initialRootBuckets){
      const day=String(item.start_date||'').slice(0,10);
      if(day&&item.item_count>0)add(totals,String(item.category)+'\u0000'+day,Number(item.item_count));
    }
    for(const item of secondRiverBuckets){
      const raw=String(item.category||''),day=String(item.start_date||'').slice(0,10);
      if(!day)continue;
      const group=bySource.get(raw);
      const parent=group?.root||(raw.startsWith('媒體 · ')?'media':'custom');
      const child=group?.key||parent+':unclassified';
      const count=Number(item.item_count)||0;
      if(!stagedSourceRiver)add(totals,parent+'\u0000'+day,count);
      add(subtotals,child+'\u0000'+day,count);
    }
    const maximum=map=>{
      const result=new Map();
      for(const [key,n] of map){
        const type=key.slice(0,key.indexOf('\u0000'));
        result.set(type,Math.max(result.get(type)||0,n));
      }
      return result;
    };
    const parentMaximum=maximum(totals),childMaximum=maximum(subtotals);
    // Counts on the left are totals for the selected time window (not the
    // maximum density of a single day). Do not read any extra article rows.
    const totalCounts=map=>{
      const counts=new Map();
      for(const [key,count] of map){
        if(!Number.isFinite(count)||count<=0)continue;
        const id=key.slice(0,key.indexOf('\u0000'));
        counts.set(id,(counts.get(id)||0)+count);
      }
      return counts;
    };
    const rootCounts=totalCounts(totals),childCounts=totalCounts(subtotals);
    const numberedLabel=(label,count)=>label+'（'+count.toLocaleString(locale)+'）';
    const row=(id,day,count,label,order,max,kind)=>({
      id:'dual:'+id+':'+day,entry_id:'dual:'+id+':'+day,
      entry_type:kind,group_key:'dual:'+id,group_label:label,group_order:order,
      start_date:day,end_date:nextRiverDay(day),item_count:count,
      density_ratio:count/Math.max(1,max),display_label:'',
      title:day+' · '+label+' · '+count.toLocaleString(locale)
    });
    const items=[],groups=[];
    const activeChildren=stagedSourceRiver
      ?new Set(groupedSources.filter(group=>group.item_count>0).map(group=>group.key))
      :new Set([...subtotals].filter(([,count])=>count>0)
        .map(([key])=>key.slice(0,key.indexOf('\u0000'))));
    const activeRoots=new Set([...totals].filter(([,count])=>count>0)
      .map(([key])=>key.slice(0,key.indexOf('\u0000'))));
    for(const parent of roots){
      // Hide zero-count parent lanes in the requested interval entirely.
      const parentCount=rootCounts.get(parent.id)||0;
      if(!activeRoots.has(parent.id)||parentCount<=0)continue;
      const members=groupedSources.filter(g=>g.root===parent.id&&activeChildren.has(g.key))
        .sort((a,b)=>a.label.localeCompare(b.label,locale));
      const expanded=openCultureRoots.includes(parent.id);
      const onlyChild=members.length===1?members[0]:null;
      // A lone child *is* the visible river: do not draw its parent's
      // identical total and force an unnecessary second lane on expansion.
      const label=onlyChild?.label||parent.label;
      groups.push({id:'dual:root:'+parent.id,label:numberedLabel(label,parentCount),order:parent.order,
        className:'scope-dual-river-root',collapsible:members.length!==1,
        selectable:Boolean(onlyChild),sourceKey:onlyChild?.key||'',expanded});
      for(const [key,count] of totals){
        const [type,day]=key.split('\u0000');
        if(type===parent.id&&count>0)items.push(row('root:'+parent.id,day,count,label,parent.order,parentMaximum.get(parent.id),'source_total'));
      }
      // A lone populated child is already represented by the parent lane.
      if(!expanded||onlyChild||(stagedSourceRiver&&!sourceSnapshotQuery.data))continue;
      members.forEach((group,index)=>{
        const count=childCounts.get(group.key)||0;
        // After expansion, use the actual loaded date buckets. Empty children
        // must not create left-side labels or selectable blank lanes.
        if(count<=0)return;
        const id='dual:child:'+group.key;
        groups.push({id,label:numberedLabel(group.label,count),order:parent.order+index+1,
          className:'scope-dual-river-child',selectable:true,sourceKey:group.key});
        for(const [key,count] of subtotals){
          const [code,day]=key.split('\u0000');
          if(code===group.key&&count>0)items.push({...row('child:'+group.key,day,count,group.label,parent.order+index+1,childMaximum.get(group.key),'source_group'),source_group_code:group.key});
        }
      });
    }
    if(virtualAnchorItems.length){
      groups.push({id:'dual:source:candidates',label:l.candidateLane,order:900,className:'scope-candidate-lane'});
      items.push(...virtualAnchorItems.map(item=>({...item,group_key:'dual:source:candidates',group_label:l.candidateLane,group_order:900})));
    }
    if(showKeywordRiver){
      items.push(...keywordDrillItems.map((item,index)=>({
        ...item,id:'dual:'+String(item.id),
        group_key:'dual:keyword:'+String(item.drill_key||item.group_label||index),
        group_label:String(item.group_label||''),group_order:1000+(Number(item.group_order)||index)
      })));
      const keywordCounts=new Map();
      for(const item of keywordDrillItems){
        const key=String(item.drill_key||'');
        if(key)keywordCounts.set(key,(keywordCounts.get(key)||0)+(Number(item.item_count)||0));
      }
      for(const group of keywordGroupOptions){
        const count=keywordCounts.get(String(group.id))||0;
        if(count<=0)continue;
        groups.push({
          id:'dual:keyword:'+group.id,label:group.label+'（'+count.toLocaleString(locale)+'）',
          order:1000+Number(group.id)*100,className:'scope-dual-river-root',
          collapsible:true,expanded:keywordDrillGroup===group.id
        });
      }
    }
    return {items,groups,hasSourceData:activeRoots.size>0};
  },[groupedSources,secondRiverBuckets,initialRootBuckets,stagedSourceRiver,openCultureRoots,sourceSnapshotQuery.data,virtualAnchorItems,showKeywordRiver,keywordDrillItems,keywordGroupOptions,keywordDrillGroup,l,locale]);
  const focusedCandidate=riverAnalysis.suggestions.find(item=>item.date===focusedAnchorDate);
  const anchorInsight=focusedCandidate?{
    date:focusedCandidate.date,before:Number(focusedCandidate.beforeCount)||0,
    after:Number(focusedCandidate.afterCount)||0,reason:(focusedCandidate.analysis||[]).join(' ')
  }:null;
  useEffect(()=>{
    setSelectedVirtualAnchorDates(current=>current.filter(date=>riverAnalysis.suggestions.some(item=>item.date===date)));
    setFocusedAnchorDate(current=>riverAnalysis.suggestions.some(item=>item.date===current)?current:'');
  },[scopeId,classificationWindowStart,classificationWindowEnd,riverAnalysis.suggestions]);

  const toggleVirtualAnchor=date=>{
    setSelectedVirtualAnchorDates(current=>current.includes(date)?current.filter(item=>item!==date):[...current,date].sort());
  };

  async function createSelectedSuggestedAnchors(){
    if(creatingSuggestedAnchors||!scopeData?.time)return;
    const suggestedDates=new Set(riverAnalysis.suggestions.map(item=>item.date));
    const existingDates=new Set(existingAnchorDates);
    const dates=[...new Set(selectedVirtualAnchorDates)]
      .filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&suggestedDates.has(date)&&!existingDates.has(date));
    if(!dates.length){setEditError('目前沒有可新增的建議定錨點。');return;}
    setCreatingSuggestedAnchors(true);setEditError('');
    try{
      // Only this explicitly requested bulk write needs the extra foreground
      // authorization check. The database RPC remains the final guard.
      const verified=await account.refresh();
      if(!verified?.authorizer?.canManageScopeSync(scopeId))throw new Error('請先登入具備此 Scope 權限的帳號。');
      const updatedAt=new Date().toISOString();
      await insertRows(scopeData.time,dates.map(date=>({
        record_type:'anchor',label:'建議定錨 '+date,
        resource_id:'anchor:'+globalThis.crypto.randomUUID(),
        note:null,status:'active',display_order:null,visibility:null,
        time_date:date,anchor_ids:null,date_status:'exact',year_value:null,
        updated_at:updatedAt
      })));
      setSelectedVirtualAnchorDates([]);
      await refreshTimelineData();
    }catch(error){setEditError(String(error?.message||error));}
    finally{setCreatingSuggestedAnchors(false);}
  }

  async function startEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid)return;
    const key=String(work?.key||('galaxy:'+uid));
    setEditingWorkKey(key);setEditDraft(null);setAuthorizedWorkKey('');setEditError('');
    try{
      // Editing is offered to every reader, but only an authorized Scope
      // editor may load an editable draft after clicking the button.
      const verified=await account.refresh();
      if(!verified?.authorizer?.canManageScopeSync(scopeId))throw new Error('請先登入具有此 Scope 編輯權限的帳號。');
      setAuthorizedWorkKey(key);
      if(!scopeData)throw new Error(l.sourceUnresolved);
      const {rows=[]}=await selectRows(scopeData.galaxy,{
        columns:'uid,title,content,searchable',
        filters:[{column:'uid',operator:'eq',value:uid}],
        limit:1
      });
      const row=rows[0];
      if(!row)throw new Error(l.workNotFound);
      const {plainTextToBlocks}=await import('../../loc/blocknote-content.mjs');
      setEditDraft({
        title:String(row.title||work.title||''),
        body:String(row.content||''),
        bodyHtml:String(row.content||''),
        bodyBlocks:plainTextToBlocks(String(row.content||'')),
        editorKey:uid,
        hidden:row.searchable===false
      });
    }catch(exception){
      setEditingWorkKey('');setAuthorizedWorkKey('');
      const message=String(exception?.message||exception||l.editReadFailed);
      setEditError(message);setFullTextError(message);
    }
  }

  async function saveEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid||!editDraft)return;
    setEditBusy(true);setEditError('');
    try{
      if(!scopeData)throw new Error(l.sourceUnresolved);
      const {blocksToPlainText}=await import('../../loc/blocknote-content.mjs');
      const content=await requireGalaxyContent(editDraft.bodyHtml??blocksToPlainText(editDraft.bodyBlocks));
      const plainBody=blocksToPlainText(editDraft.bodyHtml??editDraft.bodyBlocks);
      await updateRows(scopeData.galaxy,{
        title:resolveGalaxyTitle(editDraft.title,plainBody),
        content,
        searchable:editDraft.hidden!==true,
        UpdateTime:new Date().toISOString()
      },{filters:[{column:'uid',operator:'eq',value:uid}]});
      const key=String(work?.key||('galaxy:'+uid));
      if(fullTextKey===key)setFullText(content);
      setEditingWorkKey('');setAuthorizedWorkKey('');setEditDraft(null);
      periodWorksPage.reload();
    }catch(exception){
      setEditError(String(exception?.message||exception||l.saveFailed));
    }finally{
      setEditBusy(false);
    }
  }

  async function deleteEditingWork(work){
    const uid=String(work?.uid||'').trim();
    if(!uid)return;
    setEditBusy(true);setEditError('');
    try{
      if(!scopeData)throw new Error(l.sourceUnresolved);
      await deleteRows(scopeData.galaxy,{filters:[{column:'uid',operator:'eq',value:uid}]});
      const key=String(work?.key||('galaxy:'+uid));
      if(fullTextKey===key){setFullTextKey('');setFullText('');}
      setEditingWorkKey('');setAuthorizedWorkKey('');setEditDraft(null);
      periodWorksPage.reload();
    }catch(exception){
      setEditError(String(exception?.message||exception||l.deleteFailed));
    }finally{setEditBusy(false)}
  }

  async function toggleWorkContent(work){
    const uid=String(work?.uid||'').trim();
    if(!uid)return;
    const key=String(work?.key||('galaxy:'+uid));
    if(fullTextKey===key){
      setFullTextKey('');
      setFullText('');
      setFullTextError('');
      return;
    }
    setFullTextKey(key);
    setFullText('');
    setFullTextError('');
    setFullTextLoading(true);
    try{
      if(!scopeData)throw new Error(l.sourceUnresolved);
      const row=await selectGalaxyContent(scopeData,uid);
      if(!row)throw new Error(l.workNotFound);
      setFullText(workDisplayText(row.content||''));
    }catch(exception){
      setFullTextError(String(exception?.message||exception||l.fullTextFailed));
    }finally{
      setFullTextLoading(false);
    }
  }

  // The dedicated management entry is already in edit mode. Only its selected
  // record kind appears on the right, with the same native zoom/pan controls.
  if(isTimeEditingView){
    const editorAvailable=Boolean(scopeId&&scopeId!=='loc');
    const permissionPending=account.loading||account.permissionLoading;
    const editorAuthorized=Boolean(account.user&&account.canManageScopeSync(scopeId));
    const choice=TIME_EDITOR_SECTIONS.find(item=>item.value===timeEditorSection)||TIME_EDITOR_SECTIONS[0];
    return <FeaturePage featureId="culture">
      <section className='loc-card scope-feature-card scope-feature-card-wide'>
        <h2>時間編輯</h2>
        {!editorAvailable?<p className='scope-status'>此區沒有個別 Scope 的時間編輯資料。</p>:null}
        {editorAvailable&&permissionPending?<p className='scope-status' role='status'>正在確認此 Scope 的編輯權限…</p>:null}
        {editorAvailable&&!permissionPending&&!editorAuthorized?<p className='scope-status scope-error' role='alert'>
          {account.error?String(account.error):account.user?'目前登入帳號沒有此 Scope 的管理權限。':'請先至設定首頁登入，才能編輯時間定錨。'}
        </p>:null}
        {editorAvailable&&!permissionPending&&editorAuthorized?<div className='management-workspace scope-time-edit-workspace'>
          <ManagementSectionNav id='time-editor-sections' title='編輯項目'
            panelId='time-editor-panel' items={TIME_EDITOR_SECTIONS}
            value={timeEditorSection} onChange={next=>{
              if(next===timeEditorSection)return;
              const apply=()=>{
                setTimeEditorSection(next);
                setSelectedTimelineRecordId('');
                setSelectedTimelineInfo(null);
                setSelectedTimelineDate('');
                setSuggestedRecordType(next==='anchor-style'?'anchor':next);
                setSuggestedRequestNonce(0);
                setTimelineEditorRevision(value=>value+1);
              };
              if(editDock?.active)editDock.switchSection(next,apply);
              else apply();
            }}/>
          <div className='management-workspace-panel' id='time-editor-panel' role='region'
            aria-labelledby={'time-editor-sections-option-'+choice.value}>
            <div className='scope-culture-timeline-tools'>
              <h3>{choice.label}｜時間長河</h3>
            </div>
            {query.isPending?<p className='scope-status' role='status'>正在載入時間紀錄…</p>:null}
            {query.error?<p className='scope-status scope-error' role='alert'>{featureDataErrorMessage(query.error,UI_COPY)}</p>:null}
            {!query.isPending&&!query.error?<CultureTimeline
              key={'time-editor-'+timeEditorSection}
              items={timeEditorItems}
              labelOf={localizedLabelOf}
              focus={EMPTY_RIVER_FOCUS}
              mode='overview'
              windowStart={currentStructureStart}
              windowEnd={currentStructureEnd}
              onTimeClick={timeEditorSection==='anchor-style'?date=>beginTimelineCreation('anchor',date):null}
              onSelect={item=>beginTimelineRecordEdit(item)}
              editable
              onMove={moveTimelineRecord}
              onUpdate={(item,row)=>{
                beginTimelineRecordEdit(item,row?.recordId);
                return null;
              }}
              onRemove={removeTimelineRecord}
            />:null}
            {selectedTimelineInfo?<div className='scope-card scope-culture-timeline-selection' role='status'>
              <strong>{selectedTimelineInfo.content||selectedTimelineInfo.title||'時間紀錄'}</strong>
              <p className='scope-status'>{String(selectedTimelineInfo.start||'').slice(0,10)}{selectedTimelineInfo.end?' ～ '+String(selectedTimelineInfo.end).slice(0,10):''}</p>
            </div>:null}
            <div className='scope-culture-time-input-area'>
              {timeEditorSection==='anchor-style'?<div className='scope-culture-record-kind' role='group' aria-label='新增或編輯類型'>
                <button type='button' aria-pressed={selectedTimelineRecordId?String(selectedTimelineInfo?.entryType||selectedTimelineInfo?.raw?.entry_type)==='anchor':suggestedRecordType!=='style_comment'}
                  className='loc-button' onClick={()=>beginTimelineCreation('anchor','')}>定錨點</button>
                <button type='button' aria-pressed={selectedTimelineRecordId?String(selectedTimelineInfo?.entryType||selectedTimelineInfo?.raw?.entry_type)==='style_comment':suggestedRecordType==='style_comment'}
                  className='loc-button' onClick={()=>beginTimelineCreation('style_comment','')}>風格標籤</button>
              </div>:null}
              <CultureTimelineEditor key={scopeId+':'+timeEditorSection+':'+timelineEditorRevision}
                scopeId={scopeId}
                timeTable={scopeData?.time||''}
                selectedRecordId={selectedTimelineRecordId}
                suggestedAnchorDate={selectedTimelineDate}
                suggestedRecordType={suggestedRecordType}
                defaultRecordType={timeEditorSection==='anchor-style'?(suggestedRecordType==='style_comment'?'style_comment':'anchor'):timeEditorSection}
                suggestedRequestNonce={suggestedRequestNonce}
                onClose={()=>{setSelectedTimelineRecordId('');setSelectedTimelineDate('');setSelectedTimelineInfo(null);setSuggestedRequestNonce(0)}}/>
            </div>
            {editError?<p className='scope-status scope-error' role='alert'>{editError}</p>:null}
          </div>
        </div>:null}
      </section>
    </FeaturePage>;
  }

  return <FeaturePage featureId="culture">
    <section className='loc-card scope-feature-card scope-feature-card-wide'>
      {scopeId==='lrunes'?<div className='scope-stat-controls'><label><span><UiText id="uiExtra.cultureView.timelineContent"/></span>
        <select className='scope-select' value={lrunesView} onChange={event=>setLrunesView(event.target.value)}>
          <option value='daily'><UiText id="uiExtra.cultureView.dailyRunes"/></option>
          <option value='works'><UiText id="uiExtra.cultureView.worksAndPeriods"/></option>
        </select>
      </label></div>:null}
      {scopeId==='loc'?<div className='scope-stat-controls'><label><span>{UI_COPY.culture.viewMode}</span>
        <select className='scope-select' aria-label={UI_COPY.culture.viewMode} value={locCultureView} onChange={event=>setLocCultureView(event.target.value)}>
          <option value='period'><UiText id="uiExtra.cultureView.periodIntersectionWorks"/></option>
          <option value='item'><UiText id="uiExtra.cultureView.itemIntersectionTwoRivers"/></option>
        </select>
      </label></div>:null}
      {isLrunesDaily?<LrunesDailyCulturePanel/>:isLocItemView?<LocItemConfluence/>:<>
      <p className='loc-eyebrow'>{UI_COPY.culture.distribution}</p>
      <h2>{UI_COPY.culture.river}</h2>
      {query.isPending?<p className="scope-status" role="status" aria-live="polite">{UI_COPY.common.loading}</p>:null}
      {query.error?<p className='scope-status scope-error'>{featureDataErrorMessage(query.error,UI_COPY)}</p>:null}
      {!query.isPending&&!query.error&&!hasTimelineSurface?<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>:null}
      {!query.isPending&&!query.error&&hasTimelineSurface?<>


            {isAggregateScope?<>

              <section className='scope-card scope-culture-classification-river scope-loc-time-river'>
                <p className='loc-eyebrow'>{UI_COPY.culture.distribution}</p>
                <h3>{UI_COPY.culture.intersectionRiver}</h3>
                {locScopeRiverItems.length?<CultureTimeline
                  items={locScopeRiverItems}
                  labelOf={emptyRiverLabel}
                  focus={EMPTY_RIVER_FOCUS}
                  mode='source'
                  windowStart={requestedWindowStart||locDistributionStart}
                  windowEnd={requestedWindowEnd||locDistributionEnd}
                  fixedMin={locDistributionStart}
                  fixedMax={locDistributionEnd}
                  hiddenDates={locRiverAnalysis.hiddenDates}
                />:null}
                <div className='scope-result-links'>
                  {locIntersectionScopeIds.map(id=><ScopeLink key={id} href={featureNavigationHref(id,'culture')}>{id}{l.personalTimelineSuffix}</ScopeLink>)}
                </div>
                {locCombinedSourceRiverItems.length?<section className='scope-culture-combined-source-river'>
                  <p className='loc-eyebrow'>{UI_COPY.culture.combinedSources}</p>
                  <h4>{UI_COPY.culture.combinedRiver}</h4>
                  <CultureTimeline
                    items={locCombinedSourceRiverItems}
                    labelOf={emptyRiverLabel}
                    focus={EMPTY_RIVER_FOCUS}
                    mode='source'
                    windowStart={requestedWindowStart||locDistributionStart}
                    windowEnd={requestedWindowEnd||locDistributionEnd}
                    fixedMin={locDistributionStart}
                    fixedMax={locDistributionEnd}
                    hiddenDates={locRiverAnalysis.hiddenDates}
                  />
                </section>:null}

              </section>


            </>:<>
              <section className='scope-card scope-culture-structure-river'>
                <h3>{UI_COPY.culture.structure}</h3>
                {timelineItems.length?<CultureTimeline
                  items={timelineItems}
                  labelOf={localizedLabelOf}
                  focus={navigation}
                  mode='overview'
                  windowStart={(keywordPeriodKey==='custom'||cultureTimeKind==='event')&&keywordWindowValid?keywordWindowStart:currentStructureStart}
                  windowEnd={(keywordPeriodKey==='custom'||cultureTimeKind==='event')&&keywordWindowValid?keywordWindowEnd:currentStructureEnd}
                  onSelect={item=>setSelectedTimelineInfo(item||null)}
                  editable={false}
                />:<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>}
                {selectedTimelineInfo?<div className='scope-card scope-culture-timeline-selection' role='status'>
                  <strong>{selectedTimelineInfo.content||selectedTimelineInfo.raw?.display_label||selectedTimelineInfo.title||translateUiField(locale,'時間長河紀錄')}</strong>
                  <p className='scope-status'>{String(selectedTimelineInfo.start||'').slice(0,10)}{selectedTimelineInfo.end?' ～ '+String(selectedTimelineInfo.end).slice(0,10):''}</p>
                  {selectedTimelineInfo.title?<p>{selectedTimelineInfo.title}</p>:null}
                </div>:null}
              </section>

              {selectedWorkPeriod?<section className='scope-card scope-culture-classification-river'>
                <div className='scope-culture-river-toolbar'>
                  <h3>{UI_COPY.culture.classificationRiver}｜{classificationPeriodLabel}</h3>
                  <div className='scope-culture-river-selectors'>
                    <div className='scope-culture-time-picker'>
                      <label>
                        <select className='scope-select' aria-label={l.periodLabel} value={cultureTimeKind}
                          onChange={event=>{
                            const kind=event.target.value;
                            setCultureTimeKind(kind);
                            if(kind==='event'){
                              setKeywordPeriodKey(cultureEventOptions.length
                                ?'event:'+String(cultureEventOptions[0].id||cultureEventOptions[0].entry_id||cultureEventOptions[0].record_id):'');
                            }else{
                              setKeywordPeriodKey('latest');
                              setSelectedPeriodKey(periodKey(latestPeriod)||'all');
                            }
                          }}>
                          <option value='period'>{l.period}</option>
                          <option value='event'>{l.eventOption}</option>
                        </select>
                      </label>
                      <span aria-hidden='true'>：</span>
                      <label>
                        <select className='scope-select' aria-label={cultureTimeKind==='event'?l.eventOption:l.period}
                          value={keywordPeriodKey} onChange={event=>{
                            const next=event.target.value;
                            if(cultureTimeKind==='period'&&next==='custom'){
                              if(!keywordCustomStart)setKeywordCustomStart(keywordWindowStart);
                              if(!keywordCustomEnd)setKeywordCustomEnd(keywordWindowEnd);
                            }
                            setKeywordPeriodKey(next);
                            if(cultureTimeKind==='event')return;
                            if(next==='latest')setSelectedPeriodKey(periodKey(latestPeriod)||'all');
                            else if(next==='all')setSelectedPeriodKey('all');
                            else if(next!=='custom')setSelectedPeriodKey(next);
                          }}>
                          {cultureTimeKind==='event'
                            ?(cultureEventOptions.length
                              ?cultureEventOptions.map(item=><option key={item.id||item.entry_id||item.record_id}
                                  value={'event:'+String(item.id||item.entry_id||item.record_id)}>{localizedLabelOf(item,0)}</option>)
                              :<option value=''>{l.eventOption}</option>)
                            :<>
                              <option value='latest'>{l.recentPeriod}</option>
                              <option value='all'>{l.allPeriods}</option>
                              {primaryPeriods.map(item=><option key={periodKey(item)} value={periodKey(item)}>{localizedLabelOf(item,0)}</option>)}
                              <option value='custom'>{l.customPeriod}</option>
                            </>}
                        </select>
                      </label>
                    </div>
                    <label><span>{l.styleLabel}</span>
                      <select className='scope-select' aria-label={l.styleLabel} value={styleFilter}
                        onFocus={()=>setKeywordOptionsScope(scopeId)}
                        onPointerDown={()=>setKeywordOptionsScope(scopeId)}
                        onChange={event=>{setStyleFilter(event.target.value);setKeywordDrillGroup('');}}>
                        <option value='none'>{l.noStyle}</option>
                        <option value='rune66' disabled={!keywordClassQuery.data}>
                          {keywordClassQuery.data?keywordClassQuery.data:l.keywordStyle}
                        </option>
                      </select>
                    </label>
                    {cultureTimeKind==='period'&&keywordPeriodKey==='custom'?<>
                      <label><span>{l.period}</span><input className='scope-select' aria-label={l.customPeriod} type='date'
                        value={keywordCustomStart} max={keywordCustomEnd||undefined}
                        onChange={event=>setKeywordCustomStart(event.target.value)}/></label>
                      <label><span>～</span><input className='scope-select' aria-label={l.customPeriod} type='date'
                        value={keywordCustomEnd} min={keywordCustomStart||undefined}
                        onChange={event=>setKeywordCustomEnd(event.target.value)}/></label>
                    </>:null}
                  </div>
                  {riverRangeLoading?<span className='scope-status' role='status'>{UI_COPY.common.loading}</span>:null}
                </div>
                {styleFilter==='rune66'?<section className='scope-culture-style-filter'>
                  <p className='loc-eyebrow'>下半河道｜關鍵詞：{String(styleQuery.data?.keywordMeta?.class_name||keywordClassQuery.data||'尚未設定')}</p>
                  <div className='scope-stat-controls'>
                    {keywordDrillGroup?<button type='button' className='loc-button' onClick={()=>setKeywordDrillGroup('')}>← 返回群組總覽</button>
                      :keywordDrillSource?<button type='button' className='loc-button' onClick={()=>setKeywordDrillSource('')}>← 返回全部來源</button>:null}
                    <span className='scope-status' aria-live='polite'>
                      {classificationPeriodLabel} → {keywordDrillSource||'全部來源'} → {keywordDrillGroup
                        ?String(styleQuery.data?.keywordMeta?.classes?.[keywordDrillGroup]||'群組')+' · Group 分布'
                        :'全部群組'}
                    </span>
                  </div>
                  <h4>{keywordDrillGroup?'Class 內 Group 列表｜'+String(styleQuery.data?.keywordMeta?.classes?.[keywordDrillGroup]||'群組'):'Class 列表'}</h4>
                  {!keywordWindowValid?<p className='scope-status scope-error' role='status'>請選擇有效的時間區間。</p>:null}
                  {styleRiverAnalysis.suggestions.length>0?<details className='scope-culture-anchor-picker'>
                    <summary>風格密度建議定錨點：{styleRiverAnalysis.suggestions.length} 個（點開查看）</summary>
                    {styleRiverAnalysis.suggestions.length?<div className='scope-culture-anchor-choices'>
                      {styleRiverAnalysis.suggestions.map(item=>{
                        const route=featureNavigationHref(scopeId,'culture');
                        const href=route+(route.includes('?')?'&':'?')+'edit=1&anchorDate='+encodeURIComponent(item.date);
                        return <div key={item.date} className='scope-status'>
                          <strong>{item.date}</strong>
                          <span>｜前 3 日 {Number(item.beforeCount||0).toLocaleString(locale)} 次／後 3 日 {Number(item.afterCount||0).toLocaleString(locale)} 次</span>
                          {(item.analysis||[]).length?<span>｜{item.analysis.join(' ')}</span>:null}
                          <span>｜<ScopeLink href={href}>前往時間編輯，確認定錨點</ScopeLink></span>
                        </div>;
                      })}
                    </div>:<p className='scope-status'>此時間區間暫無足夠的風格密度變化，或分析資料尚在載入。</p>}
                  </details>:null}
                  {styleQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(styleQuery.error,UI_COPY)}</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&!styleQuery.data?.staticstime?<p className='scope-status'>關鍵詞尚未定錨；請先於關鍵詞設定完成分析。</p>:null}
                  {!styleQuery.isPending&&!styleQuery.error&&styleQuery.data?.staticstime&&!styleQuery.data?.statisticsEnabled?<p className='scope-status'>目前關鍵詞統計尚未啟用。</p>:null}
                  {keywordDetailRequested&&keywordDensityQuery.isPending&&styleQuery.data?.statisticsEnabled
                    ?<p className='scope-status' role='status'>正在讀取所選來源／群組的文章屬性…</p>:null}
                  {keywordDrillGroup&&keywordGroupCatalogQuery.isPending?<p className='scope-status' role='status'>正在載入所選群組的 Group 分布…</p>:null}
                  {keywordRiverError||keywordGroupCatalogQuery.error
                    ?<p className='scope-status scope-error'>{featureDataErrorMessage(keywordRiverError||keywordGroupCatalogQuery.error,UI_COPY)}</p>:null}
                  {!keywordRiverPending&&(!keywordDrillGroup||!keywordGroupCatalogQuery.isPending)
                    &&!keywordRiverError&&!styleQuery.error&&!keywordGroupCatalogQuery.error&&!keywordDrillItems.length
                    ?<p className='scope-status'>此範圍沒有可顯示的命中資料。</p>:null}
                </section>:null}
                {!classificationWindowValid?<p className='scope-status scope-error' role='status'>請選擇有效的時間區間（起始日期不得晚於結束日期）。</p>:null}
                {sourceRootQuery.error?<p className='scope-status scope-error'>{featureDataErrorMessage(sourceRootQuery.error,UI_COPY)}</p>:null}
                {[systemChildrenQuery.error,customChildrenQuery.error,mediaChildrenQuery.error,sourceSnapshotQuery.error]
                  .filter(Boolean).map((error,index)=><p key={index} className='scope-status scope-error' role='alert'>
                    {featureDataErrorMessage(error,UI_COPY)}</p>)}
                {stagedSourceRiver&&openCultureRoots.length>0&&
                  (systemChildrenQuery.isPending||customChildrenQuery.isPending||mediaChildrenQuery.isPending||sourceSnapshotQuery.isPending)
                  ?<p className='scope-status' role='status'>正在讀取展開河道的細部分布…</p>:null}
                {!riverRangeLoading&&riverAnalysis.suggestions.length>0?<div className='scope-culture-anchor-actions'>
                  <span>{formatCultureUi(l.candidateSummary,{count:riverAnalysis.suggestions.length})}</span>
                  <button type='button' className='loc-button' disabled={creatingSuggestedAnchors||!selectedVirtualAnchorDates.length}
                    onClick={createSelectedSuggestedAnchors}>
                    {creatingSuggestedAnchors?'正在新增…':'新增選取的建議定錨點（'+selectedVirtualAnchorDates.length+'）'}
                  </button>
                  {editError?<p className='scope-status scope-error' role='alert'>{editError}</p>:null}
                  <details className='scope-culture-anchor-picker'>
                    <summary><UiText id="uiExtra.cultureView.expandToCompareWorkVolumeChanges"/></summary>
                    <div className='scope-culture-anchor-choices'>
                      {riverAnalysis.suggestions.map(item=>{
                        const route=featureNavigationHref(scopeId,'culture');
                        const href=route+(route.includes('?')?'&':'?')+'edit=1&anchorDate='+encodeURIComponent(item.date);
                        return <div key={item.date} className='scope-status'>
                          <label><input type='checkbox' checked={selectedVirtualAnchorDates.includes(item.date)}
                            onChange={()=>toggleVirtualAnchor(item.date)}/>
                            {formatCultureUi(l.candidateComparison,{date:item.date,before:Number(item.beforeCount||0).toLocaleString(locale),after:Number(item.afterCount||0).toLocaleString(locale),analysis:(item.analysis||[]).join(' ')})}
                          </label>
                          <ScopeLink href={href}>前往時間編輯</ScopeLink>
                        </div>;
                      })}
                    </div>
                  </details>
                </div>:null}
                {classificationWindowValid&&!(stagedSourceRiver?sourceRootQuery.error:sourceSnapshotQuery.error)
                  &&(stagedSourceRiver?sourceRootQuery.data:sourceSnapshotQuery.data)
                  &&!cultureRiver.hasSourceData
                  ?<div className='scope-card scope-status scope-culture-no-data' role='status'>{l.noDataInPeriod}</div>:null}
                {/* Never mount vis-timeline over an empty/pending source snapshot:
                    on first entry it otherwise creates an unready chart and then
                    replaces its DOM while groups and density analysis arrive. */}
                {classificationWindowValid&&!(stagedSourceRiver?sourceRootQuery.error:sourceSnapshotQuery.error)
                  &&(stagedSourceRiver?sourceRootQuery.data:sourceSnapshotQuery.data)&&cultureRiver.hasSourceData
                  ?<div className='scope-culture-double-river'>
                  <CultureTimeline
                    items={cultureRiver.items}
                    extraGroups={cultureRiver.groups}
                    onGroupToggle={id=>{
                      if(id.startsWith('dual:keyword:')){
                        const groupId=id.slice('dual:keyword:'.length);
                        if(keywordGroupOptions.some(group=>group.id===groupId))
                          setKeywordDrillGroup(current=>current===groupId?'':groupId);
                        return;
                      }
                      if(!id.startsWith('dual:root:'))return;
                      const key=id.slice('dual:root:'.length);
                      setOpenCultureRoots(current=>current.includes(key)
                        ?current.filter(value=>value!==key):[...current,key]);
                    }}
                    onGroupSelect={id=>{
                      const key=cultureRiver.groups.find(group=>group.id===id)?.sourceKey
                        ||id.replace('dual:child:','');
                      setSelectedRiverGroup(current=>current===key?'':key);
                      setSelectedCategory('');
                      setWorksOpen(true);
                    }}
                    anchorInsight={anchorInsight}
                    anchorLabels={{date:l.candidateDate,before:l.candidateBefore,after:l.candidateAfter,reason:l.candidateReason,close:l.candidateClose}}
                    onAnchorClose={()=>setFocusedAnchorDate('')}
                    heightVariant='double'
                    labelOf={classificationRiverLabel}
                    focus={EMPTY_RIVER_FOCUS}
                    mode='source'
                    windowStart={classificationWindowStart}
                    windowEnd={classificationWindowEnd}
                    hiddenDates={riverAnalysis.hiddenDates}
                    onSelect={item=>{
                      if(item?.entryType==='virtual_anchor'){
                        const date=String(item?.start||'').slice(0,10);
                        setFocusedAnchorDate(date);
                        toggleVirtualAnchor(date);
                        return;
                      }
                      if(item?.entryType==='keyword_density'){
                        const key=String(item?.raw?.drill_key||'').trim();
                        if(key&&!keywordDrillGroup)setKeywordDrillGroup(key);
                        return;
                      }
                      if(item?.entryType==='source_group'){
                        setSelectedRiverGroup(String(item.raw?.source_group_code||''));
                        setSelectedCategory('');
                        setWorksOpen(true);
                        return;
                      }
                      if(item?.entryType!=='source')return;
                      const term=String(item?.raw?.category||'').trim();
                      const key='source:'+term;
                      if(term&&categoryGroups.some(group=>group.category_key===key)){
                        setSelectedRiverGroup('');
                        setSelectedCategory(key);
                      }
                    }}
                  />
                  {showKeywordRiver&&keywordDrillGroup?<section className='scope-culture-rune-list'
                    role='region' aria-label={(styleQuery.data?.keywordMeta?.classes?.[keywordDrillGroup]||'符文群組')+'符文列表'}>
                    <header>
                      <strong>{styleQuery.data?.keywordMeta?.classes?.[keywordDrillGroup]||'群組'}｜符文列表</strong>
                      <button className='loc-button' type='button' onClick={()=>setKeywordDrillGroup('')}>收合符文列表</button>
                    </header>
                    {keywordGroupCatalogQuery.isPending?<p className='scope-status' role='status'>正在載入此群組的符文…</p>:null}
                    {keywordGroupCatalogQuery.error?<p className='scope-status scope-error' role='alert'>{featureDataErrorMessage(keywordGroupCatalogQuery.error,UI_COPY)}</p>:null}
                    {keywordGroupCatalogQuery.data?.length?<ul>
                      {keywordGroupCatalogQuery.data.map(rune=>{
                        const matched=(styleQuery.data?.runeTotals||[]).find(item=>Number(item.rune_id)===Number(rune.item_no));
                        return <li key={rune.item_no}>
                          <strong>{rune.item_no} · {rune.item_name}</strong>
                          <span>{Number(matched?.count||0).toLocaleString(locale)} 次命中</span>
                        </li>;
                      })}
                    </ul>:null}
                    {keywordGroupCatalogQuery.data&&!keywordGroupCatalogQuery.data.length
                      ?<p className='scope-status'>此群組目前沒有符文項目。</p>:null}
                  </section>:null}
                </div>:null}
                {(!(stagedSourceRiver?sourceRootQuery.error:sourceSnapshotQuery.error)
                  &&(stagedSourceRiver?sourceRootQuery.data:sourceSnapshotQuery.data)&&cultureRiver.hasSourceData)?<details className='scope-culture-source-detail' open={worksOpen} onToggle={event=>setWorksOpen(event.currentTarget.open)}>
                  <summary>點開文章列表</summary>
                  {worksOpen?<><header style={{display:'flex',justifyContent:'space-between',gap:'.75rem',alignItems:'center',flexWrap:'wrap'}}>
                    {selectedGroup?<button type='button' className='scope-pagination-button' onClick={()=>setSelectedCategory('')}>{UI_COPY.culture.showAllWorks}</button>:<span/>}
                    <ArticleSortSelect value={articleSort} onChange={setArticleSort} disabled={Boolean(editingWorkKey)}/>
                  </header>
                  {periodWorksPage.error?<p className='scope-status scope-error'>{featureDataErrorMessage(periodWorksPage.error,UI_COPY)} <button type='button' className='loc-button' onClick={periodWorksPage.reload}><UiText id="uiExtra.cultureView.reloadWorks"/></button></p>:null}
                  {periodWorksPage.loading&&!visibleWorkRows.length?<p role='status' className='scope-status'>{l.loadingPeriodWorks}</p>:null}
                  <IncrementalList
                    items={visibleWorkRows}
                    batchSize={DEFAULT_LIST_BATCH_SIZE}
                    resetKey={classificationWindowStart+'|'+classificationWindowEnd+'|'+selectedCategory+'|'+selectedRiverGroup+'|source|'+articleSort}
                    className='scope-culture-source-work-scroll'
                    externalHasMore={periodWorksPage.hasMore}
                    loading={periodWorksPage.loading}
                    error={periodWorksPage.error}
                    onLoadMore={periodWorksPage.loadNext}
                    scrollRootRef={workScrollRef}
                    renderItem={(work,index)=>{
                      const workKey=String(work.key||('galaxy:'+work.uid));
                      const canEditWork=authorizedWorkKey===workKey;
                      return <Article
                      key={work.key||work.uid||work.entry_id||String(work.createtime||work.created_at)+'-'+index}
                      uid={work.uid}
                      title={workDisplayHeading(work,{media:false,limit:80})}
                      source={work.source_name||work.group_label||''}
                      scopeId={work.scope_id||classificationScope}
                      date={work.display_date||CultureTimelineModel.formatCultureDateTime(work.createtime||work.created_at)}
                      body={editingWorkKey===workKey&&editDraft?'':work.description||work.media_metadata_text||''}
                      relationLinks={galaxyRelationLinks(classificationScope,work)}
                      links={work.links||[]}
                      editable={canEditWork}
                      editing={editingWorkKey===workKey}
                      onEdit={uid=>startEditingWork({...work,uid})}
                      editorDraft={editingWorkKey===workKey?editDraft:null}
                      onDraftChange={setEditDraft}
                      onSave={()=>saveEditingWork(work)}
                      onDelete={()=>deleteEditingWork(work)}
                      onCancel={()=>{setEditingWorkKey('');setAuthorizedWorkKey('');setEditDraft(null);setEditError('')}}
                      editBusy={editBusy}
                      editError={editError}
                      showHidden
                    >
                      {work.uid&&editingWorkKey!==workKey?<div className="scope-work-fulltext-row">
                        <WorkFullText
                          open={fullTextKey===workKey}
                          loading={fullTextLoading&&fullTextKey===workKey}
                          error={fullTextKey===workKey?fullTextError:''}
                          content={fullTextKey===workKey?fullText:''}
                          onToggle={()=>toggleWorkContent(work)}
                        />
                        {fullTextKey===workKey?<button type='button' className='loc-button scope-work-edit-button'
                          onClick={()=>startEditingWork(work)}>編輯</button>:null}
                        
                      </div>:null}
                    </Article>;
                    }}
                  />
                  {!periodWorksPage.loading&&!periodWorksPage.error&&!visibleWorkRows.length?<p className='scope-status'>{UI_COPY.uiExtra.dataErrors.empty}</p>:null}
                  </>:null}
                </details>:null}
              </section>:null}
            </>}
      </>:null}
      </>}
    </section>
  </FeaturePage>;
}
