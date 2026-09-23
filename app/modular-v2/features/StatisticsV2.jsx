'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {selectScopeRankingPage} from '../../loc/neon-ranking-client';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

export default function StatisticsV2(){
  const {scopeId}=useScopeRuntimeV2();
  const [selectedTerm,setSelectedTerm]=useState('');
  const query=useQuery({queryKey:['statistics-chart',scopeId],queryFn:()=>selectScopeRankingPage(scopeId,{page:1,pageSize:100}),staleTime:30_000});
  const rows=query.data?.rows||[];
  const chartRows=useMemo(()=>rows.slice(0,20).map(row=>({...row,value:Number(row.rank_value??row.item_count??0)||0})),[rows]);
  const selected=selectedTerm?rows.filter(row=>row.term===selectedTerm):[];

  return <section className="loc-view">
    <h1>統計</h1>
    {query.error?<p className="scope-v2-status scope-v2-error">{query.error.message}</p>:null}
    {chartRows.length?<div className="scope-v2-ranking-chart">
      <ResponsiveContainer width="100%" height={Math.max(320,chartRows.length*36)}>
        <BarChart data={chartRows} layout="vertical" margin={{top:8,right:20,bottom:8,left:8}}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
          <XAxis type="number"/><YAxis type="category" dataKey="term" width={128}/><Tooltip/>
          <Bar dataKey="value" fill="#7562cf" radius={[0,4,4,0]} onClick={entry=>setSelectedTerm(entry?.term||entry?.payload?.term||'')}/>
        </BarChart>
      </ResponsiveContainer>
    </div>:null}
    {selectedTerm?<div className="scope-v2-ranking">
      {selected.map((row,index)=><div key={row.ranking_key||index}><b>{row.term}</b><span>{row.item_count??'—'} · {row.rank_value??'—'}</span></div>)}
    </div>:null}
  </section>;
}
