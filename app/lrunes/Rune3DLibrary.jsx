'use client';

import {useEffect,useRef,useState} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {selectRows} from '../loc/db-query.mjs';
import RuneArtStage from './visual/RuneArtStage';
import RuneCardInfo from './RuneCardInfo';
import EffekseerStage from './effekseer/EffekseerStage';
import {groupImage,runeImage,runeName} from './rune-directory.mjs';
import {navigationHref} from '../modular/nav-destinations.mjs';
import useNativeNavigation from '../modular/use-native-navigation';
import './skin-lab.css';
import './visual/rune-art-layout.css';
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
const RUNE_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,char_action,positive_keywords,negative_keywords,extra_rules,extra_notes,rune_evolution_history,myth_story,soul_question,practice_challenge,ritual_advice,harmony_advice';
const GROUP_COLUMNS='group_id,english_name,desc,quality,style,runeslist';
const inGroup=(rune,group)=>Number(rune.rune_id)>=group.start&&Number(rune.rune_id)<=group.end;
function cleanse(value){
  return String(value??'').replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#([0-9]+);/g,(_,n)=>String.fromCodePoint(parseInt(n,10)))
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
}
function groupIndex(row){
  const ids=(Array.isArray(row?.runeslist)?row.runeslist:[])
    .map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=64);
  return ids.length?Math.floor((Math.min(...ids)-1)/8):8;
}

