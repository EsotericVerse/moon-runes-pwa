'use client';

import {useMemo,useState} from 'react';
import {useAsyncInfiniteResource,useAsyncResource} from '../../../loc/use-async-resource';
import {selectRows} from '../../../loc/db-query.mjs';
import {defaultScopeData} from '../../../loc/scope-data';
import {readNumericIsr,usesNumericIsr} from '../../../loc/numeric-isr-client';
import {traceArticlePlaces} from './trace-article-places.mjs';
import {ArticleSortSelect,WorkSummaryCard,WorkFullText} from '../../ui';

const PAGE_SIZE=40;
const TABS=[{id:'articles',label:'文章列表'},{id:'timeline',label:'時間長河'},{id:'statistics',label:'基本報表'}];
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
  return <WorkSummaryCard title={row.title||'未命名文章'} date={String(row.createtime||'').slice(0,10)}
    source={row.source_name||''} checkIn={row.source_place||''} scopeId={scope?.id}>
    <WorkFullText open={opened} loading={opened&&body.isPending}
      error={body.error?String(body.error.message||body.error):''}
      content={body.data||''} showToggle={false}/>
    <button type="button" className="loc-button" aria-expanded={opened}
      onClick={()=>setOpened(x=>!x)}>{opened?'收合文章':'閱讀文章'}</button>
  </WorkSummaryCard>;
}

