'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {DataSet,Timeline} from 'vis-timeline/standalone';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {CULTURE_PATHS_V2} from '../../migration-bridges/current-data-compat.v2';
import {neonClient} from '../../loc/neon-client';

const DAY_MS=24*60*60*1000;
const today=()=>new Date().toISOString().slice(0,10);
const text=value=>String(value??'');
const dateValue=value=>text(value||today()).slice(0,10);

function normalizeRow(row,index){
  const payload=row?.payload&&typeof row.payload==='object'?row.payload:{};
  const value={...row,...payload};
  const kind=value.kind||value.entry_type||value.culture_type||'trajectory';
  return {
    ...value,
    id:value.id||value.entry_key||value.event_id||value.work_id||'culture-'+index,
    kind,
    title:value.title||value.name||value.label||value.work_title||'未命名內容',
    date:dateValue(value.date||value.start_date||value.created_at),
    endDate:value.end_date||value.endDate||value.date||value.start_date||'',
    eraId:value.era_id||value.period_id||value.period||'',
    body:value.body||value.content||value.description||value.summary||'',
    source:value.source||value.source_name||value.media_type||value.content_type||'',
    url:value.url||value.href||''
  };
}

function displayKind(kind){
  return ({era:'時期',event:'事件',trajectory:'軌跡',work:'作品',recommendation:'推薦'})[kind]||'軌跡';
}

function WorkbenchEditor({value,onChange,onSave,onDelete,onClose,saving}){
  if(!value)return <div className="culture-river-empty">點擊時間長河內容，或新增一筆資料。</div>;
  const set=(key,next)=>onChange({...value,[key]:next});
  const isEra=value.kind==='era';
  return <div className="culture-river-editor">
    <div className="context-item-head"><div><p className="scope-v2-eyebrow">TIME RIVER EDITOR</p><h3>{value.id?'編輯':'新增'}{displayKind(value.kind)}</h3></div><button type="button" className="context-btn ghost" onClick={onClose}>關閉</button></div>
    <div className="culture-river-form">
      <label>類型<select value={value.kind||'trajectory'} onChange={event=>set('kind',event.target.value)}><option value="era">時期</option><option value="event">事件</option><option value="trajectory">軌跡</option><option value="work">作品</option><option value="recommendation">推薦作品</option></select></label>
      <label>日期<input type="date" value={value.date||''} onChange={event=>set('date',event.target.value)}/></label>
      {isEra?<label>結束日期<input type="date" value={value.endDate||''} onChange={event=>set('endDate',event.target.value)}/></label>:null}
      <label>時期識別<input value={value.eraId||''} onChange={event=>set('eraId',event.target.value)} placeholder="例如 ERA-P7.2"/></label>
      <label className="culture-river-full">標題<input value={value.title||''} onChange={event=>set('title',event.target.value)}/></label>
      <label className="culture-river-full">軌跡／作品內容<textarea value={value.body||''} onChange={event=>set('body',event.target.value)} /></label>
      <label>來源<input value={value.source||''} onChange={event=>set('source',event.target.value)} placeholder="Threads／Suno／文章／事件"/></label>
      <label>連結<input value={value.url||''} onChange={event=>set('url',event.target.value)} placeholder="https://…"/></label>
    </div>
    <div className="context-actions"><button type="button" className="context-btn primary" disabled={saving} onClick={onSave}>{saving?'儲存中…':'儲存到 Neon'}</button><button type="button" className="context-btn ghost" onClick={onClose}>取消</button>{value.id?<button type="button" className="context-btn ghost" onClick={onDelete}>刪除</button>:null}</div>
  </div>;
}

