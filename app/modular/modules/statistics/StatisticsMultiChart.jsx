'use client';

import {useMemo} from 'react';
import {
  Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,ComposedChart,
  Legend,Line,LineChart,Pie,PieChart,PolarAngleAxis,PolarGrid,
  PolarRadiusAxis,Radar,RadarChart,RadialBar,RadialBarChart,
  ResponsiveContainer,Scatter,ScatterChart,Tooltip,Treemap,XAxis,YAxis
} from 'recharts';

// Chart types are capabilities, not ten interchangeable skins for one number.
export const STAT_VISUAL_TYPES=Object.freeze([
  ['line','折線圖'],['bar','長條圖'],['pie','圓餅圖'],
  ['area','面積圖'],['stacked','堆疊面積圖'],['composed','組合圖'],
  ['scatter','散點圖'],['radar','雷達圖'],['radial','放射長條圖'],
  ['treemap','矩形樹圖']
]);
const COLORS=['#7562cf','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f'];
const TOOLTIP={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:'8px'};
const GRID='var(--loc-line)',TEXT='var(--loc-text)',DAY=86400000;
const number=value=>Math.max(0,Number(value)||0);
const color=i=>COLORS[i%COLORS.length];

function nonemptySeries(rows=[],series=[]){
  return (Array.isArray(series)?series:[]).filter(s=>s?.key&&rows.some(row=>number(row[s.key])>0)).slice(0,8);
}
function normalizeDistribution(distribution=[],rows=[],series=[]){
  const supplied=(Array.isArray(distribution)?distribution:[])
    .map(item=>({name:String(item.name||item.term||''),value:number(item.value??item.item_count)}))
    .filter(item=>item.name&&item.value>0);
  if(supplied.length)return supplied;
  return series.map(s=>({name:s.label||s.key,value:rows.reduce((n,row)=>n+number(row[s.key]),0)}))
    .filter(item=>item.value>0);
}
function totalValue(row,series,totalKey=''){
  return totalKey?number(row?.[totalKey]):series.reduce((n,s)=>n+number(row?.[s.key]),0);
}
function movingAverage(rows,series,totalKey){
  return rows.map((row,i)=>({
    ...row,
    __stat_total:totalValue(row,series,totalKey),
    __stat_average:rows.slice(Math.max(0,i-2),i+1).reduce((n,r)=>n+totalValue(r,series,totalKey),0)/(Math.min(i+1,3))
  }));
}
function scatterPair(rows,series){
  for(let a=0;a<series.length;a++)for(let b=a+1;b<series.length;b++){
    const left=series[a],right=series[b];
    const x=rows.map(row=>number(row[left.key])),y=rows.map(row=>number(row[right.key]));
    if(rows.length>=3&&new Set(x).size>1&&new Set(y).size>1&&rows.some(row=>number(row[left.key])&&number(row[right.key]))){
      return {x:left,y:right,data:rows.map(row=>({x:number(row[left.key]),y:number(row[right.key]),period:row.period}))};
    }
  }
  return null;
}
function radarPeriodComparison(rows,series){
  if(rows.length<2||series.length<3)return null;
  const mid=Math.ceil(rows.length/2);
  const first=rows.slice(0,mid),last=rows.slice(mid);
  const firstTotal=first.reduce((n,row)=>n+totalValue(row,series),0);
  const lastTotal=last.reduce((n,row)=>n+totalValue(row,series),0);
  if(!firstTotal||!lastTotal)return null;
  const data=series.map(s=>{
    const early=first.reduce((n,row)=>n+number(row[s.key]),0)*100/firstTotal;
    const late=last.reduce((n,row)=>n+number(row[s.key]),0)*100/lastTotal;
    return {name:s.label||s.key,early,late};
  });
  if(!data.some(row=>Math.abs(row.early-row.late)>=.5))return null;
  return data;
}
function activePeriodCoverage(rows,series){
  if(rows.length<3||series.length<2)return null;
  const result=series.map((s,i)=>({
    name:s.label||s.key,
    value:100*rows.filter(row=>number(row[s.key])>0).length/rows.length,
    fill:color(i)
  }));
  if(new Set(result.map(item=>Math.round(item.value*10))).size<2)return null;
  return result;
}
export function availableStatisticChartTypes({rows=[],series=[],distribution=[],totalKey=''}={}){
  const time=Array.isArray(rows)?rows:[];
  const fields=nonemptySeries(time,series);
  const categories=normalizeDistribution(distribution,time,fields);
  if(!time.length&&!categories.length)return [];
  const hasTime=time.length>0&&(fields.length>0||(totalKey&&time.some(row=>number(row[totalKey])>0)));
  const hasMix=categories.length>=2;
  const compare=fields.length>=2;
  const usable=type=>{
    if(type==='line'||type==='bar')return hasTime||hasMix;
    if(type==='area')return time.length>=2;
    if(type==='pie'||type==='treemap')return hasMix;
    if(type==='stacked')return compare&&time.length>=2;
    if(type==='composed')return time.length>=3&&new Set(time.map(row=>totalValue(row,fields,totalKey))).size>1;
    if(type==='scatter')return Boolean(scatterPair(time,fields));
    if(type==='radar')return Boolean(radarPeriodComparison(time,fields));
    if(type==='radial')return Boolean(activePeriodCoverage(time,fields));
    return false;
  };
  return STAT_VISUAL_TYPES.filter(([type])=>usable(type));
}

