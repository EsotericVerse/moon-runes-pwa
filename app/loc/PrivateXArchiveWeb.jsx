'use client';

import {useEffect,useRef,useState} from 'react';
import {inspectPrivateArchive,ARCHIVE_MAX_BYTES} from './private-archive-universal.mjs';
import {
  openPrivateWebVault,createWebImport,stageWebRecords,removeWebDraft,
  confirmWebImport,queryWebRecords,listWebImports,deleteWebVault,
  planWebImport,persistWebPlan
} from './private-web-vault.mjs';

const n=value=>Number(value||0).toLocaleString('zh-TW');
const date=value=>value?new Date(value).toLocaleString('zh-TW'):'日期未辨識';
const reason=error=>String(error?.message||error||'未知錯誤');
export default function PrivateArchiveWeb(){
  const picker=useRef(null),activeController=useRef(null);
  const [db,setDb]=useState(null);
  const [busy,setBusy]=useState('');
  const [progress,setProgress]=useState(null);
  const [draft,setDraft]=useState(null);
  const [entries,setEntries]=useState({total:0,years:{},found:[]});
  const [history,setHistory]=useState([]);
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [confirmedPrivacy,setConfirmedPrivacy]=useState(false);
  const [confirmedText,setConfirmedText]=useState(false);
  const [clearArmed,setClearArmed]=useState(false);

  async function reload(localDb,term=''){
    const [rows,imports]=await Promise.all([queryWebRecords(localDb,term),listWebImports(localDb)]);
    setEntries(rows);setHistory(imports);
    setDraft(current=>current||imports.find(item=>item.state==='preview')||null);
  }
  useEffect(()=>{
    let alive=true;
    openPrivateWebVault().then(async localDb=>{
      if(!alive){localDb.close();return;}
      setDb(localDb);
      try{await reload(localDb);}catch(e){if(alive)setError('讀取本機資料失敗：'+reason(e));}
    }).catch(e=>{if(alive)setError('啟動本機資料庫失敗：'+reason(e));});
    return()=>{alive=false;};
  },[]);

  async function chooseFile(event){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file||!db||busy||draft)return;
    setError('');setStatus('');setProgress(null);setConfirmedText(false);
    if(file.size>ARCHIVE_MAX_BYTES){
      setError('選取檔案超過本版 2 GiB 安全限制；原始檔未修改。');return;
    }
    setBusy('解析與計算');const controller=new AbortController();activeController.current=controller;
    let id=null;const queued=[];
    try{
      id=await createWebImport(db,file.name||'未命名私人備份');
      const summary=await inspectPrivateArchive(file,{
        signal:controller.signal,
        onRecord:record=>queued.push(record),
        flush:async(force=false)=>{
          while(queued.length>=250||(force&&queued.length)){
            const chunk=queued.splice(0,250);
            await stageWebRecords(db,id,chunk);
          }
        },
        onProgress:detail=>setProgress({
          read:detail.bytesRead,size:file.size,rows:detail.totalRows
        })
      });
      // Scan local primary keys before any confirmed record is written.
      const plan=await planWebImport(db,id);
      await persistWebPlan(db,id,summary,plan);
      setDraft({id,name:file.name||'未命名檔',summary,plan,state:'preview'});
      await reload(db,query);
      setStatus('預掃描、查重與批次計算完成。尚未寫入正式紀錄，請確認設定與異常後再匯入。');
    }catch(e){
      if(id)try{await removeWebDraft(db,id);}catch(cleanErr){
        setError('匯入失敗，且暫存清理需要處理：'+reason(cleanErr));
      }
      setError(prev=>prev||'解析／預掃描失敗，未寫入正式紀錄：'+reason(e));
    }finally{
      activeController.current=null;setBusy('');setProgress(null);
    }
  }
  async function confirmImport(){
    if(!db||!draft||busy||!confirmedText)return;
    setBusy('分批寫入');setError('');setStatus('');
    try{
      const result=await confirmWebImport(db,draft.id,setProgress,draft.plan?.batchSize||100);
      setDraft(null);setConfirmedText(false);
      await reload(db,query);
      setStatus('本機寫入完成：新增 '+n(result.inserted)+' 筆，重複 '+n(result.duplicates)+' 筆略過，內容衝突 '+n(result.conflicts)+' 筆保持原狀。');
    }catch(e){setError('分批寫入中斷；原有紀錄不會覆寫，可重新確認續寫：'+reason(e));}
    finally{setBusy('');setProgress(null);}
  }
  async function discardDraft(){
    if(!db||!draft||busy)return;
    setBusy('刪除暫存');setError('');
    try{
      await removeWebDraft(db,draft.id);
      setDraft(null);setConfirmedText(false);
      await reload(db,query);setStatus('已移除未確認的本機暫存資料。');
    }catch(e){setError('移除暫存失敗：'+reason(e));}
    finally{setBusy('');}
  }
  async function search(e){
    e?.preventDefault();
    if(!db||busy)return;
    setBusy('搜尋');
    try{await reload(db,query);}catch(e){setError('本機搜尋失敗：'+reason(e));}
    finally{setBusy('');}
  }
  async function clearVault(){
    if(!clearArmed||!db||busy)return;
    setBusy('清除本機資料');setError('');
    try{
      await deleteWebVault(db);
      setDb(null);setDraft(null);setHistory([]);
      setEntries({total:0,years:{},found:[]});
      const reopened=await openPrivateWebVault();
      setDb(reopened);setClearArmed(false);
      setStatus('已清除本瀏覽器的私人匯入索引與所有已匯入紀錄。來源備份檔未修改。');
    }catch(e){setError('清除失敗：'+reason(e));}
    finally{setBusy('');}
  }
  const preview=draft?.summary,plan=draft?.plan;
  return <main className="scope-main">
    <section className="scope-page">
      <header className="loc-hero">
        <p className="loc-eyebrow">Private · Browser-only</p>
        <h1>私人備份共用匯入工作區</h1>
        <p>本機解析 X、Facebook、Instagram、Messenger、Threads 與可辨識通用文件，再共用查重、分批和搜尋流程。</p>
      </header>
      <div className="scope-content scope-settings-options">
        <section className="loc-card">
          <h2>匯入預設值</h2>
          <p>此工作區不連接 LOC 的 Supabase、Neon 或公開 Galaxy 匯入程序；不論是否登入，備份與衍生紀錄只存放在<strong>目前瀏覽器的 IndexedDB</strong>，不會跨設備同步。</p>
          <p className="scope-settings-note">重要：這是技術測試版，瀏覽器儲存<strong>尚未加密</strong>，清除網站資料後可能消失。刪除測試帳號不會自動刪除這台裝置的 IndexedDB，必須使用下方「清除全部本機資料」。請勿在公用電腦使用私人備份。</p>
          <table className="scope-table"><tbody>
            <tr><th>來源</th><td>X、Meta Facebook／Instagram／Messenger／Threads、一般 JSON／文字；自動識別可解析項目</td></tr>
            <tr><th>隱私</th><td>完全本機，不公開、不送遠端資料庫</td></tr>
            <tr><th>欄位</th><td>平台、紀錄類型、原生 ID／穩定複合 ID、時間、作者／發話者、文字、附件參照與原始 JSON 欄位</td></tr>
            <tr><th>去重</th><td>優先平台原生 ID；無原生 ID 的私訊以對話、時間、發話者、原文組合識別，不靠語意判重</td></tr>
            <tr><th>衝突</th><td>同 ID 但內容不同：跳過且報告，不覆寫</td></tr>
            <tr><th>亂碼</th><td>不自動修復；標示疑似異常，保留原文</td></tr>
            <tr><th>寫入</th><td>預先計數並分批；只在確認後執行</td></tr>
            <tr><th>未支援內容</th><td>未知 JSON 陣列逐筆保留原始欄位、標示「未映射」；無法安全解析的檔案與圖片／影片二進位媒體另列為未匯入</td></tr>
          </tbody></table>
          <label style={{display:'flex',gap:'0.6rem',alignItems:'flex-start'}}>
            <input type="checkbox" checked={confirmedPrivacy} onChange={event=>setConfirmedPrivacy(event.target.checked)}/>
            <span>我了解：這是未加密的瀏覽器本機測試，資料不會隨帳號刪除而自動清除。</span>
          </label>
          <div className="scope-stat-controls">
            <button type="button" className="loc-button primary" disabled={!confirmedPrivacy||!db||!!busy||!!draft} onClick={()=>picker.current?.click()}>
              選擇私人備份 ZIP／JSON／JS／TXT
            </button>
            {busy==='解析與計算'?<button type="button" className="loc-button" onClick={()=>activeController.current?.abort()}>取消解析</button>:null}
            <input ref={picker} type="file" hidden onChange={chooseFile} aria-label="選取本機 X 資料備份"/>
          </div>
          <p className="scope-settings-note">支援 X YTD、Meta Facebook／Instagram 貼文、Messenger／Instagram 私訊、Threads 常見 JSON 匯出、一般 JSON 與純文字（可無副檔名）。按內容及欄位辨識，不假定 Meta 每種匯出版本均相同。ZIP 內媒體檔目前只統計不保存；未辨識檔案明確列出。</p>
          {busy?<p role="status">目前作業：{busy}{progress?.size?'，已讀取 '+n(progress.read)+'／'+n(progress.size)+' bytes；已辨識 '+n(progress.rows)+' 筆':''}{progress?.inserted!==undefined?'，新增 '+n(progress.inserted)+' 筆':''}</p>:null}
        </section>
        {preview&&plan?<section className="loc-card">
          <h2>匯入前查重與批次計畫</h2>
          <p><strong>{draft.name}</strong> — 尚未正式寫入</p>
          <div className="scope-stat-controls">
            <span>掃描 {n(preview.totalRows)} 筆</span>
            <span>有效 {n(preview.acceptedRows)} 筆</span>
            <span>格式異常 {n(preview.rejectedRows)} 筆</span>
            <span>疑似亂碼 {n(preview.suspiciousRows)} 筆</span>
            <span>未映射的原始 JSON {n(preview.unmappedRows||0)} 筆</span>
          </div>
          <div className="scope-stat-controls">
            <span>本機候選 {n(plan.staged)} 筆</span>
            <span>準備新增 {n(plan.newCount)} 筆</span>
            <span>已存在 {n(plan.identical)} 筆</span>
            <span>同 ID 不同內容 {n(plan.conflicts)} 筆</span>
            <span>備份內同 ID 衝突 {n(plan.withinConflicts||0)} 筆</span>
            <span>備份內重複項目 {n(Math.max(0,preview.acceptedRows-plan.staged))} 筆</span>
          </div>
          <p>預估 <strong>{n(plan.batches)} 批</strong>；每批最多 {n(plan.batchSize)} 筆（按新增量自動調整）。單一路徑順序寫入，不開啟大量平行交易。</p>
          <p className="scope-settings-note">解析來源：{Object.entries(preview.byPlatform||{}).map(([platform,count])=>platform+' '+n(count)+' 筆').join('、')||'無'}。</p>
          <p className="scope-settings-note">辨識的資料檔：{preview.sourceFiles.slice(0,8).join('、')||'無'}{preview.sourceFiles.length>8?' 等 '+n(preview.sourceFiles.length)+' 檔':''}；未解析 ZIP 項目 {n(preview.otherFiles)} 個（其中媒體 {n(preview.mediaFiles)} 個）。</p>
          {preview.unrecognizedFiles?.length?<details>
            <summary>未辨識的檔案（不列入成功匯入）</summary>
            <ul>{preview.unrecognizedFiles.map((filename,i)=><li key={i}>{filename}</li>)}</ul>
          </details>:null}
          <h3>文字預覽（原文，不自動修正）</h3>
          {preview.sample.map((item,i)=><div key={i} className="scope-inline-card">
            <p className="scope-settings-note">{item.platform||'未知'} · {item.kind||'紀錄'} · {item.nativeId} · {date(item.createdAt)}</p>
            <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.text}</p>
          </div>)}
          {preview.problems.length?<details><summary>解析異常示例</summary>
            <ul>{preview.problems.map((item,i)=><li key={i}>{item}</li>)}</ul>
          </details>:null}
          <label style={{display:'flex',gap:'0.6rem',alignItems:'flex-start'}}>
            <input type="checkbox" checked={confirmedText} onChange={event=>setConfirmedText(event.target.checked)}/>
            <span>已核對來源、筆數、疑似亂碼、未映射原始 JSON 與未匯入媒體；同意只將新增資料寫入此瀏覽器，不修正原文、不覆寫既有紀錄。</span>
          </label>
          <div className="scope-stat-controls">
            <button className="loc-button primary" type="button" disabled={!!busy||!confirmedText||!confirmedPrivacy} onClick={confirmImport}>確認分批寫入本機</button>
            <button className="loc-button" type="button" disabled={!!busy} onClick={discardDraft}>取消並刪除暫存</button>
          </div>
        </section>:null}
        <section className="loc-card">
          <h2>已確認匯入的私人紀錄（{n(entries.total)} 筆）</h2>
          <form onSubmit={search} className="scope-stat-controls">
            <label>本機文字搜尋（跨來源）<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="關鍵字、中文內容"/></label>
            <button className="loc-button" type="submit" disabled={!db||!!busy}>搜尋／重新統計</button>
          </form>
          <p className="scope-settings-note">年度數量：{Object.entries(entries.years).sort(([a],[b])=>b.localeCompare(a)).slice(0,25).map(([y,c])=>y+' 年 '+n(c)+' 筆').join('；')||'尚無紀錄'}</p>
          {entries.found.map(item=><div key={item.key} className="scope-inline-card">
            <p className="scope-settings-note">{date(item.createdAt)} · {item.platform||'來源未知'} · {item.kind||'紀錄'} · {item.sourcePath}{item.suspectedMojibake?' · 疑似編碼異常':''}</p>
            <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.text}</p>
          </div>)}
          {entries.total>100?<p className="scope-settings-note">為避免載入過多內容，單次最多顯示 100 筆；年度總數仍由整份本機索引計算。</p>:null}
          <p className="scope-settings-note">已完成的私人匯入作業：{n(history.filter(h=>h.state==='complete').length)} 份。</p>
        </section>
        <section className="loc-card">
          <h2>結束臨時帳號測試前</h2>
          <p>清除這個瀏覽器中的私人備份解析資料。此操作不會刪除你持有的 原始備份檔，也不涉及遠端帳號或雲端資料庫。</p>
          <label style={{display:'flex',gap:'0.6rem',alignItems:'center'}}>
            <input type="checkbox" checked={clearArmed} onChange={event=>setClearArmed(event.target.checked)}/>
            <span>確認永久清除目前瀏覽器的所有本機測試紀錄</span>
          </label>
          <button type="button" className="loc-button" disabled={!db||!!busy||!clearArmed} onClick={clearVault}>清除全部本機資料</button>
        </section>
        {status?<p role="status" className="scope-status">{status}</p>:null}
        {error?<p role="alert" className="scope-status scope-error">{error}</p>:null}
      </div>
    </section>
  </main>;
}
