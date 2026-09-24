'use client';

import {useEffect,useMemo,useState} from 'react';
import {selectRecentDailyRuneDraws} from '../../loc/neon-daily-runes';

const DAYS=14;
function dayKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
}
function Card({label,value,detail}){
  return <article className="loc-card"><p className="loc-eyebrow">{label}</p><h2>{value}</h2>{detail?<p>{detail}</p>:null}</article>;
}

export default function DailyTrendClient(){
  const [draws,setDraws]=useState([]);
  const [total,setTotal]=useState(0);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function reload(){
    setLoading(true);
    setError('');
    try{
      const result=await selectRecentDailyRuneDraws({limit:28});
      setDraws(result.rows);
      setTotal(result.count||0);
    }catch(reason){
      setError(String(reason?.message||reason||'讀取每日符文趨勢失敗。'));
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{reload();},[]);

  const analysis=useMemo(()=>{
    if(!draws.length)return {days:[],topRunes:[],recent:0,maximum:1,latest:''};
    const latest=draws.map(item=>dayKey(item.record_date)).filter(Boolean).sort().at(-1);
    const anchor=new Date(`${latest}T12:00:00`);
    const days=Array.from({length:DAYS},(_,index)=>{
      const date=new Date(anchor);date.setDate(anchor.getDate()-(DAYS-1-index));
      const key=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
      return {key,label:date.toLocaleDateString('zh-Hant',{month:'numeric',day:'numeric'}),count:0};
    });
    const byDate=new Map(days.map(item=>[item.key,item]));
    const runes=new Map();
    let recent=0;
    for(const draw of draws){
      const key=dayKey(draw.record_date),day=byDate.get(key);
      if(day){day.count++;recent++;}
      const name=String(draw.rune_name||'').trim();
      if(!name)continue;
      const label=draw.direction?`${name} · ${draw.direction}`:name;
      runes.set(label,(runes.get(label)||0)+1);
    }
    const topRunes=[...runes].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,10);
    const maximum=Math.max(1,...days.map(item=>item.count));
    return {days,topRunes,recent,maximum,latest};
  },[draws]);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Daily Trend · LunaRunes</p>
      <h1>每日符文分析趨勢</h1>
      <p>每日符文紀錄，觀察截至最新紀錄的 14 日變化與符文分布。</p>
    </header>
    <div className="loc-grid two">
      <Card label="每日歷史紀錄" value={total} detail="Neon 紀錄總數"/>
      <Card label="近 14 日抽牌" value={analysis.recent} detail={analysis.latest?'截至 '+analysis.latest:'尚無紀錄日期'}/>
    </div>
    {error?<p role="alert" className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入每日抽牌趨勢…</p>:null}
    <section className="loc-card">
      <h2>每日紀錄量</h2>
      <div className="scope-v2-list" aria-label="最近 14 日紀錄量">
        {analysis.days.map(day=><div className="scope-v2-inline-card" key={day.key}>
          <strong>{day.label}</strong><span>{day.count} 筆</span>
          <span aria-hidden="true" style={{display:'block',height:8,width:Math.max(3,day.count/analysis.maximum*100)+'%',background:'var(--loc-accent)',borderRadius:8}}/>
        </div>)}
      </div>
    </section>
    <section className="loc-card">
      <h2>常見符文與方向</h2>
      {!analysis.topRunes.length?<p>目前還沒有每日抽牌資料可供分析。</p>:<ol>{analysis.topRunes.map(([label,count])=><li key={label}>{label}：{count} 次</li>)}</ol>}
    </section>
    <div className="loc-actions">
      <button className="loc-button" type="button" disabled={loading} onClick={reload}>重新整理</button>
      <a href="/daily/log/">查看每日符文紀錄</a>
    </div>
  </section>;
}
