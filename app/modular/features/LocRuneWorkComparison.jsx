'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectDailyRuneRange} from '../../loc/daily-runes';
import {selectLocConfluencePage} from '../../loc/loc-confluence-query';
import {realMoonPhase} from '../../loc/model/moon-phase';
import {normalizeDailyDraws} from '../../lrunes/daily-analytics-model.mjs';
import {
  LOC_CONFLUENCE_PAGE_SIZE,buildLocConfluenceRiver
} from '../../loc/loc-confluence-model.mjs';
import CultureTimeline from '../modules/culture-timeline/CultureTimeline';
import {WorkSummaryCard} from '../ui';
import {featureNavigationHref} from '../feature-navigation';

const FOCUS=Object.freeze({});
const RANGE_OPTIONS=[
  {value:'3m',label:'近三個月'},
  {value:'1m',label:'近一個月'},
  {value:'1y',label:'近一年'},
  {value:'custom',label:'指定區間'}
];
function taipeiToday(){
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date());
    const fields=Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
    return fields.year+'-'+fields.month+'-'+fields.day;
  }catch{return new Date().toISOString().slice(0,10);}
}
function minusMonths(day,months){
  const d=new Date(day+'T00:00:00Z');
  const originalDay=d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth()-months);
  const lastDay=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(originalDay,lastDay));
  return d.toISOString().slice(0,10);
}
function makeRange(mode,from,to,intersectionStart){
  const today=taipeiToday();
  const requestedStart=mode==='custom'?String(from||'').slice(0,10)
    :minusMonths(today,mode==='1m'?1:mode==='1y'?12:3);
  const requestedEnd=mode==='custom'?String(to||'').slice(0,10):today;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(requestedStart)||!/^\d{4}-\d{2}-\d{2}$/.test(requestedEnd)||requestedStart>requestedEnd)return null;
  const startDate=intersectionStart&&requestedStart<intersectionStart?intersectionStart:requestedStart;
  if(startDate>requestedEnd)return null;
  return {startDate,endDate:requestedEnd};
}
function riverLabel(item){return String(item?.display_label||'');}
function displayDate(item){
  return String(item?.date||item?.record_date||item?.createtime||'').slice(0,10);
}

