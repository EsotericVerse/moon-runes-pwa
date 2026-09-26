'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {deleteNeonRows,insertNeonRows,selectNeonRows,updateNeonRows} from '../../loc/neon-repository';
import {useNeonAccount} from '../../loc/use-neon-account';

const DIRECTIONS=['正位','半正位','半逆位','逆位'];
const DRAW_KINDS=[['main','主抽'],['supplement','補抽']];

function today(){
  const now=new Date();
  const local=new Date(now.getTime()-now.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}
function emptyDraft(){
  return {record_date:today(),draw_kind:'main',rune_number:'1',direction:'正位'};
}
function kindLabel(value){
  return DRAW_KINDS.find(([id])=>id===value)?.[1]||value;
}

export default function DailyRuneStatisticsV2(){
  const account=useNeonAccount();
  const [rows,setRows]=useState([]);
  const [runes,setRunes]=useState([]);
  const [draft,setDraft]=useState(emptyDraft);
  const [editingKey,setEditingKey]=useState('');
  const [editing,setEditing]=useState(emptyDraft);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const runeNames=useMemo(()=>new Map(runes.map(row=>[Number(row.rune_number),row.rune_name])),[runes]);

  const load=useCallback(async()=>{
    setLoading(true);
    setMessage('');
    try{
      const [drawResult,runeResult]=await Promise.all([
        selectNeonRows('silver.lrunes_daily_draws',{
          columns:'record_date,draw_kind,rune_number,direction',
          orders:[{column:'record_date',ascending:false},{column:'draw_kind',ascending:true}],
          limit:366
        }),
        selectNeonRows('silver.lrunes',{
          columns:'rune_number,rune_name',
          orders:[{column:'rune_number',ascending:true}],
          limit:66
        })
      ]);
      setRows(drawResult.rows);
      setRunes(runeResult.rows);
    }catch(error){
      setMessage(String(error?.message||error||'每日符文資料讀取失敗。'));
    }finally{
      setLoading(false);
    }
  },[]);

  useEffect(()=>{load();},[load]);

  const run=async action=>{
    if(!account.canManage){
      setMessage('此帳號沒有每日符文寫入權限。');
      return;
    }
    setBusy(true);
    setMessage('');
    try{
      await action();
      await load();
      setMessage('已儲存。');
    }catch(error){
      setMessage(String(error?.message||error||'儲存失敗。'));
    }finally{
      setBusy(false);
    }
  };

  const add=()=>run(async()=>{
    await insertNeonRows('silver.lrunes_daily_draws',[{
      record_date:draft.record_date,
      draw_kind:draft.draw_kind,
      rune_number:Number(draft.rune_number),
      direction:draft.direction
    }]);
    setDraft(emptyDraft());
  });

  const save=row=>run(async()=>{
    await updateNeonRows('silver.lrunes_daily_draws',{
      record_date:editing.record_date,
      draw_kind:editing.draw_kind,
      rune_number:Number(editing.rune_number),
      direction:editing.direction
    },{filters:[
      {column:'record_date',operator:'eq',value:String(row.record_date).slice(0,10)},
      {column:'draw_kind',operator:'eq',value:row.draw_kind}
    ]});
    setEditingKey('');
  });

  const remove=row=>run(async()=>{
    await deleteNeonRows('silver.lrunes_daily_draws',{filters:[
      {column:'record_date',operator:'eq',value:String(row.record_date).slice(0,10)},
      {column:'draw_kind',operator:'eq',value:row.draw_kind}
    ],returning:null});
    setEditingKey('');
  });

  return <section className="scope-v2-stat-section">
    <header className="scope-v2-stat-domain-heading">
      <div>
        <p className="loc-eyebrow">Daily Runes</p>
        <h2>每日符文</h2>
        <p>每日符文是統計資料的一部分，用於累積紀錄與後續趨勢觀察。公開可讀，只有管理身份可以寫入。</p>
      </div>
    </header>

    <div className="loc-actions">
      <a href="/daily/log/">查看每日紀錄</a>
      <a href="/daily/trend/">查看趨勢</a>
      <button type="button" className="loc-button" disabled={loading} onClick={load}>重新整理</button>
    </div>

    {account.canManage?<section className="scope-v2-inline-card">
      <h3>新增每日符文</h3>
      <div className="scope-v2-editor-options">
        <label>日期<input type="date" value={draft.record_date} onChange={event=>setDraft(current=>({...current,record_date:event.target.value}))}/></label>
        <label>類型<select value={draft.draw_kind} onChange={event=>setDraft(current=>({...current,draw_kind:event.target.value}))}>{DRAW_KINDS.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <label>符文<select value={draft.rune_number} onChange={event=>setDraft(current=>({...current,rune_number:event.target.value}))}>{runes.map(row=><option value={row.rune_number} key={row.rune_number}>{String(row.rune_number).padStart(2,'0')} · {row.rune_name}</option>)}</select></label>
        <label>方向<select value={draft.direction} onChange={event=>setDraft(current=>({...current,direction:event.target.value}))}>{DIRECTIONS.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
      </div>
      <button type="button" className="loc-button" disabled={busy||!draft.record_date} onClick={add}>{busy?'儲存中…':'新增'}</button>
    </section>:null}

    {loading?<p className="scope-v2-status">讀取每日符文…</p>:null}
    {!loading&&!rows.length?<p className="scope-v2-status">目前沒有每日符文紀錄。</p>:null}

    <div className="scope-v2-list">
      {rows.map(row=>{
        const date=String(row.record_date).slice(0,10);
        const key=date+'|'+row.draw_kind;
        const active=editingKey===key;
        return <article className="scope-v2-inline-card" key={key}>
          {active?<div className="scope-v2-editor-options">
            <label>日期<input type="date" value={editing.record_date} onChange={event=>setEditing(current=>({...current,record_date:event.target.value}))}/></label>
            <label>類型<select value={editing.draw_kind} onChange={event=>setEditing(current=>({...current,draw_kind:event.target.value}))}>{DRAW_KINDS.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
            <label>符文<select value={editing.rune_number} onChange={event=>setEditing(current=>({...current,rune_number:event.target.value}))}>{runes.map(item=><option value={item.rune_number} key={item.rune_number}>{String(item.rune_number).padStart(2,'0')} · {item.rune_name}</option>)}</select></label>
            <label>方向<select value={editing.direction} onChange={event=>setEditing(current=>({...current,direction:event.target.value}))}>{DIRECTIONS.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
            <button type="button" className="loc-button" disabled={busy} onClick={()=>save(row)}>儲存</button>
            <button type="button" className="loc-button" disabled={busy} onClick={()=>setEditingKey('')}>取消</button>
          </div>:<>
            <strong>{date} · {kindLabel(row.draw_kind)}</strong>
            <p>{String(row.rune_number).padStart(2,'0')} · {runeNames.get(Number(row.rune_number))||row.rune_number} · {row.direction}</p>
            {account.canManage?<div className="loc-actions">
              <button type="button" className="loc-button" disabled={busy} onClick={()=>{
                setEditingKey(key);
                setEditing({record_date:date,draw_kind:row.draw_kind,rune_number:String(row.rune_number),direction:row.direction});
                setMessage('');
              }}>編輯</button>
              <button type="button" className="loc-button" disabled={busy} onClick={()=>remove(row)}>刪除</button>
            </div>:null}
          </>}
        </article>;
      })}
    </div>
    {message?<p className="scope-v2-status" role="status">{message}</p>:null}
  </section>;
}
