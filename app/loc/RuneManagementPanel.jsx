'use client';

import {useEffect,useMemo,useState} from 'react';
import {fetchNeonData,LOC_DATA} from './data';
import {evaluateSpread} from './model/semantic-guidance';
import {realMoonPhase} from './model/moon-phase';
import {drawRuneSession,makeRuneDrawId,RUNE_DIRECTIONS} from '../lrunes/rune-draw-engine';
import {listNeonRecords,listRuneDrawSlots,putDailyRuneRecord,putNeonRecord,putRuneDrawSlot} from './neon-user-storage';
import {useNeonAccount} from './use-neon-account';

const MODES=[
  {key:'single',label:'單卡',count:1,positions:['核心']},
  {key:'2card',label:'雙卡',count:2,positions:['因','果']},
  {key:'3card',label:'三卡',count:3,positions:['源','轉','合']},
  {key:'5card',label:'五卡',count:5,positions:['過去成因 1','過去成因 2','意外變化','現在狀況 1','現在狀況 2']},
  {key:'ow3gs',label:'11卡 OW3gs',count:11,positions:['1','2','3','4','5','6','7','8','9','10','11']}
];

function todayKey(){
  const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function makeRecord(mode,session){
  const config=MODES.find(item=>item.key===mode)||MODES[0];
  const evaluation=evaluateSpread(session.cards,session.directions);
  return {
    id:makeRuneDrawId(mode),created_at:new Date().toISOString(),mode,mode_label:config.label,
    moon_phase:realMoonPhase(),score:evaluation.score,trend:evaluation.range.label,
    cards:session.cards.map((card,index)=>({
      number:Number(card.編號),name:card.符文名稱,
      position:config.positions[index]||`第 ${index+1} 張`,
      direction:session.directions[index],
      positive_keywords:card.正向關鍵詞||'',negative_keywords:card.反向關鍵詞||''
    }))
  };
}
function dailyRecord(session,role){
  const card=session.cards[0];
  return {
    id:makeRuneDrawId('daily'),created_at:new Date().toISOString(),mode:'daily',mode_label:'每日',
    moon_phase:realMoonPhase(),daily_role:role,
    cards:[{number:Number(card.編號),name:card.符文名稱,position:role==='supplement'?'副符':'主符',direction:session.directions[0],positive_keywords:card.正向關鍵詞||'',negative_keywords:card.反向關鍵詞||''}]
  };
}
function cardLine(record){
  return (record?.cards||[]).map(card=>`${card.position}・${card.name}・${card.direction}`).join(' ｜ ');
}

export default function RuneManagementPanel(){
  const account=useNeonAccount();
  const [runes,setRunes]=useState([]);
  const [mode,setMode]=useState('single');
  const [draw,setDraw]=useState(null);
  const [slot,setSlot]=useState(1);
  const [slots,setSlots]=useState([]);
  const [dailyRows,setDailyRows]=useState([]);
  const [dailyMain,setDailyMain]=useState(null);
  const [dailySupplement,setDailySupplement]=useState(null);
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(true);
  const canManage=account.canManageScopeSync('lunarunes');

  async function reloadRecords(){
    const [slotRows,records]=await Promise.all([listRuneDrawSlots(),listNeonRecords('rune-draw')]);
    setSlots(slotRows);
    const today=todayKey();
    setDailyRows(records.filter(row=>row.record_kind==='daily'&&String(row.record_date||'')===today));
  }
  useEffect(()=>{
    let live=true;
    if(!account.user||!canManage){setLoading(false);return()=>{live=false};}
    Promise.all([fetchNeonData(LOC_DATA.RUNES,{memory:true}),reloadRecords()])
      .then(([rows])=>{if(live)setRunes((rows||[]).filter(row=>Number(row?.編號)>=1&&Number(row?.編號)<=66));})
      .catch(error=>{if(live)setStatus(String(error?.message||error));})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false};
  },[account.user?.email,canManage]);

  const config=useMemo(()=>MODES.find(item=>item.key===mode)||MODES[0],[mode]);
  const savedMain=dailyRows.find(row=>row.daily_role==='main');
  const savedSupplement=dailyRows.find(row=>row.daily_role==='supplement');

  function drawGroup(){
    try{setDraw(makeRecord(mode,drawRuneSession(runes,config.count)));setStatus('');}
    catch(error){setStatus(error?.message||'抽牌失敗。');}
  }
  async function saveSlot(){
    if(!draw)return;
    try{await putRuneDrawSlot(slot,draw);await reloadRecords();setStatus(`第 ${slot} 組已更新；舊內容已覆蓋。`);}
    catch(error){setStatus(error?.message||'儲存失敗。');}
  }
  function drawDailyMain(){
    try{setDailyMain(dailyRecord(drawRuneSession(runes,1),'main'));setDailySupplement(null);setStatus('');}
    catch(error){setStatus(error?.message||'抽牌失敗。');}
  }
  function drawDailySupplement(){
    try{
      const mainNumber=Number((savedMain||dailyMain)?.cards?.[0]?.number);
      const pool=runes.filter(card=>Number(card?.編號)!==mainNumber);
      setDailySupplement(dailyRecord(drawRuneSession(pool,1),'supplement'));setStatus('');
    }catch(error){setStatus(error?.message||'副符抽牌失敗。');}
  }
  async function saveDaily(record){
    try{await putDailyRuneRecord(record);await reloadRecords();setStatus(record.daily_role==='supplement'?'副符已儲存。':'主符已儲存。');}
    catch(error){setStatus(error?.message||'每日符文儲存失敗。');}
  }
  async function updateDaily(row,field,value){
    const current=row.cards?.[0]||{};
    const nextCard={...current};
    if(field==='number'){
      const rune=runes.find(item=>Number(item.編號)===Number(value));
      nextCard.number=Number(value);nextCard.name=rune?.符文名稱||String(value);
    }else nextCard.direction=value;
    try{
      await putNeonRecord({...row,cards:[nextCard]});
      await reloadRecords();setStatus('每日符文紀錄已更新。');
    }catch(error){setStatus(error?.message||'更新失敗。');}
  }

  if(!canManage)return null;
  if(loading)return <section className="scope-v2-inline-card"><h3>每日符文與抽牌紀錄</h3><p>正在讀取…</p></section>;

  return <section className="scope-v2-inline-card">
    <h3>抽牌與 8 組儲存槽</h3>
    <p>每次 Draw Session 算一組；11 卡 OW3gs 也只占一組。儲存到相同槽位時直接覆蓋舊組。</p>
    <div className="scope-v2-tabs">
      {MODES.map(item=><button type="button" key={item.key} aria-pressed={mode===item.key} onClick={()=>setMode(item.key)}>{item.label}</button>)}
      <button type="button" onClick={drawGroup}>抽牌</button>
    </div>
    {draw?<article className="loc-card"><strong>{draw.mode_label}</strong><p>{cardLine(draw)}</p>
      <div className="scope-v2-stat-controls">
        <label>儲存到<select value={slot} onChange={e=>setSlot(Number(e.target.value))}>{Array.from({length:8},(_,i)=><option key={i+1} value={i+1}>第 {i+1} 組</option>)}</select></label>
        <button type="button" onClick={saveSlot}>覆蓋／儲存這一組</button>
      </div>
    </article>:null}
    <div className="scope-v2-context-list">
      {slots.map(item=><article className="scope-v2-inline-card" key={item.slot}><strong>第 {item.slot} 組</strong><p>{item.record?cardLine(item.record):'尚未儲存'}</p></article>)}
    </div>

    <hr/>
    <h3>每日符文</h3>
    <p>一天最多兩筆正式紀錄：主符 Main + 副符 Supplement。副符只補充主符；兩筆都存在後不再新增，只能編輯既有紀錄。</p>
    {!savedMain?<div className="loc-actions"><button type="button" onClick={drawDailyMain}>抽主符</button>{dailyMain?<button type="button" onClick={()=>saveDaily(dailyMain)}>儲存主符</button>:null}</div>:null}
    {(savedMain||dailyMain)&&!savedSupplement?<div className="loc-actions"><button type="button" onClick={drawDailySupplement}>抽副符</button>{dailySupplement?<button type="button" onClick={()=>saveDaily(dailySupplement)}>儲存副符</button>:null}</div>:null}
    {dailyMain&&!savedMain?<p>待存主符：{cardLine(dailyMain)}</p>:null}
    {dailySupplement&&!savedSupplement?<p>待存副符：{cardLine(dailySupplement)}</p>:null}

    <div className="scope-v2-context-list">
      {dailyRows.map(row=>{
        const card=row.cards?.[0]||{};
        return <article className="scope-v2-inline-card" key={row.id}>
          <strong>{row.daily_role==='supplement'?'副符':'主符'}｜{card.name}・{card.direction}</strong>
          <div className="scope-v2-stat-controls">
            <label>符文<select value={card.number||''} onChange={e=>updateDaily(row,'number',e.target.value)}>
              {runes.map(rune=><option key={rune.編號} value={rune.編號}>{rune.編號}・{rune.符文名稱}</option>)}
            </select></label>
            <label>方向<select value={card.direction||'正位'} onChange={e=>updateDaily(row,'direction',e.target.value)}>
              {RUNE_DIRECTIONS.map(direction=><option key={direction} value={direction}>{direction}</option>)}
            </select></label>
          </div>
        </article>;
      })}
    </div>
    {status?<p className="scope-v2-status">{status}</p>:null}
  </section>;
}
