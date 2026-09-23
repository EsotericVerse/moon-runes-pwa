'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {
  Area,AreaChart,Bar,BarChart,CartesianGrid,Cell,Line,LineChart,
  Pie,PieChart,PolarAngleAxis,PolarGrid,PolarRadiusAxis,Radar,RadarChart,
  ResponsiveContainer,Tooltip,XAxis,YAxis
} from 'recharts';
import {selectScopeRankingPage} from '../../loc/neon-ranking-client';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PIE_COLORS=['#7562cf','#8f7de3','#5f8fd3','#5db0a6','#d69b55','#cc6f7d','#9a7bc1','#6f9f77','#c49a3f','#7d8a99'];

export default function StatisticsV2(){
  const {scopeId}=useScopeRuntimeV2();
  const [rankingType,setRankingType]=useState('');

  const query=useQuery({
    queryKey:['statistics-chart',scopeId,rankingType],
    queryFn:()=>selectScopeRankingPage(scopeId,{page:1,pageSize:100,rankingType}),
    staleTime:30_000
  });

  const rows=query.data?.rows||[];
  const types=query.data?.types||[];
  const chartRows=useMemo(
    ()=>rows.slice(0,10).map((row,index)=>({
      ...row,
      order:index+1,
      value:Number(row.rank_value??row.item_count??0)||0,
      count:Number(row.item_count??0)||0
    })),
    [rows]
  );

  return <section className="loc-view">
    <h1>統計</h1>

    {types.length>1?<select
      className="scope-v2-select"
      value={rankingType}
      onChange={event=>setRankingType(event.target.value)}
      aria-label="統計類型"
    >
      <option value="">全部</option>
      {types.map(type=><option key={type} value={type}>{type}</option>)}
    </select>:null}

    {query.error?<p className="scope-v2-status scope-v2-error">{query.error.message}</p>:null}

    {chartRows.length?<div className="scope-v2-chart-grid">
      <div className="scope-v2-ranking-chart" aria-label="長條圖">
        <ResponsiveContainer width="100%" height={Math.max(320,chartRows.length*36)}>
          <BarChart data={chartRows} layout="vertical" margin={{top:8,right:20,bottom:8,left:8}}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
            <XAxis type="number"/>
            <YAxis type="category" dataKey="term" width={128}/>
            <Tooltip/>
            <Bar dataKey="value" fill="#7562cf" radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="scope-v2-ranking-chart" aria-label="折線圖">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartRows} margin={{top:8,right:20,bottom:36,left:8}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="term" angle={-30} textAnchor="end" interval={0} height={72}/>
            <YAxis/>
            <Tooltip/>
            <Line type="monotone" dataKey="value" stroke="#7562cf" strokeWidth={2}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="scope-v2-ranking-chart" aria-label="面積圖">
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={chartRows} margin={{top:8,right:20,bottom:36,left:8}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="term" angle={-30} textAnchor="end" interval={0} height={72}/>
            <YAxis/>
            <Tooltip/>
            <Area type="monotone" dataKey="value" stroke="#7562cf" fill="#7562cf" fillOpacity={0.24}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="scope-v2-ranking-chart" aria-label="圓餅圖">
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Tooltip/>
            <Pie data={chartRows} dataKey="value" nameKey="term" cx="50%" cy="50%" outerRadius={130}>
              {chartRows.map((row,index)=><Cell key={row.ranking_key||row.term||index} fill={PIE_COLORS[index%PIE_COLORS.length]}/>)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="scope-v2-ranking-chart" aria-label="雷達圖">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartRows} outerRadius="72%">
            <PolarGrid/>
            <PolarAngleAxis dataKey="term"/>
            <PolarRadiusAxis/>
            <Tooltip/>
            <Radar dataKey="value" stroke="#7562cf" fill="#7562cf" fillOpacity={0.28}/>
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>:null}
  </section>;
}
