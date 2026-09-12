'use client';

import { useEffect, useMemo, useState } from 'react';
import { googleDriveConfigured, loadJsonFromGoogleDrive, saveJsonToGoogleDrive } from '../google-drive';
import { deleteLocalRecord, downloadJsonFile, getLocalRecords, putLocalRecord, readJsonFile } from '../local-db';
import { useLocalStore } from '../local-store';
import { classifyRecords } from '../model/style-classifier';
import { createLibraryRecord, INITIAL_STYLE_PROFILE, LIBRARY_RECORD_TYPE, STYLE_STORAGE_KEY } from '../model/style-profile';

const DRIVE_FILE='loc-library.json';
const byNewest=(a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));

export default function LibraryView(){
  const {value:profile}=useLocalStore(STYLE_STORAGE_KEY,INITIAL_STYLE_PROFILE);
  const [records,setRecords]=useState([]);
  const [query,setQuery]=useState('');
  const [group,setGroup]=useState('');
  const [message,setMessage]=useState('');
  const [progress,setProgress]=useState(null);
  const driveReady=googleDriveConfigured();

  async function reload(){
    const rows=await getLocalRecords(LIBRARY_RECORD_TYPE);
    setRecords(rows.sort(byNewest));
  }
  useEffect(()=>{reload()},[]);

  const groups=useMemo(()=>{
    const names=new Set();
    records.forEach(record=>record.classification?.matches?.forEach(match=>names.add(match.name)));
    return [...names].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
  },[records]);

  const filtered=useMemo(()=>records.filter(record=>{
    const q=query.trim().toLowerCase();
    const textMatch=!q||`${record.title||''}\n${record.text||''}\n${record.source||''}`.toLowerCase().includes(q);
    const groupMatch=!group||record.classification?.matches?.some(match=>match.name===group);
    return textMatch&&groupMatch;
  }),[records,query,group]);

  async function remove(id){
    await deleteLocalRecord(id);
    await reload();
    setMessage('已從本機 Library 刪除。');
  }

  async function reclassify(mode='all'){
    const targets=mode==='missing'?records.filter(record=>!record.classification):records;
    setProgress({processed:0,total:targets.length,percent:targets.length?0:100});
    const classified=await classifyRecords(targets,profile,{getText:item=>item.text,onProgress:setProgress});
    for(const item of classified)await putLocalRecord({...item,updated_at:new Date().toISOString()});
    await reload();
    setMessage(`重新分類完成：${classified.length} 筆。`);
  }

  async function storeRows(data,sourceName='import'){
    const rows=Array.isArray(data)?data:Array.isArray(data?.records)?data.records:[];
    if(!rows.length)throw new Error('找不到 records 陣列');
    let count=0;
    for(const raw of rows){
      const record=raw?.type===LIBRARY_RECORD_TYPE&&raw?.id
        ?{...raw,type:LIBRARY_RECORD_TYPE,updated_at:new Date().toISOString()}
        :createLibraryRecord({title:raw?.title,text:raw?.text??raw?.content,source:raw?.source||sourceName,classification:raw?.classification||null});
      if(!record.text)continue;
      await putLocalRecord(record);count+=1;
    }
    await reload();
    return count;
  }

  async function importJson(event){
    const file=event.target.files?.[0];
    if(!file)return;
    try{
      const count=await storeRows(await readJsonFile(file),`import:${file.name}`);
      setMessage(`已匯入 ${count} 筆 Library 資料。`);
    }catch(error){setMessage(`匯入失敗：${error.message}`);}
    event.target.value='';
  }

  async function saveDrive(){
    try{await saveJsonToGoogleDrive(DRIVE_FILE,{version:1,records});setMessage(`已備份 ${records.length} 筆到自己的 Google Drive。`)}
    catch(error){setMessage(`Google Drive 備份失敗：${error.message}`)}
  }
  async function loadDrive(){
    try{const count=await storeRows(await loadJsonFromGoogleDrive(DRIVE_FILE),'google-drive');setMessage(`已從自己的 Google Drive 讀回 ${count} 筆。`)}
    catch(error){setMessage(`Google Drive 讀取失敗：${error.message}`)}
  }

  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">Local Library</p>
      <h1>Library</h1>
      <p>原始文字與分類結果都存在瀏覽器 IndexedDB。修改群組規則後，可重新分類而不改寫原始文字；Google Drive 只在手動備份／讀回時使用。</p>
    </header>

    <section className="loc-card">
      <div className="loc-actions">
        <a className="loc-button primary" href="/classify">＋新增／分類文字</a>
        <button className="loc-button" onClick={()=>downloadJsonFile({version:1,records},DRIVE_FILE)} disabled={!records.length}>匯出 JSON</button>
        <label className="loc-button">匯入 JSON<input className="loc-hidden-input" type="file" accept="application/json,.json" onChange={importJson}/></label>
        <button className="loc-button" onClick={saveDrive} disabled={!driveReady||!records.length}>備份到 Google Drive</button>
        <button className="loc-button" onClick={loadDrive} disabled={!driveReady}>從 Google Drive 讀回</button>
        <button className="loc-button" onClick={()=>reclassify('missing')} disabled={!records.length}>分類未分類資料</button>
        <button className="loc-button" onClick={()=>reclassify('all')} disabled={!records.length}>重新分類全部</button>
      </div>
      <div className="loc-metrics"><div><small>Library</small><strong>{records.length}</strong></div><div><small>目前顯示</small><strong>{filtered.length}</strong></div><div><small>已分類</small><strong>{records.filter(r=>r.classification).length}</strong></div></div>
      {progress&&<div className="loc-progress"><progress value={progress.processed} max={Math.max(progress.total,1)}/><span>{progress.processed} / {progress.total} · {progress.percent}%</span></div>}
      <p className="loc-status">{driveReady?'Google Drive OAuth 已可用；不做背景同步。':'Google Drive OAuth 尚未設定 client ID；本機功能不受影響。'}</p>
      {message&&<p className="loc-status">{message}</p>}
    </section>

    <section className="loc-card">
      <div className="loc-filter-row">
        <select value={group} onChange={e=>setGroup(e.target.value)}><option value="">全部群組</option>{groups.map(name=><option key={name} value={name}>{name}</option>)}</select>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋標題、內容或來源"/>
      </div>
    </section>

    <div className="loc-context-list">
      {!filtered.length&&<section className="loc-card"><p className="loc-status">Library 目前沒有符合條件的資料。</p></section>}
      {filtered.map(record=><article className="loc-card loc-library-record" key={record.id}>
        <div className="loc-result-meta"><span>{record.source||'manual'} · {record.created_at?.slice(0,10)||''}</span><button className="loc-button" onClick={()=>remove(record.id)}>刪除</button></div>
        <h2>{record.title}</h2>
        <p className="loc-library-snippet">{record.text?.slice(0,500)}{record.text?.length>500?'…':''}</p>
        <div className="loc-chip-list">{record.classification?.matches?.map(match=><span key={`${record.id}-${match.id}`}>{match.name}{match.hits?.length?` · ${match.hits.join('、')}`:' · fallback'}</span>)||<span>尚未分類</span>}</div>
      </article>)}
    </div>
  </section>;
}
