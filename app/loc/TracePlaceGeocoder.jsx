'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {executePublicRead} from './db-query.mjs';
import {useAsyncResource} from './use-async-resource';
import {useAccount} from './use-account';
import {traceKey,readTraceData,addTraceAnchorsBatch,validRadius} from '../modular/features/trace/trace-data';

const STORAGE_PREFIX='loc-trace-geocode-v1:';
const PAGE_SIZE=12;
const QUERY_PAGE=1000;
const MIN_SEARCH_GAP_MS=1250;

const normalized=value=>String(value||'').normalize('NFKC').toLowerCase()
  .replace(/[（(]\s*(台灣|臺灣)\s*[）)]/g,'')
  .replace(/[\s\u3000、，,.。()（）\-－_]/g,'');
const validDateOrNumber=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));

function readCache(id){
  try{
    const value=JSON.parse(localStorage.getItem(STORAGE_PREFIX+id)||'{}');
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }catch{return {};}
}
function writeCache(id,value){
  try{localStorage.setItem(STORAGE_PREFIX+id,JSON.stringify(value));}catch{/* Storage is optional. */}
}
function geographyChoices(payload,name){
  const source=Array.isArray(payload)?payload:[];
  const choices=source.filter(item=>validDateOrNumber(item.lon)&&validDateOrNumber(item.lat))
    .slice(0,4).map(item=>({
      longitude:Number(item.lon),latitude:Number(item.lat),
      label:String(item.display_name||item.name||name).slice(0,240),
      title:String(item.namedetails?.name||item.name||item.display_name?.split(',')[0]||'').trim()
    }));
  const exact=choices.map((item,index)=>normalized(item.title)===normalized(name)?index:-1).filter(i=>i>=0);
  return {choices,selected:exact.length===1?exact[0]:-1,status:!choices.length?'notfound':exact.length===1?'ready':'review'};
}

// Public reads transfer only non-empty check-in names; never load 30k article bodies.
async function readCheckinNames(table){
  const frequencies=new Map();
  for(let offset=0;offset<200000;offset+=QUERY_PAGE){
    const {data,error}=await executePublicRead(table,relation=>relation
      .select('source_place')
      .not('source_place','is',null)
      .neq('source_place','')
      .order('uid',{ascending:true})
      .range(offset,offset+QUERY_PAGE-1));
    if(error)throw Error(error.message||'打卡地點查詢失敗');
    const rows=data||[];
    for(const row of rows){
      const name=String(row.source_place||'').trim();
      if(name)frequencies.set(name,(frequencies.get(name)||0)+1);
    }
    if(rows.length<QUERY_PAGE)break;
    if(offset+QUERY_PAGE>=200000)throw Error('打卡地點過多，請縮小批次。');
  }
  return [...frequencies].map(([name,count])=>({name,count}))
    .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-Hant'));
}

function previewEnds(rows){
  if(rows.length<=6)return rows;
  return [...rows.slice(0,3),{name:'… 中間省略 '+(rows.length-6)+' 處'},...rows.slice(-3)];
}

