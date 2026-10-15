'use client';
import FieldText from '../../i18n/FieldText';

import {UI_COPY} from '../../i18n/ui-copy';
import {useUiCopy} from '../../i18n/ui-locale';
import UiText,{useUiText} from '../../i18n/UiText';

import {useMemo,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  Bar,BarChart,CartesianGrid,Cell,Legend,Line,LineChart,Pie,PieChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectMediaStatisticsFacetRows,selectMediaCrossTagRows,selectScopeDensityRows,selectSourceTrendRows,selectScopeSourceBreakdownRows,selectFirstScopeStatisticsDate} from '../../loc/galaxy-query';
import {selectRows} from '../../loc/db-query.mjs';
import {selectFirstDailyRuneDate} from '../../loc/daily-runes';
import {administrativeSourceTrend} from '../../loc/statistics-admin-source.mjs';
import {defaultMediaCrossAxes,mediaCrossIntersections,mediaCrossTagCatalog} from '../../loc/media-style-intersection.mjs';
import {selectRune66Classification} from '../../loc/rune66-keyword-analysis';
import {selectScopeRegistry,defaultScopeData} from '../../loc/scope-data';
import {featureNavigationHref,readFeatureNavigation} from '../feature-navigation';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state';
import {useScopeRuntime} from '../use-scope-runtime';
import {FeaturePage} from '../ui';
import {useAccount} from '../../loc/use-account';
import {scopeHref} from '../scope-registry';
import {LrunesDailyStatisticsPanel} from '../../lrunes/DailyRuneAnalytics';
import StatisticsMultiChart,{STAT_VISUAL_TYPES,availableStatisticChartTypes} from '../modules/statistics/StatisticsMultiChart';
import ScopeSelfIntersection from '../modules/statistics/ScopeSelfIntersection';
import LocMemberIntersection from '../modules/statistics/LocMemberIntersection';
import ScopeGroupOverview from '../../loc/ScopeGroupOverview';
import {ScopeCustomSourceCategories} from '../../loc/SourceCategoryEditor';
import ScopeGroupStatisticsSharing from '../../loc/ScopeGroupStatisticsSharing';
import {selectCrossScopeSharing} from '../../loc/statistics-group-sharing-query.mjs';
import {canParticipateInCrossStatistics,sharedScopeDensity} from '../../loc/statistics-group-sharing.mjs';
import StatisticsChartFrame from '../modules/statistics/StatisticsChartFrame';
import {statisticsZoomWindow} from '../modules/statistics/statistics-time-zoom.mjs';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const OTHER_RANKING_PAGE_SIZE=10;
const RUNE_RANKING_PAGE_SIZE=8;
const CHART_ACCENT='var(--loc-accent)';
const CHART_TEXT='var(--loc-text)';
const CHART_GRID='var(--loc-line)';
const CHART_TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:'8px'};
const CHART_TYPES=STAT_VISUAL_TYPES;
const STAT_TYPES=['total','source','source_custom','media_type','media_platform','media_style'];
const STAT_TYPE_KEYS=Object.freeze({
  daily_rune:'uiExtra.statisticsUI.dailyRune',
  total:'statistics.totalSource',
  source:'uiExtra.statisticsUI.sourceGroup',
  source_custom:'uiExtra.statisticsUI.sourceCustom',
  media_type:'uiExtra.statisticsUI.mediaType',
  media_platform:'uiExtra.statisticsUI.mediaPlatform',
  media_style:'uiExtra.statisticsUI.mediaStyle'
});
const MEDIA_STAT_TYPES=new Set(['media_type','media_platform','media_style']);
const STYLE_FILTERS=Object.freeze([{value:'none',textKey:'uiExtra.statisticsUI.notApplied'},{value:'rune66',textKey:'uiExtra.statisticsUI.keywordClass'}]);
const SOURCE_TREND_ORDER=Object.freeze(['Facebook','Threads','IG','Others']);
function dateKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
}
function taipeiDateKey(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:'Asia/Taipei',
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    }).formatToParts(date);
    const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  }catch{
    return date.toISOString().slice(0,10);
  }
}
function trendBucket(value,unit){
  const key=dateKey(value);
  if(!key)return null;
  const date=new Date(key+'T00:00:00Z');
  const year=date.getUTCFullYear();
  const month=date.getUTCMonth();
  if(unit==='month'){
    const monthText=String(month+1).padStart(2,'0');
    const end=new Date(Date.UTC(year,month+1,0)).toISOString().slice(0,10);
    return {key:year+'-'+monthText,label:year+'/'+monthText,start:year+'-'+monthText+'-01',end};
  }
  if(unit==='week'){
    const day=date.getUTCDay();
    date.setUTCDate(date.getUTCDate()+(day===0?-6:1-day));
    const start=date.toISOString().slice(0,10);
    const endDate=new Date(date);endDate.setUTCDate(endDate.getUTCDate()+6);
    return {key:start,label:start.slice(5).replace('-','/'),start,end:endDate.toISOString().slice(0,10)};
  }
  return {key,label:key.slice(5).replace('-','/'),start:key,end:key};
}
function rowsInWindow(rows=[],range={}){
  const startDate=dateKey(range.startDate),endDate=dateKey(range.endDate);
  const bucket=['month','week','day'].includes(range.bucket)?range.bucket:'day';
  if(!startDate||!endDate||startDate>endDate)return {rows:[],startDate:'',endDate:'',bucket};
  return {rows:rows.filter(row=>{
    const day=dateKey(row.day);
    return day&&day>=startDate&&day<=endDate;
  }),startDate,endDate,bucket};
}
function buildSourceTrend(rows=[],range={}){
  const window=rowsInWindow(rows,range);
  if(!window.startDate||!window.endDate)return [];
  const buckets=new Map();
  for(let cursor=new Date(window.startDate+'T00:00:00Z'),end=new Date(window.endDate+'T00:00:00Z');cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
    const day=cursor.toISOString().slice(0,10);
    const bucket=trendBucket(day,window.bucket);
    if(!bucket||buckets.has(bucket.key))continue;
    buckets.set(bucket.key,{period:bucket.label,_sort:bucket.key,start_date:bucket.start,end_date:bucket.end,total:0});
  }
  for(const row of window.rows){
    const bucket=trendBucket(row.day,window.bucket);
    if(!bucket)continue;
    const item=buckets.get(bucket.key)||{period:bucket.label,_sort:bucket.key,start_date:bucket.start,end_date:bucket.end,total:0};
    const source=SOURCE_TREND_ORDER.includes(row.source)?row.source:'Others';
    const count=Number(row.item_count)||0;
    item[source]=(Number(item[source])||0)+count;
    item.total+=count;
    buckets.set(bucket.key,item);
  }
  return [...buckets.values()].sort((a,b)=>a._sort.localeCompare(b._sort)).map(item=>{
    const output={period:item.period,start_date:item.start_date,end_date:item.end_date,total:item.total};
    for(const source of SOURCE_TREND_ORDER){
      const count=Number(item[source])||0;
      output[source+'_count']=count;
      output[source]=item.total>0?Number(((count/item.total)*100).toFixed(2)):0;
    }
    return output;
  });
}
function buildSummary(rows=[],range={}){
  const window=rowsInWindow(rows,range);
  const totals=new Map(SOURCE_TREND_ORDER.map(source=>[source,0]));
  let total=0;
  for(const row of window.rows){
    const source=SOURCE_TREND_ORDER.includes(row.source)?row.source:'Others';
    const count=Number(row.item_count)||0;
    totals.set(source,(totals.get(source)||0)+count);
    total+=count;
  }
  return {
    total,
    sources:SOURCE_TREND_ORDER.map(source=>({term:source,item_count:totals.get(source)||0})),
    startDate:window.startDate,
    endDate:window.endDate
  };
}

