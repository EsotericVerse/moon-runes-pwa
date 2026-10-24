'use client';

import {useMemo,useState} from 'react';
import {UI_COPY,registerDefaultSection} from '../../../i18n/ui-copy';
import {RUNE_RANKING_PAGE_SIZE,availableStatisticChartTypes,nonemptySeries,normalizeDistribution,movingAverage,scatterPair,radarPeriodComparison,activePeriodCoverage,number,color} from './statistics-time-zoom.mjs';
export {STAT_VISUAL_TYPES,availableStatisticChartTypes} from './statistics-time-zoom.mjs';
import {useUiLocale,useUiSection} from '../../../i18n/ui-locale';
import UiText,{useUiText} from '../../../i18n/UiText';
import StatisticsDetails from './StatisticsDetails';
import statisticsViewZh from '../../../i18n/sections/uiExtra.statisticsView.zh_tw.js';
import chartLabelsZh from '../../../i18n/sections/uiExtra.chartLabels.zh_tw.js';
registerDefaultSection('uiExtra.statisticsView',statisticsViewZh);
registerDefaultSection('uiExtra.chartLabels',chartLabelsZh);
import {
  Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,ComposedChart,
  Legend,Line,LineChart,Pie,PieChart,PolarAngleAxis,PolarGrid,
  PolarRadiusAxis,Radar,RadarChart,RadialBar,RadialBarChart,
  ResponsiveContainer,Scatter,ScatterChart,Tooltip,Treemap,XAxis,YAxis
} from 'recharts';

const CHART_ACCENT='var(--loc-accent)';
const CHART_TEXT='var(--loc-text)';
const CHART_GRID='var(--loc-line)';
const CHART_TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:'8px'};

const TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:'8px'};
const GRID='var(--loc-line)',TEXT='var(--loc-text)',DAY=86400000;

