'use client';

import {useMemo,useRef,useState} from 'react';
import {dbAuthClient} from './db-client.mjs';
import {readAllTraceAnchors} from '../modular/features/trace/trace-data';
import {useAsyncResource,useResourceCache} from './use-async-resource';
import {revalidateServerMetadata} from './scope-data';
import {timelineVisitWindows,matchTimelineWindows,accumulateTimelineArticles} from './timeline-place-matcher.mjs';

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
  const [decisions,setDecisions]=useState({});
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
    setSelectedFile(null);setAnalysis(null);setDecisions({});setProgress(null);setNotice('');setPage(0);
    if(fileRef.current)fileRef.current.value='';
  }
  async function analyze(){
    if(!enabled||!selectedFile||analyzing||writing||anchorQuery.isPending)return;
    if(!eligible.length){setNotice('目前沒有具有座標的空間定錨點，因此沒有可補寫的 place_id。');return;}
    const run=++runRef.current;
    setAnalyzing(true);setAnalysis(null);setDecisions({});setPage(0);setNotice('');
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
          const result=await dbAuthClient.schema('silver').rpc('preview_timeline_place_windows',{
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
      setNotice('已完成預覽。確定項目不會立即寫入；糾紛點要由管理者選擇，無候選位置留空。');
    }catch(e){
      if(run===runRef.current)setNotice('地點比對失敗：'+friendlyError(e));
    }finally{if(run===runRef.current)setAnalyzing(false);}
  }
  const manualChanges=useMemo(()=>analysis?.disputes.filter(row=>
    (row.candidates||[]).some(candidate=>candidate.uid===decisions[row.uid])
    &&decisions[row.uid]!==row.existingPlaceId)||[],[analysis,decisions]);
  const ready=analysis?.ready||[];
  const canWrite=Boolean(ready.length||manualChanges.length);
  async function apply(){
    if(!analysis||!canWrite||writing||analyzing)return;
    const updates=[
      ...ready.map(row=>({uid:row.uid,place_id:row.placeId,expected_place_id:null,manual:false})),
      ...manualChanges.map(row=>({uid:row.uid,place_id:decisions[row.uid],
        expected_place_id:row.existingPlaceId||null,manual:true}))
    ];
    if(!window.confirm('確認補寫 '+updates.length+' 篇 Galaxy 文章的 place_id？\n\n'
      +'自動確定 '+ready.length+' 篇、人工裁定 '+manualChanges.length+' 篇。\n'
      +'source_place、文章內容、時間定錨與 Timeline 行蹤都不會修改。'))return;
    setWriting(true);setNotice('');let completed=0;
    try{
      for(let i=0;i<updates.length;i+=WRITE_BATCH){
        const batch=updates.slice(i,i+WRITE_BATCH);
        const result=await dbAuthClient.schema('silver').rpc('apply_timeline_place_ids',{
          p_scope_id:scopeId,p_updates:batch
        });
        completed+=Number(checked(result,'批次寫入 place_id')||0);
        setNotice('已寫入 '+completed+' / '+updates.length+' 篇…');
      }
      setAnalysis(null);setDecisions({});
      await revalidateServerMetadata();
      await Promise.allSettled([
        cache.invalidate({queryKey:['scope-trace',scopeId]}),
        cache.invalidate({queryKey:['trace-current',scopeId]}),
        cache.invalidate({queryKey:['loc-place-summary',scopeId]})
      ]);
      setNotice('已成功補寫 '+completed+' 篇文章的 place_id；source_place 完全沒有改動。');
    }catch(e){
      setNotice('已完成 '+completed+' 篇，其餘未寫入。'+friendlyError(e)+'。請重新選擇 JSON 並執行預覽，避免重複更新。');
      setAnalysis(null);setDecisions({});
    }finally{setWriting(false);}
  }
  if(!enabled)return <p className="scope-status">請先選擇個別 Scope，LOC 不執行跨 Scope 的行蹤比對。</p>;
  return <section className="loc-card scope-feature-card" aria-label="Google Timeline 地點整理">
    <h3>地點整理 · Google Timeline</h3>
    <p className="scope-status">只在這個管理頁的瀏覽器記憶體解析 Timeline JSON。按文章 createtime 對應造訪時間，搜尋 500 公尺內既有空間定錨點（包含管理者的隱藏項目）。只補寫 place_id；不比對 Facebook，不使用時間定錨，不儲存私人路徑。</p>
    <div className="scope-management-fields">
      <label>選擇 Google Timeline JSON
        <input ref={fileRef} type="file" accept=".json,application/json" disabled={analyzing||writing}
          onChange={e=>{reset();setSelectedFile(e.currentTarget.files?.[0]||null);}}/>
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
      <p className="scope-status">文章：確定可補 ID {ready.length.toLocaleString()} 篇，
        糾紛點 {analysis.disputes.length.toLocaleString()} 篇，
        已有相同 ID {analysis.unchanged.length.toLocaleString()} 篇。
        其他沒有時間或位置交集的文章維持原狀。</p>
      {analysis.disputes.length>0?<div>
        <h4>糾紛點處理 · 管理者逐筆裁定</h4>
        <p className="scope-status">全部預設跳過；只有明確選定才會在確認時寫入。文章清單不展示地點資訊，候選位置僅在展開裁定選項後顯示。</p>
        {analysis.disputes.slice(page*50,(page+1)*50).map(row=>
          <details key={row.uid} className="scope-card">
            <summary>{row.createtime?.slice(0,16)||'時間不明'} · {row.title||'未命名文章'}（{row.uid}）</summary>
            <p className="scope-status">{row.reason}</p>
            <label>糾紛點裁定
              <select className="scope-select" disabled={writing} value={decisions[row.uid]||''}
                onChange={e=>setDecisions(current=>({...current,[row.uid]:e.target.value}))}>
                <option value="">維持原狀／不更新</option>
                {row.candidates.map(c=><option key={c.uid} value={c.uid}>
                  {c.title} · 約 {c.meters} 公尺
                </option>)}
              </select>
            </label>
          </details>
        )}
        <div className="scope-stat-controls">
          <button type="button" className="loc-button" disabled={page<=0}
            onClick={()=>setPage(x=>x-1)}>上一頁</button>
          <span>{page+1} / {Math.ceil(analysis.disputes.length/50)} 頁</span>
          <button type="button" className="loc-button" disabled={(page+1)*50>=analysis.disputes.length}
            onClick={()=>setPage(x=>x+1)}>下一頁</button>
        </div>
      </div>:null}
      <p className="scope-status">準備寫入：確定 {ready.length.toLocaleString()} 篇＋人工裁定 {manualChanges.length.toLocaleString()} 篇。</p>
      <button type="button" className="loc-button primary" disabled={!canWrite||writing||analyzing}
        onClick={apply}>{writing?'正在批次寫入…':'確認並大量補寫 place_id'}</button>
    </section>:null}
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}
