'use client';

import {useEffect,useMemo,useState} from 'react';
import {neonClient} from '../../loc/neon-client';
import {listNeonRecords} from '../../loc/neon-user-storage';
import {runeTrend} from '../../loc/model/rune-trend';
import {fetchLocJson,fetchLocJsonBatch,LOC_DATA} from '../../loc/data';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PAGE_SIZE=20;

function contextTitle(row,index){
  const value=row?.title||row?.display_title||row?.label||row?.name||row?.subject||row?.period||row?.era_name||row?.context_name||row?.context_key;
  if(value)return String(value);
  if(row?.source||row?.source_name)return String(row.source||row.source_name);
  return `脈絡項目 ${index+1}`;
}

export default function ContextV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  const view=scopeDataViewV2(scopeId,'context');
  const [rows,setRows]=useState([]);
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [dailyRows,setDailyRows]=useState([]);
  const [dailyError,setDailyError]=useState('');

  useEffect(()=>{
    let live=true;
    if(scopeId!=='runes'){
      setDailyRows([]);setDailyError('');
      return()=>{live=false};
    }
    Promise.all([
      neonClient.from('runtime_json_documents').select('payload').eq('source_path','data/json/registries/LOC8_DAILY_RUNE_REPO_HISTORY.json').limit(1),
      fetchLocJson(LOC_DATA.RUNES),
      listNeonRecords('rune-draw').catch(()=>[])
    ])
      .then(([historyResult,runes,userRecords])=>{
        if(historyResult?.error)throw new Error(historyResult.error.message||'Daily rune history read failed');
        if(!live)return;
        const runeById=new Map((Array.isArray(runes)?runes:[]).map(row=>[Number(row?.編號),row]));
        const payload=historyResult?.data?.[0]?.payload||{};
        const grouped=new Map();
        for(const row of Array.isArray(payload?.daily_draws)?payload.daily_draws:[]){
          const day=String(row?.date||'');
          if(!day)continue;
          if(!grouped.has(day))grouped.set(day,{day,cards:[]});
          const card=runeById.get(Number(row?.rune_id));
          const normalized={
            number:Number(row?.rune_id),
            name:row?.rune||card?.符文名稱||'',
            direction:row?.direction||'',
            card_face:card?.卡片屬性||'中平'
          };
          if(row?.draw_kind==='daily_draw')grouped.get(day).cards[0]=normalized;
          if(row?.draw_kind==='daily_draw_supplement')grouped.get(day).cards[1]=normalized;
        }
        for(const record of Array.isArray(userRecords)?userRecords:[]){
          if(record?.record_kind!=='daily'&&record?.mode!=='daily')continue;
          const day=String(record?.created_at||record?.updated_at||'').slice(0,10);
          if(!day)continue;
          const cards=(Array.isArray(record?.cards)?record.cards:[]).map(raw=>{
            const canonical=runeById.get(Number(raw?.number||raw?.編號));
            return {...raw,card_face:raw?.card_face||raw?.face||raw?.卡片屬性||canonical?.卡片屬性||'中平'};
          });
          grouped.set(day,{...record,day,cards});
        }
        setDailyRows([...grouped.values()].filter(row=>row.cards?.[0]).sort((a,b)=>a.day.localeCompare(b.day)));
        setDailyError('');
      })
      .catch(error=>{
        if(live){setDailyRows([]);setDailyError(String(error?.message||error));}
      });
    return()=>{live=false};
  },[scopeId]);

  useEffect(()=>{
    let live=true;
    setRows([]);setPage(1);setError('');
    if(!view)return()=>{live=false};
    setLoading(true);
    neonClient.from(view).select('*').order('updated_at',{ascending:false}).limit(1000)
      .then(({data,error})=>{
        if(error)throw new Error(error.message||'Context read failed');
        if(!Array.isArray(data)||!data.length)throw new Error('Context projection is empty');
        if(live)setRows(data);
      })
      .catch(async error=>{
        try{
          const paths=scopeId==='loc'
            ?[LOC_DATA.LOC_ERA_REGISTRY,LOC_DATA.LOC8_EVENT_SNAPSHOT]
            :[LOC_DATA.LOC_CROSS_RELATIONSHIP_REGISTRY];
          const values=await fetchLocJsonBatch(paths,{concurrency:2});
          const eraValue=values[0];
          const eventValue=scopeId==='loc'?values[1]:values[0];
          const eras=Array.isArray(eraValue?.eras)?eraValue.eras:[];
          const events=Array.isArray(eventValue?.events)?eventValue.events:[];
          const relations=scopeId==='loc'?[]:(Array.isArray(eventValue)?eventValue:(eventValue?.relations||eventValue?.relationships||eventValue?.edges||[]));
          const rows=[
            ...eras.map((row,index)=>({...row,context_key:row.era_id||`era-${index}`,context_type:'時期',title:row.display_label||row.name||row.period||'時期',summary:row.description||row.summary||''})),
            ...events.map((row,index)=>({...row,context_key:row.id||`event-${index}`,context_type:'事件',title:row.title||row.name||'事件',summary:row.description||row.summary||''})),
            ...relations
          ];
          if(live){setRows(rows);setError('');}
        }catch{
          if(live)setError(String(error?.message||error));
        }
      })
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view]);

  const dailyComparisons=useMemo(()=>{
    if(scopeId!=='runes'||dailyRows.length<2)return [];
    const results=[];
    for(let index=1;index<dailyRows.length;index+=1){
      const previous=dailyRows[index-1];
      const current=dailyRows[index];
      if(previous.day===current.day)continue;
      const prevMain=previous.cards[0];
      const currMain=current.cards[0];
      if(!prevMain||!currMain)continue;
      const main=runeTrend(
        {卡片屬性:prevMain.card_face||prevMain.face||prevMain.卡片屬性},
        prevMain.direction,
        {卡片屬性:currMain.card_face||currMain.face||currMain.卡片屬性},
        currMain.direction
      );
      const prevSub=previous.cards[1]||null;
      const currSub=current.cards[1]||null;
      const supplement=prevSub&&currSub?runeTrend(
        {卡片屬性:prevSub.card_face||prevSub.face||prevSub.卡片屬性},
        prevSub.direction,
        {卡片屬性:currSub.card_face||currSub.face||currSub.卡片屬性},
        currSub.direction
      ):null;
      results.push({previous,current,main,supplement,prevMain,currMain,prevSub,currSub});
    }
    return results.slice(-7).reverse();
  },[dailyRows,scopeId]);

  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const shown=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  return <FeaturePageV2 featureId="context" subtitle="脈絡整理時期、事件與關係，讓內容可以被搜尋、比較與追蹤。">
    {!view?<p className="scope-v2-status">此 Scope 尚未啟用脈絡 projection。</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入中…</p>:null}
    {scopeId==='runes'?<section className="scope-v2-block" data-context-kind="daily-rune-trend">
      <h2>每日符文趨勢</h2>
      <p>以 Neon 中的每日歷史作為時間觀察點。主牌比較昨日→今日；若兩天都有補牌，補牌也獨立比較。第一版先保留兩條趨勢，不把主牌與補牌硬合成單一分數。</p>
      {dailyError?<p className="scope-v2-status scope-v2-error">每日趨勢暫時無法讀取：{dailyError}</p>:null}
      {!dailyError&&!dailyComparisons.length?<p className="scope-v2-status">至少需要兩天的每日符文紀錄，才會出現趨勢。</p>:null}
      <div className="scope-v2-list">
        {dailyComparisons.map(item=><ScopeCardV2 key={`${item.previous.day}-${item.current.day}`} title={`${item.previous.day} → ${item.current.day}`}>
          <p><strong>主牌趨勢：</strong>{item.main.trend}　<strong>今日判定：</strong>{item.main.judgement}</p>
          <p>{item.prevMain.name||item.prevMain.符文名稱||'昨日主牌'}・{item.prevMain.direction} → {item.currMain.name||item.currMain.符文名稱||'今日主牌'}・{item.currMain.direction}</p>
          {item.supplement?<>
            <p><strong>補牌趨勢：</strong>{item.supplement.trend}　<strong>今日補牌判定：</strong>{item.supplement.judgement}</p>
            <p>{item.prevSub.name||item.prevSub.符文名稱||'昨日補牌'}・{item.prevSub.direction} → {item.currSub.name||item.currSub.符文名稱||'今日補牌'}・{item.currSub.direction}</p>
          </>:<p className="scope-v2-status">這一組紀錄尚未同時具有昨日與今日補牌，因此只展示主牌趨勢。</p>}
        </ScopeCardV2>)}
      </div>
    </section>:null}
    <div className="scope-v2-list">
      {shown.map((row,index)=><ScopeCardV2 key={row.context_key||row.id||JSON.stringify(row)} title={contextTitle(row,(page-1)*PAGE_SIZE+index)}>
        <div className="scope-v2-meta">{row.context_type?<span>{row.context_type}</span>:null}</div>
        {row.summary?<p>{row.summary}</p>:null}
      </ScopeCardV2>)}
    </div>
    {rows.length?<div className="scope-v2-pagination">
      <span>第 {page} / {pages} 頁 · 共 {rows.length} 筆</span>
      <div>
        <button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button>
        <button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button>
      </div>
    </div>:null}
  </FeaturePageV2>;
}