// Display-only compression: one marked gap, never an invented zero-count data point.
export function foldEmptyTimeBuckets(rows=[],series=[],units={}){
  const dayUnit=units.dayUnit??UI_COPY.uiExtra.chartLabels.dayUnit;
  const periodUnit=units.periodUnit??UI_COPY.uiExtra.chartLabels.periodUnit;
  const list=Array.isArray(rows)?rows:[],out=[],gaps=[];
  for(let i=0;i<list.length;){
    if(series.some(s=>number(list[i]?.[s.key])>0)){out.push(list[i]);i++;continue;}
    let j=i;while(j<list.length&&!series.some(s=>number(list[j]?.[s.key])>0))j++;
    if(i===0||j===list.length||j-i<3){out.push(...list.slice(i,j));i=j;continue;}
    const begin=String(list[i].start_date||'').slice(0,10);
    const end=String(list[j-1].end_date||list[j-1].start_date||'').slice(0,10);
    const from=Date.parse(begin),to=Date.parse(end);
    const days=Number.isFinite(from)&&Number.isFinite(to)?Math.max(1,Math.round((to-from)/DAY)+1):null;
    out.push({period:'∥ '+(days?days+' '+dayUnit:(j-i)+' '+periodUnit),start_date:begin,end_date:end,folded:true,
      ...Object.fromEntries(series.map(s=>[s.key,null]))});
    gaps.push({start:begin,end,days,buckets:j-i});
    i=j;
  }
  return {rows:out,gaps};
}
export default function StatisticsMultiChart({
  type='line',rows=[],series=[],distribution=[],totalKey='',height=380,foldBlank=false,
  barLayout='horizontal',onCategoryClick=null,onSeriesClick=null
}){
  useUiSection('uiExtra.statisticsView');
  useUiSection('uiExtra.chartLabels');
  const {locale}=useUiLocale();
  const t=useUiText();
  const units={dayUnit:t('uiExtra.chartLabels.dayUnit'),periodUnit:t('uiExtra.chartLabels.periodUnit')};
  const time=Array.isArray(rows)?rows:[];
  const fields=useMemo(()=>nonemptySeries(time,series),[time,series]);
  const categories=useMemo(()=>normalizeDistribution(distribution,time,fields),[distribution,time,fields]);
  const usable=availableStatisticChartTypes({rows:time,series:fields,distribution:categories,totalKey});
  const actual=usable.some(([id])=>id===type)?type:(usable[0]?.[0]||'line');
  const timeFields=totalKey?[{key:totalKey,label:t('uiExtra.chartLabels.total')}]:fields;
  const {rows:display,gaps}=useMemo(()=>foldBlank&&['line','bar','area','stacked','composed'].includes(actual)
    ?foldEmptyTimeBuckets(time,timeFields,units):{rows:time,gaps:[]},[foldBlank,actual,time,timeFields,locale]);
  const margin={top:16,right:18,bottom:44,left:0};
  const axes=(<><CartesianGrid stroke={GRID} strokeDasharray="3 3"/>
    <XAxis dataKey="period" tick={{fill:TEXT,fontSize:11}} angle={-20} textAnchor="end" height={64} interval="preserveStartEnd" stroke={GRID}/>
    <YAxis tick={{fill:TEXT,fontSize:11}} allowDecimals={false} stroke={GRID}/>
    <Tooltip contentStyle={TOOLTIP}/>
    {fields.length>1&&actual!=='composed'?<Legend wrapperStyle={{fontSize:12}}/>:null}
  </>);
  const colored=categories.map((item,i)=>({...item,fill:item.fill||color(i)}));
  const comparison=useMemo(()=>radarPeriodComparison(time,fields),[time,fields]);
  const coverage=useMemo(()=>activePeriodCoverage(time,fields),[time,fields]);
  const paired=useMemo(()=>scatterPair(time,fields),[time,fields]);
  // Calculate averages on the original, complete timeline before shortening gaps.
  const composed=useMemo(()=>{
    const full=movingAverage(time,fields,totalKey);
    return foldBlank?foldEmptyTimeBuckets(full,timeFields,units).rows:full;
  },[time,fields,totalKey,foldBlank,timeFields,locale]);
  let chart=null;
  if(actual==='pie')chart=<PieChart>
    <Tooltip contentStyle={TOOLTIP}/><Legend wrapperStyle={{fontSize:11}}/>
    <Pie data={colored} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="73%">
      {colored.map(item=><Cell key={item.name} fill={item.fill}/>)}
    </Pie>
  </PieChart>;
  else if(actual==='treemap')chart=<Treemap data={colored.map(item=>({...item,size:item.value}))}
    dataKey="size" nameKey="name" stroke="var(--loc-bg)" fill={color(0)} aspectRatio={4/3}><Tooltip contentStyle={TOOLTIP}/></Treemap>;
  else if(actual==='radar'&&comparison)chart=<RadarChart data={comparison} outerRadius="67%">
    <PolarGrid stroke={GRID}/><PolarAngleAxis dataKey="name" tick={{fill:TEXT,fontSize:11}}/>
    <PolarRadiusAxis domain={[0,100]} tick={{fill:TEXT,fontSize:10}}/>
    <Radar name={t('uiExtra.chartLabels.firstHalf')} dataKey="early" stroke={color(0)} fill={color(0)} fillOpacity={.2}/>
    <Radar name={t('uiExtra.chartLabels.lastHalf')} dataKey="late" stroke={color(1)} fill={color(1)} fillOpacity={.2}/>
    <Legend/><Tooltip contentStyle={TOOLTIP} formatter={v=>Number(v).toFixed(1)+'%'}/>
  </RadarChart>;
  else if(actual==='radial'&&coverage)chart=<RadialBarChart data={coverage} innerRadius="16%" outerRadius="82%" startAngle={90} endAngle={-270}>
    <RadialBar dataKey="value" background cornerRadius={4}/>
    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize:11}}/>
    <Tooltip contentStyle={TOOLTIP} formatter={v=>Number(v).toFixed(1)+'%'}/>
  </RadialBarChart>;
  else if(actual==='scatter'&&paired)chart=<ScatterChart margin={{top:20,right:20,bottom:45,left:20}}>
    <CartesianGrid stroke={GRID} strokeDasharray="3 3"/>
    <XAxis type="number" dataKey="x" name={paired.x.label} tick={{fill:TEXT,fontSize:11}} stroke={GRID}
      label={{value:paired.x.label||paired.x.key,position:'insideBottom',offset:-16,fill:TEXT}}/>
    <YAxis type="number" dataKey="y" name={paired.y.label} tick={{fill:TEXT,fontSize:11}} stroke={GRID}
      label={{value:paired.y.label||paired.y.key,angle:-90,position:'insideLeft',fill:TEXT}}/>
    <Tooltip contentStyle={TOOLTIP} cursor={{strokeDasharray:'3 3'}}
      content={({active,payload})=>active&&payload?.length?<div style={TOOLTIP}>
        <div>{payload[0]?.payload?.period}</div>
        <div>{paired.x.label}: {payload[0]?.payload?.x}</div>
        <div>{paired.y.label}: {payload[0]?.payload?.y}</div>
      </div>:null}/>
    <Scatter name={paired.x.label+' × '+paired.y.label} data={paired.data} fill={color(0)}/>
  </ScatterChart>;
  else if(actual==='composed')chart=<ComposedChart data={composed} margin={margin}>
    <CartesianGrid stroke={GRID} strokeDasharray="3 3"/>
    <XAxis dataKey="period" tick={{fill:TEXT,fontSize:11}} angle={-20} textAnchor="end" height={64} interval="preserveStartEnd" stroke={GRID}/>
    <YAxis tick={{fill:TEXT,fontSize:11}} allowDecimals={false} stroke={GRID}/>
    <Tooltip contentStyle={TOOLTIP}/><Legend/>
    <Bar dataKey="__stat_total" name={t('uiExtra.chartLabels.periodTotal')} fill={color(0)} opacity={.65} maxBarSize={30}/>
    <Line dataKey="__stat_average" name={t('uiExtra.chartLabels.movingAverage')} stroke={color(2)} strokeWidth={3} dot={false} connectNulls={false}/>
  </ComposedChart>;
  else if(actual==='stacked')chart=<AreaChart data={display} margin={margin}>
    {axes}{fields.map((f,i)=><Area key={f.key} type="linear" dataKey={f.key} name={f.label} stackId="parts"
      stroke={color(i)} fill={color(i)} fillOpacity={.65} connectNulls={false} isAnimationActive={false}/>)}
  </AreaChart>;
  else if(actual==='area')chart=<AreaChart data={display} margin={margin}>
    {axes}{timeFields.map((f,i)=><Area key={f.key} type="linear" dataKey={f.key} name={f.label}
      stroke={color(i)} fill={color(i)} fillOpacity={.25} connectNulls={false} isAnimationActive={false}/>)}
  </AreaChart>;
  else if(actual==='bar'&&barLayout==='vertical'&&categories.length)chart=<BarChart data={colored}
    layout="vertical" margin={{top:10,right:20,bottom:14,left:6}}>
    <CartesianGrid strokeDasharray="3 3" stroke={GRID}/>
    <XAxis type="number" allowDecimals={false} tick={{fill:TEXT}}/>
    <YAxis dataKey="name" type="category" width={190} tick={{fill:TEXT,fontSize:11}}/>
    <Tooltip contentStyle={TOOLTIP}/>
    <Bar dataKey="value" fill="var(--loc-accent)" maxBarSize={28}
      cursor={onCategoryClick?'pointer':undefined}
      onClick={onCategoryClick?(_,index)=>onCategoryClick(colored[index]?.key):undefined}>
      {colored.map(item=><Cell key={item.key} fill={item.fill}/>)}
    </Bar>
  </BarChart>;
  else if(actual==='bar')chart=<BarChart data={display} margin={margin}>
    {axes}{timeFields.map((f,i)=><Bar key={f.key} dataKey={f.key} name={f.label} fill={color(i)} maxBarSize={32}/>)}
  </BarChart>;
  else chart=<LineChart data={display} margin={margin}>
    {axes}{timeFields.map((f,i)=><Line key={f.key} type="linear" dataKey={f.key} name={f.label}
      stroke={color(i)} strokeWidth={2.5} dot={display.length<25} connectNulls={false}
      activeDot={onSeriesClick?{onClick:()=>onSeriesClick(f.key)}:undefined}
      isAnimationActive={false}/>)}
  </LineChart>;
  if(!usable.length)return <p className="scope-status">{t('uiExtra.chartLabels.noComparable')}</p>;
  return <div className="scope-multichart" role="group" aria-label={t('uiExtra.chartLabels.chartAria')}>
    <div style={{height:barLayout==='vertical'?height:`min(${height}px, max(300px, 85vw))`}}>
      <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
    </div>
    {foldBlank&&gaps.length?<p className="scope-status" role="note">
      {t('uiExtra.chartLabels.gapLabel')}{gaps.map(g=>g.start+'～'+g.end+'（'+(g.days||g.buckets)+' '+(g.days?units.dayUnit:units.periodUnit)+'）').join(t('uiExtra.chartLabels.gapSeparator'))}
    </p>:null}
  </div>;
}

