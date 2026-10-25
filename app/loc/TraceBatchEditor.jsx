'use client';

import {useEffect,useRef,useState} from 'react';
import {addTraceAnchorsBatch,validRadius} from '../modular/features/trace/trace-data';
import {exactTracePlaceMatch,searchTracePlaces} from '../modular/features/trace/trace-geocoding';

// Galaxy keeps its original source_place strings. Only confirmed spatial anchors
// are inserted here, with the same authorized Scope writes used by the editor.
export default function TraceBatchEditor({scopeId,places=[],existing=[],radius='500',reload,onPreview}){
  const [candidates,setCandidates]=useState({});
  const [working,setWorking]=useState(false);
  const [writing,setWriting]=useState(false);
  const [message,setMessage]=useState('');
  const [progress,setProgress]=useState({done:0,total:0});
  const stop=useRef(false);
  useEffect(()=>()=>{stop.current=true;},[]);
  const savedNames=new Set(existing.filter(item=>item.source_scope===scopeId)
    .map(item=>String(item.title||'').trim()));
  const missing=places.filter(item=>item?.name&&!savedNames.has(String(item.name).trim()));
  const entries=Object.entries(candidates).filter(([name])=>!savedNames.has(name));
  const confirmed=entries.flatMap(([name,row])=>{
    const hit=row.hits?.[row.chosen];
    return hit?[{title:name,longitude:hit.longitude,latitude:hit.latitude,radius_m:Number(radius)}]:[];
  });
  async function lookup(){
    if(working||writing)return;
    const next=missing.filter(item=>!Object.hasOwn(candidates,item.name)).slice(0,40);
    if(!next.length){setMessage('已查完目前待處理的候選，或沒有需要新增的打卡地點。');return;}
    stop.current=false;setWorking(true);setMessage('');setProgress({done:0,total:next.length});
    let done=0;
    try{
      for(const item of next){
        if(stop.current)break;
        try{
          const hits=await searchTracePlaces(item.name);
          if(stop.current)break;
          setCandidates(prev=>({...prev,[item.name]:{hits,chosen:-1,error:''}}));
        }catch(error){
          if(stop.current)break;
          const detail=String(error?.message||error);
          setCandidates(prev=>({...prev,[item.name]:{hits:[],chosen:-1,error:detail}}));
          if(/429|403|Failed to fetch|NetworkError/i.test(detail)){
            setMessage('免費地名服務暫時限流或網路中斷，已停止批次查詢。');
            break;
          }
        }
        done+=1;setProgress({done,total:next.length});
      }
    }finally{setWorking(false);}
  }
  async function save(){
    if(working||writing||!confirmed.length)return;
    if(!validRadius(radius)){setMessage('請先設定有效的涵蓋半徑（10 公尺至 20,000 公里）。');return;}
    setWriting(true);setMessage('');
    try{
      const result=await addTraceAnchorsBatch({scopeId,places:confirmed});
      await reload();
      const names=new Set(confirmed.map(item=>item.title));
      setCandidates(prev=>Object.fromEntries(Object.entries(prev).filter(([name])=>!names.has(name))));
      setMessage('成功寫入 '+result.count+' 個空間定錨點；略過已有的 '+result.skipped+' 個。');
    }catch(error){setMessage(String(error?.message||error));}
    finally{setWriting(false);}
  }
  return <div className="loc-trace-batch-area">
    <h4>大量已知打卡位置補齊</h4>
    <p className="scope-status">從 Galaxy 現有 source_place 去重，一次查詢最多 40 個不同地點。查到候選後請核對，再按批次寫入；不會改動原始打卡紀錄。</p>
    <p className="scope-status">尚未建立定錨：{missing.length} 處；已查詢：{entries.length} 處；已確認：{confirmed.length} 處。</p>
    <div className="scope-stat-controls">
      <button className="loc-button" type="button" disabled={working||writing||!missing.length} onClick={lookup}>查詢下一批地點</button>
      {working?<button className="loc-button" type="button" onClick={()=>{stop.current=true;}}>停止查詢</button>:null}
      <button className="loc-button" type="button" disabled={working||writing||!entries.length}
        onClick={()=>setCandidates(prev=>Object.fromEntries(Object.entries(prev).map(([name,item])=>[
          name,{...item,chosen:item.hits?.length===1&&exactTracePlaceMatch(name,item.hits[0])?0:item.chosen}
        ])))}>確認唯一且完全同名的候選</button>
      <button className="loc-button primary" type="button" disabled={working||writing||!confirmed.length||!validRadius(radius)}
        onClick={save}>批次儲存已確認的 {confirmed.length} 處</button>
    </div>
    {working?<p className="scope-status" role="status">查詢進度：{progress.done}／{progress.total}（逐筆低頻查詢，結果會快取）。</p>:null}
    {message?<p className="scope-status" role="status">{message}</p>:null}
    {entries.length?<div className="loc-trace-batch-results" role="group" aria-label="打卡位置候選核對">
      {entries.map(([name,item])=><div className="loc-trace-batch-row" key={name}>
        <span>{name}</span>
        <select aria-label={name+' 的候選地點'} value={item.chosen} disabled={writing||!item.hits?.length}
          onChange={event=>{
            const chosen=Number(event.target.value);
            setCandidates(prev=>({...prev,[name]:{...prev[name],chosen}}));
            if(item.hits[chosen])onPreview?.({...item.hits[chosen],name,radius_m:Number(radius)||500});
          }}>
          <option value={-1}>{item.error||(!item.hits?.length?'無符合候選':'尚未確認')}</option>
          {(item.hits||[]).map((hit,i)=><option key={i} value={i}>{hit.label}</option>)}
        </select>
        {item.hits?.length?<button className="loc-button" type="button"
          onClick={()=>onPreview?.({...item.hits[Math.max(0,item.chosen)],name,radius_m:Number(radius)||500})}>地圖預覽</button>:null}
      </div>)}
    </div>:null}
    <p className="scope-status">地名查詢使用免費 Photon（OpenStreetMap 資料），只在按下查詢後送出地名。免費公共服務可能限流或停止供應；同名商家、模糊地名必須人工核對。</p>
  </div>;
}