export default function TracePlaceResults({place=null,anchors=[],scopeId='',period=null}){
  const [tab,setTab]=useState('articles');
  const [sort,setSort]=useState('desc');
  const name=String(place?.title||'').trim();
  const isMap=place?.trace_type==='map';
  const targetScope=String(place?.source_scope||scopeId||'').trim();
  const scope=useMemo(()=>defaultScopeData(targetScope),[targetScope]);
  const sourcePlaces=useMemo(()=>traceArticlePlaces(place,anchors),[place,anchors]);
  const placesKey=sourcePlaces.join('|');
  const startDate=validDate(period?.start_date)?String(period.start_date).slice(0,10):'';
  const endDate=validDate(period?.end_date)?String(period.end_date).slice(0,10):'';
  const enabled=Boolean(name&&sourcePlaces.length&&scope?.galaxy&&targetScope===scopeId);

  // One selected resource and one small page at a time. No eager Galaxy scan.
  const list=useAsyncInfiniteResource({
    queryKey:['trace-articles-v2',targetScope,place?.uid||'',placesKey,startDate,endDate,sort],
    enabled:enabled&&tab==='articles',
    initialPageParam:0,
    getNextPageParam:page=>page.hasMore?page.nextOffset:undefined,
    queryFn:async({pageParam})=>{
      const filters=[
        {column:'source_place',operator:sourcePlaces.length===1?'eq':'in',
          value:sourcePlaces.length===1?sourcePlaces[0]:sourcePlaces},
        {column:'searchable',operator:'eq',value:true},
        ...(startDate?[{column:'createtime',operator:'gte',value:startDate+'T00:00:00+08:00'}]:[]),
        ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999+08:00'}]:[])
      ];
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

  // Per-day counts are served from the existing one-hour numeric ISR route.
  // Only the opened timeline/report tab requests them; no article bodies.
  const useIsr=enabled&&tab!=='articles'&&usesNumericIsr(targetScope);
  const numeric=useAsyncResource({
    queryKey:['trace-confirmed-place-summary',targetScope,startDate,endDate],
    enabled:useIsr,
    queryFn:()=>readNumericIsr(targetScope,'places',{startDate,endDate}),
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const rows=useMemo(()=>(list.data?.pages||[]).flatMap(p=>p.rows||[]),[list.data]);
  const verified=useMemo(()=>{
    const wanted=new Set(sourcePlaces),months=new Map(),places=new Map();
    for(const row of numeric.data?.rows||[]){
      if(!wanted.has(row.category)||!validDate(String(row.day||'')))continue;
      const count=Number(row.item_count)||0,month=String(row.day).slice(0,7);
      months.set(month,(months.get(month)||0)+count);
      places.set(row.category,(places.get(row.category)||0)+count);
    }
    return {months:[...months].sort(([a],[b])=>a.localeCompare(b)),
      places:[...places].sort((a,b)=>b[1]-a[1]),
      total:[...places.values()].reduce((total,n)=>total+n,0)};
  },[numeric.data,placesKey]);
  const listTotal=list.data?.pages?.[0]?.total;

  if(!name)return <section className="loc-card loc-trace-works" aria-label="地圖下方文章報表">
    <h2>文章列表／時間長河／基本報表</h2>
    <p className="scope-status">選擇一個空間定錨點，或一張痕跡圖，再選時期；報表在這裡展開，不會跳到搜尋。</p>
  </section>;
  const loading=tab==='articles'?list.isPending:numeric.isPending;
  const error=tab==='articles'?list.error:numeric.error;
  const maxMonth=Math.max(1,...verified.months.map(([,n])=>n));
  return <section className="loc-card loc-trace-works" aria-label={name+'文章報表'}>
    <header className="loc-trace-works-title">
      <div><p className="loc-eyebrow">{isMap?'痕跡圖 · 多定錨點':'空間定錨點 · 單一地點'}</p><h2>{name}</h2></div>
      <span className="scope-status">{isMap?(place.anchor_uids?.length||0)+' 站 · ':''}
        {tab==='articles'?(listTotal==null?'按需載入中…':listTotal+' 篇文章')
          :(numeric.data?verified.total+' 篇已確認打卡文章':'基本報表')}
      </span>
    </header>
    <div className="loc-trace-works-tabs" role="group" aria-label="雙定錨基本報表">
      {TABS.map(item=><button key={item.id} type="button" className="loc-button"
        aria-pressed={tab===item.id} onClick={()=>setTab(item.id)}>{item.label}</button>)}
      {tab==='articles'?<ArticleSortSelect value={sort} onChange={setSort}/>:null}
    </div>
    <p className="scope-status">文章依原始打卡與已核對的同址別名關聯；尚未核准補寫的 Google Timeline 候選不計入已確認篇數。</p>
    {loading?<p role="status" className="scope-status">正在按需讀取目前時間與地點的內容…</p>:null}
    {error?<p role="alert" className="scope-status scope-error">{String(error.message||error)}</p>:null}
    {tab==='articles'&&!loading&&!error&&!rows.length?<p className="scope-status">目前沒有符合這個時期的已確認打卡文章。</p>:null}
    {tab==='articles'&&rows.length?<div className="loc-trace-works-list">
      {rows.map(row=><TraceWork key={targetScope+':'+row.uid} row={row} scope={scope}/>)}
    </div>:null}
    {tab==='articles'&&list.hasNextPage?<button className="loc-button" type="button"
      disabled={list.isFetchingNextPage} onClick={()=>list.fetchNextPage()}>
      {list.isFetchingNextPage?'載入中…':'載入更多文章'}
    </button>:null}
    {tab!=='articles'&&!usesNumericIsr(targetScope)?<p className="scope-status">本機版保留文章列表；雲端數值 ISR 不用於私人 SQLite。</p>:null}
    {tab==='timeline'&&numeric.data?<div className="loc-trace-works-timeline" aria-label="按月份排列的文章時間長河">
      {verified.months.length?verified.months.map(([month,count])=><div className="loc-trace-month" key={month}>
        <strong>{month}</strong><span>{count} 篇文章</span>
      </div>):<p className="scope-status">這個時期沒有已確認的打卡紀錄。</p>}
    </div>:null}
    {tab==='statistics'&&numeric.data?<div className="loc-trace-works-stat" aria-label="地點與文章基本統計">
      <h3>地點與文章</h3>
      {verified.places.length?verified.places.map(([placeName,count])=><div className="loc-trace-stat-row" key={placeName}>
        <span>{placeName}</span><div className="loc-trace-stat-track">
          <span style={{width:(count/Math.max(1,verified.total)*100)+'%'}}/>
        </div><strong>{count}</strong>
      </div>):<p className="scope-status">這個時期沒有已確認的打卡紀錄。</p>}
      <h3>每月文章數</h3>
      {verified.months.map(([month,count])=><div className="loc-trace-stat-row" key={month}>
        <time>{month}</time><div className="loc-trace-stat-track">
          <span style={{width:(count/maxMonth*100)+'%'}}/>
        </div><strong>{count}</strong>
      </div>)}
    </div>:null}
  </section>;
}