function SummaryList({rankingType,summary}){
  const UI_COPY=useUiCopy();
  const rows=rankingType==='total'
    ?[{term:UI_COPY.statistics.totalSource,item_count:summary.total}]
    :summary.sources;
  return <div className="scope-ranking">
    {rows.map(row=><div key={row.term}><strong>{row.term}</strong><span>{Number(row.item_count||0).toLocaleString()}</span></div>)}
  </div>;
}
function SummaryChart({type='bar',rankingType,summary,height=380}){
  const UI_COPY=useUiCopy();
  const data=rankingType==='total'
    ?[{term:UI_COPY.statistics.totalSource,value:summary.total}]
    :summary.sources.map(row=>({term:row.term,value:Number(row.item_count)||0}));
  if(!data.length)return <p className="scope-status">{FEATURE_EMPTY_MESSAGE}</p>;
  if(type==='pie')return <ResponsiveContainer width="100%" height={height}>
    <PieChart><Tooltip contentStyle={CHART_TOOLTIP}/><Pie data={data} dataKey="value" nameKey="term" cx="50%" cy="50%" outerRadius={Math.min(140,height/2-26)}>
      {data.map((row,index)=><Cell key={row.term} fill={PIE_COLORS[index%PIE_COLORS.length]}/>)}
    </Pie></PieChart>
  </ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{top:8,right:18,bottom:32,left:8}}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
      <XAxis dataKey="term" tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <YAxis tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <Tooltip contentStyle={CHART_TOOLTIP}/>
      <Bar dataKey="value" fill={CHART_ACCENT} radius={[4,4,0,0]}/>
    </BarChart>
  </ResponsiveContainer>;
}
function TotalTrendChart({rows=[],range={},height=420}){
  const UI_COPY=useUiCopy();
  const data=useMemo(()=>buildSourceTrend(rows,range),[rows,range]);
  if(!data.length)return <p className="scope-status">{FEATURE_EMPTY_MESSAGE}</p>;
  return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{top:8,right:18,bottom:48,left:4}}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
      <XAxis dataKey="period" angle={-24} textAnchor="end" interval="preserveStartEnd" height={72} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <YAxis tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <Tooltip contentStyle={CHART_TOOLTIP} formatter={value=>[Number(value).toLocaleString()+' 項',UI_COPY.statistics.totalSource]}/>
      <Line type="monotone" dataKey="total" name="總來源" stroke={CHART_ACCENT} strokeWidth={3} dot={false}/>
    </LineChart>
  </ResponsiveContainer>;
}
function SourceTrendChart({rows=[],range={},height=420}){
  const data=useMemo(()=>buildSourceTrend(rows,range),[rows,range]);
  if(!data.length)return <p className="scope-status">{FEATURE_EMPTY_MESSAGE}</p>;
  return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{top:8,right:18,bottom:48,left:4}}>
      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
      <XAxis dataKey="period" angle={-24} textAnchor="end" interval="preserveStartEnd" height={72} tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
      <YAxis domain={[0,100]} tick={{fill:CHART_TEXT}} stroke={CHART_GRID} tickFormatter={value=>value+'%'}/>
      <Tooltip contentStyle={CHART_TOOLTIP} formatter={value=>[Number(value).toFixed(1)+'%']}/>
      <Legend/>
      {SOURCE_TREND_ORDER.map((source,index)=><Line key={source} type="monotone" dataKey={source} stroke={PIE_COLORS[index%PIE_COLORS.length]} strokeWidth={2} dot={false} connectNulls/>)}
    </LineChart>
  </ResponsiveContainer>;
}