export default function CultureV2({section=null}){
  const {scopeId}=useScopeRuntimeV2();
  const view=scopeDataViewV2(scopeId,'culture');
  const timelineRef=useRef(null);
  const timelineInstance=useRef(null);
  const [rows,setRows]=useState([]);
  const [editor,setEditor]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [sourceFilter,setSourceFilter]=useState('');
  const [kindFilter,setKindFilter]=useState('');
  const [styleFilter,setStyleFilter]=useState('');
  const [keywordFilter,setKeywordFilter]=useState('');
  const [workFilter,setWorkFilter]=useState('');
  const [displayMode,setDisplayMode]=useState('excerpt');
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    let live=true;
    setLoading(true);setError('');
    if(!view){setRows([]);setLoading(false);setError('此 Scope 尚未設定 Culture SQL projection。');return()=>{live=false};}
    neonClient.from(view).select('*').order('date',{ascending:true}).limit(3000)
      .then(result=>{
        if(result?.error)throw new Error(result.error.message||'Culture SQL projection 讀取失敗');
        if(live)setRows((result?.data||[]).map(normalizeRow));
      })
      .catch(errorValue=>live&&setError(String(errorValue?.message||errorValue)))
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view]);

  const eras=useMemo(()=>rows.filter(row=>row.kind==='era'),[rows]);
  const filters=useMemo(()=>[...new Set(rows.map(row=>row.source).filter(Boolean))].sort(),[rows]);
  const styles=useMemo(()=>[...new Set(rows.map(row=>row.style).filter(Boolean))].sort(),[rows]);
  const keywords=useMemo(()=>[...new Set(rows.flatMap(row=>row.keywords||[]).map(value=>text(value)).filter(Boolean))].sort(),[rows]);
  const visible=useMemo(()=>rows.filter(row=>(!sourceFilter||row.source===sourceFilter)&&(!kindFilter||row.kind===kindFilter)&&(!styleFilter||row.style===styleFilter)&&(!keywordFilter||(row.keywords||[]).map(value=>text(value)).includes(keywordFilter))&&(!workFilter||(workFilter==='works'?(row.kind==='work'||row.kind==='recommendation'):workFilter==='nonworks'&&row.kind!=='work'&&row.kind!=='recommendation'))),[rows,sourceFilter,kindFilter,styleFilter,keywordFilter,workFilter]);
  const visibleIds=useMemo(()=>new Set(visible.map(row=>row.id)),[visible]);
  const dailyStats=useMemo(()=>{const grouped=new Map();for(const row of visible){const key=row.date||'未指定';const current=grouped.get(key)||{date:key,total:0,works:0,events:0,trajectories:0,sources:new Set()};current.total+=1;if(row.kind==='work'||row.kind==='recommendation')current.works+=1;if(row.kind==='event')current.events+=1;if(row.kind==='trajectory')current.trajectories+=1;if(row.source)current.sources.add(row.source);grouped.set(key,current);}return [...grouped.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date)));},[visible]);
  const trajectoryRows=useMemo(()=>visible.filter(row=>row.body||row.kind==='trajectory'||row.kind==='event').sort((a,b)=>String(b.date).localeCompare(String(a.date))),[visible]);

  const items=useMemo(()=>visible.map(row=>{
    const start=dateValue(row.date);
    const end=row.kind==='era'&&row.endDate&&row.endDate!==start?dateValue(row.endDate):new Date(new Date(start).getTime()+DAY_MS).toISOString().slice(0,10);
    return {id:row.id,content:row.title,start,end,type:row.kind==='era'?'range':'box',group:row.eraId||'unassigned',className:'culture-river-item culture-river-'+row.kind};
  }),[visible]);

  const groups=useMemo(()=>{
    const byId=new Map();
    eras.forEach(row=>byId.set(row.id,{id:row.id,content:row.title,className:'culture-river-era-group'}));
    visible.forEach(row=>{const id=row.eraId||'unassigned';if(!byId.has(id))byId.set(id,{id,content:id==='unassigned'?'未分期':id,className:'culture-river-era-group'});});
    return [...byId.values()];
  },[eras,visible]);

  useEffect(()=>{
    if(!timelineRef.current||!items.length)return;
    const itemData=new DataSet(items);
    const groupData=new DataSet(groups);
    const timeline=new Timeline(timelineRef.current,itemData,groupData,{stack:true,zoomable:true,moveable:true,orientation:'top',verticalScroll:true,zoomKey:'ctrlKey',maxHeight:'620px',minHeight:'360px',showCurrentTime:true});
    timeline.on('select',event=>{const id=event.items?.[0];if(id)setEditor(rows.find(row=>row.id===id)||null);});
    timelineInstance.current=timeline;
    return()=>{timeline.destroy();timelineInstance.current=null};
  },[items,groups,rows]);

  function add(kind='trajectory'){setEditor({id:'',kind,title:'',date:today(),endDate:'',eraId:eras[eras.length-1]?.id||'',body:'',source:'',url:''});}
  async function save(){
    if(!editor)return;
    const value=normalizeRow({...editor,id:editor.id||'culture-'+Date.now()});
    setRows(current=>{const index=current.findIndex(row=>row.id===value.id);if(index<0)return [...current,value];const next=[...current];next[index]=value;return next});
    setEditor(value);setSaving(true);
    try{
      const result=await neonClient.from(view).upsert({scope_id:scopeId,entry_key:value.id,entry_type:value.kind,title:value.title,start_date:value.date,end_date:value.endDate||value.date,era_id:value.eraId||null,payload:value,updated_at:new Date().toISOString()});
      if(result?.error)throw new Error(result.error.message||'Culture Neon 寫入失敗');
      setNotice('已儲存到 Culture SQL projection');
    }catch(errorValue){setNotice('畫面已更新，但 SQL 寫入失敗：'+String(errorValue?.message||errorValue))}
    finally{setSaving(false)}
  }
  async function remove(){
    if(!editor?.id)return;
    setRows(current=>current.filter(row=>row.id!==editor.id));
    try{
      const result=await neonClient.from(view).delete().eq('entry_key',editor.id);
      if(result?.error)throw new Error(result.error.message||'Culture SQL 刪除失敗');
      setNotice('已刪除');
    }catch(errorValue){setNotice('畫面已移除，但 SQL 刪除失敗：'+String(errorValue?.message||errorValue))}
    setEditor(null);
  }

  return <FeaturePageV2 featureId="culture" expandedPath="/culture" subtitle="一條時間長河，讓時期、事件、軌跡與作品在同一個時間座標上呈現。">
    <ScopeCardV2 eyebrow="Culture · Time River" title="時期趨勢軌跡圖">
      <p>以日為最小單位；時期負責切段，事件、軌跡、作品與推薦作品落在長河上。拖曳瀏覽、Ctrl＋滾輪縮放，點擊項目進入同一個編輯器。</p>
      <div className="culture-river-toolbar"><div><button type="button" className="context-btn primary" onClick={()=>add('trajectory')}>新增軌跡</button><button type="button" className="context-btn ghost" onClick={()=>add('era')}>新增時期</button><button type="button" className="context-btn ghost" onClick={()=>add('work')}>新增作品</button></div><div className="culture-river-filters"><label>關鍵字濾鏡<select value={keywordFilter} onChange={event=>setKeywordFilter(event.target.value)}><option value="">全部關鍵字</option>{keywords.map(value=><option key={value}>{value}</option>)}</select></label><label>風格濾鏡<select value={styleFilter} onChange={event=>setStyleFilter(event.target.value)}><option value="">全部風格</option>{styles.map(value=><option key={value}>{value}</option>)}</select></label><label>作品濾鏡<select value={workFilter} onChange={event=>setWorkFilter(event.target.value)}><option value="">全部作品</option><option value="works">只看作品</option><option value="nonworks">排除作品</option></select></label><label>來源濾鏡<select value={sourceFilter} onChange={event=>setSourceFilter(event.target.value)}><option value="">全部來源</option>{filters.map(source=><option key={source}>{source}</option>)}</select></label><label>文字顯示<select value={displayMode} onChange={event=>setDisplayMode(event.target.value)}><option value="excerpt">摘要</option><option value="full">全文</option></select></label></div></div>
      {loading?<p className="scope-v2-status">載入 Culture SQL projection…</p>:null}
      {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
      <div ref={timelineRef} className="culture-river-timeline" aria-label="文化時間長河"/>
      {!loading&&!visible.length?<div className="culture-river-empty">目前 SQL projection 沒有可顯示資料。</div>:null}
    </ScopeCardV2>
    <div className="culture-river-summary"><span>{visible.length} 筆時間內容</span><span>{eras.length} 個時期</span><span>{filters.length} 種來源</span>{section?<span>目前 route：{section}</span>:null}</div>
    <div className="culture-river-reading">
      <section className="culture-river-reading-card"><p className="scope-v2-eyebrow">TIME UNITS</p><h3>時間統計</h3><p>統計是長河中的單位表達，不改寫軌跡文字。</p><div className="culture-river-stat-list">{dailyStats.slice(-30).map(row=><div key={row.date}><strong>{row.date}</strong><span>{row.total} 筆 · 作品 {row.works} · 事件 {row.events} · 軌跡 {row.trajectories} · 來源 {row.sources.size}</span></div>)}</div></section>
      <section className="culture-river-reading-card"><p className="scope-v2-eyebrow">TRAJECTORY NOTES</p><h3>軌跡紀錄</h3><p>軌跡是長河中的文字表達，保留事件、作品與時期轉折。</p><div className="culture-river-note-list">{trajectoryRows.slice(0,30).map(row=><article key={row.id}><div><strong>{row.title}</strong><span>{row.date} · {displayKind(row.kind)}{row.source?' · '+row.source:''}</span></div>{row.body?<p>{displayMode==='full'?row.body:(row.body.length>180?row.body.slice(0,180)+'…':row.body)}</p>:null}</article>)}</div></section>
    </div>
    <aside>{editor?<CultureEditor value={editor} onChange={setEditor} onSave={save} onDelete={remove} onClose={()=>setEditor(null)} saving={saving}/>:<div className="culture-river-editor"><h3>時間長河編輯器</h3><p>點擊長河上的時期、事件、軌跡或作品即可編輯。推薦作品不另建頁面，直接作為長河上的一種內容。</p></div>}</aside>
    {notice?<p className="scope-v2-status">{notice}</p>:null}
  </FeaturePageV2>;
}
