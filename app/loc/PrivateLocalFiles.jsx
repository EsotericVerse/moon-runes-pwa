'use client';

import {useEffect,useRef,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {createPrivateLocalStore,isTextPrivateFile,privateFilePath,PRIVATE_FILE_MAX_BYTES} from './private-local-files.mjs';

const byteLabel=size=>{
  if(!Number.isFinite(size))return '未知大小';
  if(size<1024)return size+' B';
  if(size<1024*1024)return (size/1024).toFixed(1)+' KB';
  return (size/(1024*1024)).toFixed(1)+' MB';
};
const privateNative=()=>Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios';
const readableDate=value=>value?new Date(value).toLocaleString('zh-TW'):'未知日期';

export default function PrivateLocalFiles(){
  const picker=useRef(null);
  const [native,setNative]=useState(false);
  const [store,setStore]=useState(null);
  const [entries,setEntries]=useState([]);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [progress,setProgress]=useState(null);
  const [pendingDelete,setPendingDelete]=useState('');
  const [preview,setPreview]=useState(null);
  const [encoding,setEncoding]=useState('auto');

  useEffect(()=>{
    const supported=privateNative();
    setNative(supported);
    if(!supported)return;
    let active=true;
    (async()=>{
      try{
        const {Filesystem,Directory}=await import('@capacitor/filesystem');
        if(!Directory.LibraryNoCloud)throw new Error('此版本的原生 Filesystem 不支援無雲端備份目錄。');
        const storage=createPrivateLocalStore(Filesystem,Directory.LibraryNoCloud);
        const files=await storage.list();
        if(active){setStore(storage);setEntries(files);}
      }catch(e){if(active)setError('本機檔案庫啟動失敗：'+String(e?.message||e));}
    })();
    return()=>{active=false;};
  },[]);

  if(!native)return null;

  async function chooseFiles(event){
    const files=Array.from(event.target.files||[]);
    event.target.value='';
    if(!files.length||busy||!store)return;
    setBusy(true);setError('');setStatus('');setProgress(null);setPreview(null);setPendingDelete('');
    let completed=0;
    const failures=[];
    try{
      for(const file of files){
        if(file.size>PRIVATE_FILE_MAX_BYTES){
          failures.push(file.name+'：單檔超過 512 MB');continue;
        }
        try{
          await store.importFile(file,(written,total)=>setProgress({
            name:file.name,written,total,completed,count:files.length
          }));
          completed++;
        }catch(e){failures.push(file.name+'：'+String(e?.message||e));}
      }
      setEntries(await store.list());
      window.dispatchEvent(new CustomEvent('loc-private-file-changed'));
      setStatus('已將 '+completed+'／'+files.length+' 份原始檔案保存於這支 iPhone；沒有上傳到 Supabase、Neon 或網站。');
      if(failures.length)setError(failures.join('；'));
    }catch(e){setError('檔案清單更新失敗：'+String(e?.message||e));}
    finally{setProgress(null);setBusy(false);}
  }

  async function showText(entry,nextEncoding='auto'){
    if(busy||!store)return;
    setBusy(true);setStatus('');setError('');
    try{
      const text=await store.preview(entry.id,nextEncoding);
      setEncoding(nextEncoding);
      setPreview({id:entry.id,name:entry.name,text});
    }catch(e){setPreview(null);setError('本機預覽失敗：'+String(e?.message||e));}
    finally{setBusy(false);}
  }

  async function openWithIOS(entry){
    if(busy||!store)return;
    setBusy(true);setError('');setStatus('');setPreview(null);
    let copyPath='';
    try{
      // An explicit user action only. A temporary Cache copy gives the iOS
      // share/open sheet the original extension instead of the opaque .bin name.
      const [{Filesystem,Directory},{Share}]=await Promise.all([
        import('@capacitor/filesystem'),import('@capacitor/share')
      ]);
      const base='loc-private-file-share';
      const cleanName=entry.name.replace(/[\\/\u0000-\u001f:]/g,'_').slice(0,180)||'private-file';
      copyPath=base+'/'+entry.id+'/'+cleanName;
      await Filesystem.mkdir({path:base+'/'+entry.id,directory:Directory.Cache,recursive:true});
      await Filesystem.copy({
        from:privateFilePath(entry.id),directory:Directory.LibraryNoCloud,
        to:copyPath,toDirectory:Directory.Cache
      });
      const {uri}=await Filesystem.getUri({path:copyPath,directory:Directory.Cache});
      if(!uri)throw new Error('無法取得本機分享檔案。');
      await Share.share({title:entry.name,url:uri,dialogTitle:'開啟或另存私人檔案'});
      setStatus('已交給 iOS 開啟／分享選單；只有你選擇的目標會收到檔案。');
    }catch(e){setError('開啟／分享失敗：'+String(e?.message||e));}
    finally{
      if(copyPath){
        try{
          const {Filesystem,Directory}=await import('@capacitor/filesystem');
          await Filesystem.deleteFile({path:copyPath,directory:Directory.Cache});
        }catch{/* Temporary cache may be cleared by iOS. */}
      }
      setBusy(false);
    }
  }

  async function remove(entry){
    if(busy||!store)return;
    if(pendingDelete!==entry.id){setPendingDelete(entry.id);setPreview(null);return;}
    setBusy(true);setError('');setStatus('');
    try{
      await store.remove(entry.id);
      setEntries(await store.list());
      window.dispatchEvent(new CustomEvent('loc-private-file-changed'));
      setPendingDelete('');
      setPreview(null);
      setStatus('已從這支裝置刪除「'+entry.name+'」，不影響原先在 iOS 檔案 App 的來源檔。');
    }catch(e){setError('刪除失敗：'+String(e?.message||e));}
    finally{setBusy(false);}
  }

  return <section className="loc-card" aria-labelledby="loc-private-files-heading">
    <h2 id="loc-private-files-heading">私人 Local File（僅此 iPhone）</h2>
    <p className="scope-settings-note">不需登入。從 iOS「檔案」選取原始檔，完整複製到 App 專屬的 LibraryNoCloud 儲存區；不進入 Galaxy、Supabase、Neon、公開搜尋或任何網路 API。此功能與管理頁的雲端 JSON 匯入完全不同。</p>
    <p className="scope-settings-note">每檔上限 512 MB；不要求特定檔名或副檔名，會檢查檔案開頭的位元組與資料結構，顯示可能格式及文字編碼。這只是本機辨識提示，尚不會把 MSN 對話拆成訊息、人物或時間軸。所有類型仍原樣保存。App 卸載時本機資料可能一併消失；不會自動雲端備份。若選擇「開啟／分享」，你可以自行決定是否交給其他 App 或儲存至 iCloud。</p>
    <div className="scope-stat-controls">
      <button type="button" className="loc-button primary" onClick={()=>picker.current?.click()} disabled={busy||!store}>選擇本機檔案匯入</button>
      <button type="button" className="loc-button" onClick={async()=>{
        if(busy||!store)return;
        setBusy(true);setError('');
        try{setEntries(await store.list());setStatus('已重新載入此 iPhone 的本機檔案清單。');}
        catch(e){setError('更新清單失敗：'+String(e?.message||e));}
        finally{setBusy(false);}
      }} disabled={busy||!store}>重新整理清單</button>
      <input ref={picker} hidden type="file" multiple onChange={chooseFiles} aria-label="選取要保存在 iPhone 的本機檔案"/>
    </div>
    {!store&&!error?<p className="scope-settings-note" role="status">正在開啟本機檔案庫…</p>:null}
    {progress?<p role="status" className="scope-settings-note">正在儲存 {progress.name}：{byteLabel(progress.written)}／{byteLabel(progress.total)}（已完成 {progress.completed}／{progress.count} 檔）</p>:null}
    {status?<p role="status" className="scope-status">{status}</p>:null}
    {error?<p role="alert" className="scope-status scope-error">{error}</p>:null}
    <h3>已保存在此裝置（{entries.length}）</h3>
    {store&&!entries.length?<p className="scope-settings-note">目前沒有保存的本機檔案。</p>:null}
    {entries.map(entry=><div key={entry.id} className="scope-inline-card">
      <strong style={{overflowWrap:'anywhere'}}>{entry.name}</strong>
      <p className="scope-settings-note">{byteLabel(entry.size)} · 匯入 {readableDate(entry.importedAt)}{entry.lastModified?' · 原始修改 '+readableDate(entry.lastModified):''}</p>
      {entry.detection?<p className="scope-settings-note">內容辨識：{entry.detection.label}（{entry.detection.certainty==='high'?'特徵明確':entry.detection.certainty==='medium'?'初步符合':'未確認'}）{entry.detection.encoding?' · 建議編碼 '+entry.detection.encoding:''}。{entry.detection.reason}</p>:<p className="scope-settings-note">舊版匯入資料：尚未進行內容辨識，原始檔保留不變。</p>}
      <div className="scope-stat-controls">
        {isTextPrivateFile(entry)?<button type="button" className="loc-button" onClick={()=>showText(entry)} disabled={busy}>文字預覽</button>:null}
        <button type="button" className="loc-button" onClick={()=>openWithIOS(entry)} disabled={busy}>開啟／分享</button>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>remove(entry)}>
          {pendingDelete===entry.id?'確認永久刪除':'刪除本機副本'}
        </button>
        {pendingDelete===entry.id?<button type="button" className="loc-button" onClick={()=>setPendingDelete('')} disabled={busy}>取消</button>:null}
      </div>
      {preview?.id===entry.id?<div>
        <label>文字編碼
          <select className="scope-select" value={encoding} onChange={event=>{
            const value=event.target.value;
            setEncoding(value);
            showText(entry,value);
          }} disabled={busy}>
            <option value="auto">自動（依內容辨識）</option>
            <option value="utf-8">UTF-8</option>
            <option value="big5">Big5（繁中舊資料）</option>
            <option value="utf-16le">UTF-16 LE</option>
            <option value="utf-16be">UTF-16 BE</option>
          </select>
        </label>
        <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'24rem',overflowY:'auto'}}>{preview.text}</pre>
        <button type="button" className="loc-button" onClick={()=>setPreview(null)}>關閉預覽</button>
      </div>:null}
    </div>)}
  </section>;
}