function facetTotals(rows=[]){
  const map=new Map();
  for(const row of rows){
    const category=String(row.category||'').trim();
    if(!category)continue;
    const key=category.normalize('NFKC').toLocaleLowerCase();
    const existing=map.get(key);
    if(existing)existing.item_count+=(Number(row.item_count)||0);
    else map.set(key,{term:category,item_count:Number(row.item_count)||0});
  }
  return [...map.values()].sort((a,b)=>b.item_count-a.item_count||a.term.localeCompare(b.term));
}
function facetTrend(rows=[],window={},selectedCategories=[]){
  if(!window.startDate||!window.endDate)return [];
  const categories=new Map(selectedCategories.map(value=>[String(value).normalize('NFKC').toLocaleLowerCase(),value]));
  const buckets=new Map();
  for(let cursor=new Date(window.startDate+'T00:00:00Z'),end=new Date(window.endDate+'T00:00:00Z');cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
    const bucket=trendBucket(cursor.toISOString().slice(0,10),window.bucket);
    if(bucket&&!buckets.has(bucket.key))buckets.set(bucket.key,{period:bucket.label,_sort:bucket.key});
  }
  for(const row of rows){
    const canonical=categories.get(String(row.category||'').normalize('NFKC').toLocaleLowerCase());
    if(!canonical)continue;
    const bucket=trendBucket(row.day,window.bucket);
    if(!bucket)continue;
    const output=buckets.get(bucket.key);
    if(output)output[canonical]=(Number(output[canonical])||0)+(Number(row.item_count)||0);
  }
  return [...buckets.values()].sort((a,b)=>a._sort.localeCompare(b._sort)).map(row=>{
    const output={period:row.period};
    for(const category of selectedCategories)output[category]=Number(row[category])||0;
    return output;
  });
}
function MediaFacetStatistics({rankingType,rows=[],chartType='line',onChartTypeChange,range={},scopeId,foldBlank=false,zoomLevel=0,onZoomLevelChange}){
  const [selectedTag,setSelectedTag]=useState('all');
  const [rankingPage,setRankingPage]=useState(1);
  const window=useMemo(()=>rowsInWindow(rows,range),[rows,range]);
  // No NOT/exclusion list; count all existing Meta Tags.
  const facetRows=window.rows;
  const totals=useMemo(()=>facetTotals(facetRows),[facetRows]);
  const chosen=totals.find(row=>row.term===selectedTag)?selectedTag:'all';
  const displayed=chosen==='all'?totals:totals.filter(row=>row.term===chosen);
  const pageSize=scopeId==='lrunes'?RUNE_RANKING_PAGE_SIZE:OTHER_RANKING_PAGE_SIZE;
  const pages=Math.max(1,Math.ceil(displayed.length/pageSize));
  const currentPage=Math.max(1,Math.min(pages,rankingPage));
  const chartCategories=chosen==='all'?totals.slice(0,6).map(row=>row.term):[chosen];
  const chartRows=useMemo(()=>facetTrend(facetRows,window,chartCategories),[facetRows,window.startDate,window.endDate,window.bucket,chartCategories.join('\u0000')]);
  const bars=(chosen==='all'?totals.slice(0,15):displayed).map(row=>({term:row.term,value:row.item_count}));
  const supported=availableStatisticChartTypes({
    rows:chartRows,series:chartCategories.map(category=>({key:category,label:category})),
    distribution:bars.map(row=>({name:row.term,value:row.value}))
  });
  const chosenChartType=supported.some(([value])=>value===chartType)?chartType:(supported[0]?.[0]||'line');
  return <>
    <div className="scope-stat-controls">
      <label><span><FieldText text={rankingType==='media_style'?'指定 Meta Tag':'指定統計細項'}/></span>
        <select className="scope-select" value={chosen} onChange={event=>{setSelectedTag(event.target.value);setRankingPage(1);}}>
          <option value="all"><FieldText text="全部項目"/></option>
          {totals.map(row=><option key={row.term} value={row.term}>{row.term}（{row.item_count.toLocaleString()}）</option>)}
        </select>
      </label>
      <label><span><FieldText text="圖形"/></span>
        <select className="scope-select" value={chosenChartType} onChange={event=>onChartTypeChange?.(event.target.value)}>
          {supported.length?supported.map(([value,label])=><option key={value} value={value}><FieldText text={label}/></option>):<option value="line"><FieldText text="尚無可用圖形"/></option>}
        </select>
      </label>
    </div>
    {!totals.length?<StatisticsChartFrame level={zoomLevel} onChange={onZoomLevelChange} range={range} idPrefix="scope-stat">
      <p className="scope-status">{FEATURE_EMPTY_MESSAGE}</p>
    </StatisticsChartFrame>:<>
      <div className="scope-ranking">
        {displayed.slice((currentPage-1)*pageSize,currentPage*pageSize).map(row=><div key={row.term}><strong>{row.term}</strong><span>{row.item_count.toLocaleString()}</span></div>)}
      </div>
      {pages>1?<nav className="scope-stat-controls" aria-label="統計分頁">
        <button type="button" className="loc-button" disabled={currentPage===1} onClick={()=>setRankingPage(currentPage-1)}><FieldText text="上一頁"/></button>
        <span>{currentPage} / {pages}</span>
        <button type="button" className="loc-button" disabled={currentPage===pages} onClick={()=>setRankingPage(currentPage+1)}><FieldText text="下一頁"/></button>
      </nav>:null}
      <StatisticsChartFrame level={zoomLevel} onChange={onZoomLevelChange} range={range} idPrefix="scope-stat">
        <StatisticsMultiChart type={chosenChartType}
          rows={chartRows}
          series={chartCategories.map(category=>({key:category,label:category}))}
          distribution={bars.map(row=>({name:row.term,value:row.value}))}
          foldBlank={foldBlank}
          height={420}
        />
      </StatisticsChartFrame>
    </>}
  </>;
}

