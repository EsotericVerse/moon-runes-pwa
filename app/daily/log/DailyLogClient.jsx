'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {
  deleteDailyRuneRecord,
  insertDailyRuneRecord,
  selectDailyRuneMonth,
  updateDailyRuneRecord
} from '../../loc/neon-daily-runes';
import {selectNeonRows} from '../../loc/neon-query';
import {useNeonAccount} from '../../loc/use-neon-account';

const FIRST_MONTH=2026*12+7;
const WEEKDAYS=['日','一','二','三','四','五','六'];
const DIRECTIONS=['正位','半正位','半逆位','逆位'];

function taipeiParts(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  }catch{
    return {
      year:String(date.getFullYear()),
      month:String(date.getMonth()+1).padStart(2,'0'),
      day:String(date.getDate()).padStart(2,'0')
    };
  }
}
function taipeiToday(){
  const parts=taipeiParts();
  return parts.year+'-'+parts.month+'-'+parts.day;
}
function currentMonthValue(){
  const parts=taipeiParts();
  return Number(parts.year)*12+(Number(parts.month)-1);
}
function monthParts(value){return {year:Math.floor(value/12),month:value%12+1};}
function monthLabel(value){const {year,month}=monthParts(value);return year+' 年 '+month+' 月';}
function dateKey(year,month,day){return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
function formatDate(value){return String(value||'').slice(0,10).replaceAll('-','/');}
function monthValueOf(date){
  const [year,month]=String(date||'').slice(0,7).split('-').map(Number);
  return year&&month?year*12+(month-1):currentMonthValue();
}
function rowKey(row){
  return String(row.record_date||'').slice(0,10)+'|'+String(row.draw_kind||'');
}

export default function DailyLogClient({embedded=false}={}){
  const account=useNeonAccount();
  const [monthValue,setMonthValue]=useState(()=>Math.max(FIRST_MONTH,currentMonthValue()));
  const [rows,setRows]=useState([]);
  const [selectedDate,setSelectedDate]=useState(()=>taipeiToday());
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [runes,setRunes]=useState([]);
  const [message,setMessage]=useState('');
  const [saving,setSaving]=useState(false);
  const [editingKey,setEditingKey]=useState('');
  const [editForm,setEditForm]=useState(null);
  const [newForm,setNewForm]=useState(()=>({
    recordDate:taipeiToday(),
    drawKind:'main',
    runeNumber:'1',
    direction:'正位'
  }));
  const {year,month}=monthParts(monthValue);
  const canWrite=account.canManageScopeSync('lunarunes');

  const loadMonth=useCallback(async()=>{
    setLoading(true);
    setError('');
    try{
      const result=await selectDailyRuneMonth({year,month});
      setRows(result);
      const today=taipeiToday();
      setSelectedDate(current=>{
        if(current&&current.slice(0,7)===dateKey(year,month,1).slice(0,7))return current;
        if(today.slice(0,7)===dateKey(year,month,1).slice(0,7))return today;
        return String(result.at(-1)?.record_date||dateKey(year,month,1)).slice(0,10);
      });
    }catch(reason){
      setRows([]);
      setError(String(reason?.message||reason||'讀取每日符文紀錄失敗。'));
    }finally{setLoading(false);}
  },[year,month]);

  useEffect(()=>{loadMonth();},[loadMonth]);

  useEffect(()=>{
    if(!canWrite)return;
    let active=true;
    selectNeonRows('silver.runes',{
      columns:'rune_id,rune_name',
      orders:[{column:'rune_id',ascending:true}],
      limit:67,
      offset:0
    }).then(({rows})=>{
      if(!active)return;
      setRunes(rows||[]);
      if(rows?.length&&!rows.some(row=>String(row.rune_id)===String(newForm.runeNumber))){
        setNewForm(current=>({...current,runeNumber:String(rows[0].rune_id)}));
      }
    }).catch(reason=>setMessage(String(reason?.message||reason||'符文資料讀取失敗。')));
    return()=>{active=false;};
  },[canWrite]);

  const byDate=useMemo(()=>{
    const grouped=new Map();
    for(const row of rows){
      const key=String(row.record_date).slice(0,10);
      if(!grouped.has(key))grouped.set(key,[]);
      grouped.get(key).push(row);
    }
    return grouped;
  },[rows]);

  const cells=useMemo(()=>{
    const firstWeekday=new Date(Date.UTC(year,month-1,1)).getUTCDay();
    const dayCount=new Date(Date.UTC(year,month,0)).getUTCDate();
    return [...Array(firstWeekday).fill(null),...Array.from({length:dayCount},(_,index)=>index+1)];
  },[year,month]);
  const selectedRows=byDate.get(selectedDate)||[];

  async function addRecord(event){
    event.preventDefault();
    setSaving(true);setMessage('');
    try{
      await insertDailyRuneRecord(newForm);
      const nextMonth=monthValueOf(newForm.recordDate);
      setSelectedDate(newForm.recordDate);
      if(nextMonth!==monthValue)setMonthValue(nextMonth);
      else await loadMonth();
      setMessage('已新增每日符文紀錄。');
    }catch(reason){
      setMessage(String(reason?.message||reason||'新增失敗。'));
    }finally{setSaving(false);}
  }

  function beginEdit(row){
    setEditingKey(rowKey(row));
    setEditForm({
      recordDate:String(row.record_date).slice(0,10),
      drawKind:row.draw_kind,
      runeNumber:String(row.rune_number),
      direction:row.direction
    });
    setMessage('');
  }

  async function saveEdit(event){
    event.preventDefault();
    if(!editForm)return;
    setSaving(true);setMessage('');
    try{
      await updateDailyRuneRecord(editForm);
      await loadMonth();
      setEditingKey('');setEditForm(null);
      setMessage('已更新每日符文紀錄。');
    }catch(reason){
      setMessage(String(reason?.message||reason||'修改失敗。'));
    }finally{setSaving(false);}
  }

  async function removeRecord(row){
    if(!window.confirm('確定刪除這筆每日符文紀錄？'))return;
    setSaving(true);setMessage('');
    try{
      await deleteDailyRuneRecord({
        recordDate:String(row.record_date).slice(0,10),
        drawKind:row.draw_kind
      });
      await loadMonth();
      setMessage('已刪除每日符文紀錄。');
    }catch(reason){
      setMessage(String(reason?.message||reason||'刪除失敗。'));
    }finally{setSaving(false);}
  }

  return <section className="loc-view">
    {!embedded?<header className="loc-hero">
      <p className="loc-eyebrow">每日抽籤紀錄</p>
      <h1>每日符文抽籤紀錄</h1>
      <p>依日期保存每日符文的主抽與補抽，方便回看當天結果，也可作為每日趨勢分析的紀錄來源。</p>
    </header>:null}

    <section className="loc-card" aria-label="每日符文行事曆">
      <div className="scope-v2-daily-calendar-nav">
        <button className="loc-button" type="button" disabled={monthValue<=FIRST_MONTH||loading} onClick={()=>setMonthValue(value=>value-1)} aria-label="上個月">‹</button>
        <h2 aria-live="polite">{monthLabel(monthValue)}</h2>
        <button className="loc-button" type="button" disabled={loading} onClick={()=>setMonthValue(value=>value+1)} aria-label="下個月">›</button>
      </div>
      <div role="grid" aria-label={monthLabel(monthValue)} className="scope-v2-daily-calendar-grid">
        {WEEKDAYS.map((day,index)=><div role="columnheader" key={'weekday-'+index} className="scope-v2-daily-calendar-weekday">{day}</div>)}
        {cells.map((day,index)=>{
          if(!day)return <div role="gridcell" aria-hidden="true" key={'blank-'+index}/>;
          const key=dateKey(year,month,day);
          const entries=byDate.get(key)||[];
          const main=entries.some(row=>row.draw_kind==='main');
          const supplement=entries.some(row=>row.draw_kind==='supplement');
          const selected=selectedDate===key;
          return <button
            role="gridcell"
            key={key}
            type="button"
            aria-pressed={selected}
            aria-label={formatDate(key)+(main?'，主抽':'')+(supplement?'，補抽':'')}
            onClick={()=>setSelectedDate(key)}
            className={"scope-v2-daily-calendar-cell"+(entries.length?" has-entry":"")}
          >
            <span className="scope-v2-daily-calendar-day">{day}</span>
            <span className="scope-v2-daily-calendar-flags">
              {main?<span>主抽</span>:null}{supplement?<span>補抽</span>:null}
            </span>
          </button>;
        })}
      </div>
    </section>

    {!embedded&&canWrite?<section className="loc-card">
      <p className="loc-eyebrow">手動紀錄</p>
      <h2>人工新增紀錄</h2>
      <form className="scope-v2-stat-controls" onSubmit={addRecord}>
        <label><span>日期</span><input className="scope-v2-select" type="date" min="2026-08-01" value={newForm.recordDate} onChange={event=>setNewForm(current=>({...current,recordDate:event.target.value}))}/></label>
        <label><span>種類</span><select className="scope-v2-select" value={newForm.drawKind} onChange={event=>setNewForm(current=>({...current,drawKind:event.target.value}))}><option value="main">主抽</option><option value="supplement">補抽</option></select></label>
        <label><span>符文</span><select className="scope-v2-select" value={newForm.runeNumber} onChange={event=>setNewForm(current=>({...current,runeNumber:event.target.value}))}>{runes.map(row=><option value={row.rune_id} key={row.rune_id}>{row.rune_id}｜{row.rune_name}</option>)}</select></label>
        <label><span>方向</span><select className="scope-v2-select" value={newForm.direction} onChange={event=>setNewForm(current=>({...current,direction:event.target.value}))}>{DIRECTIONS.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
        <button className="loc-button" type="submit" disabled={saving||!runes.length}>{saving?'儲存中…':'新增紀錄'}</button>
      </form>
      {message?<p className="scope-v2-status">{message}</p>:null}
    </section>:null}

    {error?<p role="alert" className="loc-status">{error}<button className="loc-button" type="button" onClick={loadMonth}>重新讀取</button></p>:null}
    {loading?<p className="loc-status" aria-live="polite">讀取每日符文紀錄…</p>:null}
    {!loading&&!error&&!rows.length?<article className="loc-card">目前沒有每日符文紀錄。</article>:null}
    {selectedDate?<section className="loc-context-list" aria-live="polite">
      <h2>{formatDate(selectedDate)}</h2>
      {!selectedRows.length?<article className="loc-card">這一天沒有每日符文紀錄。</article>:null}
      {selectedRows.map(row=>{
        const key=rowKey(row);
        const editing=canWrite&&editingKey===key&&editForm;
        return <article className="loc-card" key={key}>
          <div className="loc-result-meta"><span>{row.draw_kind==='supplement'?'補抽':'主抽'}</span><span>{formatDate(row.record_date)}</span></div>
          {!editing?<><h3>{row.rune_name}・{row.direction}</h3>
            {canWrite?<div className="scope-v2-tabs"><button type="button" disabled={saving} onClick={()=>beginEdit(row)}>編輯</button><button type="button" disabled={saving} onClick={()=>removeRecord(row)}>刪除</button></div>:null}
          </>:<form className="scope-v2-stat-controls" onSubmit={saveEdit}>
            <label><span>符文</span><select className="scope-v2-select" value={editForm.runeNumber} onChange={event=>setEditForm(current=>({...current,runeNumber:event.target.value}))}>{runes.map(item=><option value={item.rune_id} key={item.rune_id}>{item.rune_id}｜{item.rune_name}</option>)}</select></label>
            <label><span>方向</span><select className="scope-v2-select" value={editForm.direction} onChange={event=>setEditForm(current=>({...current,direction:event.target.value}))}>{DIRECTIONS.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
            <button className="loc-button" type="submit" disabled={saving}>儲存</button>
            <button className="loc-button" type="button" disabled={saving} onClick={()=>{setEditingKey('');setEditForm(null)}}>取消</button>
          </form>}
        </article>;
      })}
    </section>:null}
  </section>;
}
