'use client';

import {useEffect,useRef,useState} from 'react';
import {selectRows} from '../loc/db-query.mjs';
import {runeGlyphProfile} from './effekseer/rune-glyph-library.mjs';
import EffekseerStage from './effekseer/EffekseerStage';
import {runeImage,runeName} from './rune-directory.mjs';
import {navigationHref} from '../modular/nav-destinations.mjs';
import useNativeNavigation from '../modular/use-native-navigation';
import './skin-lab.css';
import './effekseer/effekseer-stage.css';

// Nine canonical groups, eight runes each except the last two-rune group.
const GROUPS=Object.freeze([
  {id:1,name:'靈魂',start:1,end:8},
  {id:2,name:'連結',start:9,end:16},
  {id:3,name:'生命',start:17,end:24},
  {id:4,name:'自然',start:25,end:32},
  {id:5,name:'礦物',start:33,end:40},
  {id:6,name:'元素',start:41,end:48},
  {id:7,name:'秩序',start:49,end:56},
  {id:8,name:'無序',start:57,end:64},
  {id:9,name:'特殊',start:65,end:66}
]);
const DIRECTIONS=Object.freeze([
  {name:'正位',hint:'完整藍色光緣'},
  {name:'半正位',hint:'間斷淺藍光緣'},
  {name:'半逆位',hint:'間斷淺紅光緣'},
  {name:'逆位',hint:'完整紅色光緣'}
]);
const RUNE_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,rune_description,archetype,char_action,positive_keywords,negative_keywords';
const inGroup=(rune,group)=>Number(rune.rune_id)>=group.start&&Number(rune.rune_id)<=group.end;

function Keywords({label,words}){
  if(!words)return null;
  const content=Array.isArray(words)?words.filter(Boolean).join('、'):String(words).trim();
  return content?<p><strong>{label}：</strong>{content}</p>:null;
}