export default function LocRuneWorkComparison({
  scopes=[],distribution=[],anchors=[],intersectionStart=''
}){
  const authorScope=useMemo(()=>scopes.find(scope=>scope.id==='lo3rwang')||null,[scopes]);
  const [rangeMode,setRangeMode]=useState('3m');
  const [customFrom,setCustomFrom]=useState('');
  const [customTo,setCustomTo]=useState('');
  const [selected,setSelected]=useState(null);
  const [page,setPage]=useState(0);
  const [pageCursors,setPageCursors]=useState([null]);
  const range=useMemo(()=>makeRange(rangeMode,customFrom,customTo,intersectionStart),
    [rangeMode,customFrom,customTo,intersectionStart]);
  const rangeKey=range?range.startDate+'|'+range.endDate:'invalid';

  useEffect(()=>{setPage(0);setPageCursors([null]);setSelected(null);},[rangeKey]);
  const drawQuery=useQuery({
    queryKey:['loc-confluence-runes',range?.startDate,range?.endDate],
    queryFn:()=>selectDailyRuneRange(range),
    enabled:Boolean(range),
    staleTime:60_000
  });
  const draws=useMemo(()=>normalizeDailyDraws(drawQuery.data||[],date=>
    realMoonPhase(new Date(date+'T12:00:00+08:00'))
  ),[drawQuery.data]);
  const riverItems=useMemo(()=>buildLocConfluenceRiver({
    draws,distribution,anchors,startDate:range?.startDate,endDate:range?.endDate
  }),[draws,distribution,anchors,range?.startDate,range?.endDate]);
  const personalDensity=useMemo(()=>distribution.filter(row=>
    row.scope_id==='lo3rwang'&&range&&row.start_date>=range.startDate&&row.start_date<=range.endDate
  ).reduce((sum,row)=>sum+(Number(row.item_count)||0),0),[distribution,range?.startDate,range?.endDate]);

  const cursor=pageCursors[page]||null;
  const listQuery=useQuery({
    queryKey:['loc-confluence-page',rangeKey,page,cursor,drawQuery.dataUpdatedAt,authorScope?.id],
    queryFn:()=>selectLocConfluencePage({
      personalScope:authorScope,
      draws,
      startDate:range.startDate,endDate:range.endDate,
      cursor,limit:LOC_CONFLUENCE_PAGE_SIZE
    }),
    enabled:Boolean(range)&&drawQuery.isSuccess,
    staleTime:60_000
  });
  const listing=listQuery.data?.rows||[];
  function chooseDate(date){
    if(!date)return;
    setCustomFrom(date);setCustomTo(date);setRangeMode('custom');
  }
  function nextPage(){
    if(!listQuery.data?.hasMore||!listQuery.data?.nextCursor)return;
    setPageCursors(current=>{
      const next=current.slice(0,page+1);
      next.push(listQuery.data.nextCursor);
      return next;
    });
    setPage(value=>value+1);
  }
  return <section className="scope-card scope-culture-classification-river scope-loc-confluence" aria-label="LOC 符文與個人作品交會">
    <p className="loc-eyebrow">LOC · 交會觀測</p>
    <h3>每日符文 × 個人作品</h3>
    <p className="scope-status">同一時間軸對照符韻每日符文、個人作品／媒體量與雙方的正式定錨點。符文仍屬符韻，作品仍屬作者；僅在 LOC 做唯讀交會，不重複儲存，也不把每日抽牌算進作品數量。</p>
    <div className="scope-stat-controls">
      <label><span>交會區間</span><select className="scope-select" value={rangeMode} onChange={event=>setRangeMode(event.target.value)}>
        {RANGE_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      {rangeMode==='custom'?<>
        <label><span>開始日期</span><input type="date" className="scope-input" value={customFrom} onChange={event=>setCustomFrom(event.target.value)}/></label>
        <label><span>結束日期</span><input type="date" className="scope-input" value={customTo} onChange={event=>setCustomTo(event.target.value)}/></label>
      </>:null}
    </div>
    {!range?<p className="scope-status">請設定有效日期。LOC 交會起點為 {intersectionStart||'尚未確定'}。</p>:null}
    {drawQuery.isPending&&range?<p className="scope-status">正在讀取符韻每日紀錄…</p>:null}
    {drawQuery.error?<p className="scope-status scope-error">每日符文讀取失敗：{String(drawQuery.error.message||drawQuery.error)}</p>:null}
    {!drawQuery.isPending&&!drawQuery.error&&range?<p className="scope-status">
      {range.startDate} ～ {range.endDate} · 每日符文 {draws.length.toLocaleString()} 筆 · 個人作品／媒體分布 {personalDensity.toLocaleString()} 項（兩種數量分開計算）
    </p>:null}
    {!drawQuery.error&&!drawQuery.isPending&&range&&riverItems.length?<CultureTimeline
      items={riverItems}
      labelOf={riverLabel}
      focus={FOCUS}
      mode="source"
      windowStart={range.startDate}
      windowEnd={range.endDate}
      onSelect={item=>setSelected(item?.raw||null)}
    />:null}
    {selected?<div className="scope-culture-anchor-actions">
      <span>{String(selected.title||selected.display_label||'').trim()}</span>
      <button className="loc-button" type="button" onClick={()=>chooseDate(String(selected.start_date||'').slice(0,10))}>查看這一天的紀錄</button>
    </div>:null}
    {!drawQuery.isPending&&!drawQuery.error&&range&&!riverItems.length?<p className="scope-status">此區間沒有可以交會的紀錄。</p>:null}
    <h4>符文與作品列表 · 日期交錯顯示</h4>
    <p className="scope-status">每頁最多 20 筆，依日期排序；符文與作品各自標明來源。點選作品連結可返回作者原始紀錄。</p>
    {!authorScope?<p className="scope-status">目前沒有可用的作者 Scope，仍可檢視符韻紀錄。</p>:null}
    {listQuery.error?<p className="scope-status scope-error">交會列表讀取失敗：{String(listQuery.error.message||listQuery.error)}</p>:null}
    {listQuery.isPending&&range&&!drawQuery.error?<p className="scope-status">正在讀取第 {page+1} 頁紀錄…</p>:null}
    {!listQuery.isPending&&!listQuery.error&&!listing.length?<p className="scope-status">此區間沒有符文或公開作品紀錄。</p>:null}
    {!listQuery.isPending&&!listQuery.error&&listing.length?<div className="scope-culture-source-work-scroll">
      {listing.map(row=>row.entry_type==='loc_daily_rune'
        ?<WorkSummaryCard key={row.key}
          title={row.title}
          source="每日符文"
          scopeId="lrunes"
          date={displayDate(row)}
          body={row.description}
          destinations={[{id:'daily-log',href:'/daily/log/',label:'每日符文行事曆'}]}
        />
        :<WorkSummaryCard key={row.key}
          title={row.title||'未命名作品'}
          source={row.source_name||row.group_label||'作品'}
          scopeId="lo3rwang"
          date={displayDate(row)}
          body={row.description||row.media_metadata_text||''}
          links={row.links||[]}
          destinations={[{
            id:'author-original',
            href:row.uid
              ?featureNavigationHref('lo3rwang','search',{identity:String(row.uid)})
              :featureNavigationHref('lo3rwang','culture'),
            label:'前往作者紀錄'
          }]}
        />)}
    </div>:null}
    {listQuery.data&&!listQuery.error&&(page>0||listQuery.data.hasMore)?<nav className="scope-stat-controls" aria-label="LOC 交會作品列表分頁">
      <button className="loc-button" type="button" disabled={page===0||listQuery.isFetching} onClick={()=>setPage(value=>Math.max(0,value-1))}>上一頁</button>
      <span className="scope-status">第 {page+1} 頁 · 每頁最多 {LOC_CONFLUENCE_PAGE_SIZE} 筆</span>
      <button className="loc-button" type="button" disabled={!listQuery.data.hasMore||listQuery.isFetching} onClick={nextPage}>下一頁</button>
    </nav>:null}
  </section>;
}
