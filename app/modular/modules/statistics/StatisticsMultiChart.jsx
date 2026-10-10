'use client';

import {useMemo} from 'react';
import {
  Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,ComposedChart,
  Legend,Line,LineChart,Pie,PieChart,PolarAngleAxis,PolarGrid,
  PolarRadiusAxis,Radar,RadarChart,RadialBar,RadialBarChart,
  ResponsiveContainer,Scatter,ScatterChart,Tooltip,Treemap,XAxis,YAxis
} from 'recharts';

// Ten real, selectable presentations. The chosen data dimension remains unchanged.
export const STAT_VISUAL_TYPES=Object.freeze([
  ['line','折線圖'],
  ['bar','長條圖'],
  ['pie','圓餅圖'],
  ['area','面積圖'],
  ['stacked','堆疊面積圖'],
  ['composed','組合圖'],
  ['scatter','散點圖'],
  ['radar','雷達圖'],
  ['radial','放射長條圖'],
  ['treemap','矩形樹圖']
]);
const SERIES_COLORS=['#7562cf','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f'];
const TOOLTIP_STYLE={background:'var(--loc-panel)',border:'1px solid var(--loc-line)',color:'var(--loc-text)',borderRadius:'8px'};
const GRID='var(--loc-line)';
const TEXT='var(--loc-text)';
const DAY=86400000;

export function foldEmptyTimeBuckets(rows=[],series=[]){
  const list=Array.isArray(rows)?rows:[];
  const out=[];
  const gaps=[];
  for(let i=0;i<list.length;){
    if(series.some(s=>Number(list[i]?.[s.key])>0)){out.push(list[i]);i++;continue;}
    let j=i;
    while(j<list.length&&!series.some(s=>Number(list[j]?.[s.key])>0))j++;
    // Keep endpoints and short inactivity spans proportional to the calendar.
    if(i===0||j===list.length||j-i<3){out.push(...list.slice(i,j));i=j;continue;}
    const begin=String(list[i].start_date||'').slice(0,10);
    const end=String(list[j-1].end_date||list[j-1].start_date||'').slice(0,10);
    const from=Date.parse(begin),to=Date.parse(end);
    const days=Number.isFinite(from)&&Number.isFinite(to)?Math.max(1,Math.round((to-from)/DAY)+1):null;
    const label='∥ 省略 '+(days?days+' 天':(j-i)+' 個區間');
    out.push({
      period:label,start_date:begin,end_date:end,folded:true,
      ...Object.fromEntries(series.map(s=>[s.key,null]))
    });
    gaps.push({start:begin,end,days,buckets:j-i});
    i=j;
  }
  return {rows:out,gaps};
}