export default function Rune3DLibrary(){
  const native=useNativeNavigation();
  const [allRunes,setAllRunes]=useState([]);
  const [groupId,setGroupId]=useState(1);
  const [focusId,setFocusId]=useState(1);
  const [direction,setDirection]=useState(null);
  const [details,setDetails]=useState(null);
  const [status,setStatus]=useState('loading');
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  const stageRef=useRef(null);

  useEffect(()=>{
    let active=true;
    selectRows('silver.runes',{
      columns:RUNE_COLUMNS,
      orders:[{column:'rune_id',ascending:true}],
      limit:67,offset:0
    }).then(({rows})=>{
      if(!active)return;
      const next=(rows||[]).filter(rune=>{
        const id=Number(rune.rune_id);
        return Number.isInteger(id)&&id>=1&&id<=66;
      });
      const ids=new Set(next.map(rune=>Number(rune.rune_id)));
      if(next.length!==66||ids.size!==66){
        throw Error('符文資料不完整：目前讀取 '+ids.size+' / 66');
      }
      setAllRunes(next);setError('');setStatus('ready');
    }).catch(err=>{
      if(active){setError(String(err?.message||err));setStatus('error');}
    });
    return()=>{active=false;};
  },[reload]);

  const group=GROUPS.find(item=>item.id===groupId)||GROUPS[0];
  const runes=allRunes.filter(rune=>inGroup(rune,group));
  const current=runes.find(rune=>Number(rune.rune_id)===focusId)||runes[0]||null;
  const runePosition=Math.max(0,runes.findIndex(rune=>Number(rune.rune_id)===Number(current?.rune_id)));

  const jumpTo=rune=>{
    if(!rune)return;
    setFocusId(Number(rune.rune_id));setDetails(null);
    requestAnimationFrame(()=>stageRef.current?.scrollIntoView({behavior:'smooth',block:'center'}));
  };
  const selectGroup=entry=>{
    setGroupId(entry.id);setFocusId(entry.start);setDetails(null);
  };
  const stepRune=delta=>{
    if(!runes.length)return;
    jumpTo(runes[(runePosition+delta+runes.length)%runes.length]);
  };

  return <main className="loc-next-main rune-skin-lab rune-3d-shell rune-3d-library"
    data-rune-3d-preview="list" data-rune-embodiment="66">
    <header className="rune-3d-header">
      <p className="loc-eyebrow">LUNARUNES · 符文圖鑑</p>
      <h1>六十六枚符文 · 3D 圖鑑</h1>
      <p>九大群組、六十六枚原創中文字。選取符文後，以原本字形與專屬 Effekseer 魔法短暫顯現；四種位向可在圖鑑中獨立預覽，不影響抽牌。</p>
    </header>

    <nav className="rune-3d-group-index rune-3d-library-groups" aria-label="九大符文群組">
      {GROUPS.map(entry=><button type="button" key={entry.id}
        aria-pressed={groupId===entry.id} onClick={()=>selectGroup(entry)}>
        <span>{entry.name}</span><small>{entry.end-entry.start+1} 枚</small>
      </button>)}
    </nav>

    <section className="rune-3d-library-index" aria-label={group.name+'符文字樣'}>
      <div className="rune-3d-library-title">
        <h2>{group.name} · 符文列表</h2>
        <span>{status==='ready'?group.start+'–'+group.end+' / 66':'資料載入中'}</span>
      </div>
      {status==='loading'?<p role="status" className="rune-3d-library-message">正在載入六十六枚符文……</p>:null}
      {status==='error'?<div className="rune-3d-library-message" role="alert">
        <p>符文資料無法完整載入：{error}</p>
        <button type="button" className="rune-skin-btn" onClick={()=>{setStatus('loading');setReload(n=>n+1);}}>重新載入</button>
      </div>:null}
      {status==='ready'?<div className="rune-3d-glyph-grid">
        {runes.map(rune=>{
          const profile=runeGlyphProfile(rune);
          return <button type="button" key={rune.rune_id} className="rune-3d-glyph-tile"
            aria-pressed={Number(current?.rune_id)===Number(rune.rune_id)}
            aria-label={'顯現 '+runeName(rune)+' 之符文'}
            onClick={()=>jumpTo(rune)}>
            <span className={'rune-3d-glyph-letter rune-effekseer-glyph--'+profile.font}
              data-glyph-finish={profile.finish} style={{'--rune-ink':profile.ink}} aria-hidden="true">{runeName(rune)}</span>
            <span className="rune-3d-glyph-english">{rune.english_name}</span>
          </button>;
        })}
      </div>:null}
    </section>

    {status==='ready'&&current?<section className="rune-3d-library-manifestation" ref={stageRef}
      aria-label={runeName(current)+'符文 3D 顯現'}>
      <div className="rune-3d-library-title">
        <h2>{runeName(current)} · {current.english_name}</h2>
        <span>第 {current.rune_id} / 66 枚 · {group.name}</span>
      </div>
      <div className="rune-3d-orientation-selector" role="group" aria-label="四向位向外緣光預覽">
        <button type="button" className="rune-3d-orientation-btn"
          aria-pressed={direction===null} onClick={()=>setDirection(null)}>原本字色</button>
        {DIRECTIONS.map(entry=><button type="button" key={entry.name}
          className="rune-3d-orientation-btn" data-direction={entry.name}
          aria-pressed={direction===entry.name} aria-label={entry.name+'：'+entry.hint}
          onClick={()=>setDirection(entry.name)}>{entry.name}</button>)}
      </div>
      <p className="rune-3d-orientation-help">
        {direction?DIRECTIONS.find(entry=>entry.name===direction)?.hint+'，僅作用於文字輪廓，不修改字形與魔法。':'原本字色，沒有位向描邊。'} 
      </p>
      <div className="rune-3d-stage">
        <EffekseerStage rune={current} direction={direction} vfxOnly onGlyphClick={()=>setDetails(current)}/>
      </div>
      <div className="rune-3d-library-actions">
        <div className="rune-3d-review-stepping" role="group" aria-label="前後符文">
          <button type="button" className="rune-skin-btn" onClick={()=>stepRune(-1)}>← 上一枚</button>
          <span>{runePosition+1} / {runes.length}</span>
          <button type="button" className="rune-skin-btn" onClick={()=>stepRune(1)}>下一枚 →</button>
        </div>
        <button className="rune-skin-btn" type="button" onClick={()=>setDetails(current)}>閱讀符文資料</button>
      </div>
    </section>:null}

    <footer className="rune-3d-footer">
      <nav className="rune-skin-controls" aria-label="符文圖鑑導覽">
        <a className="rune-skin-btn" href={navigationHref('lrunes','',native)}>回符文首頁</a>
        <a className="rune-skin-btn" href={navigationHref('lrunes','card/list',native)}>2D 符文圖鑑</a>
      </nav>
    </footer>

    {details?<div className="rune-3d-modal-backdrop" role="presentation" onClick={()=>setDetails(null)}>
      <section className="rune-3d-modal" role="dialog" aria-modal="true"
        aria-label={runeName(details)+'符文資料'} onClick={event=>event.stopPropagation()}>
        <header className="rune-3d-modal-head">
          <h2>{runeName(details)} · {details.english_name}</h2>
          <button type="button" className="rune-skin-btn" onClick={()=>setDetails(null)} autoFocus>關閉</button>
        </header>
        <div className="rune-3d-daily-modal-fields">
          <img className="rune-3d-daily-card" src={runeImage(details)}
            alt={runeName(details)+'原始符文卡面'}/>
          {details.rune_description?<p>{details.rune_description}</p>:null}
          {details.archetype?<p><strong>象徵原型：</strong>{String(details.archetype)}</p>:null}
          <Keywords label="正向關鍵字" words={details.positive_keywords}/>
          <Keywords label="逆向關鍵字" words={details.negative_keywords}/>
        </div>
      </section>
    </div>:null}
  </main>;
}