function MediaCrossTagPicker({title,options,selected,onChange}){
  const chosen=new Set(selected);
  return <details className="scope-stat-cross-picker">
    <summary><FieldText text={title}/>（<FieldText text="已選"/> {chosen.size} <FieldText text="項"/>）</summary>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'8px 0'}}>
      <button className="loc-button" type="button" onClick={()=>onChange(options.map(x=>x.key))}><FieldText text="全選"/></button>
      <button className="loc-button" type="button" onClick={()=>onChange([])}><FieldText text="清除"/></button>
    </div>
    <div style={{maxHeight:210,overflowY:'auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))',gap:6}}>
      {options.map(tag=><label key={tag.key} className="scope-setting-toggle" style={{display:'flex',alignItems:'center',gap:6}}>
        <input type="checkbox" checked={chosen.has(tag.key)} onChange={event=>{
          onChange(event.target.checked?[...chosen,tag.key]:[...chosen].filter(key=>key!==tag.key));
        }}/>
        <span>{tag.label}（{tag.count}）</span>
      </label>)}
    </div>
  </details>;
}
function MediaCrossTagStatistics({rows=[],range={},zoomLevel=0,onZoomLevelChange}){
  const [leftOverride,setLeftOverride]=useState(null);
  const [rightOverride,setRightOverride]=useState(null);
  const [mode,setMode]=useState('ranking');
  const [visibleCount,setVisibleCount]=useState(15);
  const [selectedPair,setSelectedPair]=useState('');
  const catalog=useMemo(()=>mediaCrossTagCatalog(rows),[rows]);
  const tagKeys=new Set(catalog.options.map(x=>x.key));
  const defaults=defaultMediaCrossAxes(catalog);
  const left=leftOverride===null?defaults.left:leftOverride.filter(x=>tagKeys.has(x));
  const leftSet=new Set(left);
  const right=rightOverride===null?catalog.options.filter(x=>!leftSet.has(x.key)).map(x=>x.key)
    :rightOverride.filter(x=>tagKeys.has(x));
  const pairs=useMemo(()=>mediaCrossIntersections(catalog,left,right),[catalog,left.join('\u0000'),right.join('\u0000')]);
  const selected=pairs.find(x=>x.key===selectedPair);
  const leading=pairs.slice(0,12);
  const trendPairs=pairs.slice(0,6);
  const trendData=useMemo(()=>{
    const daily=trendPairs.flatMap(pair=>[...pair.days].map(([day,item_count])=>({
      day,category:pair.key,item_count
    })));
    return facetTrend(daily,{
      startDate:range.startDate,endDate:range.endDate,bucket:range.bucket||'day'
    },trendPairs.map(pair=>pair.key));
  },[pairs,range.startDate,range.endDate,range.bucket]);
  return <section className="scope-stat-cross" aria-label="多媒體標籤交互統計">
    <h3><FieldText text="多媒體 Meta Tag 交互統計"/></h3>
    <p className="scope-status"><FieldText text="兩側標籤皆從現有多媒體 metadata 產生；預選 Mandopop／J-Pop／K-Pop 對其他標籤，沒有的組合不列出。每組每筆媒體只算一次。"/></p>
    {!catalog.options.length?<p className="scope-status"><FieldText text="目前區間沒有可交互比較的 Meta Tag。"/></p>:<>
      <div className="scope-stat-controls" style={{alignItems:'start'}}>
        <MediaCrossTagPicker title="第一組標籤" options={catalog.options} selected={left} onChange={setLeftOverride}/>
        <MediaCrossTagPicker title="第二組標籤" options={catalog.options} selected={right} onChange={setRightOverride}/>
        <button type="button" className="loc-button" onClick={()=>{
          setLeftOverride(null);setRightOverride(null);setSelectedPair('');setVisibleCount(15);
        }}><FieldText text="恢復預設搭配"/></button>
      </div>
      <div className="scope-stat-controls">
        <label><span><FieldText text="圖表"/></span><select className="scope-select" value={mode} onChange={event=>setMode(event.target.value)}>
          <option value="ranking"><FieldText text="組合數量"/></option><option value="trend"><FieldText text="組合時間趨勢"/></option>
        </select></label>
        <span><FieldText text="符合的標籤組合"/>：{pairs.length.toLocaleString()} <FieldText text="組"/></span>
      </div>
      {!pairs.length?<p className="scope-status"><FieldText text="目前選擇沒有共同出現的標籤組合，請調整任一側標籤。"/></p>:<>
        <StatisticsChartFrame level={zoomLevel} onChange={onZoomLevelChange} range={range} idPrefix="scope-stat-cross">
          {mode==='ranking'?<div style={{overflowX:'auto'}}>
            <div style={{minWidth:480}}>
              <ResponsiveContainer width="100%" height={Math.max(250,leading.length*38+70)}>
                <BarChart data={leading.map(pair=>({key:pair.key,label:pair.leftLabel+' × '+pair.rightLabel,count:pair.count}))} layout="vertical" margin={{top:10,right:20,bottom:14,left:6}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
                  <XAxis type="number" allowDecimals={false} tick={{fill:CHART_TEXT}}/>
                  <YAxis dataKey="label" type="category" width={190} tick={{fill:CHART_TEXT,fontSize:11}}/>
                  <Tooltip contentStyle={CHART_TOOLTIP}/>
                  <Bar dataKey="count" name="共同作品" fill={CHART_ACCENT} maxBarSize={28}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>:<ResponsiveContainer width="100%" height={420}>
            <LineChart data={trendData} margin={{top:16,right:12,bottom:55,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
              <XAxis dataKey="period" angle={-25} textAnchor="end" height={65} tick={{fill:CHART_TEXT,fontSize:11}}/>
              <YAxis allowDecimals={false} tick={{fill:CHART_TEXT}}/>
              <Tooltip contentStyle={CHART_TOOLTIP}/><Legend/>
              {trendPairs.map((pair,i)=><Line key={pair.key} type="monotone" name={pair.leftLabel+' × '+pair.rightLabel} dataKey={pair.key} stroke={PIE_COLORS[i%PIE_COLORS.length]} strokeWidth={2} dot={trendData.length<20} connectNulls={false}/>)}
            </LineChart>
          </ResponsiveContainer>}
        </StatisticsChartFrame>
        <div className="scope-ranking">
          {pairs.slice(0,visibleCount).map(pair=><div key={pair.key}>
            <strong>{pair.leftLabel} × {pair.rightLabel}</strong>
            <span>{pair.count.toLocaleString()} 件
              {' '}<button type="button" className="loc-button" onClick={()=>setSelectedPair(selectedPair===pair.key?'':pair.key)}>
                <FieldText text={selectedPair===pair.key?'收起作品':'查看作品'}/>
              </button>
            </span>
          </div>)}
        </div>
        {visibleCount<pairs.length?<button type="button" className="loc-button" onClick={()=>setVisibleCount(n=>n+15)}><FieldText text="顯示更多組合"/></button>:null}
        {selected?<div className="scope-stat-cross-matches">
          <h4>{selected.leftLabel} × {selected.rightLabel} · {selected.count} 件</h4>
          <div className="scope-ranking">
            {selected.media.map(media=><div key={media.id}>
              <strong>{media.title||media.id}</strong>
              <span>{media.day||'未標記日期'} {/^https?:\/\//iu.test(media.url)?<a href={media.url} target="_blank" rel="noopener noreferrer"><FieldText text="查看媒體"/></a>:null}</span>
            </div>)}
          </div>
        </div>:null}
      </>}
    </>}
  </section>;
}

function classLabel(value){
  const text=String(value||'').trim();
  return !text?'':text.endsWith('群組')?text:text+'群組';
}
function groupLabel(value){
  const text=String(value||'').trim();
  return !text?'':text.endsWith('符文')?text:text+'之符文';
}
function Rune66Summary({analysis}){
  const [groupPage,setGroupPage]=useState(1);
  const data=analysis||{};
  const className=String(data.keywordMeta?.class_name||'關鍵詞 Class');
  const globalCount=Math.max(0,Number(data.keywordDocumentCount||0));
  const minDocuments=Math.max(0,Number(data.keywordMinDocuments||0));
  if(!data.staticstime)return null;
  if(!data.statisticsEnabled)return <div className="scope-ranking">
    <div><strong>{className}</strong><span>{globalCount.toLocaleString()} / {minDocuments.toLocaleString()}</span></div>
  </div>;
  const classRows=[...(data.groupTotals||[])]
    .filter(row=>Number(row.document_count||0)>0)
    .sort((a,b)=>Number(b.document_count||0)-Number(a.document_count||0)||Number(a.order||0)-Number(b.order||0));
  const groupRows=[...(data.runeRanking||[])]
    .filter(row=>Number(row.count||0)>0);
  const classifiedTotal=Math.max(0,Number(data.classifiedCount||0));
  const groupHitTotal=groupRows.reduce((sum,row)=>sum+Number(row.count||0),0);
  const groupPageCount=Math.max(1,Math.ceil(groupRows.length/RUNE_RANKING_PAGE_SIZE));
  const activeGroupPage=Math.min(groupPage,groupPageCount);
  const visibleGroupRows=groupRows.slice((activeGroupPage-1)*RUNE_RANKING_PAGE_SIZE,activeGroupPage*RUNE_RANKING_PAGE_SIZE);
  return <div className="scope-rune66-summary">
    <div className="scope-ranking"><div><strong>{className}</strong><span>{Number(data.documentCount||0).toLocaleString()} 項 · 已分類 {classifiedTotal.toLocaleString()} · 未分類 {Number(data.unclassifiedCount||0).toLocaleString()}</span></div></div>
    <section className="scope-card">
      <h3>Class｜符文群組</h3>
      <div className="scope-ranking">
        {classRows.map(row=>{
          const count=Number(row.document_count||0);
          const ratio=classifiedTotal>0?(count/classifiedTotal)*100:0;
          return <div key={row.group}><strong>{classLabel(row.group)}</strong><span>{count.toLocaleString()} 篇 · {ratio.toFixed(1)}%</span></div>;
        })}
      </div>
      {classRows.length?<ResponsiveContainer width="100%" height={360}>
        <BarChart data={classRows.map(row=>({label:classLabel(row.group),value:Number(row.document_count)||0}))} margin={{top:8,right:18,bottom:28,left:8}}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID}/>
          <XAxis dataKey="label" tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
          <YAxis tick={{fill:CHART_TEXT}} stroke={CHART_GRID}/>
          <Tooltip contentStyle={CHART_TOOLTIP}/>
          <Bar dataKey="value" name="Class 作品數" fill={CHART_ACCENT} radius={[4,4,0,0]}/>
        </BarChart>
      </ResponsiveContainer>:null}
    </section>
    <section className="scope-card">
      <h3>Group｜符文排行</h3>
      <div className="scope-ranking">
        {visibleGroupRows.map(row=>{
          const count=Number(row.count||0);
          const ratio=groupHitTotal>0?(count/groupHitTotal)*100:0;
          return <div key={row.rune_id}><strong>{String(row.rune_id).padStart(2,'0')} · {groupLabel(row.label)}</strong><span>{count.toLocaleString()} 次 · {ratio.toFixed(1)}%</span></div>;
        })}
      </div>
      {groupRows.length>RUNE_RANKING_PAGE_SIZE?<nav className="scope-stat-controls" aria-label="Group 統計分頁">
        <button type="button" className="loc-button" disabled={activeGroupPage===1} onClick={()=>setGroupPage(activeGroupPage-1)}><FieldText text="上一頁"/></button>
        <span className="scope-status" aria-live="polite">第 {activeGroupPage} / {groupPageCount} 頁 · 共 {groupRows.length.toLocaleString()} 項</span>
        <button type="button" className="loc-button" disabled={activeGroupPage===groupPageCount} onClick={()=>setGroupPage(activeGroupPage+1)}><FieldText text="下一頁"/></button>
      </nav>:null}
    </section>
  </div>;
}

function StatisticTypeSelect({scopeId,navigation,types}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const router=useRouter();
  const requested=String(navigation.rankingType||'');
  const active=types.includes(requested)?requested:(types[0]||'');
  if(!types.length)return null;
  return <label>
    <span>{UI_COPY.statistics.item}</span>
    <select id="statistics-ranking-type" className="scope-select" value={active} onChange={event=>{
      const value=event.target.value;
      if(!value||value===active)return;
      router.push(featureNavigationHref(scopeId,'statics',{...navigation,rankingType:value}));
    }}>
      {types.map(value=><option key={value} value={value}>{t(STAT_TYPE_KEYS[value]||value)}</option>)}
    </select>
  </label>;
}

async function selectPublicStatisticsMembers(){
  const rows=await selectScopeRegistry({scopeKind:'scope'});
  return rows.map(row=>({...defaultScopeData(row.scope_id),label:row.display_name||row.scope_id}))
    .filter(row=>row.id&&row.galaxy&&row.galaxyMedia);
}

function ScopeGroupStatistics(){
  const UI_COPY=useUiCopy();
  const [aggregateType,setAggregateType]=useState('total');
  const [chartType,setChartType]=useState('line');
  const [zoomLevel,setZoomLevel]=useState(0);
  // Persist intersection selections while the range-specific query remounts.
  const [memberLaneCount,setMemberLaneCount]=useState(2);
  const [memberChoices,setMemberChoices]=useState([]);
  const [memberGraph,setMemberGraph]=useState('line');
  const scopesQuery=useQuery({
    queryKey:['managed-scopes'],
    queryFn:selectPublicStatisticsMembers,
    staleTime:5*60_000
  });
  const policy=useQuery({
    queryKey:['cross-statistics-sharing'],
    queryFn:selectCrossScopeSharing,
    staleTime:0,refetchOnMount:'always',refetchOnWindowFocus:true
  });
  const scopes=useMemo(()=>(scopesQuery.data||[]).filter(scope=>
    canParticipateInCrossStatistics(scope.id,policy.data?.permissions,policy.data?.categories)
  ),[scopesQuery.data,policy.data]);
  const scopeIds=useMemo(()=>scopes.map(scope=>String(scope.id||'').trim()).filter(Boolean),[scopes]);
  const endDate=useMemo(()=>taipeiDateKey(),[]);
  const earliest=useQuery({
    queryKey:['statistics-history-start','loc',scopesQuery.data?.map(row=>row.id).join('|')],
    enabled:scopesQuery.isSuccess,
    queryFn:async()=>{
      const starts=await Promise.all([
        ...(scopesQuery.data||[]).map(selectFirstScopeStatisticsDate),
        selectFirstDailyRuneDate()
      ]);
      return starts.filter(Boolean).sort()[0]||'';
    },
    staleTime:5*60_000
  });
  const zoomRange=useMemo(()=>statisticsZoomWindow(zoomLevel,endDate,earliest.data||''),
    [zoomLevel,endDate,earliest.data]);
  const {startDate,endDate:rangeEndDate,bucket}=zoomRange;
  const densityQuery=useQuery({
    queryKey:['scope-density','loc',zoomLevel,startDate,rangeEndDate,scopeIds.join('|'),JSON.stringify(policy.data?.permissions||[])],
    queryFn:async()=>{
      const output=await Promise.all(scopes.map(async scope=>
        sharedScopeDensity(await selectScopeSourceBreakdownRows(scope,{startDate,endDate:rangeEndDate}),scope.id,policy.data)
      ));
      return output.flat();
    },
    enabled:Boolean(policy.data&&scopes.length&&startDate&&rangeEndDate),
    staleTime:5*60_000
  });
  const overallTotal=useMemo(
    ()=>(densityQuery.data||[]).reduce((sum,row)=>sum+(Number(row.item_count)||0),0),
    [densityQuery.data]
  );
  const totals=useMemo(()=>{
    const map=new Map(scopeIds.map(id=>[id,0]));
    for(const row of densityQuery.data||[]){
      const id=String(row.scope_id||'').trim();
      if(!map.has(id))continue;
      map.set(id,(map.get(id)||0)+(Number(row.item_count)||0));
    }
    return scopeIds.map(id=>{
      const total=map.get(id)||0;
      return {scope_id:id,total,ratio:overallTotal>0?(total/overallTotal)*100:0};
    });
  },[densityQuery.data,scopeIds,overallTotal]);
  const trendData=useMemo(()=>{
    if(!startDate||!rangeEndDate)return [];
    const bucketUnit=bucket;
    const buckets=new Map();
    for(let cursor=new Date(startDate+'T00:00:00Z'),end=new Date(rangeEndDate+'T00:00:00Z');cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
      const day=cursor.toISOString().slice(0,10);
      const bucket=trendBucket(day,bucketUnit);
      if(!bucket||buckets.has(bucket.key))continue;
      const row={period:bucket.label,_sort:bucket.key,total:0};
      for(const id of scopeIds)row[id]=0;
      buckets.set(bucket.key,row);
    }
    for(const sourceRow of densityQuery.data||[]){
      const bucket=trendBucket(sourceRow.day,bucketUnit);
      if(!bucket)continue;
      const row=buckets.get(bucket.key)||{period:bucket.label,_sort:bucket.key,total:0};
      for(const id of scopeIds)if(row[id]===undefined)row[id]=0;
      const id=String(sourceRow.scope_id||'').trim();
      const count=Number(sourceRow.item_count)||0;
      if(scopeIds.includes(id))row[id]=(Number(row[id])||0)+count;
      row.total=(Number(row.total)||0)+count;
      buckets.set(bucket.key,row);
    }
    return [...buckets.values()].sort((a,b)=>a._sort.localeCompare(b._sort));
  },[densityQuery.data,startDate,rangeEndDate,scopeIds,bucket]);
  const distributionData=totals.map(row=>({term:row.scope_id,value:row.total}));
  // Even when displaying a combined total, its composition is the real
  // set of child Scopes. A single 100% "LOC total" pie is not analytics.
  const locSeries=scopeIds.map(id=>({key:id,label:id}));
  const locDistribution=distributionData.map(row=>({name:row.term,value:row.value}));
  const locAllowed=availableStatisticChartTypes({
    rows:trendData,series:locSeries,distribution:locDistribution,totalKey:aggregateType==='total'?'total':''
  });
  const locChartType=locAllowed.some(([value])=>value===chartType)?chartType:(locAllowed[0]?.[0]||'line');

  return <section className="scope-stat-section">
    <header className="scope-stat-domain-heading">
      <div>
        <h2>{UI_COPY.statistics.result}</h2>
      </div>
    </header>
    <div className="scope-stat-controls">
      <label>
        <span>{UI_COPY.statistics.item}</span>
        <select className="scope-select" value={aggregateType} onChange={event=>setAggregateType(event.target.value)}>
          <option value="total"><FieldText text="LOC 合併總數"/></option>
          <option value="scope"><FieldText text="所屬人員分布"/></option>
        </select>
      </label>
      <label>
        <span>{UI_COPY.statistics.chart}</span>
        <select className="scope-select" value={locChartType} onChange={event=>setChartType(event.target.value)}>
          {locAllowed.length?locAllowed.map(([value,label])=><option key={value} value={value}><FieldText text={label}/></option>):<option value="line"><FieldText text="尚無可用圖形"/></option>}
        </select>
      </label>
    </div>

    <p className="scope-status">{startDate&&rangeEndDate?startDate+' ～ '+rangeEndDate:''}</p>
    <p className="scope-status">LOC 合併統計沿用原有公開來源資料；只有成員明確關閉的群組來源分類會從跨成員數值中排除。每日符文可獨立參與交互比較。</p>
    <div className="scope-ranking">
      <div>
        <strong><FieldText text="LOC 合併總數"/></strong>
        <span>{overallTotal.toLocaleString()} 項</span>
      </div>
    </div>

    <div className="scope-result-links">
      {scopeIds.map(id=><a key={id} href={featureNavigationHref(id,'statics')}>{id} · 查看統計</a>)}
    </div>

    <StatisticsChartFrame level={zoomLevel} onChange={setZoomLevel} range={zoomRange} idPrefix="loc-stat">
      {!densityQuery.isPending&&!densityQuery.error&&trendData.length?<StatisticsMultiChart
        type={locChartType} rows={trendData} series={locSeries}
        distribution={locDistribution} totalKey={aggregateType==='total'?'total':''} height={420}
      />:<p className="scope-status">{densityQuery.isPending?t('uiExtra.statisticsUI.loading'):t('uiExtra.statisticsUI.noChart')}</p>}
    </StatisticsChartFrame>
    <LocMemberIntersection key={startDate+'|'+rangeEndDate}
      scopes={scopesQuery.data||[]} startDate={startDate} endDate={rangeEndDate}
      unit={bucket} sharing={policy.data||{}}
      laneCount={memberLaneCount} onLaneCountChange={setMemberLaneCount}
      choices={memberChoices} onChoicesChange={setMemberChoices}
      graph={memberGraph} onGraphChange={setMemberGraph}
      zoomLevel={zoomLevel} onZoomLevelChange={setZoomLevel} zoomRange={zoomRange}/>
    {scopesQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(scopesQuery.error)}</p>:null}
    {policy.error?<p className="scope-status scope-error">{featureDataErrorMessage(policy.error)}</p>:null}
    {earliest.error?<p className="scope-status scope-error">{featureDataErrorMessage(earliest.error)}</p>:null}
    {densityQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(densityQuery.error)}</p>:null}
  </section>;
}

function ScopeStatisticsResults({scopeId,navigation,types}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const requested=String(navigation.rankingType||'');
  const rankingType=types.includes(requested)?requested:(types[0]||'');
  const mediaDimension=MEDIA_STAT_TYPES.has(rankingType);
  const isLrunesDaily=scopeId==='lrunes'&&rankingType==='daily_rune';
  const [chartType,setChartType]=useState('line');
  const [zoomLevel,setZoomLevel]=useState(0);
  const [foldBlank,setFoldBlank]=useState(true);
  // Leave potentially expensive keyword aggregation OFF until explicitly chosen.
  const [styleFilter,setStyleFilter]=useState('none');
  const queryEndDate=useMemo(()=>taipeiDateKey(),[]);
  const scopesQuery=useQuery({
    queryKey:['managed-scopes'],
    queryFn:selectPublicStatisticsMembers,
    staleTime:5*60_000
  });
  const targetScopes=useMemo(()=>{
    const scopes=scopesQuery.data||[];
    return scopes.filter(scope=>scope.id===scopeId);
  },[scopeId,scopesQuery.data]);
  const earliest=useQuery({
    queryKey:['statistics-history-start',scopeId],
    enabled:!isLrunesDaily&&Boolean(targetScopes[0]),
    queryFn:()=>selectFirstScopeStatisticsDate(targetScopes[0]),
    staleTime:5*60_000
  });
  const queryRange=useMemo(()=>statisticsZoomWindow(zoomLevel,queryEndDate,earliest.data||''),
    [zoomLevel,queryEndDate,earliest.data]);
  const trendQuery=useQuery({
    queryKey:['statistics-source-trend',scopeId,zoomLevel,queryRange.startDate,queryRange.endDate],
    queryFn:()=>selectSourceTrendRows(targetScopes,queryRange),
    enabled:!isLrunesDaily&&!mediaDimension&&Boolean(rankingType)&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate),
    staleTime:5*60_000
  });
  const mediaQuery=useQuery({
    queryKey:['statistics-media-facet',scopeId,rankingType,queryRange.startDate,queryRange.endDate],
    queryFn:()=>selectMediaStatisticsFacetRows(targetScopes[0],rankingType,queryRange),
    enabled:mediaDimension&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate),
    staleTime:0,
    refetchOnMount:'always',
    refetchOnWindowFocus:true
  });
  const crossTagQuery=useQuery({
    queryKey:['statistics-media-cross-tags',scopeId,queryRange.startDate,queryRange.endDate],
    queryFn:()=>selectMediaCrossTagRows(targetScopes[0],queryRange),
    enabled:rankingType==='media_style'&&Boolean(targetScopes[0])&&Boolean(queryRange.startDate&&queryRange.endDate),
    staleTime:0,
    refetchOnMount:'always',
    refetchOnWindowFocus:true
  });
  const summary=useMemo(()=>buildSummary(trendQuery.data||[],queryRange),[trendQuery.data,queryRange]);
  const sourceCatalog=useQuery({
    queryKey:['statistics-source-taxonomy',scopeId],
    enabled:!isLrunesDaily&&!mediaDimension&&Boolean(rankingType),
    queryFn:async()=>{
      const [cat,aliases,personal]=await Promise.all([
        selectRows('silver.statistics_source_categories',{columns:'category_code,display_name,enabled',limit:250}),
        selectRows('silver.statistics_source_aliases',{columns:'source_key,category_code',limit:250}),
        selectRows('silver.scope_source_subcategories',{columns:'scope_id,source_key,category_code,display_name,enabled',
          filters:[{column:'scope_id',operator:'eq',value:scopeId}],limit:250})
      ]);
      return {categories:cat.rows,aliases:aliases.rows,scopeSources:personal.rows};
    },
    staleTime:5*60_000
  });
  const sourceRows=useQuery({
    queryKey:['own-scope-source-intersection',scopeId,queryRange.startDate,queryRange.endDate],
    queryFn:()=>selectScopeSourceBreakdownRows(targetScopes[0],queryRange),
    enabled:!isLrunesDaily&&!mediaDimension&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate),
    staleTime:5*60_000
  });
  const adminSource=useMemo(()=>administrativeSourceTrend(sourceRows.data||[],sourceCatalog.data||{},{
    startDate:queryRange.startDate,endDate:queryRange.endDate,
    unit:queryRange.bucket,scopeId,
    dimension:rankingType==='source_custom'?'personal':'group'
  }),[sourceRows.data,sourceCatalog.data,queryRange.startDate,queryRange.endDate,queryRange.bucket,scopeId,rankingType]);
  const basicTrend=adminSource.rows;
  const basicSeries=adminSource.series;
  const basicDistribution=adminSource.distribution;
  const sourceSummary={...summary,total:adminSource.total,
    sources:adminSource.distribution.map(row=>({term:row.name,item_count:row.value})),
    startDate:queryRange.startDate,endDate:queryRange.endDate
  };
  const facetRange=rowsInWindow(mediaQuery.data||[],queryRange);
  const facetTotalsForOptions=facetTotals(facetRange.rows);
  const facetNames=facetTotalsForOptions.slice(0,6).map(row=>row.term);
  const facetData=facetTrend(facetRange.rows,facetRange,facetNames);
  const facetDistribution=facetTotalsForOptions.slice(0,15).map(row=>({name:row.term,value:row.item_count}));
  const optionsForCurrent=availableStatisticChartTypes(mediaDimension
    ?{rows:facetData,series:facetNames.map(name=>({key:name,label:name})),distribution:facetDistribution}
    :{rows:basicTrend,series:basicSeries,distribution:basicDistribution,totalKey:rankingType==='total'?'total':''});
  const effectiveChartType=optionsForCurrent.some(([value])=>value===chartType)?chartType:(optionsForCurrent[0]?.[0]||'line');
  const styleRange=useMemo(()=>({
    startDate:queryRange.startDate||'',
    endDate:queryRange.endDate||''
  }),[queryRange.startDate,queryRange.endDate]);
  const runeQuery=useQuery({
    queryKey:['statistics-style-filter','rune66',scopeId,styleRange.startDate,styleRange.endDate],
    queryFn:()=>selectRune66Classification({scopeId,...styleRange}),
    enabled:scopeId==='lo3rwang'&&styleFilter==='rune66'&&Boolean(styleRange.startDate&&styleRange.endDate),
    staleTime:5*60_000
  });

  return <section className="scope-stat-section">
    <header className="scope-stat-domain-heading"><div><h2>{UI_COPY.statistics.result}</h2></div></header>
    <div className="scope-stat-controls">
      <StatisticTypeSelect scopeId={scopeId} navigation={navigation} types={types}/>
      {!isLrunesDaily?<>{!mediaDimension?<label><span>{UI_COPY.statistics.chart}</span><select className="scope-select" value={effectiveChartType} onChange={event=>setChartType(event.target.value)}>
        {optionsForCurrent.length?optionsForCurrent.map(([value,label])=><option key={value} value={value}><FieldText text={label}/></option>):<option value="line"><FieldText text="尚無可用圖形"/></option>}
      </select></label>:null}
      {!['pie','radar','radial','treemap','scatter'].includes(effectiveChartType)?<label className="scope-setting-toggle">
        <input type="checkbox" checked={foldBlank} onChange={event=>setFoldBlank(event.target.checked)}/> <FieldText text="折疊空白時間"/>
      </label>:null}
      </>:null}
      {scopeId==='lo3rwang'?<label><span><FieldText text="表現風格"/></span><select className="scope-select" value={styleFilter} onChange={event=>setStyleFilter(event.target.value)}>
        {STYLE_FILTERS.map(item=><option key={item.value} value={item.value}>{t(item.textKey)}</option>)}
      </select></label>:null}
    </div>
    {isLrunesDaily?<LrunesDailyStatisticsPanel/>:<>
    {scopesQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(scopesQuery.error)}</p>:null}
    {earliest.error?<p className="scope-status scope-error">{featureDataErrorMessage(earliest.error)}</p>:null}
    {!mediaDimension&&(trendQuery.error||sourceRows.error||sourceCatalog.error)?<p className="scope-status scope-error">{featureDataErrorMessage(trendQuery.error||sourceRows.error||sourceCatalog.error)}</p>:null}
    {mediaDimension&&mediaQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(mediaQuery.error)}</p>:null}
    {!mediaDimension&&!sourceRows.isPending&&!sourceCatalog.isPending&&!sourceRows.error&&!sourceCatalog.error?<>
      <p className="scope-status">{sourceSummary.startDate&&sourceSummary.endDate?sourceSummary.startDate+' ～ '+sourceSummary.endDate:''}</p>
      <SummaryList rankingType={rankingType} summary={sourceSummary}/>
      <StatisticsChartFrame level={zoomLevel} onChange={setZoomLevel} range={queryRange} idPrefix="scope-stat">
        <StatisticsMultiChart
          type={effectiveChartType}
          rows={basicTrend}
          series={basicSeries}
          distribution={basicDistribution}
          totalKey={rankingType==='total'?'total':''}
          foldBlank={foldBlank}
          height={420}
        />
      </StatisticsChartFrame>
    </>:null}
    {mediaDimension&&Boolean(targetScopes.length)&&Boolean(queryRange.startDate&&queryRange.endDate)?<div className="scope-stat-controls">
      <button type="button" className="loc-button" onClick={()=>mediaQuery.refetch()} disabled={mediaQuery.isFetching}>
        {mediaQuery.isFetching?t('uiExtra.statisticsUI.refreshing'):t('uiExtra.statisticsUI.refresh')}
      </button>
    </div>:null}
    {rankingType==='media_style'&&crossTagQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(crossTagQuery.error)}</p>:null}
    {rankingType==='media_style'&&crossTagQuery.isPending?<p className="scope-status"><UiText id="uiExtra.statisticsUI.loadingMediaTags"/></p>:null}
    {rankingType==='media_style'&&!crossTagQuery.isPending&&!crossTagQuery.error?<MediaCrossTagStatistics
      rows={crossTagQuery.data||[]}
      range={queryRange}
      zoomLevel={zoomLevel}
      onZoomLevelChange={setZoomLevel}
    />:null}
    {mediaDimension&&!mediaQuery.isPending&&!mediaQuery.error?<MediaFacetStatistics
      key={rankingType}
      rankingType={rankingType}
      rows={mediaQuery.data||[]}
      chartType={chartType}
      onChartTypeChange={setChartType}
      range={queryRange}
      foldBlank={foldBlank}
      zoomLevel={zoomLevel}
      onZoomLevelChange={setZoomLevel}
      scopeId={scopeId}
    />:null}
    {styleFilter==='rune66'?<>
      {runeQuery.isPending?<p className="scope-status"><UiText id="uiExtra.statisticsUI.loadingKeywordAttrs"/></p>:null}
      {runeQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error&&runeQuery.data?<Rune66Summary analysis={runeQuery.data}/>:null}
    </>:null}
    {!isLrunesDaily&&Boolean(targetScopes[0])?<ScopeSelfIntersection
      key={scopeId}
      scope={targetScopes[0]}
      range={queryRange}
      zoomLevel={zoomLevel}
      onZoomLevelChange={setZoomLevel}
    />:null}
    </>}
  </section>;
}

