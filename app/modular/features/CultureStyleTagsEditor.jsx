'use client';

import {useEffect,useMemo,useState} from 'react';
import {deleteRows,insertRows,updateRows} from '../../loc/db-client.mjs';

// Each style_comment row owns exactly ONE label, ONE TEXT description, and
// ONE existing anchor ID. A period never owns a comma-separated tag collection.
function anchorName(row){
  return [String(row?.start_date||'').slice(0,10),String(row?.display_label||row?.title||row?.resource_id||'')]
    .filter(Boolean).join('｜');
}
function normalize(value){return String(value||'').trim().normalize('NFKC').toLocaleLowerCase('zh-Hant');}
export default function CultureStyleTagsEditor({
  period,styles=[],anchors=[],scopeId,table,canEdit=false,onSaved=null,selectedStyleRecordId='',selectedStyleRequestNonce=0
}){
  const [mode,setMode]=useState('view');
  const [recordId,setRecordId]=useState('');
  const [label,setLabel]=useState('');
  const [description,setDescription]=useState('');
  const [anchorId,setAnchorId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const availableAnchors=useMemo(()=>anchors
    .filter(row=>row?.entry_type==='anchor'&&row?.resource_id)
    .sort((a,b)=>String(a.start_date||'').localeCompare(String(b.start_date||''))),[anchors]);
  const anchorsById=useMemo(()=>new Map(availableAnchors.map(a=>[String(a.resource_id),a])),[availableAnchors]);
  // Style comments are independent of work periods. A style's chosen anchor
  // can be decades before/after the currently selected work-classification
  // period, so this editor must always allow editing all Scope styles.
  const visibleStyles=useMemo(()=>[...styles]
    .filter(row=>row?.status!=='needs_anchor'||canEdit)
    .sort((a,b)=>String(a.label||'').localeCompare(String(b.label||''),'zh-Hant')),[styles,canEdit]);
  function reset(){
    setMode('view');setRecordId('');setLabel('');setDescription('');setAnchorId('');setMessage('');
  }
  useEffect(()=>{reset();},[scopeId]);
  useEffect(()=>{
    if(!selectedStyleRecordId)return;
    const record=styles.find(item=>String(item.record_id||'')===String(selectedStyleRecordId));
    if(record)edit(record);
  },[selectedStyleRecordId,selectedStyleRequestNonce,styles]);
  function add(){
    setRecordId('');setLabel('');setDescription('');setAnchorId('');setMessage('');setMode('create');
  }
  function edit(row){
    setRecordId(String(row.record_id||''));
    setLabel(String(row.label||''));
    setDescription(String(row.style_description||''));
    setAnchorId(String(row.anchor_id||row.anchor_ids?.[0]||''));
    setMessage('');setMode('edit');
  }
  async function save(event){
    event.preventDefault();
    if(!canEdit||busy||!table)return;
    const name=label.trim(),body=description.trim();
    if(!name||!body){setMessage('每一個風格標籤都需要自己的名稱及完整敘述。');return;}
    if(!anchorId||!anchorsById.has(anchorId)){setMessage('每一個風格標籤必須選擇一個既有正式定錨點。');return;}
    if(styles.some(row=>String(row.record_id||'')!==recordId&&normalize(row.label)===normalize(name))){
      setMessage('此 Scope 已存在同名風格，每個風格名稱只能有一筆獨立說明。');return;
    }
    setBusy(true);setMessage('');
    try{
      if(mode==='create'){
        await insertRows(table,[{
          record_type:'style_comment',
          resource_id:'style_comment:'+globalThis.crypto.randomUUID(),
          label:name,
          style_description:body,
          anchor_ids:[anchorId],status:'active',
          updated_at:new Date().toISOString()
        }]);
      }else{
        await updateRows(table,{
          label:name,style_description:body,anchor_ids:[anchorId],status:'active',
          updated_at:new Date().toISOString()
        },{filters:[{column:'record_id',operator:'eq',value:recordId}]});
      }
      await onSaved?.();reset();
    }catch(error){setMessage('儲存失敗：'+(error?.message||String(error)));}
    finally{setBusy(false);}
  }
  async function remove(){
    if(!recordId||!canEdit||busy)return;
    if(!globalThis.confirm('確定刪除這一筆風格標籤與敘述？正式定錨點與其他紀錄不會刪除。'))return;
    setBusy(true);setMessage('');
    try{
      await deleteRows(table,{filters:[{column:'record_id',operator:'eq',value:recordId}]});
      await onSaved?.();reset();
    }catch(error){setMessage('刪除失敗：'+(error?.message||String(error)));}
    finally{setBusy(false);}
  }
  return <section className="scope-culture-style-surface" data-scope={scopeId} aria-label="風格標籤與定錨點">
    <p className="scope-status">每一個已啟用的 style_comment 都有自己的名稱、TEXT 敘述與一個正式定錨點。舊風格先以待定位草稿保留，請依作品、歌詞或真正形成風格的時間自行選定；不會自動套用時期起點。</p>
    {mode==='view'?<>
      <div className="scope-style-tag-row">
        {visibleStyles.length?visibleStyles.map(row=><article className="scope-style-comment-item" key={row.record_id}>
          <div><strong>{row.label}</strong>
            {row.status==='needs_anchor'?<p className="scope-status">待指定定錨點（舊風格文字已分開保存，尚未公開啟用）</p>:null}
            <p>{row.style_description}</p>
            {row.status!=='needs_anchor'?<span className="scope-status">正式定錨：{anchorName(anchorsById.get(String(row.anchor_id||row.anchor_ids?.[0]||'')))}</span>:null}
          </div>
          {canEdit?<button type="button" className="loc-button" onClick={()=>edit(row)}>{row.status==='needs_anchor'?'指定定錨點':'編輯風格標籤'}</button>:null}
        </article>):<p className="scope-status">此 Scope 尚未設定風格標籤。</p>}
      </div>
      {canEdit?<button type="button" className="loc-button" onClick={add}>＋ 新增風格標籤</button>:null}
    </>:<form onSubmit={save} className="scope-culture-style-editing">
      <h4>{mode==='create'?'新增風格標籤':'編輯風格標籤'}</h4>
      <label><span>風格標籤名稱（搜尋關鍵詞）</span>
        <input className="scope-search-input" value={label} onChange={e=>setLabel(e.target.value)} required placeholder="例如：政德風"/>
      </label>
      <label><span>該風格專屬敘述（TEXT）</span>
        <textarea className="scope-search-input" rows={7} value={description} onChange={e=>setDescription(e.target.value)} required placeholder="完整說明這一個風格的文化意義"/>
      </label>
      <label><span>唯一正式定錨點</span>
        <select className="scope-select" value={anchorId} onChange={e=>setAnchorId(e.target.value)} required>
          <option value="">請選擇既有定錨點</option>
          {availableAnchors.map(row=><option key={row.resource_id} value={row.resource_id}>{anchorName(row)}</option>)}
        </select>
      </label>
      <div className="scope-tabs">
        <button type="submit" disabled={busy}>{busy?'儲存中…':mode==='create'?'儲存新增風格':'儲存風格修改'}</button>
        <button type="button" disabled={busy} onClick={reset}>取消</button>
        {mode==='edit'?<button type="button" disabled={busy} onClick={remove}>刪除這筆風格</button>:null}
      </div>
    </form>}
    {message?<p className="scope-status scope-error" role="alert">{message}</p>:null}
  </section>;
}
