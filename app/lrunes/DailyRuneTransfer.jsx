'use client';

import {useEffect,useRef,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {dbAuthRelation} from '../loc/db-client.mjs';
import {selectAllRows} from '../loc/db-query.mjs';
import {listLocalDailyRunes,importLocalDailyTransfer} from './local-rune-sqlite.mjs';
import {
  DAILY_TRANSFER_MAX_BYTES,DAILY_TRANSFER_BATCH,makeDailyTransfer,parseDailyTransfer,planDailyTransfer
} from './daily-transfer-contract.mjs';

const FIELDS='record_date,draw_kind,rune_number,direction,recorded_phase';
const bytesOf=source=>new TextEncoder().encode(source);
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});

async function dailyRows(native){
  if(native)return listLocalDailyRunes();
  return (await selectAllRows('silver.lrunes_daily',{
    columns:FIELDS,orders:[{column:'record_date',ascending:true},{column:'draw_kind',ascending:true}]
  })).rows||[];
}
async function downloadJson(content,filename,native){
  if(native){
    const [{Filesystem,Directory},{Share}]=await Promise.all([
      import('@capacitor/filesystem'),import('@capacitor/share')
    ]);
    const bytes=bytesOf(content);
    let raw='';
    for(let p=0;p<bytes.length;p+=8192)
      raw+=String.fromCharCode(...bytes.subarray(p,p+8192));
    await Filesystem.writeFile({
      path:filename,directory:Directory.Cache,data:btoa(raw)
    });
    const {uri}=await Filesystem.getUri({path:filename,directory:Directory.Cache});
    if(!uri)throw new Error('無法取得 iOS 備份檔案位置。');
    await Share.share({title:'每日符文備份',url:uri,dialogTitle:'儲存或分享每日符文備份'});
    return '已開啟 iOS 檔案分享／儲存介面。';
  }
  const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');
  a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  return '已交給瀏覽器下載。';
}
export default function DailyRuneTransfer({cloudCanManage=false,onImported}={}){
  const input=useRef(null);
  const [native,setNative]=useState(false);
  const [busy,setBusy]=useState(false);
  const [preview,setPreview]=useState(null);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{setNative(Capacitor.isNativePlatform());},[]);
  const canImport=native||cloudCanManage;
  async function onExport(){
    if(!canImport||busy)return;
    setBusy(true);setMessage('');setError('');
    try{
      const rows=await dailyRows(native);
      const payload=JSON.stringify(makeDailyTransfer(rows),null,2);
      if(bytesOf(payload).length>DAILY_TRANSFER_MAX_BYTES)throw new Error('JSON 備份超過 24 MB 限制。');
      const result=await downloadJson(payload,'LunaRunes-Daily-'+today()+'.json',native);
      setMessage(result+' 共 '+rows.length+' 筆。來源：'+(native?'本機 SQLite':'網站 Supabase')+'。');
    }catch(e){setError('匯出失敗：'+String(e?.message||e));}
    finally{setBusy(false);}
  }
  async function onFile(event){
    const f=event.target.files?.[0];event.target.value='';
    if(!f||!canImport||busy)return;
    setBusy(true);setError('');setMessage('');setPreview(null);
    try{
      if(f.size>DAILY_TRANSFER_MAX_BYTES)throw new Error('匯入檔案超過 24 MB。');
      const text=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(await f.arrayBuffer())).replace(/^\uFEFF/,'');
      const incoming=parseDailyTransfer(text);
      const existing=await dailyRows(native);
      const plan=planDailyTransfer(incoming,existing);
      setPreview({name:f.name,plan});
      setMessage('已完成格式驗證與查重。請確認新增、重複與衝突筆數，尚未寫入。');
    }catch(e){setError('匯入預覽失敗：'+String(e?.message||e));}
    finally{setBusy(false);}
  }
  async function onCommit(){
    if(!preview||busy||!canImport)return;
    setBusy(true);setError('');setMessage('');
    try{
      let inserted=0;
      if(native){
        const result=await importLocalDailyTransfer(preview.plan.fresh);
        inserted=result.newCount;
      }else{
        for(let offset=0;offset<preview.plan.fresh.length;offset+=DAILY_TRANSFER_BATCH){
          const group=preview.plan.fresh.slice(offset,offset+DAILY_TRANSFER_BATCH).map(row=>({
            ...row,record_id:'transfer:'+row.record_date+':'+row.draw_kind
          }));
          // Supabase's unique (record_date, draw_kind) constraint is the final
          // idempotency guard; no update of existing rows is permitted.
          const {data,error}=await dbAuthRelation('silver.lrunes_daily')
            .upsert(group,{onConflict:'record_date,draw_kind',ignoreDuplicates:true})
            .select('record_date,draw_kind');
          if(error)throw new Error(error.message||'Supabase 分批寫入失敗');
          inserted+=(data||[]).length;
        }
      }
      setMessage((native?'本機 SQLite':'Supabase')+' 匯入完成：新增 '+inserted+' 筆；已存在 '+preview.plan.duplicateCount+
        ' 筆，衝突 '+preview.plan.conflictCount+' 筆保留原值。');
      setPreview(null);
      onImported?.();
    }catch(e){
      setError('匯入中斷，請重新選取原檔進行查重後續寫：'+String(e?.message||e));
    }finally{setBusy(false);}
  }
  if(!canImport)return null;
  return <section className="loc-card" aria-label="每日符文匯入及匯出">
    <h2>每日符文 · 匯入與匯出</h2>
    <p className="scope-settings-note">自動分流：{native?
      'iOS App 寫入此裝置本機 SQLite，絕不將匯入紀錄寫入 Supabase。':
      '網站依月之符文管理權限寫入 Supabase，絕不存入手機 Local File。'}
      兩邊共用相同 JSON 備份格式；相同日期與種類的紀錄不覆寫。</p>
    <div className="scope-stat-controls">
      <button className="loc-button" type="button" onClick={onExport} disabled={busy}>匯出每日符文</button>
      <button className="loc-button" type="button" onClick={()=>input.current?.click()} disabled={busy}>匯入每日符文</button>
      <input ref={input} type="file" hidden accept=".json,application/json" onChange={onFile} aria-label="選擇每日符文 JSON 備份"/>
    </div>
    {preview?<div className="scope-inline-card">
      <p><strong>{preview.name}</strong>　已辨識 {preview.plan.total} 筆，預定新增 {preview.plan.newCount} 筆，
        完全重複 {preview.plan.duplicateCount} 筆，內容衝突 {preview.plan.conflictCount} 筆。</p>
      <p>分批計畫：最多每批 {DAILY_TRANSFER_BATCH} 筆，共 {preview.plan.batches} 批。未確認前不寫入。</p>
      {preview.plan.conflicts.length?<details><summary>檢視衝突（不覆寫）</summary><p>{preview.plan.conflicts.slice(0,20).map(x=>x.key).join('、')}</p></details>:null}
      <button className="loc-button primary" type="button" disabled={busy} onClick={onCommit}>確認匯入</button>
      <button className="loc-button" type="button" disabled={busy} onClick={()=>setPreview(null)}>取消</button>
    </div>:null}
    {message?<p className="scope-status" role="status">{message}</p>:null}
    {error?<p className="scope-status scope-error" role="alert">{error}</p>:null}
  </section>;
}
