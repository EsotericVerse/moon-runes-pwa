'use client';

import {useMemo,useRef,useState} from 'react';
import {dbAuthClient} from './db-client.mjs';
import {readAllTraceAnchors} from '../modular/features/trace/trace-data';
import {useAsyncResource,useResourceCache} from './use-async-resource';
import {revalidateServerMetadata} from './scope-data';
import {timelineVisitWindows,matchTimelineWindows,accumulateTimelineArticles,groupTimelineMissingPlaces} from './timeline-place-matcher.mjs';

const WINDOW_BATCH=40,RESULT_PAGE=750,WRITE_BATCH=150;
const friendlyError=e=>String(e?.message||e||'未知錯誤');
function checked(result,label){
  if(result.error)throw Error(label+'：'+result.error.message);
  return result.data;
}
export default function TimelinePlaceManager({scopeId}){
  const [selectedFile,setSelectedFile]=useState(null);
  const [analyzing,setAnalyzing]=useState(false);
  const [writing,setWriting]=useState(false);
  const [progress,setProgress]=useState(null);
  const [analysis,setAnalysis]=useState(null);
  const [groupChoices,setGroupChoices]=useState({});
  const [itemChoices,setItemChoices]=useState({});
  const [excluded,setExcluded]=useState({});
  const [groupPages,setGroupPages]=useState({});
  const [page,setPage]=useState(0);
  const [notice,setNotice]=useState('');
  const runRef=useRef(0);
  const fileRef=useRef(null);
  const cache=useResourceCache();
  const enabled=['lo3rwang','lrunes'].includes(scopeId);
  const anchorQuery=useAsyncResource(['timeline-place-anchors-owner',scopeId],()=>{
    return readAllTraceAnchors(scopeId,{includeHidden:true});
  },{enabled,revalidateOnFocus:false,revalidateOnReconnect:false});
  const eligible=useMemo(()=>(anchorQuery.data||[]).filter(row=>
    row.trace_type==='space_anchor'&&Array.isArray(row.address)&&row.address.length===2
    &&row.address.every(v=>v!==null&&v!==undefined&&Number.isFinite(Number(v)))),[anchorQuery.data]);
  function reset(){
    runRef.current++;
    setSelectedFile(null);setAnalysis(null);setGroupChoices({});setItemChoices({});setExcluded({});setGroupPages({});setProgress(null);setNotice('');setPage(0);
    if(fileRef.current)fileRef.current.value='';
  }
  async function analyze(){
    if(!enabled||!selectedFile||analyzing||writing||anchorQuery.isPending)return;
    if(!eligible.length){setNotice('目前沒有具有座標的空間定錨點，因此沒有可補寫的 place_id。');return;}
    const run=++runRef.current;
    setAnalyzing(true);setAnalysis(null);setGroupChoices({});setItemChoices({});setExcluded({});setGroupPages({});setPage(0);setNotice('');
    try{
      if(selectedFile.size>200*1024*1024)throw Error('Timeline JSON 超過 200 MB，請按年度拆分後匯入');
      setProgress({done:0,total:0,message:'正在本機讀取 Timeline JSON…'});
      const document=JSON.parse(await selectedFile.text());
      if(run!==runRef.current)return;
      const visits=timelineVisitWindows(document);
      if(!visits.length)throw Error('這份 JSON 沒有可辨識的造訪地點與時間（行車軌跡不會自動當成打卡）');
      const matched=matchTimelineWindows(visits,eligible);
      const windows=matched.windows;
      if(!windows.length){
        setAnalysis({ready:[],disputes:[],unchanged:[],visitCount:visits.length,
          empty:matched.withoutAnchor,ambiguous:0,articleCount:0});
        setNotice('沒有任何 Timeline 造訪點落在既有空間定錨點 500 公尺內；不更新文章。');
        return;
      }
      const articleMatches=[],byIndex=new Map(windows.map(w=>[w.index,w]));
      const total=Math.ceil(windows.length/WINDOW_BATCH);
      for(let i=0;i<windows.length;i+=WINDOW_BATCH){
        if(run!==runRef.current)return;
        const batch=windows.slice(i,i+WINDOW_BATCH).map(w=>({
          index:w.index,start_time:w.from,end_time:w.to
        }));
        let offset=0;
        while(true){
          if(run!==runRef.current)return;
          const result=await dbAuthClient.schema('silver').rpc('preview_timeline_missing_place_windows',{
            p_scope_id:scopeId,p_windows:batch,p_limit:RESULT_PAGE,p_offset:offset
          });
          const rows=checked(result,'查詢 Galaxy 文章時間');
          for(const row of rows||[])articleMatches.push({
            uid:row.article_uid,title:row.article_title,createtime:row.article_time,
            place_id:row.existing_place_id,window:byIndex.get(row.window_index)
          });
          if(articleMatches.length>250000)throw Error('候選文章超過 250,000 篇，請縮小 Timeline 年度');
          if((rows||[]).length<RESULT_PAGE)break;
          offset+=RESULT_PAGE;
          if(offset>100000)throw Error('單批造訪對照超過查詢上限，請按年度拆分 JSON');
        }
        setProgress({done:Math.floor(i/WINDOW_BATCH)+1,total,
          message:'比對 Galaxy 文章時間與定錨點…'});
      }
      if(run!==runRef.current)return;
      const classified=accumulateTimelineArticles(articleMatches);
      setAnalysis({...classified,visitCount:visits.length,empty:matched.withoutAnchor,
        ambiguous:matched.ambiguousWindows,articleCount:classified.ready.length+
        classified.disputes.length+classified.unchanged.length});
      setNotice('已完成空白打卡地點預覽。相同經緯度集中列出；請選擇位置並檢查不同樓層，確認前不寫入。');
    }catch(e){
      if(run===runRef.current)setNotice('地點比對失敗：'+friendlyError(e));
    }finally{if(run===runRef.current)setAnalyzing(false);}
  }
  const reviewGroups=useMemo(()=>groupTimelineMissingPlaces(analysis),[analysis]);
  // Every article starts checked; the group and per-article selectors decide its place.
  const selectedUpdates=useMemo(()=>reviewGroups.flatMap(group=>group.rows.flatMap(row=>{
    if(excluded[row.uid])return [];
    const placeId=itemChoices[row.uid]||(groupChoices[group.key]??group.defaultPlaceId);
    if(!placeId||!row.candidates.some(candidate=>candidate.uid===placeId))return [];
    // A pre-existing place_id is authoritative. Never overwrite a different ID.
    if(row.existingPlaceId&&row.existingPlaceId!==placeId)return [];
    return [{uid:row.uid,place_id:placeId,expected_place_id:row.existingPlaceId||null,manual:true}];
  })),[reviewGroups,groupChoices,itemChoices,excluded]);
  const canWrite=selectedUpdates.length>0;
  const selectGroup=(group,selected)=>setExcluded(current=>{
    const next={...current};
    for(const row of group.rows){
      if(selected)delete next[row.uid];
      else next[row.uid]=true;
    }
    return next;
  });
  async function apply(){
    if(!analysis||!canWrite||writing||analyzing)return;
    const updates=selectedUpdates;
    if(!window.confirm('確認補寫 '+updates.length+' 篇 Galaxy 文章空白的 source_place，並補齊缺少的 place_id？\\n\\n'
      +'只處理已勾選且地點有效的文章；已有打卡文字絕不覆寫。\\n'
      +'原有不同的 place_id 不會被覆寫，Timeline 原始資料也不會儲存。'))return;
    setWriting(true);setNotice('');let completed=0;
    try{
      for(let i=0;i<updates.length;i+=WRITE_BATCH){
        const batch=updates.slice(i,i+WRITE_BATCH);
        const result=await dbAuthClient.schema('silver').rpc('apply_timeline_missing_places',{
          p_scope_id:scopeId,p_updates:batch
        });
        completed+=Number(checked(result,'批次寫入 place_id')||0);
        setNotice('已寫入 '+completed+' / '+updates.length+' 篇…');
      }
      // Keep unresolved disputes on screen after writing the definite rows.
      // The user can decide them later without re-importing private Timeline JSON.
      const resolved=new Set(updates.map(row=>row.uid));
      setAnalysis(previous=>previous?{...previous,
        ready:previous.ready.filter(row=>!resolved.has(row.uid)),
        disputes:previous.disputes.filter(row=>!resolved.has(row.uid)),
        unchanged:[...previous.unchanged,...previous.ready.filter(row=>resolved.has(row.uid)),
          ...previous.disputes.filter(row=>resolved.has(row.uid))]}:null);
      setGroupChoices({});setItemChoices({});setExcluded({});setGroupPages({});
      setPage(0);
      await revalidateServerMetadata();
      await Promise.allSettled([
        cache.invalidate({queryKey:['scope-trace',scopeId]}),
        cache.invalidate({queryKey:['trace-current',scopeId]}),
        cache.invalidate({queryKey:['loc-place-summary',scopeId]})
      ]);
      setNotice('已補寫 '+completed+' 篇原本空白的 source_place，並補齊需要的 place_id；既有打卡文字保持不變。');
    }catch(e){
      setNotice('已完成 '+completed+' 篇，其餘未寫入。'+friendlyError(e)+'。請重新預覽再寫入，避免覆蓋其他編輯。');
      setAnalysis(null);setGroupChoices({});setItemChoices({});setExcluded({});setGroupPages({});
    }finally{setWriting(false);}
  }
  if(!enabled)return <p className="scope-status">請先選擇個別 Scope，LOC 不執行跨 Scope 的行蹤比對。</p>;
  return <section className="loc-card scope-feature-card" aria-label="Google Timeline 地點整理">
    <h3>地點整理 · Google Timeline</h3>
    <p className="scope-status">Timeline JSON 只在瀏覽器記憶體解析。以文章時間比對 500 公尺內既有定錨點，只列出 source_place 尚未填寫的文章；同座標集中審查樓層或不同店家。最後只補寫空白打卡地點與缺少的 place_id，不儲存私人行蹤。</p>
    <div className="scope-management-fields">
      <label>選擇 Google Timeline JSON
        <input ref={fileRef} type="file" accept=".json,application/json" disabled={analyzing||writing}
          onChange={e=>{const file=e.currentTarget.files?.[0]||null;
            runRef.current++;setAnalysis(null);setGroupChoices({});setItemChoices({});setExcluded({});setGroupPages({});setProgress(null);setNotice('');setPage(0);
            setSelectedFile(file);
          }}/>
      </label>
      <p className="scope-status">可比對空間定錨點：{eligible.length.toLocaleString()}；只辨識造訪地點，移動路線不直接視為文章的確定位置。</p>
    </div>
    {anchorQuery.error?<p role="alert" className="scope-status scope-error">讀取定錨點失敗：{friendlyError(anchorQuery.error)}</p>:null}
    <div className="scope-stat-controls">
      <button type="button" className="loc-button" disabled={!selectedFile||analyzing||writing||anchorQuery.isPending||Boolean(anchorQuery.error)}
        onClick={analyze}>{analyzing?'比對中…':'分析 JSON 並預覽'}</button>
      <button type="button" className="loc-button" disabled={writing} onClick={reset}>清除暫存／重新選檔</button>
      {analyzing?<button type="button" className="loc-button" onClick={()=>{
        runRef.current++;setAnalyzing(false);setNotice('已取消分析，尚未寫入任何資料。');
      }}>取消分析</button>:null}
    </div>
    {progress&&analyzing?<p role="status" className="scope-status">{progress.message} {progress.total?progress.done+' / '+progress.total+' 批':''}</p>:null}
    {analysis?<section className="scope-card">
      <h4>匹配預覽（尚未寫入）</h4>
      <p className="scope-status">Timeline 造訪區間：{analysis.visitCount.toLocaleString()}；
        500 公尺外／無定錨點：{analysis.empty.toLocaleString()}；
        候選有歧義的造訪區間：{analysis.ambiguous.toLocaleString()}。</p>
      <p className="scope-status">待補打卡文章：{(ready.length+analysis.disputes.length).toLocaleString()} 篇；
        同座標審查群組：{reviewGroups.length.toLocaleString()} 組；
        其中有歧義文章 {analysis.disputes.length.toLocaleString()} 篇。
        已有 source_place 的文章不列入也不會更新。</p>
      {reviewGroups.length>0?<div>
        <h4>按經緯度分組審查 · 預設全勾選</h4>
        <p className="scope-status">每組選擇一次既有空間定錨點，也可以逐篇改選其他樓層。所有文章預設勾選，但沒有選定地點、存在不同 place_id 或跨座標的文章不會自動寫入。</p>
        {reviewGroups.slice(page*10,(page+1)*10).map(group=>{
          const chosen=groupChoices[group.key]??group.defaultPlaceId;
          const groupPage=groupPages[group.key]||0;
          const checkedCount=group.rows.filter(row=>!excluded[row.uid]).length;
          return <details key={group.key} className="scope-card">
            <summary>{group.key.startsWith('point:')?'座標 '+group.coordinates[0]:'多個座標／須逐篇確認'} · {group.rows.length.toLocaleString()} 篇 · 已勾 {checkedCount.toLocaleString()} 篇</summary>
            <div className="scope-stat-controls">
              <button type="button" className="loc-button" disabled={writing} onClick={()=>selectGroup(group,true)}>全選這組</button>
              <button type="button" className="loc-button" disabled={writing} onClick={()=>selectGroup(group,false)}>取消這組全選</button>
            </div>
            <label>這組文章預設的定錨點（可逐篇覆蓋）
              <select className="scope-select" disabled={writing} value={chosen}
                onChange={e=>setGroupChoices(current=>({...current,[group.key]:e.target.value}))}>
                <option value="">尚未選擇 · 全部暫不寫入</option>
                {group.candidates.map(c=><option key={c.uid} value={c.uid}>{c.title} · 約 {c.meters} 公尺（{c.uid}）</option>)}
              </select>
            </label>
            <div role="group" aria-label="這組文章勾選清單">
              {group.rows.slice(groupPage*50,(groupPage+1)*50).map(row=>{
                const selected=itemChoices[row.uid]||chosen;
                const valid=Boolean(selected&&row.candidates.some(c=>c.uid===selected)&&
                  (!row.existingPlaceId||row.existingPlaceId===selected));
                return <div key={row.uid} className="scope-management-fields">
                  <label>
                    <input type="checkbox" disabled={writing} checked={!excluded[row.uid]}
                      onChange={e=>setExcluded(current=>({...current,[row.uid]:!e.target.checked}))}/>
                    {String(row.createtime||'').slice(0,16)||'時間不明'} · {row.title||'未命名文章'}（{row.uid}）
                  </label>
                  <label>單篇地點／樓層（可選）
                    <select className="scope-select" disabled={writing} value={itemChoices[row.uid]||''}
                      onChange={e=>setItemChoices(current=>({...current,[row.uid]:e.target.value}))}>
                      <option value="">沿用這組設定</option>
                      {row.candidates.map(c=><option key={c.uid} value={c.uid}>{c.title}（{c.uid}）</option>)}
                    </select>
                  </label>
                  {row.existingPlaceId?<p className="scope-status">既有 place_id：{row.existingPlaceId}（只可補打卡名稱，不覆寫既有 ID）</p>:null}
                  {row.reason?<p className="scope-status">{row.reason}</p>:null}
                  {!valid?<p className="scope-status">這篇尚未符合寫入條件，不會寫入。</p>:null}
                </div>;
              })}
            </div>
            {group.rows.length>50?<div className="scope-stat-controls">
              <button type="button" className="loc-button" disabled={groupPage===0||writing}
                onClick={()=>setGroupPages(current=>({...current,[group.key]:groupPage-1}))}>上一頁</button>
              <span>{groupPage+1} / {Math.ceil(group.rows.length/50)} 頁</span>
              <button type="button" className="loc-button" disabled={(groupPage+1)*50>=group.rows.length||writing}
                onClick={()=>setGroupPages(current=>({...current,[group.key]:groupPage+1}))}>下一頁</button>
            </div>:null}
          </details>;
        })}
        {reviewGroups.length>10?<div className="scope-stat-controls">
          <button type="button" className="loc-button" disabled={page===0||writing}
            onClick={()=>setPage(x=>x-1)}>上一組</button>
          <span>群組 {page+1} / {Math.ceil(reviewGroups.length/10)} 頁</span>
          <button type="button" className="loc-button" disabled={(page+1)*10>=reviewGroups.length||writing}
            onClick={()=>setPage(x=>x+1)}>下一組</button>
        </div>:null}
      </div>:null}
      <p className="scope-status">準備補寫空白打卡地點：{selectedUpdates.length.toLocaleString()} 篇；未勾選或尚有歧義者跳過。</p>
      <button type="button" className="loc-button primary" disabled={!canWrite||writing||analyzing}
        onClick={apply}>{writing?'正在批次寫入…':'確認批次補寫 source_place／place_id'}</button>
    </section>:null}
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}
