'use client';

import {useMemo,useState} from 'react';
import {useAsyncInfiniteResource,useAsyncResource} from '../../../loc/use-async-resource';
import {selectRows} from '../../../loc/db-query.mjs';
import {defaultScopeData} from '../../../loc/scope-data';
import {WorkSummaryCard,WorkFullText} from '../../ui';

const PAGE_SIZE=80;
const TABS=[{id:'articles',label:'文章列表'},{id:'timeline',label:'時間長河'},{id:'statistics',label:'統計圖'}];
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));

function workPeriodRows(rows){
  const byMonth=new Map();
  for(const row of rows){
    const day=String(row.createtime||'').slice(0,10);
    if(!validDate(day))continue;
    const month=day.slice(0,7);
    const group=byMonth.get(month)||[];
    group.push(row);byMonth.set(month,group);
  }
  return [...byMonth].sort(([a],[b])=>a.localeCompare(b));
}

function TraceWork({row,scope}){
  const [opened,setOpened]=useState(false);
  const body=useAsyncResource({
    queryKey:['trace-place-work-content',scope?.id,row.uid],
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
      onClick={()=>setOpened(value=>!value)}>{opened?'收合文章':'閱讀文章'}</button>
  </WorkSummaryCard>;
}

export default function TracePlaceResults({place=null,scopeId='',period=null}){
  const [tab,setTab]=useState('articles');
  const name=String(place?.title||'').trim();
  const targetScope=String(place?.source_scope||scopeId||'').trim();
  const scope=useMemo(()=>defaultScopeData(targetScope),[targetScope]);
  const startDate=validDate(period?.start_date)?String(period.start_date).slice(0,10):'';
  const endDate=validDate(period?.end_date)?String(period.end_date).slice(0,10):'';
  const result=useAsyncInfiniteResource({
    queryKey:['trace-one-place',targetScope,name,startDate,endDate],
    enabled:Boolean(name&&scope?.galaxy),
    initialPageParam:0,
    getNextPageParam:page=>page.hasMore?page.nextOffset:undefined,
    queryFn:async({pageParam})=>{
      const filters=[
        {column:'source_place',operator:'eq',value:name},
        {column:'searchable',operator:'eq',value:true},
        ...(startDate?[{column:'createtime',operator:'gte',value:startDate}]:[]),
        ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999'}]:[])
      ];
      const offset=Number(pageParam)||0;
      const response=await selectRows(scope.galaxy,{
        columns:'uid,title,createtime,source_name,source_place,url',
        filters,orders:[{column:'createtime',ascending:false},{column:'uid',ascending:true}],
        limit:PAGE_SIZE,offset,count:offset===0?'exact':null
      });
      const rows=response.rows||[];
      const total=offset===0?Number(response.count??rows.length):null;
      return {rows,total,hasMore:rows.length===PAGE_SIZE&&(total==null||offset+rows.length<total),
        nextOffset:offset+rows.length};
    }
  });
  const rows=useMemo(()=>(result.data?.pages||[]).flatMap(page=>page.rows||[]),[result.data]);
  const months=useMemo(()=>workPeriodRows(rows),[rows]);
  const total=result.data?.pages?.[0]?.total??0;
  const partial=Boolean(result.hasNextPage);
  const max=Math.max(1,...months.map(([,items])=>items.length));
  if(!name)return <section className="loc-card loc-trace-works" aria-label="單一地點作品">
    <h2>地點作品</h2>
    <p className="scope-status">點選地圖上的一個空間定錨點，下方就會顯示該地點的文章列表、時間長河與統計圖；不會跳頁。</p>
  </section>;

  return <section className="loc-card loc-trace-works" aria-label={name+'的作品'}>
    <header className="loc-trace-works-title">
      <div><p className="loc-eyebrow">單一地點</p><h2>{name}</h2></div>
      <span className="scope-status">{result.isPending?'查詢中…':`${total} 篇作品`}</span>
    </header>
    <div className="loc-trace-works-tabs" role="group" aria-label="地點資料顯示方式">
      {TABS.map(item=><button type="button" key={item.id} className="loc-button"
        aria-pressed={tab===item.id} onClick={()=>setTab(item.id)}>{item.label}</button>)}
    </div>
    {result.isPending?<p className="scope-status" role="status">正在取得這個地點的作品…</p>:null}
    {result.error?<p className="scope-status scope-error" role="alert">{String(result.error.message||result.error)}</p>:null}
    {!result.isPending&&!result.error&&!rows.length?<p className="scope-status">這個地點目前沒有符合條件的公開文章。</p>:null}
    {rows.length&&tab==='articles'?<div className="loc-trace-works-list">
      {rows.map(row=><TraceWork key={targetScope+':'+row.uid} row={row} scope={scope}/>)}
    </div>:null}
    {rows.length&&tab==='timeline'?<div className="loc-trace-works-timeline" aria-label="依月份排列的時間長河">
      {months.map(([month,items])=><section key={month} className="loc-trace-month">
        <strong>{month}</strong><span>{items.length} 篇</span>
        <div className="loc-trace-month-entries">
          {items.map(row=><p key={row.uid}><time>{String(row.createtime).slice(0,10)}</time> · {row.title||'未命名文章'}</p>)}
        </div>
      </section>)}
    </div>:null}
    {rows.length&&tab==='statistics'?<div className="loc-trace-works-stat" aria-label="依月份統計作品數量">
      <h3>每月文章數</h3>
      {months.map(([month,items])=><div className="loc-trace-stat-row" key={month}>
        <time>{month}</time>
        <div className="loc-trace-stat-track"><span style={{width:(items.length/max*100)+'%'}}/></div>
        <strong>{items.length}</strong>
      </div>)}
    </div>:null}
    {partial?<p className="scope-status" role="status">
      時間長河與統計圖目前反映已載入的 {rows.length} 篇，非全部 {total} 篇。
    </p>:null}
    {result.hasNextPage?<button className="loc-button" type="button"
      disabled={result.isFetchingNextPage} onClick={()=>result.fetchNextPage()}>
      {result.isFetchingNextPage?'載入中…':'載入更多文章'}
    </button>:null}
  </section>;
}