export default function Rune3DLibrary(){
  const native=useNativeNavigation();
  const [allRunes,setAllRunes]=useState([]);
  const [groupRows,setGroupRows]=useState([]);
  const [groupError,setGroupError]=useState('');
  const [groupId,setGroupId]=useState(null);
  const [focusId,setFocusId]=useState(null);
  const [showCardInfo,setShowCardInfo]=useState(false);
  const [playback,setPlayback]=useState(0);
  const [textureQuality,setTextureQuality]=useState('original');
  useEffect(()=>{
    setTextureQuality(new URLSearchParams(window.location.search).get('texture256')==='1'?'hd256':'original');
  },[]);
  const reducedMotion=useReducedMotion();
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

  useEffect(()=>{
    let active=true;
    selectRows('silver.runes_group',{columns:GROUP_COLUMNS,limit:9,offset:0})
      .then(({rows})=>{
        if(!active)return;
        if((rows||[]).length!==9)throw Error('群組資料不完整：'+(rows||[]).length+' / 9');
        setGroupRows(rows);setGroupError('');
      }).catch(err=>{if(active)setGroupError('群組文字資料暫時無法載入：'+String(err?.message||err));});
    return()=>{active=false;};
  },[reload]);

  const groups=GROUPS.map(entry=>{
    const row=groupRows.find(value=>groupIndex(value)===entry.id-1);
    return {...entry,english_name:cleanse(row?.english_name),
      desc:cleanse(row?.desc),quality:cleanse(row?.quality),style:cleanse(row?.style),
      runeslist:Array.from({length:entry.end-entry.start+1},(_,index)=>entry.start+index)};
  });
  const group=groups.find(item=>item.id===groupId)||null;
  const runes=group?allRunes.filter(rune=>inGroup(rune,group)):[];
  const current=focusId===null?null:runes.find(rune=>Number(rune.rune_id)===focusId)||null;
  const runePosition=Math.max(0,runes.findIndex(rune=>Number(rune.rune_id)===Number(current?.rune_id)));

  useEffect(()=>{
    if(focusId!==null)stageRef.current?.scrollIntoView({behavior:'smooth',block:'start'});
  },[focusId]);
  const jumpTo=rune=>{
    if(!rune)return;
    setShowCardInfo(false);
    setPlayback(n=>n+1);
    setFocusId(Number(rune.rune_id));
  };
  const selectGroup=entry=>{
    setGroupId(entry.id);setFocusId(null);setShowCardInfo(false);
    window.scrollTo?.({top:0,behavior:'smooth'});
  };
  const backToGroups=()=>{
    setGroupId(null);setFocusId(null);setShowCardInfo(false);
    window.scrollTo?.({top:0,behavior:'smooth'});
  };
  const stepRune=delta=>{
    if(!runes.length||!current)return;
    jumpTo(runes[(runePosition+delta+runes.length)%runes.length]);
  };

  return <main className="loc-next-main rune-skin-lab rune-3d-shell rune-3d-library"
    data-rune-3d-preview="list" data-rune-embodiment="66">
    <header className="rune-3d-header">
      <p className="loc-eyebrow">LUNARUNES · 符文圖鑑</p>
      <h1>{group?group.name+'組 · 3D 符文圖鑑':'六十六枚符文 · 3D 圖鑑'}</h1>
      <p>{group?'群組畫作展開後，點選符文卡圖，即可觀看該枚符文的 3D Effekseer 顯現。':
        '以九個群組的原創圖片為入口，展開符文畫廊，不再使用星系式選單。'}</p>
    </header>
    {status==='loading'?<p className="rune-3d-library-message" role="status">正在載入六十六枚符文……</p>:null}
    {status==='error'?<div className="rune-3d-library-message" role="alert">
      <p>符文資料無法完整載入：{error}</p>
      <button type="button" className="rune-skin-btn" onClick={()=>{setStatus('loading');setReload(n=>n+1);}}>重新載入</button>
    </div>:null}
    {groupError?<p className="rune-3d-atlas-data-warning" role="status">{groupError}（原創群組畫作仍可瀏覽）</p>:null}
    {status==='ready'&&!group?<section className="rune-3d-atlas-gallery" aria-label="九大群組原創圖片">
      <RuneArtStage mode="groups" items={groups} onSelect={selectGroup}
        galleryTitle="九大符文群組" galleryDescription="點選原創畫作，展開群組介紹與符文卡圖。"/>
    </section>:null}
    {status==='ready'&&group?<>
      <nav className="rune-3d-atlas-back" aria-label="返回群組畫廊">
        <button type="button" className="rune-skin-btn" onClick={backToGroups}>← 返回九個群組</button>
        <span>第 {String(group.id).padStart(2,'0')} / 09 組 · {runes.length} 枚</span>
      </nav>
      <section className="rune-3d-atlas-group-hero" aria-label={group.name+'群組原創畫作與介紹'}>
        <div className="rune-3d-atlas-group-artwork">
          <img src={groupImage(group.id)} alt={group.name+'群組原創畫作'} loading="eager" decoding="async"/>
        </div>
        <div className="rune-3d-atlas-group-copy">
          <p className="loc-eyebrow">RUNE GROUP · {String(group.id).padStart(2,'0')} / 09</p>
          <h2>{group.name}組</h2>
          {group.english_name?<p className="rune-3d-atlas-group-en">{group.english_name}</p>:null}
          {group.desc?<p className="rune-3d-atlas-group-description">{group.desc}</p>:null}
          {group.quality&&group.quality!=='風格特徵'?<p><strong>群組特徵：</strong>{group.quality}</p>:null}
          {group.style&&group.style!=='style / trait'?<p><strong>風格：</strong>{group.style}</p>:null}
          <p>本群組收錄 {runes.length} 枚 3D 符文</p>
        </div>
      </section>
      <section className="rune-3d-atlas-gallery" aria-label={group.name+'原創符文卡圖'}>
        <RuneArtStage mode="runes" items={runes} onSelect={jumpTo}
          galleryTitle={group.name+' · 符文卡圖'}
          galleryDescription="符文卡圖、原始敘述與基本屬性均完整呈現；點選卡圖觀看專屬 3D 演出。"
          runeActionLabel="觀看 3D 顯現"/>
      </section>
    </>:null}

    {status==='ready'&&current?<section className="rune-3d-library-manifestation" ref={stageRef}
      aria-label={runeName(current)+'符文 3D 顯現'}>
      <div className="rune-3d-library-title">
        <h2>{runeName(current)} · {current.english_name}</h2>
        <span>第 {current.rune_id} / 66 枚 · {group.name}</span>
        <button type="button" className="rune-skin-btn" aria-pressed={textureQuality==='hd256'}
          onClick={()=>{
            setTextureQuality(value=>value==='hd256'?'original':'hd256');
            setPlayback(value=>value+1);setShowCardInfo(false);
          }}>{textureQuality==='hd256'?'粒子貼圖：256 測試':'粒子貼圖：原版'}</button>
      </div>
      <div className={'rune-3d-stage rune-3d-atlas-performance'+(showCardInfo?' rune-3d-atlas-performance--reading':'')}>
        <EffekseerStage key={current.rune_id+'-'+playback} rune={current} vfxOnly textureQuality={textureQuality}
          onPlaybackComplete={()=>setShowCardInfo(true)}/>
        {showCardInfo?<motion.div key={'reading-'+current.rune_id+'-'+playback}
          className="rune-3d-atlas-reading" role="region" aria-label={runeName(current)+'原始符文卡片資料'}
          initial={reducedMotion?false:{opacity:0,y:20}}
          animate={{opacity:1,y:0}}
          transition={{duration:reducedMotion?0:.75,ease:'easeOut'}}>
          <div className="rune-3d-atlas-reading-inner">
            <p className="loc-eyebrow">RUNE ARCHIVE · {String(current.rune_id).padStart(2,'0')} / 66</p>
            <h3 className="rune-3d-atlas-reading-title">{runeName(current)}之符文 · 詳細資料</h3>
            <RuneCardInfo card={current} imageSrc={runeImage(current)} layout="home" expandKeywords/>
            <div className="rune-3d-atlas-reading-details" aria-label="符文完整延伸敘述">
              {[
                ['角色行動',current.char_action],['額外規則',current.extra_rules],
                ['額外留意',current.extra_notes],['符文歷史',current.rune_evolution_history],
                ['神話故事',current.myth_story],['靈魂課題',current.soul_question],
                ['實踐挑戰',current.practice_challenge],['儀式建議',current.ritual_advice],
                ['調和建議',current.harmony_advice]
              ].filter(([,value])=>String(value??'').trim()).map(([label,value])=>
                <section key={label} className="rune-3d-atlas-reading-detail">
                  <h4>{label}</h4>
                  <p>{cleanse(Array.isArray(value)?value.join('、'):value)}</p>
                </section>)}
            </div>
            <div className="rune-3d-atlas-reading-actions">
              <button type="button" className="rune-skin-btn" onClick={()=>{
                setShowCardInfo(false);setPlayback(n=>n+1);
              }}>重播符文演出</button>
            </div>
          </div>
        </motion.div>:null}
      </div>
      <div className="rune-3d-library-actions">
        <div className="rune-3d-review-stepping" role="group" aria-label="前後符文">
          <button type="button" className="rune-skin-btn" onClick={()=>stepRune(-1)}>← 上一枚</button>
          <span>{runePosition+1} / {runes.length}</span>
          <button type="button" className="rune-skin-btn" onClick={()=>stepRune(1)}>下一枚 →</button>
        </div>

      </div>
    </section>:null}

    <footer className="rune-3d-footer">
      <nav className="rune-skin-controls" aria-label="符文圖鑑導覽">
        <a className="rune-skin-btn" href={navigationHref('lrunes','',native)}>回符文首頁</a>
        <a className="rune-skin-btn" href={navigationHref('lrunes','card/list',native)}>2D 符文圖鑑</a>
      </nav>
    </footer>


  </main>;
}