export default function TracePlaceGeocoder({scopeId}){
  const account=useAccount();
  const authorized=account.canManageScopeSync(scopeId);
  const scope=account.scopeDataFor(scopeId);
  const table=scope?.galaxy||'';
  const places=useAsyncResource(['trace-checkin-names',scopeId,table],
    ()=>readCheckinNames(table),{enabled:authorized&&Boolean(table),
      revalidateOnFocus:false,revalidateOnReconnect:false});
  const traces=useAsyncResource(traceKey(scopeId),()=>readTraceData(scopeId),
    {enabled:authorized,revalidateOnFocus:false,revalidateOnReconnect:false});
  const [found,setFound]=useState({});
  const foundRef=useRef(found);
  foundRef.current=found;
  const [filter,setFilter]=useState('all');
  const [page,setPage]=useState(0);
  const [running,setRunning]=useState(false);
  const [policyAccepted,setPolicyAccepted]=useState(false);
  const [radius,setRadius]=useState('500');
  const [saving,setSaving]=useState(false);
  const [processed,setProcessed]=useState(0);
  const [notice,setNotice]=useState('');
  const [failure,setFailure]=useState('');
  const stopRef=useRef(false);
  const busyRef=useRef(false);
  const requestRef=useRef(null);
  const lastRequestRef=useRef(0);
  useEffect(()=>{
    const next=readCache(scopeId);
    foundRef.current=next;setFound(next);setPage(0);
    return ()=>{
      stopRef.current=true;
      requestRef.current?.abort();
    };
  },[scopeId]);
  const remember=(name,item)=>{
    const next={...foundRef.current,[name]:item};
    foundRef.current=next;
    setFound(next);
    writeCache(scopeId,next);
  };
  const already=new Set((traces.data?.anchors||[])
    .filter(item=>item.source_scope===scopeId)
    .map(item=>String(item.title||'').trim()));
  const all=places.data||[];
  const pending=useMemo(()=>all.filter(item=>!already.has(item.name)),
    [places.data,traces.data,scopeId]);
  const ready=pending.filter(item=>{
    const result=found[item.name];
    return result?.status==='ready'&&result.choices?.[result.selected];
  });
  const unresolved=pending.filter(item=>found[item.name]?.status==='review');
  const missing=pending.filter(item=>found[item.name]?.status==='notfound');
  const visible=filter==='ready'?ready:filter==='review'?unresolved:filter==='missing'?missing:pending;
  const pages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE));
  const currentPage=Math.min(page,pages-1);
  const rows=visible.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
  const total=all.reduce((sum,item)=>sum+item.count,0);

  async function lookUp(name){
    const now=Date.now();
    const pause=Math.max(0,MIN_SEARCH_GAP_MS-(now-lastRequestRef.current));
    if(pause)await new Promise(resolve=>setTimeout(resolve,pause));
    if(stopRef.current)return null;
    lastRequestRef.current=Date.now();
    const abort=new AbortController();
    requestRef.current=abort;
    try{
      const params=new URLSearchParams({
        q:name,format:'jsonv2',limit:'4',namedetails:'1',addressdetails:'1',
        'accept-language':'zh-TW,zh,en'
      });
      const response=await fetch('https://nominatim.openstreetmap.org/search?'+params,{
        signal:abort.signal,headers:{Accept:'application/json'}
      });
      if(!response.ok)throw Error('地理服務 HTTP '+response.status);
      return geographyChoices(await response.json(),name);
    }finally{
      if(requestRef.current===abort)requestRef.current=null;
    }
  }
  async function lookupMany(names){
    if(busyRef.current||saving||!policyAccepted)return;
    busyRef.current=true;stopRef.current=false;setRunning(true);
    setFailure('');setNotice('');setProcessed(0);
    let completed=0;
    try{
      for(const name of names){
        if(stopRef.current)break;
        const result=await lookUp(name);
        if(!result)break;
        remember(name,result);
        completed+=1;setProcessed(completed);
      }
      setNotice('本次已查詢 '+completed+' 處。只有名稱高度吻合的候選會預選，其餘必須人工確認。');
    }catch(error){
      if(!stopRef.current)setFailure('查詢已停止：'+String(error.message||error)+'。既有結果已保存在本機，可續查。');
    }finally{busyRef.current=false;setRunning(false);}
  }
  const searchNext=()=>lookupMany(pending
    .filter(item=>!foundRef.current[item.name])
    .map(item=>item.name).slice(0,20));
  const searchAll=()=>lookupMany(pending
    .filter(item=>!foundRef.current[item.name])
    .map(item=>item.name));
  const choose=(name,value)=>{
    const old=foundRef.current[name];
    if(!old?.choices?.[value])return;
    remember(name,{...old,selected:value,status:'ready'});
  };
  async function saveReady(){
    if(running||saving||!ready.length)return;
    if(!validRadius(radius)){setFailure('搜尋半徑請設定為 10 公尺至 20,000 公里。');return;}
    const payload=ready.map(item=>({
      title:item.name,
      longitude:found[item.name].choices[found[item.name].selected].longitude,
      latitude:found[item.name].choices[found[item.name].selected].latitude,
      radius_m:Number(radius)
    }));
    const names=previewEnds(payload).map(item=>item.name).join('\n');
    if(!window.confirm('即將在 '+scopeId+' 新增 '+payload.length+' 個空間定錨點，半徑 '+radius+' 公尺，保留 Galaxy 原本的打卡名稱與文章內容。\n\n'+names+'\n\n確定寫入？'))return;
    setSaving(true);setFailure('');setNotice('');
    try{
      const result=await addTraceAnchorsBatch({scopeId,places:payload});
      await traces.mutate();
      setNotice('已新增 '+result.count+' 個空間定錨點；略過已存在地點 '+result.skipped+' 個。');
    }catch(error){
      await traces.mutate().catch(()=>{});
      setFailure(String(error.message||error));
    }finally{setSaving(false);}
  }

  if(!authorized)return <p className="scope-status">需要此 Scope 的管理權限。</p>;
  return <section className="loc-card scope-feature-card">
    <h3>打卡地點 → 空間定錨點</h3>
    <p className="scope-status">從 Galaxy 既有的 source_place 去重，搜尋經緯度並建立同名空間定錨點。只讀取打卡地點名稱，不變更任何 Galaxy 文章。地理位置來自 OpenStreetMap Nominatim，候選可能不完整或有同名地點。</p>
    {places.isPending||traces.isPending?<p role="status" className="scope-status">正在讀取打卡名稱與現有定錨點…</p>:null}
    {places.error||traces.error?<p role="alert" className="scope-status scope-error">{String(places.error?.message||traces.error?.message||'')}</p>:null}
    {!places.isPending&&!traces.isPending&&!places.error&&!traces.error?<>
      <p className="scope-status">
        共 {total} 筆打卡、{all.length} 種名稱；現有定錨點已涵蓋 {all.length-pending.length} 種。
        待定位 {pending.length} 種，其中可儲存 {ready.length} 種、待核對 {unresolved.length} 種、無結果 {missing.length} 種。
      </p>
      <label className="scope-setting-toggle">
        <input type="checkbox" checked={policyAccepted} onChange={event=>setPolicyAccepted(event.target.checked)}/>
        <span>我了解查詢會將打卡地點名稱傳送至公開 Nominatim，並已閱讀 <a href="https://operations.osmfoundation.org/policies/nominatim/" target="_blank" rel="noopener noreferrer">其使用政策</a>。這是單一使用者發起、可停止並快取結果的一次性整理，不適合做為大量用戶的長期批次服務。</span>
      </label>
      <div className="scope-management-fields"><label>批次定錨的涵蓋半徑（公尺）<input type="number" min={10} max={20000000} step={10} value={radius} onChange={event=>setRadius(event.target.value)} disabled={running||saving}/></label></div>
      <div className="scope-stat-controls">
        <button className="loc-button" type="button" disabled={!policyAccepted||running||saving||!pending.some(item=>!found[item.name])} onClick={searchNext}>查詢接下來 20 處</button>
        <button className="loc-button" type="button" disabled={!policyAccepted||running||saving||!pending.some(item=>!found[item.name])} onClick={searchAll}>查詢其餘地點</button>
        {running?<button className="loc-button" type="button" onClick={()=>{stopRef.current=true;requestRef.current?.abort()}}>停止</button>:null}
        <button className="loc-button primary" type="button" disabled={running||saving||!ready.length||!validRadius(radius)} onClick={saveReady}>{saving?'儲存中…':'確認並批次儲存 '+ready.length+' 處'}</button>
      </div>
      <p role="status" className="scope-status">
        {running?'已完成本次 '+processed+' 處；可停止並從本機快取續查。':'每次按鈕操作才查詢，不會在開啟頁面時自動查位置。'}
      </p>
      <div className="scope-stat-controls">
        <label>顯示
          <select className="scope-select" value={filter} disabled={running||saving}
            onChange={e=>{setFilter(e.target.value);setPage(0)}}>
            <option value="all">尚未建立的地點</option>
            <option value="ready">有可儲存座標</option>
            <option value="review">待核對候選</option>
            <option value="missing">無搜尋結果</option>
          </select>
        </label>
      </div>
      <div className="loc-trace-place-review">
        {rows.map(item=>{
          const result=found[item.name];
          return <div key={item.name} className="scope-publisher-panel">
            <strong>{item.name}</strong> <span className="scope-status">（{item.count} 篇）</span>
            {result?.status==='ready'?<p className="scope-status">已選位置：{result.choices[result.selected]?.label}（{result.choices[result.selected]?.latitude}, {result.choices[result.selected]?.longitude}）</p>:null}
            {result?.status==='review'?<p className="scope-status">同名或相似候選，請核對位置再選取：</p>:null}
            {result?.status==='notfound'?<p className="scope-status">沒有找到。可在一般空間定錨點頁面改用地圖手動選取。</p>:null}
            {Boolean(result?.choices?.length)?<label>候選位置
              <select className="scope-select" value={result.selected>=0?String(result.selected):''}
                disabled={running||saving} onChange={e=>{if(e.target.value!=='')choose(item.name,Number(e.target.value));}}>
                <option value="">請確認位置</option>
                {result.choices.map((candidate,i)=><option key={i} value={i}>{candidate.label}</option>)}
              </select>
            </label>:null}
            {!result||result.status==='notfound'?<button type="button" className="loc-button"
              disabled={!policyAccepted||running||saving} onClick={()=>lookupMany([item.name])}>查詢這個地點</button>:null}
          </div>;
        })}
        {!rows.length?<p className="scope-status">沒有符合目前條件的地點。</p>:null}
      </div>
      {pages>1?<div className="scope-stat-controls">
        <button type="button" className="loc-button" disabled={currentPage===0} onClick={()=>setPage(Math.max(0,currentPage-1))}>上一頁</button>
        <span className="scope-status">{currentPage+1} / {pages}</span>
        <button type="button" className="loc-button" disabled={currentPage===pages-1} onClick={()=>setPage(Math.min(pages-1,currentPage+1))}>下一頁</button>
      </div>:null}
      <p className="scope-status">地理資料 © OpenStreetMap contributors。查詢結果會儲存在目前裝置以避免重複請求；真正的定錨點只在按下「確認並批次儲存」後寫入。服務限制單一序列低頻請求；開放大量使用者時應改用可受控的專用地理編碼服務。</p>
      {notice?<p role="status" className="scope-status">{notice}</p>:null}
      {failure?<p role="alert" className="scope-status scope-error">{failure}</p>:null}
    </>:null}
  </section>;
}
