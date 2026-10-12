'use client';

import {useEffect,useRef,useState} from 'react';
import {selectRows} from '../loc/db-query.mjs';
import {runeGlyphProfile} from './effekseer/rune-glyph-library.mjs';
import {RUNE_VFX_REVIEW_NAMES} from './effekseer/rune-review-queue.mjs';
import EffekseerStage from './effekseer/EffekseerStage';
import {runeImage,runeName} from './rune-directory.mjs';
import {navigationHref} from '../modular/nav-destinations.mjs';
import useNativeNavigation from '../modular/use-native-navigation';
import './skin-lab.css';
import './effekseer/effekseer-stage.css';

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
const RUNE_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,rune_description,archetype,char_action,positive_keywords,negative_keywords';
const inGroup=(rune,group)=>Number(rune.rune_id)>=group.start&&Number(rune.rune_id)<=group.end;

// This is the actual independent /card3d/list/ Rune catalogue, not a sample panel.
// A shared letterform library produces the indexed glyphs and the central manifestation.
// The existing EffekseerStage plays only the selected Rune so nine groups never
// consume 66 simultaneous WebGL contexts or duplicate effects.
export default function Rune3DLibrary(){
  const native=useNativeNavigation();
  const [allRunes,setAllRunes]=useState([]);
  const [groupId,setGroupId]=useState(1);
  const [reviewMode,setReviewMode]=useState(false);
  const [focusId,setFocusId]=useState(1);
  const [details,setDetails]=useState(null);
  const [status,setStatus]=useState('loading');
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  const stageRef=useRef(null);

  useEffect(()=>{
    let live=true;
    selectRows('silver.runes',{
      columns:RUNE_COLUMNS,
      orders:[{column:'rune_id',ascending:true}],
      limit:67,offset:0
    }).then(({rows})=>{
      if(!live)return;
      const next=(rows||[]).filter(row=>{
        const id=Number(row.rune_id);
        return Number.isInteger(id)&&id>=1&&id<=66;
      });
      if(next.length!==66)throw Error('符文資料不完整：目前讀取 '+next.length+' / 66');
      setAllRunes(next);
      setStatus('ready');setError('');
    }).catch(err=>{
      if(live){setStatus('error');setError(String(err?.message||err));}
    });
    return()=>{live=false;};
  },[reload]);

  const group=GROUPS.find(item=>item.id===groupId)||GROUPS[0];
  const runes=reviewMode?allRunes.filter(rune=>RUNE_VFX_REVIEW_NAMES.includes(rune.english_name)):
    allRunes.filter(rune=>inGroup(rune,group));
  const current=runes.find(rune=>Number(rune.rune_id)===focusId)||runes[0]||null;
  const jumpTo=(rune)=>{
    if(!rune)return;
    setFocusId(Number(rune.rune_id));setDetails(null);
    requestAnimationFrame(()=>stageRef.current?.scrollIntoView({behavior:'smooth',block:'center'}));
  };
  const stepRune=(direction)=>{
    const index=runes.findIndex(rune=>Number(rune.rune_id)===Number(current?.rune_id));
    const next=runes[(index+direction+runes.length)%runes.length];
    jumpTo(next);
  };
  const selectGroup=(entry)=>{
    setReviewMode(false);setGroupId(entry.id);setFocusId(entry.start);setDetails(null);
  };
  const showRejected=()=>{
    const first=allRunes.find(rune=>RUNE_VFX_REVIEW_NAMES.includes(rune.english_name));
    setReviewMode(true);if(first)setFocusId(Number(first.rune_id));setDetails(null);
  };
  const reveal=(rune)=>{
    jumpTo(rune);
  };

  return <main className="loc-next-main rune-skin-lab rune-3d-shell rune-3d-library" data-rune-3d-preview="list" data-rune-embodiment="66">
    <header className="rune-3d-header">
      <p className="loc-eyebrow">LUNARUNES · 符文顯現</p>
      <h1>六十六枚符文 · 字之形</h1>
      <p>每枚符文都有自己的文字本體。相近的符文共享合適的字型筆勢，各自以語義、色彩與魔法短暫顯現。</p>
    </header>
    <div className="rune-3d-review-toolbar" role="group" aria-label="符文特效檢視方式">
      <button type="button" className="rune-skin-btn" aria-pressed={!reviewMode}
        onClick={()=>{setReviewMode(false);setFocusId(group.start);setDetails(null);}}>九組符文圖鑑</button>
      <button type="button" className="rune-skin-btn" aria-pressed={reviewMode}
        onClick={showRejected}>退回 7 枚 · 快速驗收</button>
    </div>
    <nav className="rune-3d-group-index rune-3d-library-groups" aria-label="切換符文群組">
      {GROUPS.map(entry=><button type="button" key={entry.id}
        aria-pressed={groupId===entry.id} onClick={()=>selectGroup(entry)}>
        <span>{entry.name}</span><small>{entry.end-entry.start+1} 枚</small>
      </button>)}
    </nav>
    <section className="rune-3d-library-index" aria-label={group.name+'符文字樣'}>
      <div className="rune-3d-library-title">
        <h2>{reviewMode?'退回 7 枚 · 特效驗收':group.name+' · 符文字樣'}</h2>
        <span>{status==='ready'?(reviewMode?runes.length+' 枚待檢視':group.start+'–'+group.end+' / 66'):'資料載入中'}</span>
      </div>
      {status==='loading'?<p role="status" className="rune-3d-library-message">正在載入符文的正式字義與字樣……</p>:null}
      {status==='error'?<div className="rune-3d-library-message" role="alert">
        <p>符文資料無法完整載入：{error}</p>
        <button type="button" className="rune-skin-btn" onClick={()=>{setStatus('loading');setReload(x=>x+1);}}>重新載入符文</button>
      </div>:null}
      {status==='ready'?<div className="rune-3d-glyph-grid">
        {runes.map(rune=>{
          const profile=runeGlyphProfile(rune);
          return <button type="button" key={rune.rune_id}
            className="rune-3d-glyph-tile" aria-pressed={Number(current?.rune_id)===Number(rune.rune_id)}
            aria-label={'顯現 '+runeName(rune)+' 之符文'} onClick={()=>reveal(rune)}>
            <span className={'rune-3d-glyph-letter rune-effekseer-glyph--'+profile.font}
              data-glyph-finish={profile.finish} style={{'--rune-ink':profile.ink}} aria-hidden="true">{runeName(rune)}</span>
            <span className="rune-3d-glyph-english">{rune.english_name}</span>
          </button>;
        })}
      </div>:null}
    </section>
    {current?<section className="rune-3d-library-manifestation" ref={stageRef} aria-label={runeName(current)+'符文顯現'}>
      <div className="rune-3d-library-title">
        <h2>{runeName(current)} · {current.english_name}</h2>
        <span>{reviewMode?'特效集中檢視':group.name+'之符文'}</span>
      </div>
      <div className="rune-3d-stage">
        <EffekseerStage rune={current} vfxOnly={reviewMode} onGlyphClick={()=>setDetails(current)}/>
      </div>
      <div className="rune-3d-library-actions">
        <div className="rune-3d-review-stepping" role="group" aria-label="切換符文特效">
          <button type="button" className="rune-skin-btn" onClick={()=>stepRune(-1)}>← 上一枚</button>
          <span>{Math.max(0,runes.findIndex(rune=>rune.rune_id===current.rune_id))+1} / {runes.length}</span>
          <button type="button" className="rune-skin-btn" onClick={()=>stepRune(1)}>下一枚 →</button>
        </div>
        <button className="rune-skin-btn" type="button" onClick={()=>setDetails(current)}>閱讀符文資料</button>
        <span>選擇上方其他符文，即可觀看它的字型與顯現</span>
      </div>
    </section>:null}
    <footer className="rune-3d-footer">
      <nav className="rune-skin-controls" aria-label="符文模式與返回">
        <a className="rune-skin-btn" href={navigationHref('lrunes','',native)}>回符文首頁</a>
        <a className="rune-skin-btn" href={navigationHref('lrunes','card/list',native)}>返回 2D 圖鑑</a>
        <a className="rune-skin-btn" href={navigationHref('lrunes','card3d/duel',native)}>符文抽牌</a>
        <a className="rune-skin-btn" href={navigationHref('lrunes','card3d/daily',native)}>每日符文</a>
      </nav>
    </footer>
    {details?<div className="rune-3d-modal-backdrop" role="presentation" onClick={()=>setDetails(null)}>
      <section className="rune-3d-modal" role="dialog" aria-modal="true" aria-label={runeName(details)+'符文基本資料'} onClick={event=>event.stopPropagation()}>
        <header className="rune-3d-modal-head">
          <h2>{runeName(details)}之符文 · {details.english_name}</h2>
          <button type="button" className="rune-skin-btn" onClick={()=>setDetails(null)} autoFocus>關閉</button>
        </header>
        <div className="rune-3d-daily-modal-fields">
          <img className="rune-3d-daily-card" src={runeImage(details)} alt={runeName(details)+'原始符文卡面'}/>
          <p>{details.rune_description||details.rune_name}</p>
        </div>
      </section>
    </div>:null}
  </main>;
}
