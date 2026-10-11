'use client';

import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {selectRows} from '../../loc/db-query.mjs';
import {runeImage} from '../rune-directory.mjs';
import '../skin-lab.css';
import '../three/rune-world.css';

const RuneWorld=dynamic(()=>import('../three/RuneWorld'),{ssr:false,loading:()=> <p className="rune-world-loading">月之星域正在形成……</p>});
const GROUP_COLUMNS='group_id,english_name,desc,runeslist';
const DETAIL_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,char_action,positive_keywords,negative_keywords,extra_rules,extra_notes,rune_evolution_history,myth_story,soul_question,practice_challenge,ritual_advice,harmony_advice';
const GROUP_NAMES=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
function cleanse(value){
  return String(value??'').replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#([0-9]+);/g,(_,n)=>String.fromCodePoint(parseInt(n,10)))
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
}
function groupIndex(row){
  const nums=Array.isArray(row?.runeslist)?row.runeslist.map(Number).filter(Number.isInteger):[];
  const a=nums.filter(n=>n>=1&&n<=64);
  return a.length?Math.floor((Math.min(...a)-1)/8):8;
}
function RuneInfoDialog({rune,onClose}){
  useEffect(()=>{
    const escape=e=>{if(e.key==='Escape')onClose();};
    window.addEventListener('keydown',escape);
    return()=>window.removeEventListener('keydown',escape);
  },[onClose]);
  const details=[
    ['符文本義',rune.rune_description],['原型',rune.archetype],
    ['角色行動',rune.char_action],['正向關鍵詞',rune.positive_keywords],
    ['負向關鍵詞',rune.negative_keywords],['額外規則',rune.extra_rules],
    ['額外留意',rune.extra_notes],['符文歷史',rune.rune_evolution_history],
    ['神話故事',rune.myth_story],['靈魂課題',rune.soul_question],
    ['實踐挑戰',rune.practice_challenge],['儀式建議',rune.ritual_advice],
    ['調和建議',rune.harmony_advice]
  ].filter(([,value])=>String(value??'').trim());
  return <div className="rune-3d-modal-backdrop" role="presentation" onClick={onClose}>
    <section className="rune-3d-modal" role="dialog" aria-modal="true" aria-label={rune.rune_name+'符文資料'} onClick={e=>e.stopPropagation()}>
      <div className="rune-3d-modal-head">
        <div><span className="loc-eyebrow">RUNE ARCHIVE · {String(rune.rune_id).padStart(2,'0')}</span>
          <h2>{rune.rune_name}</h2>
          <p>{rune.english_name||''}　{rune.group_name||''}</p>
        </div>
        <button className="rune-skin-btn" type="button" autoFocus onClick={onClose} aria-label="關閉資訊視窗">× 關閉</button>
      </div>
      <div className="rune-3d-modal-main">
        <img src={runeImage(rune)} alt={rune.rune_name+'原始卡圖'} loading="lazy"/>
        <div className="rune-3d-modal-details">
          {details.map(([label,value])=><div key={label}>
            <h3>{label}</h3>
            <p>{cleanse(Array.isArray(value)?value.join('、'):value)}</p>
          </div>)}
        </div>
      </div>
    </section>
  </div>;
}
export default function RuneAtlasLab(){
  const [groups,setGroups]=useState([]);
  const [group,setGroup]=useState(null);
  const [preview,setPreview]=useState(null);
  const [runes,setRunes]=useState([]);
  const [details,setDetails]=useState(null);
    const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    selectRows('silver.runes_group',{columns:GROUP_COLUMNS,limit:9,offset:0})
      .then(({rows})=>{if(active){
        setGroups((rows||[]).map(row=>({...row,index:groupIndex(row)}))
          .sort((a,b)=>a.index-b.index).map((row,i)=>({
            ...row,id:row.index+1,name:row.group_id||GROUP_NAMES[i],
            runeslist:Array.isArray(row.runeslist)?row.runeslist.map(Number):[]
          })));
      }})
      .catch(e=>{if(active)setError('群組載入失敗：'+String(e?.message||e));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false};
  },[]);
  useEffect(()=>{
    let active=true;
    if(!group){setRunes([]);return()=>{active=false;};}
    const ids=[...new Set(group.runeslist.map(Number).filter(n=>Number.isInteger(n)&&n>=0))];
    if(!ids.length){setRunes([]);return()=>{active=false;};}
    setLoading(true);setError('');
    selectRows('silver.runes',{columns:DETAIL_COLUMNS,
      filters:[{column:'rune_id',operator:'in',value:ids}],
      orders:[{column:'rune_id',ascending:true}],limit:ids.length,offset:0
    }).then(({rows})=>{if(active)setRunes(rows||[]);})
      .catch(e=>{if(active)setError('符文讀取失敗：'+String(e?.message||e));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[group]);
  // Nested URL history makes native/PWA Back behave as expected:
  // rune dialog → eight-rune orbit → nine-group orbit → /card hub.
  const previewGroup=entry=>{
    window.history.pushState({runeCardLevel:'preview'},'','#preview-'+entry.id);
    setPreview(entry);setGroup(null);setDetails(null);
  };
  const closePreview=()=>{
    if(window.history.state?.runeCardLevel==='preview')window.history.back();
    else{window.history.replaceState({},'',window.location.pathname);setPreview(null);}
  };
  const enterGroup=entry=>{
    window.history.pushState({runeCardLevel:'group'},'','#group-'+entry.id);
    setGroup(entry);setPreview(null);setDetails(null);
  };
  const show=card=>{
    if(!group)return;
    window.history.pushState({runeCardLevel:'rune'},'','#group-'+group.id+'/rune-'+card.rune_id);
    setDetails(card);
  };
  const closeDetails=()=>{
    if(window.history.state?.runeCardLevel==='rune')window.history.back();
    else{
      window.history.replaceState({},'','#group-'+group.id);
      setDetails(null);
    }
  };
  const backToGroups=()=>{
    if(window.history.state?.runeCardLevel==='group')window.history.back();
    else{
      window.history.replaceState({},'',window.location.pathname);
      setGroup(null);setDetails(null);
    }
  };
  useEffect(()=>{
    const syncLocation=()=>{
      const match=new RegExp('^#group-([0-9]+)(?:/rune-([0-9]+))?$').exec(window.location.hash);
      if(!match){
        const selected=/^#preview-([0-9]+)$/.exec(window.location.hash);
        setPreview(selected?groups.find(x=>Number(x.id)===Number(selected[1]))||null:null);
        setGroup(null);setDetails(null);return;
      }
      setPreview(null);
      const g=groups.find(x=>Number(x.id)===Number(match[1]));
      setGroup(g||null);
      const id=Number(match[2]);
      setDetails(id?(runes.find(r=>Number(r.rune_id)===id)||null):null);
    };
    window.addEventListener('popstate',syncLocation);
    window.addEventListener('hashchange',syncLocation);
    syncLocation();
    return()=>{
      window.removeEventListener('popstate',syncLocation);
      window.removeEventListener('hashchange',syncLocation);
    };
  },[groups,runes]);
  const display=useMemo(()=>group?runes:groups,[group,runes,groups]);
  return <main className="loc-next-main rune-skin-lab rune-3d-shell" data-rune-lab="list2">
    <header className="rune-3d-header">
      <p className="loc-eyebrow">LunaRunes · Living Atlas</p>
      <h1>{group?group.name+'之符文':'月之符文 · 九曜星域'}</h1>
      <p>{group?'符文在星環中恆動。輕觸任一符文，它會回應你的觸摸，原有圖鑑文字隨即浮現。':
        '九顆群組星球持續環繞月亮。先點選星球閱讀群組說明，再按「進入」查看符文。'}</p>
    </header>
    <nav className="rune-3d-toolbar" aria-label="圖鑑視角">
      {group?<button className="rune-skin-btn" onClick={backToGroups}>← 回九群組</button>:<span className="rune-3d-toolbar-label">九大符文群組 · 恆動展示</span>}

    </nav>
    <section className="rune-3d-stage" aria-label="真實 3D 符文星域">
      <RuneWorld mode={group?'runes':'groups'} items={display} quality="high"
        onSelect={group?show:previewGroup}/>
      <div className="rune-3d-stage-label">{loading?'星域載入中……':
        error||(!group?'點選星球閱讀群組說明，再按「進入」查看符文':'輕觸符文，查看原有文字資料')}</div>
      {preview&&!group?<section className="rune-3d-group-preview" role="dialog" aria-label={preview.name+'群組說明'}>
        <p className="loc-eyebrow">RUNE CONSTELLATION · {String(preview.id).padStart(2,'0')}</p>
        <h2>{preview.name}</h2><p className="rune-3d-group-en">{preview.english_name||''}</p>
        <p className="rune-3d-group-description">{cleanse(preview.desc||'')}</p>
        <p className="rune-3d-group-count">本群組 {preview.runeslist.length} 枚符文</p>
        <div className="rune-skin-controls">
          <button type="button" className="rune-skin-btn primary" onClick={()=>enterGroup(preview)}>進入</button>
          <button type="button" className="rune-skin-btn" onClick={closePreview}>返回九星球</button>
        </div>
      </section>:null}
    </section>
    {!group?<nav className="rune-3d-group-index" aria-label="九個符文群組">
      {groups.map(item=><button key={item.id} type="button"
        className="rune-3d-group-name-btn" onClick={()=>previewGroup(item)}>{item.name}</button>)}
    </nav>:null}
    <footer className="rune-3d-footer">
      <span>使用拖曳可變換觀看角度 · 場景始終恆動</span>
      <nav className="rune-skin-controls" aria-label="返回與模式切換">
        <a href="/card/" className="rune-skin-btn">← 3D 場域首頁</a>
        <a href="/card/duel/" className="rune-skin-btn">切換隨機抽牌</a>
        <a href="/list/" className="rune-skin-btn">舊版圖鑑</a>
      </nav>
    </footer>
    {details?<RuneInfoDialog rune={details} onClose={closeDetails}/>:null}
  </main>;
}
