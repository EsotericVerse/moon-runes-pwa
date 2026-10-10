'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectManagedScopes} from '../../loc/scope-data';
import {selectLocItemDailySeries} from '../../loc/item-confluence-query';
import {
  ITEM_CONFLUENCE_PAGE_SIZE,ITEM_LANE_OPTIONS,itemConfluenceShiftMonth,
  validateItemConfluenceRange,validateItemLane,itemLaneDescription,
  buildItemConfluenceDaily,buildItemConfluenceRiver,itemConfluenceSummary
} from '../../loc/item-confluence-model.mjs';
import CultureTimeline from '../modules/culture-timeline/CultureTimeline';

const EMPTY_SCOPES=Object.freeze([]);
const EMPTY_FOCUS=Object.freeze({});
function nowInTaipei(){
  try{
    const fields=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date()).filter(item=>item.type!=='literal').map(item=>[item.type,item.value]));
    return fields.year+'-'+fields.month+'-'+fields.day;
  }catch{return new Date().toISOString().slice(0,10);}
}
function labelOf(row){return String(row?.display_label||'');}
function defaultLane(scopeId,source){return {scopeId,source,exact:''};}
function LanePicker({label,lane,scopes,onChange}){
  const scopeOptions=scopes.filter(scope=>scope.id!=='loc');
  const sourceOptions=ITEM_LANE_OPTIONS.filter(option=>option.value!=='daily:rune'||lane.scopeId==='lrunes');
  return <fieldset className="scope-card" style={{minWidth:0,flex:'1 1 250px'}}>
    <legend>{label}</legend>
    <div className="scope-stat-controls">
      <label><span>Scope</span>
        <select className="scope-select" value={lane.scopeId} onChange={event=>{
          const id=event.target.value;
          onChange({...lane,scopeId:id,source:lane.source==='daily:rune'&&id!=='lrunes'?'galaxy:all':lane.source});
        }}>
          {!scopeOptions.some(scope=>scope.id===lane.scopeId)?<option value="">請選擇</option>:null}
          {scopeOptions.map(scope=><option key={scope.id} value={scope.id}>{scope.id}</option>)}
        </select>
      </label>
      <label><span>指定河道項目</span>
        <select className="scope-select" value={sourceOptions.some(item=>item.value===lane.source)?lane.source:'galaxy:all'}
          onChange={event=>onChange({...lane,source:event.target.value,exact:''})}>
          {sourceOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {lane.source.endsWith(':exact')?<label><span>指定原始類型</span>
        <input className="scope-input" value={lane.exact} maxLength={100} placeholder={lane.source.startsWith('media:')?'media_type':'source_name'}
          onChange={event=>onChange({...lane,exact:event.target.value})}/>
      </label>:null}
    </div>
  </fieldset>;
}
export default function LocItemConfluence(){
  const today=useMemo(nowInTaipei,[]);
  const [startDate,setStartDate]=useState(()=>itemConfluenceShiftMonth(nowInTaipei(),-3));
  const [endDate,setEndDate]=useState(today);
  const [laneA,setLaneA]=useState(()=>defaultLane('','galaxy:all'));
  const [laneB,setLaneB]=useState(()=>defaultLane('','galaxy:all'));
  const [selectedDay,setSelectedDay]=useState('');
  const [page,setPage]=useState(1);
  const scopesQuery=useQuery({
    queryKey:['managed-scopes'],
    queryFn:selectManagedScopes,
    staleTime:5*60_000
  });
  const scopes=scopesQuery.data||EMPTY_SCOPES;
  const range=useMemo(()=>validateItemConfluenceRange(startDate,endDate),[startDate,endDate]);
  const selectionA=useMemo(()=>validateItemLane(laneA,scopes),[laneA,scopes]);
  const selectionB=useMemo(()=>validateItemLane(laneB,scopes),[laneB,scopes]);
  const valid=range.valid&&selectionA.valid&&selectionB.valid;
  const selectedA=scopes.find(scope=>scope.id===laneA.scopeId)||null;
  const selectedB=scopes.find(scope=>scope.id===laneB.scopeId)||null;
  const query=useQuery({
    queryKey:['loc-item-confluence',range.startDate,range.endDate,laneA.scopeId,laneA.source,laneA.exact,laneB.scopeId,laneB.source,laneB.exact],
    queryFn:()=>Promise.all([
      selectLocItemDailySeries({scope:selectedA,lane:laneA,startDate:range.startDate,endDate:range.endDate,knownScopes:scopes}),
      selectLocItemDailySeries({scope:selectedB,lane:laneB,startDate:range.startDate,endDate:range.endDate,knownScopes:scopes})
    ]),
    enabled:valid&&Boolean(selectedA&&selectedB),
    staleTime:60_000
  });
  const labels=useMemo(()=>[itemLaneDescription(laneA),itemLaneDescription(laneB)],[laneA,laneB]);
  const daily=useMemo(()=>valid&&query.data?buildItemConfluenceDaily({
    startDate:range.startDate,endDate:range.endDate,lanes:[laneA,laneB],series:query.data
  }):[],[valid,query.data,range.startDate,range.endDate,laneA,laneB]);
  const river=useMemo(()=>buildItemConfluenceRiver(daily,labels),[daily,labels]);
  const summary=useMemo(()=>itemConfluenceSummary(daily),[daily]);
  const totalPages=Math.max(1,Math.ceil(daily.length/ITEM_CONFLUENCE_PAGE_SIZE));
  const visibleRows=daily.slice((page-1)*ITEM_CONFLUENCE_PAGE_SIZE,page*ITEM_CONFLUENCE_PAGE_SIZE);
  useEffect(()=>{setPage(1);setSelectedDay('');},
    [startDate,endDate,laneA.scopeId,laneA.source,laneA.exact,laneB.scopeId,laneB.source,laneB.exact]);
  const invalidMessage=!range.valid?range.reason:!selectionA.valid?('河道 A：'+selectionA.reason):!selectionB.valid?('河道 B：'+selectionB.reason):'';

  return <section className="scope-card scope-culture-classification-river scope-loc-time-river" aria-label="LOC 自訂項目交會">
    <p className="loc-eyebrow">LOC Culture · 項目交會</p>
    <h3>指定河道交會比較</h3>
    <p className="scope-status">從可讀取的 Scope 中指定兩條河道，在同一段日期觀察每日筆數與密度；不預設比較對象。來源不合併寫入資料庫，不把不同人的作品當作同一筆，也不推論交會代表因果。</p>
    <div className="scope-stat-controls" style={{alignItems:'stretch'}}>
      <LanePicker label="河道 A" lane={laneA} scopes={scopes} onChange={setLaneA}/>
      <LanePicker label="河道 B" lane={laneB} scopes={scopes} onChange={setLaneB}/>
    </div>
    <div className="scope-stat-controls">
      <label><span>開始日期</span><input className="scope-input" type="date" value={startDate} onChange={event=>setStartDate(event.target.value)}/></label>
      <label><span>結束日期</span><input className="scope-input" type="date" value={endDate} onChange={event=>setEndDate(event.target.value)}/></label>
      <span className="scope-status">單次比較最多三個日曆月；超出期間不發出查詢。</span>
    </div>
    {scopesQuery.isPending?<p className="scope-status">正在讀取可選的 Scope…</p>:null}
    {scopesQuery.error?<p className="scope-status scope-error">Scope 清單讀取失敗：{String(scopesQuery.error.message||scopesQuery.error)}</p>:null}
    {!scopesQuery.isPending&&!scopesQuery.error&&invalidMessage?<p className="scope-status scope-error" role="alert">{invalidMessage}</p>:null}
    {valid&&query.isPending?<p className="scope-status">正在計算兩條指定河道的每日密度…</p>:null}
    {query.error&&valid?<p className="scope-status scope-error" role="alert">項目交會讀取失敗：{String(query.error.message||query.error)}</p>:null}
    {valid&&query.data&&!query.error?<div>
      <p className="scope-status">{range.startDate} ～ {range.endDate} · 河道 A {summary.totals[0].toLocaleString()} 筆 · 河道 B {summary.totals[1].toLocaleString()} 筆 · 雙方都有紀錄 {summary.bothActiveDays} 天</p>
      <p className="scope-status">密度為各自河道「當日筆數 ÷ 該河道區間單日最高筆數」，只比較變化，不混用兩人的量尺。每日筆數以原始資料為準。</p>
      {river.length?<CultureTimeline
        items={river}
        labelOf={labelOf}
        focus={EMPTY_FOCUS}
        mode="source"
        windowStart={range.startDate}
        windowEnd={range.endDate}
        fixedMin={range.startDate}
        fixedMax={(()=>{
          const date=new Date(range.endDate+'T00:00:00Z');
          date.setUTCDate(date.getUTCDate()+1);
          return date.toISOString().slice(0,10);
        })()}
        onSelect={item=>setSelectedDay(String(item?.start||'').slice(0,10))}
      />:<p className="scope-status">選取期間沒有可觀察的公開資料，仍可調整來源或區間。</p>}
      {selectedDay?<p className="scope-status" role="status">目前選取 {selectedDay}：{labels.map((label,i)=>label+' '+(daily.find(row=>row.day===selectedDay)?.counts[i]||0)+' 筆').join('；')}</p>:null}
      <h4>每日交會數據</h4>
      <div className="scope-culture-source-work-scroll">
        <table className="scope-stat-table">
          <thead><tr><th scope="col">日期</th><th scope="col">河道 A · 筆數／相對密度</th><th scope="col">河道 B · 筆數／相對密度</th></tr></thead>
          <tbody>{visibleRows.map(row=><tr key={row.day}>
            <th scope="row">{row.day}</th>
            {row.counts.map((count,i)=><td key={i}>{count.toLocaleString()} 筆 · {(row.ratios[i]*100).toFixed(1)}%</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <nav className="scope-stat-controls" aria-label="項目交會每日資料分頁">
        <button type="button" className="loc-button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button>
        <span className="scope-status">第 {page}／{totalPages} 頁 · 每頁最多 {ITEM_CONFLUENCE_PAGE_SIZE} 天</span>
        <button type="button" className="loc-button" disabled={page>=totalPages} onClick={()=>setPage(value=>Math.min(totalPages,value+1))}>下一頁</button>
      </nav>
    </div>:null}
  </section>;
}
