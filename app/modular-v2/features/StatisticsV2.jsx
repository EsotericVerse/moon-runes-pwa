'use client';

import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery} from '@tanstack/react-query';
import {
  Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,Line,LineChart,
  Pie,PieChart,PolarAngleAxis,PolarGrid,PolarRadiusAxis,Radar,RadarChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeRankingPage} from '../../loc/neon-ranking-client';
import {readFeatureNavigation} from '../feature-navigation.v2';
import {scopeFeatureSubtitleV2} from '../page-profiles.v2';
import {FEATURE_EMPTY_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import FeaturePageV2 from '../FeaturePageV2';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];
const CHART_TYPES=Object.freeze([
  ['bar','長條圖'],
  ['line','折線圖'],
  ['area','面積圖'],
  ['pie','圓餅圖'],
  ['radar','雷達圖']
]);

function RankingChart({type,rows}){
  if(type==='line')return <ResponsiveContainer width="100%" height={360}>
    <LineChart data={rows} margin={{top:8,right:20,bottom:36,left:8}}>
      <CartesianGrid strokeDasharray="3 3"/>
      <XAxis dataKey="term" angle={-30} textAnchor="end" interval={0} height={72}/>
      <YAxis/>
      <Tooltip/>
      <Line type="monotone" dataKey="value" stroke="#7562cf" strokeWidth={2}/>
    </LineChart>
  </ResponsiveContainer>;

  if(type==='area')return <ResponsiveContainer width="100%" height={360}>
    <AreaChart data={rows} margin={{top:8,right:20,bottom:36,left:8}}>
      <CartesianGrid strokeDasharray="3 3"/>
      <XAxis dataKey="term" angle={-30} textAnchor="end" interval={0} height={72}/>
      <YAxis/>
      <Tooltip/>
      <Area type="monotone" dataKey="value" stroke="#7562cf" fill="#7562cf" fillOpacity={0.24}/>
    </AreaChart>
  </ResponsiveContainer>;

  if(type==='pie')return <ResponsiveContainer width="100%" height={360}>
    <PieChart>
      <Tooltip/>
      <Pie data={rows} dataKey="value" nameKey="term" cx="50%" cy="50%" outerRadius={130}>
        {rows.map((row,index)=><Cell key={row.ranking_key||row.term||index} fill={PIE_COLORS[index%PIE_COLORS.length]}/>)}
      </Pie>
    </PieChart>
  </ResponsiveContainer>;

  if(type==='radar')return <ResponsiveContainer width="100%" height={400}>
    <RadarChart data={rows} outerRadius="72%">
      <PolarGrid/>
      <PolarAngleAxis dataKey="term"/>
      <PolarRadiusAxis/>
      <Tooltip/>
      <Radar dataKey="value" stroke="#7562cf" fill="#7562cf" fillOpacity={0.28}/>
    </RadarChart>
  </ResponsiveContainer>;

  return <ResponsiveContainer width="100%" height={Math.max(320,rows.length*36)}>
    <BarChart data={rows} layout="vertical" margin={{top:8,right:20,bottom:8,left:8}}>
      <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
      <XAxis type="number"/>
      <YAxis type="category" dataKey="term" width={128}/>
      <Tooltip/>
      <Bar dataKey="value" fill="#7562cf" radius={[0,4,4,0]}/>
    </BarChart>
  </ResponsiveContainer>;
}

export default function StatisticsV2(){
  const {scopeId}=useScopeRuntimeV2();
  const searchParams=useSearchParams();
  const navigation=useMemo(()=>readFeatureNavigation(searchParams),[searchParams]);
  const [rankingType,setRankingType]=useState(navigation.rankingType||'');
  const [chartType,setChartType]=useState('bar');
  useEffect(()=>setRankingType(navigation.rankingType||''),[navigation.rankingType]);

  const query=useQuery({
    queryKey:['statistics-chart',scopeId,rankingType,navigation.q,navigation.identity,navigation.source,navigation.period,navigation.anchor,navigation.from,navigation.to],
    queryFn:()=>selectScopeRankingPage(scopeId,{page:1,pageSize:10,rankingType,navigation}),
    staleTime:30_000
  });

  const rows=query.data?.rows||[];
  const types=query.data?.types||[];
  const chartRows=useMemo(
    ()=>rows.map((row,index)=>({
      ...row,
      order:index+1,
      value:Number(row.rank_value??row.item_count??0)||0,
      count:Number(row.item_count??0)||0
    })),
    [rows]
  );

  return <FeaturePageV2 featureId="statics">
    <section className="loc-card scope-v2-feature-card">
      <p className="loc-eyebrow">Charts</p>
      <h2>統計圖表</h2>
      <div className="scope-v2-stat-controls">
        {types.length>1?<label>
          <span>統計類型</span>
          <select
            className="scope-v2-select"
            value={rankingType}
            onChange={event=>setRankingType(event.target.value)}
            aria-label="統計類型"
          >
            <option value="">全部</option>
            {types.map(type=><option key={type} value={type}>{type}</option>)}
          </select>
        </label>:null}
  
        <label>
          <span>圖形</span>
          <select
            className="scope-v2-select"
            value={chartType}
            onChange={event=>setChartType(event.target.value)}
            aria-label="圖形類型"
          >
            {CHART_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
  
      {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
  
      {!query.isPending&&!query.error&&!chartRows.length?<p className="scope-v2-status">{FEATURE_EMPTY_MESSAGE}</p>:null}
  
      {chartRows.length?<div className="scope-v2-ranking-chart" aria-label={CHART_TYPES.find(([value])=>value===chartType)?.[1]||'統計圖'}>
        <RankingChart type={chartType} rows={chartRows}/>
      </div>:null}
  
    </section>

  </FeaturePageV2>;
}
