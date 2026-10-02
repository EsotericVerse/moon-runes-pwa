'use client';

import {useEffect,useMemo,useState} from 'react';
import {neonAuthRelation} from './neon-client';
import {useNeonAccount} from './use-neon-account';

export default function RuneKeywordManagement(){
  const account=useNeonAccount();
  const [rows,setRows]=useState([]);
  const [selectedId,setSelectedId]=useState(1);
  const [draft,setDraft]=useState({positive:'',negative:''});
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const [revision,setRevision]=useState(0);
  const canManage=account.canManageScopeSync('lrunes');

  useEffect(()=>{
    if(!canManage)return;
    let active=true;
    neonAuthRelation('silver.runes')
      .select('rune_id,rune_name,group_name,positive_keywords,negative_keywords')
      .gte('rune_id',1).lte('rune_id',66).order('rune_id',{ascending:true})
      .then(({data,error})=>{
        if(!active)return;
        if(error){setStatus(error.message||'符文關鍵詞讀取失敗');return;}
        setRows(data||[]);
      });
    return()=>{active=false;};
  },[canManage,revision]);

  const selected=useMemo(()=>rows.find(row=>Number(row.rune_id)===Number(selectedId))||rows[0]||null,[rows,selectedId]);
  useEffect(()=>{
    if(!selected)return;
    setSelectedId(Number(selected.rune_id));
    setDraft({positive:String(selected.positive_keywords||''),negative:String(selected.negative_keywords||'')});
    setStatus('');
  },[selected?.rune_id,selected?.positive_keywords,selected?.negative_keywords]);

  if(!canManage)return null;

  async function save(){
    if(!selected)return;
    setBusy(true);setStatus('');
    const {error}=await neonAuthRelation('silver.runes')
      .update({positive_keywords:draft.positive.trim()||null,negative_keywords:draft.negative.trim()||null})
      .eq('rune_id',selected.rune_id);
    setBusy(false);
    if(error){setStatus(error.message||'關鍵詞儲存失敗');return;}
    setStatus('關鍵詞已更新。');setRevision(value=>value+1);
  }

  return <section className="loc-card scope-feature-card scope-management-workspace">
    <p className="loc-eyebrow">Rune66 Keywords</p>
    <h2>符文66 關鍵詞</h2>
    <p>直接維護 LunaRunes Core 的正向／負向關鍵詞。九大群組 identity 與符文歸屬不在這裡改寫。</p>
    <div className="scope-management-split">
      <div className="scope-management-records">
        {rows.map(row=><button type="button" key={row.rune_id} className="scope-inline-card scope-management-record" aria-pressed={Number(row.rune_id)===Number(selectedId)} onClick={()=>setSelectedId(Number(row.rune_id))}>
          <strong>{String(row.rune_id).padStart(2,'0')} · {row.rune_name}</strong><span>{row.group_name||'—'}</span>
        </button>)}
      </div>
      <div className="scope-management-editor">
        {selected?<section className="scope-inline-card">
          <p className="loc-eyebrow">{selected.group_name}</p><h3>{String(selected.rune_id).padStart(2,'0')} · {selected.rune_name}</h3>
          <label className="scope-management-wide-field"><span>正向關鍵詞</span><textarea rows={6} value={draft.positive} onChange={e=>setDraft(current=>({...current,positive:e.target.value}))}/></label>
          <label className="scope-management-wide-field"><span>負向關鍵詞</span><textarea rows={6} value={draft.negative} onChange={e=>setDraft(current=>({...current,negative:e.target.value}))}/></label>
          <div className="scope-tabs"><button type="button" disabled={busy} onClick={save}>{busy?'儲存中…':'儲存關鍵詞'}</button></div>
          {status?<p className="scope-status">{status}</p>:null}
        </section>:<p className="scope-status">讀取符文資料中…</p>}
      </div>
    </div>
  </section>;
}