// Display-only compression: one marked gap, never an invented zero-count data point.
export function foldEmptyTimeBuckets(rows=[],series=[]){
  const list=Array.isArray(rows)?rows:[],out=[],gaps=[];
  for(let i=0;i<list.length;){
    if(series.some(s=>number(list[i]?.[s.key])>0)){out.push(list[i]);i++;continue;}
    let j=i;while(j<list.length&&!series.some(s=>number(list[j]?.[s.key])>0))j++;
    if(i===0||j===list.length||j-i<3){out.push(...list.slice(i,j));i=j;continue;}
    const begin=String(list[i].start_date||'').slice(0,10);
    const end=String(list[j-1].end_date||list[j-1].start_date||'').slice(0,10);
    const from=Date.parse(begin),to=Date.parse(end);
    const days=Number.isFinite(from)&&Number.isFinite(to)?Math.max(1,Math.round((to-from)/DAY)+1):null;
    out.push({period:'∥ '+(days?days+' 天':(j-i)+' 區間'),start_date:begin,end_date:end,folded:true,
      ...Object.fromEntries(series.map(s=>[s.key,null]))});
    gaps.push({start:begin,end,days,buckets:j-i});
    i=j;
  }
  return {rows:out,gaps};
}
export default function StatisticsMultiChart({
  type='line',rows=[],series=[],distribution=[],totalKey='',height=380,foldBlank=false
}){
  const time=Array.isArray(rows)?rows:[];
  const fields=useMemo(()=>nonemptySeries(time,series),[time,series]);
  const categories=useMemo(()=>normalizeDistribution(distribution,time,fields),[distribution,time,fields]);
  const usable=availableStatisticChartTypes({rows:time,series:fields,distribution:categories,totalKey});
  const actual=usable.some(([id])=>id===type)?type:(usable[0]?.[0]||'line');
  const timeFields=totalKey?[{key:totalKey,label:'總量'}]:fields;
  const {rows:display,gaps}=useMemo(()=>foldBlank&&['line','bar','area','stacked','composed'].includes(actual)
    ?foldEmptyTimeBuckets(time,timeFields):{rows:time,gaps:[]},[foldBlank,actual,time,timeFields]);
  const margin={top:16,right:18,bottom:44,left:0};
  const axes=(<><CartesianGrid stroke={GRID} strokeDasharray="3 3"/>
    <XAxis dataKey="period" tick={{fill:TEXT,fontSize:11}} angle={-20} textAnchor="end" height={64} interval="preserveStartEnd" stroke={GRID}/>
    <YAxis tick={{fill:TEXT,fontSize:11}} allowDecimals={false} stroke={GRID}/>
    <Tooltip contentStyle={TOOLTIP}/>
    {fields.length>1&&actual!=='composed'?<Legend wrapperStyle={{fontSize:12}}/>:null}
  </>);
  const colored=categories.map((item,i)=>({...item,fill:color(i)}));
  const comparison=useMemo(()=>radarPeriodComparison(time,fields),[time,fields]);
  const coverage=useMemo(()=>activePeriodCoverage(time,fields),[time,fields]);
  const paired=useMemo(()=>scatterPair(time,fields),[time,fields]);
  // Calculate averages on the original, complete timeline before shortening gaps.
  const composed=useMemo(()=>{
    const full=movingAverage(time,fields,totalKey);
    return foldBlank?foldEmptyTimeBuckets(full,timeFields).rows:full;
  },[time,fields,totalKey,foldBlank,timeFields]);
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
    <Radar name="前半期占比" dataKey="early" stroke={color(0)} fill={color(0)} fillOpacity={.2}/>
    <Radar name="後半期占比" dataKey="late" stroke={color(1)} fill={color(1)} fillOpacity={.2}/>
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
    <Bar dataKey="__stat_total" name="該期總量" fill={color(0)} opacity={.65} maxBarSize={30}/>
    <Line dataKey="__stat_average" name="近三期移動平均" stroke={color(2)} strokeWidth={3} dot={false} connectNulls={false}/>
  </ComposedChart>;
  else if(actual==='stacked')chart=<AreaChart data={display} margin={margin}>
    {axes}{fields.map((f,i)=><Area key={f.key} type="linear" dataKey={f.key} name={f.label} stackId="parts"
      stroke={color(i)} fill={color(i)} fillOpacity={.65} connectNulls={false} isAnimationActive={false}/>)}
  </AreaChart>;
  else if(actual==='area')chart=<AreaChart data={display} margin={margin}>
    {axes}{timeFields.map((f,i)=><Area key={f.key} type="linear" dataKey={f.key} name={f.label}
      stroke={color(i)} fill={color(i)} fillOpacity={.25} connectNulls={false} isAnimationActive={false}/>)}
  </AreaChart>;
  else if(actual==='bar')chart=<BarChart data={display} margin={margin}>
    {axes}{timeFields.map((f,i)=><Bar key={f.key} dataKey={f.key} name={f.label} fill={color(i)} maxBarSize={32}/>)}
  </BarChart>;
  else chart=<LineChart data={display} margin={margin}>
    {axes}{timeFields.map((f,i)=><Line key={f.key} type="linear" dataKey={f.key} name={f.label}
      stroke={color(i)} strokeWidth={2.5} dot={display.length<25} connectNulls={false} isAnimationActive={false}/>)}
  </LineChart>;
  if(!usable.length)return <p className="scope-status">目前區間沒有可比較的資料。</p>;
  return <div className="scope-multichart" role="group" aria-label="統計圖形">
    <ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer>
    {foldBlank&&gaps.length?<p className="scope-status" role="note">
      時間斷層：{gaps.map(g=>g.start+'～'+g.end+'（'+(g.days||g.buckets)+(g.days?' 天':' 區間')+'）').join('；')}
    </p>:null}
    {actual==='radial'?<p className="scope-status">有紀錄的時間區間占比</p>:null}
  </div>;
}