export default function StatisticsMultiChart({
  type='line',rows=[],series=[],distribution=[],height=380,foldBlank=false
}){
  const dimensions=useMemo(()=>(Array.isArray(series)?series:[])
    .filter(item=>item?.key).slice(0,8),[series]);
  const totals=useMemo(()=>{
    const given=(Array.isArray(distribution)?distribution:[])
      .map(item=>({name:String(item.name||item.term||''),value:Number(item.value??item.item_count)||0}))
      .filter(item=>item.name&&item.value>0);
    if(given.length)return given;
    return dimensions.map(s=>({
      name:s.label||s.key,
      value:(rows||[]).reduce((n,r)=>n+Math.max(0,Number(r[s.key])||0),0)
    })).filter(item=>item.value>0);
  },[distribution,dimensions,rows]);
  const {rows:times,gaps}=useMemo(()=>foldBlank?foldEmptyTimeBuckets(rows,dimensions):{rows,gaps:[]},[rows,dimensions,foldBlank]);
  const fields=dimensions.length?dimensions:[{key:'value',label:'數量'}];
  const shown=(Array.isArray(times)?times:[]);
  const chartRows=shown.length?shown:totals.map(item=>({period:item.name,value:item.value}));
  const chartFields=shown.length?fields:[{key:'value',label:'數量'}];
  const categories=totals.map((item,index)=>({...item,fill:SERIES_COLORS[index%SERIES_COLORS.length]}));
  const margin={top:14,right:12,bottom:42,left:0};
  const axes=<>
    <CartesianGrid stroke={GRID} strokeDasharray="3 3"/>
    <XAxis dataKey="period" tick={{fill:TEXT,fontSize:11}} angle={-20} textAnchor="end" height={65} interval="preserveStartEnd" stroke={GRID}/>
    <YAxis tick={{fill:TEXT,fontSize:11}} allowDecimals={false} stroke={GRID}/>
    <Tooltip contentStyle={TOOLTIP_STYLE}/>
    {chartFields.length>1?<Legend wrapperStyle={{fontSize:12}}/>:null}
  </>;
  let graphic=null;
  if(type==='pie'&&categories.length)graphic=<PieChart>
    <Tooltip contentStyle={TOOLTIP_STYLE}/>
    <Pie data={categories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="75%" label={categories.length<=5}>
      {categories.map(item=><Cell key={item.name} fill={item.fill}/>)}
    </Pie>
    <Legend wrapperStyle={{fontSize:12}}/>
  </PieChart>;
  else if(type==='radar'&&categories.length)graphic=<RadarChart data={categories} outerRadius="67%">
    <PolarGrid stroke={GRID}/>
    <PolarAngleAxis dataKey="name" tick={{fill:TEXT,fontSize:11}}/>
    <PolarRadiusAxis tick={{fill:TEXT,fontSize:10}}/>
    <Radar name="數量" dataKey="value" stroke={SERIES_COLORS[0]} fill={SERIES_COLORS[0]} fillOpacity={.35}/>
    <Tooltip contentStyle={TOOLTIP_STYLE}/>
  </RadarChart>;
  else if(type==='radial'&&categories.length)graphic=<RadialBarChart data={categories} innerRadius="16%" outerRadius="85%" startAngle={90} endAngle={-270}>
    <RadialBar dataKey="value" background cornerRadius={4}/>
    <Tooltip contentStyle={TOOLTIP_STYLE}/>
    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize:11}}/>
  </RadialBarChart>;
  else if(type==='treemap'&&categories.length)graphic=<Treemap data={categories.map(item=>({...item,size:item.value}))} dataKey="size" nameKey="name" stroke="var(--loc-bg)" fill={SERIES_COLORS[0]} aspectRatio={4/3}>
    <Tooltip contentStyle={TOOLTIP_STYLE}/>
  </Treemap>;
  else if(type==='bar')graphic=<BarChart data={chartRows} margin={margin}>
    {axes}
    {chartFields.map((f,i)=><Bar key={f.key} dataKey={f.key} name={f.label||f.key} fill={SERIES_COLORS[i%SERIES_COLORS.length]} maxBarSize={32}/>)}
  </BarChart>;
  else if(type==='area'||type==='stacked')graphic=<AreaChart data={chartRows} margin={margin}>
    {axes}
    {chartFields.map((f,i)=><Area key={f.key} type="linear" dataKey={f.key} name={f.label||f.key} stackId={type==='stacked'?'shared':undefined} stroke={SERIES_COLORS[i%SERIES_COLORS.length]} fill={SERIES_COLORS[i%SERIES_COLORS.length]} fillOpacity={type==='stacked'?.66:.18} connectNulls={false} isAnimationActive={false}/>)}
  </AreaChart>;
  else if(type==='composed')graphic=<ComposedChart data={chartRows} margin={margin}>
    {axes}
    <Bar dataKey={chartFields[0].key} name={chartFields[0].label} fill={SERIES_COLORS[0]} opacity={.65} maxBarSize={30}/>
    {chartFields.slice(1).map((f,i)=><Line key={f.key} type="linear" dataKey={f.key} name={f.label} stroke={SERIES_COLORS[(i+1)%SERIES_COLORS.length]} strokeWidth={2} dot={false} connectNulls={false}/>)}
    {chartFields.length===1?<Line type="linear" dataKey={chartFields[0].key} stroke={SERIES_COLORS[1]} dot={false} name="趨勢" />:null}
  </ComposedChart>;
  else if(type==='scatter')graphic=<ScatterChart margin={margin}>
    <CartesianGrid stroke={GRID} strokeDasharray="3 3"/>
    <XAxis type="number" dataKey="x" name="時序" domain={[0,Math.max(1,chartRows.length-1)]} tickFormatter={value=>chartRows[Math.round(value)]?.period||''} tick={{fill:TEXT,fontSize:10}} stroke={GRID}/>
    <YAxis type="number" dataKey="y" name="數量" tick={{fill:TEXT,fontSize:11}} stroke={GRID}/>
    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{strokeDasharray:'3 3'}} formatter={v=>Number(v).toLocaleString()}/>
    {chartFields.length>1?<Legend/>:null}
    {chartFields.map((f,i)=><Scatter key={f.key} name={f.label||f.key} data={chartRows.filter(row=>!row.folded&&Number(row[f.key])>0).map(row=>({x:chartRows.indexOf(row),y:Number(row[f.key])||0}))} fill={SERIES_COLORS[i%SERIES_COLORS.length]}/>)}
  </ScatterChart>;
  else graphic=<LineChart data={chartRows} margin={margin}>
    {axes}
    {chartFields.map((f,i)=><Line key={f.key} type="linear" dataKey={f.key} name={f.label||f.key} stroke={SERIES_COLORS[i%SERIES_COLORS.length]} strokeWidth={2.5} dot={chartRows.length<25} connectNulls={false} isAnimationActive={false}/>)}
  </LineChart>;
  if(!categories.length&&!rows.length)return <p className="scope-status">目前區間沒有可用的統計資料。</p>;
  return <div className="scope-multichart" role="group" aria-label="統計圖形">
    <ResponsiveContainer width="100%" height={height}>{graphic}</ResponsiveContainer>
    {foldBlank&&gaps.length?<div className="scope-status" role="note">
      時間斷層：{gaps.map(g=>g.start+' ～ '+g.end+'（'+(g.days||g.buckets)+(g.days?' 天':' 區間')+'）').join('；')}。只折疊連續空白區間；原始數據與總量不變。
    </div>:null}
    {(type==='pie'||type==='radar'||type==='radial'||type==='treemap')?<p className="scope-status">這個圖形顯示所選期間的總量分布，不代表事件順序或因果關係。</p>:null}
  </div>;
}