// Saved keyword classifications are sufficient to build group trends.
// Item totals have no dated breakdown in this response; never fabricate one.
function keywordGroupTrend(classifications=[],groups=[],bucket='month'){
  const known=new Set(groups.map(row=>String(row.class_id)));
  const dates=new Map();
  for(const row of classifications){
    const day=String(row?.date||'').slice(0,10);
    const id=String(row?.class_id??'');
    const count=Number(row?.count)||0;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!known.has(id)||count<=0)continue;
    const key=bucket==='day'?day:bucket==='week'
      ?(()=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);})()
      :day.slice(0,7);
    if(!dates.has(key))dates.set(key,{period:key});
    const result=dates.get(key);
    result['class_'+id]=(result['class_'+id]||0)+count;
  }
  return [...dates.values()].sort((a,b)=>a.period.localeCompare(b.period));
}
function classLabel(value,t){
  const text=String(value||'').trim();
  const suffix=t('uiExtra.statisticsView.groupSuffix');
  return !text?'':text.endsWith(suffix)||text.endsWith(UI_COPY.uiExtra.statisticsView.groupSuffix)?text:text+' '+suffix;
}
function groupLabel(value,t){
  const text=String(value||'').trim();
  const suffix=t('uiExtra.statisticsView.runeSuffix');
  return !text?'':text.endsWith(suffix)||text.endsWith(UI_COPY.uiExtra.statisticsView.runeSuffix)?text:text+suffix;
}
export function Rune66Summary({analysis,range={}}){
  useUiSection('uiExtra.statisticsView');
  const t=useUiText();
  const [groupPage,setGroupPage]=useState(1);
  const [shown,setShown]=useState('group');
  const [chartType,setChartType]=useState('bar');
  const data=analysis||{};
  const className=String(data.keywordMeta?.class_name||'').trim();
  const setLabel=className?'關鍵詞組：'+className:t('uiExtra.statisticsView.classFallback');
  const groupDisplay=group=>[className,classLabel(group,t)].filter(Boolean).join(' ');
  const globalCount=Math.max(0,Number(data.keywordDocumentCount||0));
  const minDocuments=Math.max(0,Number(data.keywordMinDocuments||0));
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
  const groupDistribution=classRows.map(row=>({
    key:String(row.class_id),name:classLabel(row.group,t),value:Number(row.document_count)||0
  }));
  const itemDistribution=groupRows.slice(0,10).map(row=>({
    key:String(row.rune_id),name:groupLabel(row.label,t),value:Number(row.count)||0
  }));
  // Combined mode uses the same measure for both dimensions. An item
  // may occur repeatedly within an article, but each article counts once.
  const combinedDistribution=[
    ...groupDistribution.map(row=>({...row,key:'class:'+row.key,name:'群組 · '+row.name,fill:color(0)})),
    ...groupRows.slice(0,10).map(row=>({
      key:'item:'+row.rune_id,name:'項目 · '+groupLabel(row.label,t),
      value:Number(row.document_count)||0,fill:color(1)
    })).filter(row=>row.value>0)
  ];
  const trend=keywordGroupTrend(data.classifications,classRows,range?.bucket||'month');
  const trendSeries=classRows.map(row=>({key:'class_'+row.class_id,label:classLabel(row.group,t)}));
  const renderGroup=shown==='group'||shown==='both';
  const renderItems=shown==='item'||shown==='both';
  const distribution=shown==='both'?combinedDistribution:shown==='group'?groupDistribution:itemDistribution;
  // Group rows include daily counts, but Item totals do not. No invented trend.
  const trendRows=shown==='group'?trend:[];
  const series=shown==='group'?trendSeries:[];
  const options=availableStatisticChartTypes({rows:trendRows,series,distribution})
    .filter(([kind])=>shown==='group'||['bar','pie','treemap'].includes(kind));
  const actualChart=options.some(([kind])=>kind===chartType)?chartType:(options.find(([kind])=>kind==='bar')?.[0]||options[0]?.[0]||'bar');
  if(!data.staticstime)return null;
  if(!data.statisticsEnabled)return <div className="scope-ranking">
    <div><strong>{setLabel}</strong><span>{globalCount.toLocaleString()} / {minDocuments.toLocaleString()}</span></div>
  </div>;
  const typePicker=(id,selected,onSelect,options)=><label>
    <span>{t('uiExtra.statisticsView.chart')}</span>
    <select className="scope-select" aria-label={id} value={selected} onChange={event=>onSelect(event.target.value)}>
      {options.map(([kind,label])=><option key={kind} value={kind}>{t(label)}</option>)}
    </select>
  </label>;
  return <section className="scope-rune66-summary scope-card">
    <h3>關鍵詞分佈統計</h3>
    <div className="scope-stat-controls">
      <label><span>顯示內容</span>
        <select className="scope-select" value={shown} onChange={event=>setShown(event.target.value)}>
          <option value="group">{t('uiExtra.statisticsView.classRuneTitle')}</option>
          <option value="item">{t('uiExtra.statisticsView.runeRankTitle')}</option>
          <option value="both">群組＋項目（同圖）</option>
        </select>
      </label>
      {options.length?typePicker('關鍵詞統計圖型',actualChart,setChartType,options):null}
    </div>
    {distribution.length?<StatisticsMultiChart type={actualChart}
      rows={trendRows} series={series} distribution={distribution}
      barLayout="vertical" height={Math.max(340,Math.min(24,distribution.length)*36+85)}/>:
      <p className="scope-status">{t('uiExtra.statisticsView.noVisual')}</p>}
    {shown==='both'?<p className="scope-status" role="note">
      同圖以涉及作品篇數比較群組與項目，顏色區分兩類；一篇文章可同時屬於某個群組及命中多個項目，各項不能相加當成不同作品總數。
    </p>:null}
    {renderItems&&groupRows.length>10?<p className="scope-status">
      圖中顯示前 10 個關鍵詞項目；完整項目可於下方詳細數據查看。
    </p>:null}
    {renderGroup?<div className="scope-stat-section">
      <h4><UiText id="uiExtra.statisticsView.classRuneTitle"/></h4>
      <StatisticsDetails>{()=><>
        <div className="scope-ranking"><div><strong>{setLabel}</strong><span>{t('uiExtra.statisticsView.classifiedCount',{total:Number(data.documentCount||0).toLocaleString(),classified:classifiedTotal.toLocaleString(),unclassified:Number(data.unclassifiedCount||0).toLocaleString()})}</span></div></div>
        <div className="scope-ranking">
          {classRows.map(row=><div key={row.group}><strong>{groupDisplay(row.group)}</strong>
            <span>{t('uiExtra.statisticsView.groupWorks',{count:Number(row.document_count||0).toLocaleString(),ratio:(classifiedTotal>0?100*Number(row.document_count||0)/classifiedTotal:0).toFixed(1)})}</span>
          </div>)}
        </div>
      </>}</StatisticsDetails>
    </div>:null}
    {renderItems?<div className="scope-stat-section">
      <h4><UiText id="uiExtra.statisticsView.runeRankTitle"/></h4>
      <StatisticsDetails>{()=><>
        <div className="scope-ranking">
          {visibleGroupRows.map(row=><div key={row.rune_id}><strong>{String(row.rune_id).padStart(2,'0')} · {groupLabel(row.label,t)}</strong>
            <span>{t('uiExtra.statisticsView.runeHits',{count:Number(row.count||0).toLocaleString(),ratio:(groupHitTotal>0?100*Number(row.count||0)/groupHitTotal:0).toFixed(1)})}</span>
          </div>)}
        </div>
        {groupRows.length>RUNE_RANKING_PAGE_SIZE?<nav className="scope-stat-controls" aria-label={t('uiExtra.statisticsView.groupPageNav')}>
          <button type="button" className="loc-button" disabled={activeGroupPage===1} onClick={()=>setGroupPage(activeGroupPage-1)}><UiText id="uiExtra.statisticsView.previous"/></button>
          <span className="scope-status" aria-live="polite"><UiText id="uiExtra.statisticsView.pageTotal" params={{page:activeGroupPage,pages:groupPageCount,total:groupRows.length.toLocaleString()}}/></span>
          <button type="button" className="loc-button" disabled={activeGroupPage===groupPageCount} onClick={()=>setGroupPage(activeGroupPage+1)}><UiText id="uiExtra.statisticsView.next"/></button>
        </nav>:null}
      </>}</StatisticsDetails>
    </div>:null}
  </section>;
}
