'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectManagedScopes} from '../../loc/scope-data';
import {selectLocItemDailySeries} from '../../loc/item-confluence-query';
import {
  ITEM_CONFLUENCE_PAGE_SIZE,ITEM_LANE_OPTIONS,itemConfluenceShiftMonth,
  validateItemConfluenceRange,validateItemLane,itemLaneDescription,
  buildItemConfluenceDaily,buildItemConfluenceRiver,itemConfluenceSummary,itemRuneDisplay
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
function laneDayText(row,index,lane){
  if(lane?.source==='daily:rune'){
    const draws=row?.runeDraws?.[index]||[];
    return draws.length?draws.map(itemRuneDisplay).join(' ／ '):'當日無符文紀錄';
  }
  const count=Number(row?.counts?.[index])||0;
  return count.toLocaleString()+' 筆 · '+((Number(row?.ratios?.[index])||0)*100).toFixed(1)+'%';
}
function laneColumnLabel(lane){
  return lane?.source==='daily:rune'?'每日符文 · 符文／四向／真實月相':'作品／媒體 · 筆數／相對密度';
}
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
  const river=useMemo(()=>buildItemConfluenceRiver(daily,labels,[laneA,laneB]),[daily,labels,laneA,laneB]);
  const summary=useMemo(()=>itemConfluenceSummary(daily),[daily]);
  const lanes=[laneA,laneB];
  const selectedRow=daily.find(row=>row.day===selectedDay)||null;
  const totalPages=Math.max(1,Math.ceil(daily.length/ITEM_CONFLUENCE_PAGE_SIZE));
  const visibleRows=daily.slice((page-1)*ITEM_CONFLUENCE_PAGE_SIZE,page*ITEM_CONFLUENCE_PAGE_SIZE);
  useEffect(()=>{setPage(1);setSelectedDay('');},
    [startDate,endDate,laneA.scopeId,laneA.source,laneA.exact,laneB.scopeId,laneB.source,laneB.exact]);
  const invalidMessage=!range.valid?range.reason:!selectionA.valid?('河道 A：'+selectionA.reason):!selectionB.valid?('河道 B：'+selectionB.reason):'';

  return <section className="scope-card scope-culture-classification-river scope-loc-time-river" aria-label="LOC 自訂項目交會">
    <p className="loc-eyebrow">LOC Culture · 項目交會</p>
    <h3>指定河道交會比較</h3>
    <p className="scope-status">從可讀取的 Scope 中指定兩條河道，在同一段日期觀察作品密度或符韻每日符文內容；符文只顯示符文名稱、四向方向及真實月相，不作密度。來源不合併寫入資料庫，不把不同人的作品當作同一筆，也不推論交會代表因果。</p>
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
      <p className="scope-status">{range.startDate} ～ {range.endDate} · {lanes.map((lane,index)=>{
        const total=summary.totals[index];
        return '河道 '+(index===0?'A':'B')+' '+(lane.source==='daily:rune'
          ?daily.filter(row=>row.runeDraws?.[index]?.length).length+' 個每日符文紀錄日'
          :total.toLocaleString()+' 筆');
      }).join(' · ')} · 雙方都有紀錄 {summary.bothActiveDays} 天</p>
      <p className="scope-status">一般文字／媒體河道顯示筆數與各自峰值標準化密度；僅符韻每日符文河道直接顯示符文名稱、四向方向、由抽取日期計算的真實月相，不將一天 1～2 筆誤作密度差異。</p>
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
      {selectedRow?<div className="scope-card" role="status" aria-live="polite">
        <p className="scope-status">選取日期：{selectedDay}</p>
        {lanes.map((lane,index)=><p className="scope-status" key={index}>
          <strong>{labels[index]}：</strong> {laneDayText(selectedRow,index,lane)}
        </p>)}
      </div>:null}
      <h4>每日交會數據</h4>
      <div className="scope-culture-source-work-scroll">
        <table className="scope-stat-table">
          <thead><tr><th scope="col">日期</th>
            {lanes.map((lane,index)=><th key={index} scope="col">河道 {index===0?'A':'B'} · {laneColumnLabel(lane)}</th>)}
          </tr></thead>
          <tbody>{visibleRows.map(row=><tr key={row.day}>
            <th scope="row"><button type="button" className="loc-button" onClick={()=>setSelectedDay(row.day)}>{row.day}</button></th>
            {lanes.map((lane,index)=><td key={index}>{laneDayText(row,index,lane)}</td>)}
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
