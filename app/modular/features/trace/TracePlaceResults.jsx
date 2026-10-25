'use client';

import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {useAsyncInfiniteResource,useAsyncResource} from '../../../loc/use-async-resource';
import {selectRows,selectAllRows} from '../../../loc/db-query.mjs';
import {traceArticleFilters,groupedTraceDays,traceMediaMatches} from './trace-panel-filters.mjs';
import {defaultScopeData} from '../../../loc/scope-data';
import {readNumericIsr,usesNumericIsr} from '../../../loc/numeric-isr-client';
import {traceArticlePlaces} from './trace-article-places.mjs';
import Article from '../../Article';
import {ArticleSortSelect,IncrementalList,WorkFullText} from '../../ui';

const CultureTimeline=dynamic(()=>import('../../modules/culture-timeline/CultureTimeline'),{loading:()=> <p className="scope-status">正在開啟時間長河…</p>});
const StatisticsMultiChart=dynamic(()=>import('../../modules/statistics/StatisticsMultiChart'),{loading:()=> <p className="scope-status">正在開啟統計圖…</p>});
const PAGE_SIZE=40;
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));

function TraceWork({row,scope}){
  const [opened,setOpened]=useState(false);
  const body=useAsyncResource({
    queryKey:['trace-work-content',scope?.id,row.uid],
    enabled:opened&&Boolean(scope?.galaxy&&row.uid),
    queryFn:async()=>{
      const {rows}=await selectRows(scope.galaxy,{
        columns:'uid,content',filters:[{column:'uid',operator:'eq',value:row.uid},
          {column:'searchable',operator:'eq',value:true}],limit:1
      });
      return String(rows[0]?.content||'');
    },
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  return <Article uid={row.uid} title={row.title||'未命名文章'}
    date={String(row.createtime||'').slice(0,10)}
    source={row.source_name||''} checkInPlace={row.source_place||''}
    scopeId={scope?.id} editOnCardClick={false}>
    <WorkFullText open={opened} loading={opened&&body.isPending}
      error={body.error?String(body.error.message||body.error):''}
      content={body.data||''} showToggle={false}/>
    <button type="button" className="loc-button" aria-expanded={opened}
      onClick={()=>setOpened(x=>!x)}>{opened?'收合文章':'閱讀文章'}</button>
  </Article>;
}

export default function TracePlaceResults({place=null,anchors=[],scopeId='',period=null,
  tab='articles',sourceName='',mediaType='',dateRange=null}){
  const [sort,setSort]=useState('desc');
  const [chartType,setChartType]=useState('bar');
  const [showAllVisits,setShowAllVisits]=useState(false);
  const [visibleCount,setVisibleCount]=useState(PAGE_SIZE);
  const name=String(place?.title||'').trim();
  const isMap=place?.trace_type==='map';
  const targetScope=String(place?.source_scope||scopeId||'').trim();
  const scope=useMemo(()=>defaultScopeData(targetScope),[targetScope]);
  const sourcePlaces=useMemo(()=>traceArticlePlaces(place,anchors),[place,anchors]);
  const placesKey=sourcePlaces.join('|');
  const startDate=validDate(dateRange?.startDate)?dateRange.startDate
    :validDate(period?.start_date)?String(period.start_date).slice(0,10):'';
  const endDate=validDate(dateRange?.endDate)?dateRange.endDate
    :validDate(period?.end_date)?String(period.end_date).slice(0,10):'';
  const sourceFilter=String(sourceName||'').trim();
  const selectedMediaType=String(mediaType||'').trim();
  useEffect(()=>{setVisibleCount(PAGE_SIZE);},[place?.uid,sourceFilter,selectedMediaType,startDate,endDate]);
  const enabled=Boolean(name&&sourcePlaces.length&&scope?.galaxy&&targetScope===scopeId);

  // One selected resource and one small page at a time. No eager Galaxy scan.
  const list=useAsyncInfiniteResource({
    queryKey:['trace-articles-v3',targetScope,place?.uid||'',placesKey,startDate,endDate,sourceFilter,sort],
    enabled:enabled&&tab==='articles'&&!selectedMediaType,
    initialPageParam:0,
    getNextPageParam:page=>page.hasMore?page.nextOffset:undefined,
    queryFn:async({pageParam})=>{
      const filters=traceArticleFilters(sourcePlaces,{startDate,endDate,sourceName:sourceFilter});
      const offset=Number(pageParam)||0;
      const result=await selectRows(scope.galaxy,{
        columns:'uid,title,createtime,source_name,source_place,url',
        filters,orders:[{column:'createtime',ascending:sort==='asc'},{column:'uid',ascending:true}],
        limit:PAGE_SIZE,offset,count:offset===0?'exact':null
      });
      const rows=result.rows||[];
      const total=offset===0?Number(result.count??rows.length):null;
      return {rows,total,hasMore:rows.length===PAGE_SIZE&&(total==null||offset+rows.length<total),
        nextOffset:offset+rows.length};
    }
  });

  // Only an explicitly selected media filter loads joined media metadata.
  // galaxy_media.galaxy_link is the real article UID (not the media platform);
  // batch by parent UID to keep each IN expression within the request budget.
  const mediaFiltered=useAsyncResource({
    queryKey:['trace-media-filter-v1',targetScope,placesKey,startDate,endDate,
      sourceFilter,selectedMediaType],
    enabled:enabled&&Boolean(selectedMediaType)&&Boolean(scope?.galaxyMedia),
    queryFn:async()=>{
      const {rows:articles}=await selectAllRows(scope.galaxy,{
        columns:'uid,title,createtime,source_name,source_place,url,statistics_able',
        filters:traceArticleFilters(sourcePlaces,{startDate,endDate,sourceName:sourceFilter})
      });
      if(!articles.length)return [];
      const linked=[];
      for(let i=0;i<articles.length;i+=120){
        const ids=articles.slice(i,i+120).map(row=>String(row.uid||'').trim()).filter(Boolean);
        if(!ids.length)continue;
        const {rows}=await selectAllRows(scope.galaxyMedia,{
          columns:'galaxy_link,media_type',
          filters:[{column:'galaxy_link',operator:'in',value:ids},
            {column:'media_type',operator:'eq',value:selectedMediaType}]
        });
        linked.push(...rows);
      }
      return traceMediaMatches(articles,linked);
    },
    revalidateOnFocus:false,revalidateOnReconnect:false
  });

  // Per-day counts are served from the existing one-hour numeric ISR route.
  // Only the opened timeline/report tab requests them; no article bodies.
  const needsSummary=enabled&&tab!=='articles';
  const useIsr=needsSummary&&!sourceFilter&&!selectedMediaType&&usesNumericIsr(targetScope);
  const numeric=useAsyncResource({
    queryKey:['trace-confirmed-place-summary',targetScope,startDate,endDate],
    enabled:useIsr,
    queryFn:()=>readNumericIsr(targetScope,'places',{startDate,endDate}),
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  // A source-specific view cannot reuse place totals from numeric ISR:
  // that would silently count Facebook/other sources in a Threads filter.
  // Read only its matching, searchable Galaxy metadata on demand.
  const filteredDaily=useAsyncResource({
    queryKey:['trace-filtered-daily-v1',targetScope,placesKey,startDate,endDate,sourceFilter],
    enabled:needsSummary&&!useIsr&&!selectedMediaType,
    queryFn:async()=>{
      const {rows}=await selectAllRows(scope.galaxy,{
        columns:'source_place,source_name,createtime',
        filters:[...traceArticleFilters(sourcePlaces,{startDate,endDate,sourceName:sourceFilter}),
          {column:'statistics_able',operator:'eq',value:true}]
      });
      return {rows:groupedTraceDays(rows)};
    },
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const mediaSummary=useMemo(()=>mediaFiltered.data
    ?{rows:groupedTraceDays(mediaFiltered.data.filter(row=>row.statistics_able===true))}
    :undefined,[mediaFiltered.data]);
  const summary=selectedMediaType
    ?{data:mediaSummary,isPending:mediaFiltered.isPending,error:mediaFiltered.error}
    :useIsr?numeric:filteredDaily;
  const rows=useMemo(()=>{
    if(selectedMediaType)return (mediaFiltered.data||[])
      .slice().sort((a,b)=>sort==='asc'
        ?String(a.createtime||'').localeCompare(String(b.createtime||''))
        :String(b.createtime||'').localeCompare(String(a.createtime||'')))
      .slice(0,visibleCount);
    return (list.data?.pages||[]).flatMap(p=>p.rows||[]);
  },[list.data,selectedMediaType,mediaFiltered.data,sort,visibleCount]);
  const verified=useMemo(()=>{
    const wanted=new Set(sourcePlaces),months=new Map(),places=new Map();
    for(const row of summary.data?.rows||[]){
      if(!wanted.has(row.category)||!validDate(String(row.day||'')))continue;
      const count=Number(row.item_count)||0,month=String(row.day).slice(0,7);
      months.set(month,(months.get(month)||0)+count);
      places.set(row.category,(places.get(row.category)||0)+count);
    }
    return {months:[...months].sort(([a],[b])=>a.localeCompare(b)),
      places:[...places].sort((a,b)=>b[1]-a[1]),
      total:[...places.values()].reduce((total,n)=>total+n,0)};
  },[summary.data,placesKey]);
  // Each spatial anchor has its own times[]; a multi-day route does not mean
  // each stop was visited continuously throughout that route.
  // Use saved times, never inferred timestamps from the route or article period.
  const visits=useMemo(()=>{
    const stops=isMap
      ?(place?.anchor_uids||[]).map(uid=>anchors.find(a=>a.uid===uid&&a.source_scope===targetScope)).filter(Boolean)
      :(place?[place]:[]);
    return stops.flatMap((stop,stopIndex)=>(Array.isArray(stop.times)?stop.times:[])
      .flatMap((when,visitIndex)=>{
        const timestamp=Date.parse(String(when||''));
        if(!Number.isFinite(timestamp))return [];
        const exact=new Date(timestamp);
        return [{
          id:stop.uid+':'+stopIndex+':'+visitIndex,uid:stop.uid,
          title:String(stop.title||''),when:exact.toISOString(),
          label:exact.toLocaleString('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',
            month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})+'（臺灣時間）'
        }];
      }))
      .sort((a,b)=>a.when.localeCompare(b.when));
  },[isMap,place,anchors,targetScope]);
  const visibleVisits=useMemo(()=>visits.filter(visit=>{
    // The contents of the favorite frame share one date filter, including
    // independently recorded visit timestamps (which are not article dates).
    const day=new Date(Date.parse(visit.when)+8*3600000).toISOString().slice(0,10);
    return (!startDate||day>=startDate)&&(!endDate||day<=endDate);
  }),[visits,startDate,endDate]);
  const visitRiver=useMemo(()=>visibleVisits.map(visit=>({
    id:'trace-visit:'+visit.id,entry_id:'trace-visit:'+visit.id,
    entry_type:'spatial_visit',group_key:'trace-visits',group_label:'實際造訪時間',
    group_order:0,start_date:visit.when,
    title:visit.title+' · '+visit.label
  })),[visibleVisits]);
  const listTotal=selectedMediaType?mediaFiltered.data?.length:list.data?.pages?.[0]?.total;
  // Present the same vis-timeline river used by Culture. Aggregate by month
  // so a 20-year personal history remains navigable without thousands of
  // individual glyphs. Each range is article density, NOT an inferred visit.
  const riverRows=useMemo(()=>{
    const peak=Math.max(1,...verified.months.map(([,count])=>count));
    return verified.months.map(([month,count])=>{
      const after=new Date(month+'-01T00:00:00Z');
      after.setUTCMonth(after.getUTCMonth()+1);
      return {id:'trace-month:'+month,entry_id:'trace-month:'+month,
        entry_type:'place_density',group_key:'trace-density',group_label:name,
        group_order:0,start_date:month+'-01',end_date:after.toISOString().slice(0,10),
        item_count:count,density_ratio:count/peak,
        title:month+' · '+count+' 篇有打卡地點的文章'};
    });
  },[verified.months,name]);
  const riverItems=useMemo(()=>[...(sourceFilter||selectedMediaType?[]:visitRiver),...riverRows],
    [sourceFilter,selectedMediaType,visitRiver,riverRows]);
  const chartRows=useMemo(()=>verified.months.map(([month,count])=>({
    period:month.replace('-', '/'),start_date:month+'-01',value:count
  })),[verified.months]);
  const chartDistribution=useMemo(()=>verified.places.map(([placeName,count])=>({
    name:placeName,value:count
  })),[verified.places]);

  if(!name)return <section className="loc-card loc-trace-works" aria-label="地圖下方文章報表">
    <h2>文章列表／時間長河／統計圖</h2>
    <p className="scope-status">選擇一個空間定錨點，或一張痕跡圖，再選時期；報表在這裡展開，不會跳到搜尋。</p>
  </section>;
  const loading=tab==='articles'?(selectedMediaType?mediaFiltered.isPending:list.isPending):summary.isPending;
  const error=tab==='articles'?(selectedMediaType?mediaFiltered.error:list.error):summary.error;
  return <section className="loc-card loc-trace-works" aria-label={name+'文章報表'}>
    <header className="loc-trace-works-title">
      <div><p className="loc-eyebrow">{isMap?'痕跡圖 · 多定錨點':'空間定錨點 · 單一地點'}</p><h2>{name}</h2></div>
      <span className="scope-status">{isMap?(place.anchor_uids?.length||0)+' 站 · ':''}
        {!enabled?'沒有可對應的打卡地點'
          :tab==='articles'?(listTotal==null?'按需載入中…':listTotal+' 篇文章')
          :(summary.data?verified.total+' 篇符合條件的打卡文章':'數值圖表')}
      </span>
    </header>
    {!sourceFilter&&!selectedMediaType?<div className="loc-trace-visit-times" aria-label="空間定錨點造訪時間">
      <p className="scope-status">
        {visibleVisits.length?'已保存 '+visibleVisits.length+' 次具體造訪時間；各站獨立記錄。'
          :'目前沒有可確認的造訪時刻；不會以整趟旅程起訖日期代替各站時間。'}
      </p>
      {visibleVisits.length?<p className="scope-status">時間統一換算為臺灣時區顯示；境外地點的當地時間，須另依原始時區或航班文件確認。</p>:null}
      {visibleVisits.length?<ol className="loc-trace-selection-order">
        {(showAllVisits?visibleVisits:visibleVisits.slice(0,12)).map(visit=><li key={visit.id}>
          <span>{visit.label} · {visit.title}</span>
        </li>)}
      </ol>:null}
      {visibleVisits.length>12?<button className="loc-button" type="button"
        onClick={()=>setShowAllVisits(value=>!value)}>
        {showAllVisits?'收合造訪時間':'顯示全部 '+visibleVisits.length+' 次造訪時間'}
      </button>:null}
    </div>:null}
    {tab==='articles'?<ArticleSortSelect value={sort} onChange={setSort}/>:null}
    {sourceFilter||selectedMediaType?<p className="scope-status">篩選條件：{sourceFilter?'作品來源 '+sourceFilter:'全部來源'} · {selectedMediaType?'媒體 '+selectedMediaType:'全部媒體'}（三種模式一致）</p>:null}
    <p className="scope-status">文章依原始打卡與已核對的同址別名關聯；尚未核准補寫的 Google Timeline 候選不計入已確認篇數。</p>
    {!enabled?<p className="scope-status" role="status">此路線或地點目前沒有可對應的原始打卡名稱，或尚未配置有效的作品資料表；可繼續使用地圖，報表會維持空白而不產生錯誤。</p>:null}
    {loading?<p role="status" className="scope-status">正在按需讀取目前時間與地點的內容…</p>:null}
    {error?<p role="alert" className="scope-status scope-error">{String(error.message||error)}</p>:null}
    {tab==='articles'&&!loading&&!error&&!rows.length?<p className="scope-status">目前沒有符合這個時期的已確認打卡文章。</p>:null}
    {tab==='articles'&&rows.length?<IncrementalList
      items={rows}
      batchSize={PAGE_SIZE}
      resetKey={[targetScope,place?.uid,placesKey,startDate,endDate,sourceFilter,selectedMediaType,sort].join('|')}
      className="loc-trace-works-list"
      externalHasMore={selectedMediaType
        ?(mediaFiltered.data?.length||0)>visibleCount:Boolean(list.hasNextPage)}
      loading={selectedMediaType?mediaFiltered.isPending:Boolean(list.isPending||list.isFetchingNextPage)}
      error={error}
      onLoadMore={selectedMediaType?()=>setVisibleCount(n=>n+PAGE_SIZE):list.fetchNextPage}
      renderItem={row=><TraceWork key={targetScope+':'+row.uid} row={row} scope={scope}/>}
    />:null}
    {tab==='timeline'&&(summary.data||(!sourceFilter&&!selectedMediaType&&visibleVisits.length>0))?<div className="loc-trace-works-timeline" aria-label="按真實造訪時間排列的時間長河">
      {riverItems.length?<CultureTimeline items={riverItems}
        extraGroups={[
          ...(!sourceFilter&&!selectedMediaType&&visitRiver.length?[{id:'trace-visits',label:'實際造訪時間',order:0,selectable:false}]:[]),
          ...(riverRows.length?[{id:'trace-density',label:'文章月份密度',order:1,selectable:false}]:[])
        ]}
        labelOf={()=>''} mode="source" heightVariant="double"
        windowStart={!sourceFilter&&!selectedMediaType&&visitRiver.length?'':startDate} windowEnd={!sourceFilter&&!selectedMediaType&&visitRiver.length?'':endDate}
      />:<p className="scope-status">目前沒有可顯示的時間資料。</p>}
      <p className="scope-status">造訪點只採用每個空間錨點 times[] 中的原始時間；文章密度是獨立河道，不推定造訪或停留。</p>
    </div>:null}
    {tab==='statistics'&&summary.data?<div className="loc-trace-works-stat" aria-label="地點與文章統計圖">
      {verified.total?<><label>圖表
        <select className="scope-select" value={chartType}
          onChange={event=>setChartType(event.target.value)}>
          <option value="bar">長條圖</option>
          <option value="line">折線圖</option>
          <option value="pie">圓餅圖</option>
        </select>
      </label>
      <StatisticsMultiChart type={chartType} rows={chartRows}
        series={[{key:'value',label:'文章篇數'}]}
        distribution={chartDistribution.length>1?chartDistribution:verified.months.map(([month,count])=>({name:month,value:count}))}
        height={400}/></>:<p className="scope-status">這個時期沒有已確認的打卡紀錄。</p>}
    </div>:null}
  </section>;
}
