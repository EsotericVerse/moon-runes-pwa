'use client';

import {useEffect,useMemo,useState} from 'react';
import {listNeonRecords} from '../../loc/neon-user-storage';
import {useNeonAccount} from '../../loc/use-neon-account';
import DAILY_HISTORY_ARCHIVE from '../../../data/json/registries/LOC8_DAILY_RUNE_REPO_HISTORY.json';

const DAYS=14;
function dayKey(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return date.toLocaleDateString('en-CA');
}
function dailyRows(records){
  return records.filter(row=>row.record_kind==='daily');
}
function collectDraws(records){
  const archive=(DAILY_HISTORY_ARCHIVE.daily_draws||[]).map(row=>({id:row.id,date:row.date,rune:row.rune,direction:row.direction,source:'RC3 歷史'}));
  const personal=records.flatMap(record=>(record.cards||[]).map((card,index)=>({id:String(record.id||record.created_at||'')+'-'+index,date:record.record_date||record.date||record.created_at,rune:card?.name||card?.rune_name,direction:card?.direction,source:'Neon 帳戶'})));
  const seen=new Set();
  return [...archive,...personal].filter(item=>{
    const date=dayKey(item.date),key=date+'|'+String(item.rune||'')+'|'+String(item.direction||'');
    if(!date||!item.rune||seen.has(key))return false;seen.add(key);return true;
  });
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

  const draws=useMemo(()=>collectDraws(records),[records]);
  const analysis=useMemo(()=>{
    const latest=draws.map(item=>dayKey(item.date)).filter(Boolean).sort().at(-1);
    const anchor=latest?new Date(latest+'T12:00:00'):new Date();
    const days=Array.from({length:DAYS},(_,index)=>{
      const date=new Date(anchor);date.setDate(anchor.getDate()-(DAYS-1-index));
      const key=dayKey(date);
      return {key,label:date.toLocaleDateString('zh-Hant',{month:'numeric',day:'numeric'}),count:0};
    });
    const byDate=new Map(days.map(item=>[item.key,item]));
    const runes=new Map();
    let recent=0;
    for(const draw of draws){
      const key=dayKey(draw.date),day=byDate.get(key);
      if(day){day.count++;recent++;}
      const name=String(draw.rune||'').trim();if(!name)continue;
      const direction=String(draw.direction||''),label=direction?name+' · '+direction:name;
      runes.set(label,(runes.get(label)||0)+1);
    }
    const topRunes=[...runes].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,10);
    const maximum=Math.max(1,...days.map(item=>item.count));
    return {days,topRunes,recent,maximum,total:draws.length,latest};
  },[draws]);

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Daily Trend · LunaRunes</p>
      <h1>每日符文分析趨勢</h1>
      <p>合併 RC3 已確認的歷史紀錄與登入帳戶的 Neon 每日抽牌，觀察截至最新紀錄的 14 日變化與符文分布。</p>
    </header>
    {!account.user?<section className="loc-card"><p>可先查看 RC3 歷史趨勢；登入後會合併自己的 Neon 紀錄。</p><button className="loc-button primary" type="button" onClick={account.signIn}>使用 Google 登入 Neon</button></section>:<>
      <div className="loc-grid two">
        <Card label="每日歷史紀錄" value={analysis.total} detail={'RC3 歷史 '+DAILY_HISTORY_ARCHIVE.daily_draws.length+' 筆 + 帳戶新增紀錄'}/>
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
      <div className="loc-actions"><button className="loc-button" type="button" disabled={loading} onClick={reload}>重新整理</button><a href="/daily/log/">查看每日符文紀錄</a></div>
    </>}
  </section>;
}
