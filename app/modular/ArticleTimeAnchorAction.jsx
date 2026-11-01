'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {useAccount} from '../loc/use-account';
import {selectManagedScope} from '../loc/scope-data';
import {selectRows,DB_QUERY_BATCH_SIZE} from '../loc/db-query.mjs';
import {insertRows} from '../loc/db-client.mjs';
import {allocateTimeUid} from '../loc/time-anchor-ranges.mjs';

const validDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''));

async function findDateAnchor(table,date){
  const {rows=[]}=await selectRows(table,{
    columns:'uid,title,description,address',
    filters:[{column:'type',operator:'eq',value:'anchor'},{column:'address',operator:'eq',value:date}],
    limit:1,authenticated:true
  });
  return rows[0]||null;
}

async function allocateScopedTimeUid(table){
  const occupied=[];
  for(let offset=0;;offset+=DB_QUERY_BATCH_SIZE){
    const {rows=[]}=await selectRows(table,{
      columns:'uid',orders:[{column:'uid',ascending:true}],
      limit:DB_QUERY_BATCH_SIZE,offset,authenticated:true
    });
    occupied.push(...rows);
    if(rows.length<DB_QUERY_BATCH_SIZE)break;
  }
  return allocateTimeUid(occupied);
}

export default function ArticleTimeAnchorAction({scopeId='',date='',onCreated=null}){
  const account=useAccount({enabled:false});
  const dialogRef=useRef(null);
  const titleId=useId();
  const [checking,setChecking]=useState(false);
  const [saving,setSaving]=useState(false);
  const [open,setOpen]=useState(false);
  const [table,setTable]=useState('');
  const [description,setDescription]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    if(!open)return undefined;
    const dialog=dialogRef.current;
    if(dialog&&!dialog.open)dialog.showModal();
    return ()=>{if(dialog?.open)dialog.close();};
  },[open]);

  const close=()=>{
    if(saving)return;
    setOpen(false);
    setDescription('');
  };

  const begin=async()=>{
    if(checking||saving)return;
    setChecking(true);
    setError('');
    setNotice('');
    try{
      if(!validDay(date)||scopeId==='loc'||scopeId==='local')
        throw new Error('這篇文章沒有可用的時間定錨日期。');
      const verified=await account.refresh({forceVerify:true});
      if(!verified?.authorizer?.canManageScopeSync(scopeId))
        throw new Error('請先透過 Clerk 登入具有此 Scope 編輯權限的帳號。');
      const target=await selectManagedScope(scopeId);
      if(!target?.time)throw new Error('無法取得此 Scope 的時間資料表。');
      const existing=await findDateAnchor(target.time,date);
      if(existing){
        onCreated?.(existing);
        setNotice('此日期已有時間定錨，已沿用原有紀錄。');
        return;
      }
      setTable(target.time);
      setDescription('');
      setOpen(true);
    }catch(cause){
      setError(String(cause?.message||cause||'無法確認編輯權限。'));
    }finally{
      setChecking(false);
    }
  };

  const save=async event=>{
    event.preventDefault();
    if(saving)return;
    setSaving(true);
    setError('');
    try{
      const details=description.trim();
      if(!details)throw new Error('請先填寫時間定錨的敘述。');
      if(!validDay(date)||!table)throw new Error('定錨日期或資料表無效。');
      const existing=await findDateAnchor(table,date);
      if(existing){
        onCreated?.(existing);
        setNotice('此日期已有時間定錨，已沿用原有紀錄。');
      }else{
        const uid=await allocateScopedTimeUid(table);
        const record={uid,type:'anchor',title:date,description:details,
          address:date,anchor_ids:null,invisible:false};
        const result=await insertRows(table,[record]);
        if(result?.count!==1)throw new Error('新增時間定錨未確認成功。');
        onCreated?.(record);
        setNotice('已新增 '+date+' 的時間定錨。');
      }
      setOpen(false);
      setDescription('');
    }catch(cause){
      setError(String(cause?.message||cause||'新增時間定錨失敗。'));
    }finally{
      setSaving(false);
    }
  };

  return <>
    <button type="button" className="loc-button" disabled={checking||saving}
      onClick={begin}>{checking?'正在確認權限…':'新增時間定錨'}</button>
    {notice?<span className="scope-status" role="status">{notice}</span>:null}
    {!open&&error?<span className="scope-status scope-error" role="alert">{error}</span>:null}
    {open?<dialog ref={dialogRef} className="scope-edit-switch-dialog"
      aria-labelledby={titleId} onCancel={event=>{event.preventDefault();close();}}>
      <h2 id={titleId}>新增時間定錨</h2>
      <p className="scope-status">定錨日期：{date}</p>
      <form className="scope-editor" onSubmit={save}>
        <label>敘述
          <textarea className="scope-input" value={description} rows={4}
            maxLength={4000} autoFocus required disabled={saving}
            onChange={event=>setDescription(event.target.value)}
            placeholder="寫下這個日期的重要事件或意義"/>
        </label>
        {error?<p className="scope-status scope-error" role="alert">{error}</p>:null}
        <div className="scope-edit-switch-actions">
          <button type="submit" className="loc-button" disabled={saving||!description.trim()}>
            {saving?'正在新增…':'確認新增'}
          </button>
          <button type="button" className="loc-button" onClick={close} disabled={saving}>取消</button>
        </div>
      </form>
    </dialog>:null}
  </>;
}
