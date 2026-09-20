'use client';

import {useEffect,useMemo,useState} from 'react';
import {neonClient} from '../../loc/neon-client';
import {fetchLocJson,LOC_DATA} from '../../loc/data';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PAGE_SIZE=20;

const LEGACY_SECTIONS=Object.freeze({
  keyword:{eyebrow:'Keyword Statistics',title:'關鍵字統計',text:'集中查看關鍵字在跨時期資料中的出現與分布，作為風格分析與資料回查入口。'},
  source:{eyebrow:'Source Management',title:'來源管理',text:'檢視搜尋資料來源、可搜尋筆數、文字量、時間範圍與目前資料狀態。'},
  import:{eyebrow:'Import',title:'匯入',text:'匯入網頁暫時保留功能位置；目前先維持既有資料流程，後續再接入新的資料來源。'},
  total:{eyebrow:'Total Ranking',title:'總排行榜',text:'跨時期關鍵字排行榜集中於此，可切換文字、社群與音樂資料的統計類型。'}
});

export default function StatisticsV2({section=null}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const view=scopeDataViewV2(scopeId,'rankings');
  const [rows,setRows]=useState([]);
  const [dailyDraws,setDailyDraws]=useState([]);
  const [type,setType]=useState('');
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [dailyDraft,setDailyDraft]=useState({date:'',kind:'daily_draw',rune:'',direction:'正位',note:''});
  const [manualDaily,setManualDaily]=useState([]);

  useEffect(()=>{
    let live=true;
    setRows([]);setDailyDraws([]);setType('');setPage(1);setError('');
    if(!view)return()=>{live=false};
    setLoading(true);
    neonClient.from(view).select('*').order('rank_value',{ascending:false}).limit(1000)
      .then(({data,error})=>{
        if(error)throw new Error(error.message||'Ranking read failed');
        if(live)setRows(data||[]);
      })
      .catch(async error=>{
        try{
          const fallback=await fetchLocJson(LOC_DATA.SEARCH_SOURCE_STATS);
          const candidates=Array.isArray(fallback)?fallback:Object.values(fallback||{}).flatMap(value=>Array.isArray(value)?value:[]);
          const rows=candidates.map((row,index)=>({
            ranking_key:row.ranking_key||row.key||row.source||String(index),
            ranking_type:row.ranking_type||'資料來源',
            term:row.term||row.name||row.source||row.label||'—',
            item_count:row.item_count??row.count??row.total??'—',
            rank_value:row.rank_value??row.score??row.count??row.total??0
          }));
          if(live){setRows(rows);setError('');}
        }catch{
          if(live)setError(String(error?.message||error));
        }
      })
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view]);

  useEffect(()=>{
    let live=true;
    if(scopeId!=='runes')return()=>{live=false};
    fetchLocJson(LOC_DATA.DAILY_RUNE_REPO_HISTORY)
      .then(value=>{if(live)setDailyDraws(Array.isArray(value?.daily_draws)?[...value.daily_draws].reverse():[]);})
      .catch(()=>{if(live)setDailyDraws([]);});
    return()=>{live=false};
  },[scopeId]);

  const types=useMemo(()=>[...new Set(rows.map(row=>row.ranking_type).filter(Boolean))],[rows]);
  useEffect(()=>{if(types.length&&!types.includes(type))setType(types[0]);},[types,type]);
  const filtered=useMemo(()=>rows.filter(row=>!type||row.ranking_type===type),[rows,type]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const shown=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const legacy=LEGACY_SECTIONS[section?.split('/')[0]];
  const rankingPath=!section||section==='total'||section==='keyword/total'||section==='music/total'||section==='source/total'?'/statics':null;
  return <FeaturePageV2 featureId="statics" expandedPath={rankingPath} subtitle="統計關鍵字排行榜與資料來源的分佈，來做風格的分析。">
    {legacy?<ScopeCardV2 eyebrow={legacy.eyebrow} title={legacy.title}><p>{legacy.text}</p></ScopeCardV2>:null}
    <ScopeCardV2 eyebrow="Statistics" title="跨時期關鍵字排行榜集中於此。">
      <p>統計排行榜、關鍵字、曲風與來源的分佈，作為風格分析與資料回查的入口。</p>
    </ScopeCardV2>
    {!view?<p className="scope-v2-status">此 Scope 尚未啟用統計 projection。</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入中…</p>:null}
    {scopeId==='runes'&&dailyDraws.length?<ScopeCardV2 eyebrow="抽籤紀錄" title="每日符文紀錄">
      <div className="scope-v2-ranking">
        {dailyDraws.slice(0,10).map(row=><div key={row.id||row.date}>
          <b>{row.date} · {row.rune}</b>
          <span>{row.direction||'—'}</span>
        </div>)}
      </div>
      <p className="scope-v2-status">顯示已確認的每日抽籤紀錄；完整紀錄依日期保留。</p>
    </ScopeCardV2>:null}

    {(!section||section==='runes')?<ScopeCardV2 eyebrow="Rune Statistics" title="符文統計">
      <p>顯示月之符文群組與可抽符文的結構統計。符文母資料與符文演化資料獨立於個人文化時期。</p>
      <div className="scope-v2-chip-list">
        {['靈魂','連結','生命','自然','礦物','元素','秩序','混沌','特殊'].map(item=><span key={item}>{item}</span>)}
      </div>
    </ScopeCardV2>:null}
    {(!section||section==='source')?<ScopeCardV2 eyebrow="Sources" title="來源管理">
      <p>集中檢視搜尋資料來源、可搜尋筆數、文字量、時間範圍與目前資料狀態。</p>
      <div className="scope-v2-status">來源資料由目前 projection 與 repository JSON fallback 提供；來源本身不改寫母資料。</div>
    </ScopeCardV2>:null}
    {(!section||section==='daily')?<ScopeCardV2 eyebrow="Daily Runes" title="每日符文">
      <p>每日符文的手動紀錄與趨勢統計集中在這裡；線上即時抽牌仍由月之符文首頁處理。</p>
      <form className="scope-v2-editor" onSubmit={event=>{event.preventDefault();if(!dailyDraft.date||!dailyDraft.rune)return;setManualDaily(rows=>[{'...dailyDraft,id:'local-'+Date.now()},...rows]);setDailyDraft({date:'',kind:'daily_draw',rune:'',direction:'正位',note:''});}}>
        <label>日期<input type="date" value={dailyDraft.date} onChange={event=>setDailyDraft(value=>({...value,date:event.target.value}))} required/></label>
        <label>類型<select value={dailyDraft.kind} onChange={event=>setDailyDraft(value=>({...value,kind:event.target.value}))}><option value="daily_draw">主抽</option><option value="daily_draw_supplement">補抽</option></select></label>
        <label>符文<input value={dailyDraft.rune} onChange={event=>setDailyDraft(value=>({...value,rune:event.target.value}))} placeholder="輸入符文" required/></label>
        <label>方向<select value={dailyDraft.direction} onChange={event=>setDailyDraft(value=>({...value,direction:event.target.value}))}><option>正位</option><option>半正位</option><option>半逆位</option><option>逆位</option></select></label>
        <label className="scope-v2-editor-full">備註<input value={dailyDraft.note} onChange={event=>setDailyDraft(value=>({...value,note:event.target.value}))}/></label>
        <button type="submit">加入目前展示</button>
      </form>
      {manualDaily.length?<div className="scope-v2-ranking">{manualDaily.map(row=><div key={row.id}><b>{row.date} · {row.rune}</b><span>{(row.kind==='daily_draw_supplement'?'補抽':'主抽')+' · '+row.direction+(row.note?' · '+row.note:'')}</span></div>)}</div>:<div className="scope-v2-status">尚未加入本頁展示的手動紀錄。</div>}
    </ScopeCardV2>:null}
    {(!section||section==='import')?<ScopeCardV2 eyebrow="Import" title="匯入">
      <p>匯入網頁暫時保留功能位置，目前不開放直接匯入。</p>
    </ScopeCardV2>:null}
    {types.length?<nav className="scope-v2-tabs" aria-label="排行榜類型">
      {types.map(item=><button type="button" key={item} aria-pressed={item===type} onClick={()=>{setType(item);setPage(1)}}>{item}</button>)}
    </nav>:null}
    <ScopeCardV2 eyebrow={scope.label} title={scope.rankingTitle||'排行榜'}>
      <div className="scope-v2-ranking">
        {shown.map((row,index)=><div key={row.ranking_key||`${row.term}-${index}`}>
          <b>{(page-1)*PAGE_SIZE+index+1}. {row.term}</b>
          <span>{row.item_count??'—'} · {row.rank_value??'—'}</span>
        </div>)}
      </div>
      {!loading&&!error&&!shown.length?<p>目前沒有可顯示的統計資料。</p>:null}
    </ScopeCardV2>
    {filtered.length?<div className="scope-v2-pagination">
      <span>第 {page} / {pages} 頁 · 共 {filtered.length} 筆</span>
      <div>
        <button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button>
        <button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button>
      </div>
    </div>:null}
  </FeaturePageV2>;
}