function ScopeStatisticsPanel({scopeId,navigation,types,canManageKeywords=false,canManageSources=false}){
  return <>
    {canManageKeywords?<section className="scope-stat-section scope-stat-keyword-link">
      <a className="loc-button" href={scopeHref(scopeId,'statics/keywords')}>
        關鍵詞設定
      </a>
    </section>:null}
    <ScopeStatisticsResults scopeId={scopeId} navigation={navigation} types={types}/>
    {canManageSources?<details className="scope-stat-section">
      <summary><FieldText text="群組來源分類 · 對外統計開放"/></summary>
      <ScopeGroupStatisticsSharing scopeId={scopeId}/>
    </details>:null}
    {canManageSources?<details className="scope-stat-section">
      <summary><FieldText text="個人自訂來源分類 · 管理"/></summary>
      <ScopeCustomSourceCategories scopeId={scopeId}/>
    </details>:null}
  </>;
}

function StatisticsPanel({scopeId,aggregateScopes=false,navigation,types,canManageKeywords=false,canManageSources=false}){
  // Cross-Scope statistical aggregation belongs to LOC only. Other Scope
  // Groups remain overview/navigation surfaces, never merged COUNT queries.
  if(aggregateScopes&&scopeId==='loc')return <ScopeGroupStatistics/>;
  if(aggregateScopes)return <ScopeGroupOverview
    scopeId={scopeId}
    featureId="statics"
    title="Scope Group 統計導引"
    description="各 Scope 自行執行作品、來源及 2～4 組自交互統計；Group 只提供導引。"
  />;
  return <ScopeStatisticsPanel scopeId={scopeId} navigation={navigation} types={types} canManageKeywords={canManageKeywords} canManageSources={canManageSources}/>;
}

export default function Statistics(){
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const canManageKeywords=Boolean(account.user)&&scopeId!=='lrunes'&&account.canManageScopeSync(scopeId);
  const canManageSources=Boolean(account.user)&&account.canManageScopeSync(scopeId);
  return <FeaturePage featureId="statics">
    <section className="loc-card scope-feature-card">
      <StatisticsPanel
        scopeId={scopeId}
        aggregateScopes={Boolean(scope?.aggregateChildren)}
        navigation={navigation}
        types={scopeId==='lrunes'?['daily_rune',...STAT_TYPES]:STAT_TYPES}
        canManageKeywords={canManageKeywords}
        canManageSources={canManageSources}
      />
    </section>
  </FeaturePage>;
}
