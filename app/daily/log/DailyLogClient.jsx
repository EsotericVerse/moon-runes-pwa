'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import DailyRuneCalendar from '../../lrunes/DailyRuneCalendar';
import {
  deleteDailyRuneRecord,
  insertDailyRuneRecord,
  selectDailyRuneMonth,
  selectPreviousDailyRuneOccurrence,
  selectDailyRuneContext,
  selectDailyRuneSituation,
  updateDailyRuneRecord
} from '../../loc/daily-runes';
import {selectRows} from '../../loc/db-query.mjs';
import {useAccount} from '../../loc/use-account';

const FIRST_MONTH=2026*12+7;
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
  const account=useAccount();
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
  const [comparisons,setComparisons]=useState([]);
  const [comparisonLoading,setComparisonLoading]=useState(false);
  const [newForm,setNewForm]=useState(()=>({
    recordDate:taipeiToday(),
    drawKind:'main',
    runeNumber:'1',
    direction:'正位'
  }));
  const {year,month}=monthParts(monthValue);
  const canWrite=account.canManageScopeSync('lrunes');

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
    selectRows('silver.runes',{
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

  const selectedRows=byDate.get(selectedDate)||[];

  useEffect(()=>{
    let active=true;
    async function loadComparisons(){
      if(!selectedDate||!selectedRows.length){
        setComparisons([]);
        return;
      }
      setComparisonLoading(true);
      try{
        const next=await Promise.all(selectedRows.map(async row=>{
          const previous=await selectPreviousDailyRuneOccurrence({
            runeNumber:row.rune_number,
            beforeDate:selectedDate
          });
          const currentContext=await selectDailyRuneContext({
            runeNumber:row.rune_number,
            direction:row.direction,
            recordDate:selectedDate
          });
          const previousSituation=previous?await selectDailyRuneSituation({
            runeNumber:previous.rune_number,
            direction:previous.direction,
            recordDate:previous.record_date
          }):null;
          return {key:rowKey(row),current:row,previous,currentContext,previousSituation};
        }));
        if(active)setComparisons(next);
      }catch{
        if(active)setComparisons([]);
      }finally{
        if(active)setComparisonLoading(false);
      }
    }
    loadComparisons();
    return()=>{active=false;};
  },[selectedDate,selectedRows]);


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
      <p>依日期保存每日符文的主抽與補抽，並在行事曆下方比較同一符文上一次出現的日期與當時狀況。</p>
    </header>:null}

    <DailyRuneCalendar
      year={year}
      month={month}
      rows={rows}
      selectedDate={selectedDate}
      loading={loading}
      canPrevious={monthValue>FIRST_MONTH}
      onPrevious={()=>setMonthValue(value=>value-1)}
      onNext={()=>setMonthValue(value=>value+1)}
      onSelectDate={setSelectedDate}
    />

    {selectedRows.length?<section className="loc-card" aria-live="polite">
      <p className="loc-eyebrow">每日符文說明</p>
      <h2>{formatDate(selectedDate)} 的當日指引與前次紀錄</h2>
      {comparisonLoading?<p className="loc-status">讀取前次同符文紀錄…</p>:null}
      {!comparisonLoading?<div className="scope-list">
        {comparisons.map(({key,current,previous,currentContext,previousSituation})=><article className="scope-inline-card" key={'compare-'+key}>
          <strong>{current.draw_kind==='supplement'?'補抽':'主抽'}｜{current.rune_name}・{current.direction}</strong>
          <span>當日真實月相：{currentContext?.moonPhase||'未知'}</span>
          <span>狀況形容：{currentContext?.situation||'目前沒有對應的狀況形容。'}</span>
          {currentContext?.reminder?<span>每日占卜提醒：{currentContext.reminder}</span>:null}
          {currentContext?.guidance?<span>每日占卜引導：{currentContext.guidance}</span>:null}
          {currentContext?.blessing?<span>每日占卜祝福：{currentContext.blessing}</span>:null}
          {previous?<>
            <span>上次抽到「{current.rune_name}」是 {formatDate(previous.record_date)}，方向為 {previous.direction}，當日真實月相為 {previousSituation?.moonPhase||'未知'}。</span>
            <span>之前的狀況：{previousSituation?.text||'目前沒有對應的狀況形容。'}</span>
          </>:<span>此前沒有抽到「{current.rune_name}」的紀錄。</span>}
        </article>)}
      </div>:null}
    </section>:null}

    {!embedded&&canWrite?<section className="loc-card">
      <p className="loc-eyebrow">手動紀錄</p>
      <h2>人工新增紀錄</h2>
      <form className="scope-stat-controls" onSubmit={addRecord}>
        <label><span>日期</span><input className="scope-select" type="date" min="2026-08-01" value={newForm.recordDate} onChange={event=>setNewForm(current=>({...current,recordDate:event.target.value}))}/></label>
        <label><span>種類</span><select className="scope-select" value={newForm.drawKind} onChange={event=>setNewForm(current=>({...current,drawKind:event.target.value}))}><option value="main">主抽</option><option value="supplement">補抽</option></select></label>
        <label><span>符文</span><select className="scope-select" value={newForm.runeNumber} onChange={event=>setNewForm(current=>({...current,runeNumber:event.target.value}))}>{runes.map(row=><option value={row.rune_id} key={row.rune_id}>{row.rune_id}｜{row.rune_name}</option>)}</select></label>
        <label><span>方向</span><select className="scope-select" value={newForm.direction} onChange={event=>setNewForm(current=>({...current,direction:event.target.value}))}>{DIRECTIONS.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
        <button className="loc-button" type="submit" disabled={saving||!runes.length}>{saving?'儲存中…':'新增紀錄'}</button>
      </form>
      {message?<p className="scope-status">{message}</p>:null}
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
            {canWrite?<div className="scope-tabs"><button type="button" disabled={saving} onClick={()=>beginEdit(row)}>編輯</button><button type="button" disabled={saving} onClick={()=>removeRecord(row)}>刪除</button></div>:null}
          </>:<form className="scope-stat-controls" onSubmit={saveEdit}>
            <label><span>符文</span><select className="scope-select" value={editForm.runeNumber} onChange={event=>setEditForm(current=>({...current,runeNumber:event.target.value}))}>{runes.map(item=><option value={item.rune_id} key={item.rune_id}>{item.rune_id}｜{item.rune_name}</option>)}</select></label>
            <label><span>方向</span><select className="scope-select" value={editForm.direction} onChange={event=>setEditForm(current=>({...current,direction:event.target.value}))}>{DIRECTIONS.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
            <button className="loc-button" type="submit" disabled={saving}>儲存</button>
            <button className="loc-button" type="button" disabled={saving} onClick={()=>{setEditingKey('');setEditForm(null)}}>取消</button>
          </form>}
        </article>;
      })}
    </section>:null}
  </section>;
}
