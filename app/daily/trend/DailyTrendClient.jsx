'use client';

import {useEffect,useMemo,useState} from 'react';
import {listNeonRecords} from '../../loc/neon-user-storage';
import {useNeonAccount} from '../../loc/use-neon-account';

const DAYS=14;
function dayKey(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return date.toLocaleDateString('en-CA');
}
function dailyRows(records){
  return records.filter(row=>row.record_kind==='daily');
}
function Card({label,value,detail}){
  return <article className="loc-card"><p className="loc-eyebrow">{label}</p><h2>{value}</h2>{detail?<p>{detail}</p>:null}</article>;
}

export default function DailyTrendClient(){
  const account=useNeonAccount();
  const [records,setRecords]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function reload(){
    if(!account.user){setRecords([]);return;}
    setLoading(true);setError('');
    try{setRecords(dailyRows(await listNeonRecords('rune-draw')));}
    catch(reason){setError(String(reason?.message||reason||'讀取每日符文紀錄失敗。'));}
    finally{setLoading(false);}
  }
  useEffect(()=>{reload();},[account.user?.id]);

  const analysis=useMemo(()=>{
    const today=new Date();
    const days=Array.from({length:DAYS},(_,index)=>{
      const date=new Date(today);date.setDate(today.getDate()-(DAYS-1-index));
      const key=dayKey(date);
      return {key,label:date.toLocaleDateString('zh-Hant',{month:'numeric',day:'numeric'}),count:0};
    });
    const byDate=new Map(days.map(item=>[item.key,item]));
    const runes=new Map();
    let recent=0;
    for(const record of records){
      const key=dayKey(record.record_date||record.date||record.created_at);
      const day=byDate.get(key);
      if(day){day.count++;recent++;}
      for(const card of Array.isArray(record.cards)?record.cards:[]){
        const name=String(card?.name||card?.rune_name||'').trim();
        if(!name)continue;
        const direction=String(card?.direction||'');
        const label=direction?name+' · '+direction:name;
        runes.set(label,(runes.get(label)||0)+1);
      }
    }
    const topRunes=[...runes].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,10);
    const maximum=Math.max(1,...days.map(item=>item.count));
    return {days,topRunes,recent,maximum,total:records.length};
  },[records]);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Daily Trend · LunaRunes</p>
      <h1>每日符文分析趨勢</h1>
      <p>以你自己的每日抽牌紀錄，整理近 14 日頻率與符文出現分布；資料沿用抽牌紀錄的 Neon 帳戶權限。</p>
    </header>
    {!account.user?<section className="loc-card"><p>登入後即可查看自己的每日符文趨勢。</p><button className="loc-button primary" type="button" onClick={account.signIn}>使用 Google 登入 Neon</button></section>:<>
      <div className="loc-grid two">
        <Card label="累計每日紀錄" value={analysis.total} detail="帳戶內保存的每日抽牌紀錄"/>
        <Card label="近 14 日抽牌" value={analysis.recent} detail="依每日紀錄日期統計"/>
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
      <div className="loc-actions"><button className="loc-button" type="button" disabled={loading} onClick={reload}>重新整理</button><a href="/daily/log/">查看每日符文紀錄</a></div>
    </>}
  </section>;
}
