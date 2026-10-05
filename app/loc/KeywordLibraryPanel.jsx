'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {dbAuthRelation,writeKeywordLibraryItem} from './db-client.mjs';
import {useAccount} from './use-account';
import {clearRune66ClassificationCache} from './rune66-keyword-analysis';

const TABLE='silver.lo3rwang_keywords';

function normalizeKeywordLines(value){
  const lines=String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean);
  return [...new Set(lines)];
}

function keywordText(value){
  return Array.isArray(value)?value.map(item=>String(item||'').trim()).filter(Boolean).join('\n'):'';
}

function blankDraft(groupName='',itemNo=1){
  return {
    keyword_id:null,
    group_name:groupName,
    item_no:itemNo,
    item_name:'',
    principle:'',
    keywords_text:'',
    order_no:itemNo
  };
}

export default function KeywordLibraryPanel(){
  const account=useAccount();
  const queryClient=useQueryClient();
  const [rows,setRows]=useState([]);
  const [group,setGroup]=useState('');
  const [selectedId,setSelectedId]=useState('');
  const [draft,setDraft]=useState(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const canEdit=account.canManageScopeSync('lo3rwang');

  async function load(preferredId='',preferredGroup=''){
    if(!canEdit)return;
    setLoading(true);setMessage('');
    try{
      const {data,error}=await dbAuthRelation(TABLE)
        .select('keyword_id,group_name,item_no,item_name,principle,keywords,order_no')
        .order('group_name',{ascending:true})
        .order('order_no',{ascending:true})
        .order('item_no',{ascending:true});
      if(error)throw new Error(error.message||'關鍵詞庫讀取失敗');
      const next=data||[];
      setRows(next);
      const groups=[...new Set(next.map(row=>String(row.group_name||'').trim()).filter(Boolean))];
      const requestedGroup=String(preferredGroup||group||'').trim();
      const nextGroup=groups.includes(requestedGroup)?requestedGroup:(groups.includes('符文66')?'符文66':(groups[0]||''));
      setGroup(nextGroup);
      const candidate=next.find(row=>String(row.keyword_id)===String(preferredId))
        ||next.find(row=>String(row.group_name)===nextGroup)
        ||null;
      if(candidate){
        setSelectedId(String(candidate.keyword_id));
        setDraft({
          ...candidate,
          keywords_text:keywordText(candidate.keywords)
        });
      }else{
        setSelectedId('');
        setDraft(null);
      }
    }catch(error){
      setRows([]);setSelectedId('');setDraft(null);setMessage(String(error?.message||error));
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{if(canEdit)load();},[canEdit,account.email]);

  const groups=useMemo(()=>[...new Set(rows.map(row=>String(row.group_name||'').trim()).filter(Boolean))],[rows]);
  const items=useMemo(()=>rows
    .filter(row=>String(row.group_name)===group)
    .sort((a,b)=>Number(a.order_no||0)-Number(b.order_no||0)||Number(a.item_no||0)-Number(b.item_no||0)),[rows,group]);

  function selectItem(row){
    setSelectedId(String(row.keyword_id));
    setDraft({...row,keywords_text:keywordText(row.keywords)});
    setMessage('');
  }

  function newItem(){
    const next=Math.max(0,...items.map(row=>Number(row.item_no)||0))+1;
    setSelectedId('');
    setDraft(blankDraft(group||'',next));
    setMessage('');
  }

  async function save(){
    if(!draft)return;
    const groupName=String(draft.group_name||'').trim();
    const itemName=String(draft.item_name||'').trim();
    const itemNo=Number(draft.item_no);
    if(!groupName){setMessage('群組不可為空。');return;}
    if(!itemName){setMessage('項目名稱不可為空。');return;}
    if(!Number.isInteger(itemNo)||itemNo<1){setMessage('項目編號必須是正整數。');return;}

    const payload={
      keyword_id:draft.keyword_id,
      group_name:groupName,
      item_no:itemNo,
      item_name:itemName,
      principle:String(draft.principle||'').trim(),
      keywords:normalizeKeywordLines(draft.keywords_text),
      order_no:Number.isFinite(Number(draft.order_no))?Number(draft.order_no):itemNo
    };

    setBusy(true);setMessage('');
    try{
      const result=await writeKeywordLibraryItem(draft.keyword_id?'update':'insert',payload);
      clearRune66ClassificationCache();
      await queryClient.invalidateQueries({queryKey:['statistics-rune66-classification'],refetchType:'all'});
      setGroup(groupName);
      await load(result.keyword_id||draft.keyword_id||'',groupName);
      setMessage('關鍵詞設定已儲存。');
    }catch(error){
      setMessage(String(error?.message||error||'關鍵詞設定儲存失敗。'));
    }finally{
      setBusy(false);
    }
  }

  async function remove(){
    if(!draft?.keyword_id)return;
    if(!window.confirm('確定刪除這個分類項目？'))return;
    setBusy(true);setMessage('');
    try{
      await writeKeywordLibraryItem('delete',draft);
      clearRune66ClassificationCache();
      await queryClient.invalidateQueries({queryKey:['statistics-rune66-classification'],refetchType:'all'});
      setSelectedId('');setDraft(null);
      await load();
      setMessage('分類項目已刪除。');
    }catch(error){
      setMessage(String(error?.message||error||'分類項目刪除失敗。'));
    }finally{
      setBusy(false);
    }
  }

  if(!canEdit)return null;

  return <section className="loc-card scope-feature-card scope-management-workspace">
    <p className="loc-eyebrow">Keyword Library</p>
    <h2>關鍵詞庫</h2>
    <p>每個分類項目直接保存「群組、項目名稱、判別原理、關鍵詞集合」。TO／AND／NAME／NOR 若出現在關鍵詞字串內，由分析器自行解讀，不另設規則類型。</p>

    <div className="scope-stat-controls">
      <label><span>群組</span><select className="scope-select" value={group} onChange={event=>{setGroup(event.target.value);const first=rows.find(row=>String(row.group_name)===event.target.value);if(first)selectItem(first);}}>
        {groups.map(name=><option key={name} value={name}>{name}</option>)}
      </select></label>
      <button type="button" className="loc-button" onClick={newItem}>新增分類項目</button>
    </div>

    {loading?<p className="scope-status">讀取中…</p>:null}
    <div className="scope-management-split">
      <div className="scope-management-records">
        {items.map(row=><button
          type="button"
          key={row.keyword_id}
          aria-pressed={selectedId===String(row.keyword_id)}
          className="scope-inline-card scope-management-record"
          onClick={()=>selectItem(row)}
        >
          <strong>{row.item_no} · {row.item_name}</strong>
          <span>{Array.isArray(row.keywords)?row.keywords.length:0} 個關鍵詞</span>
        </button>)}
        {!loading&&!items.length?<p className="scope-status">這個群組目前沒有分類項目。</p>:null}
      </div>

      <div className="scope-management-editor">
        {!draft?<p className="scope-status">選一個分類項目，或新增一個項目。</p>:<>
          <div className="scope-management-fields">
            <label><span>群組</span><input value={draft.group_name||''} onChange={event=>setDraft(current=>({...current,group_name:event.target.value}))}/></label>
            <label><span>項目編號</span><input type="number" min="1" value={draft.item_no||''} onChange={event=>setDraft(current=>({...current,item_no:event.target.value}))}/></label>
            <label><span>項目名稱</span><input value={draft.item_name||''} onChange={event=>setDraft(current=>({...current,item_name:event.target.value}))}/></label>
            <label><span>排序</span><input type="number" value={draft.order_no??''} onChange={event=>setDraft(current=>({...current,order_no:event.target.value}))}/></label>
          </div>
          <label><span>判別原理</span><textarea rows="4" value={draft.principle||''} onChange={event=>setDraft(current=>({...current,principle:event.target.value}))}/></label>
          <label><span>關鍵詞（每行一筆）</span><textarea rows="16" value={draft.keywords_text||''} onChange={event=>setDraft(current=>({...current,keywords_text:event.target.value}))}/></label>
          <div className="scope-preview-links">
            <button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?'儲存中…':'儲存'}</button>
            {draft.keyword_id?<button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={remove}>刪除此項目</button>:null}
          </div>
        </>}
        {message?<p className={message.includes('失敗')||message.includes('不可')||message.includes('0 rows')?'scope-status scope-error':'scope-status'}>{message}</p>:null}
      </div>
    </div>
  </section>;
}
