'use client';

import {useEffect,useState} from 'react';
import {selectRows} from '../loc/db-query.mjs';
import {groupImage,localRuneId,runeImage,runeName,runeNumberForRoute,runeNumbersForGroup} from './rune-directory.mjs';
import {scopeHref} from '../modular/scope-registry';
import RuneCardInfo from './RuneCardInfo';

const listHref=(path='')=>scopeHref('lrunes',`list${path?'/'+String(path).replace(/^\/+/, ''):''}`);
const RUNE_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,char_action,positive_keywords,negative_keywords,extra_rules,extra_notes';
const RUNE_DETAIL_COLUMNS='rune_evolution_history,myth_story,soul_question,practice_challenge,ritual_advice,harmony_advice';
const GROUP_COLUMNS='group_id,english_name,desc,runeslist';

function groupView(row){
  const runes=Array.isArray(row?.runeslist)?row.runeslist.map(Number).filter(Number.isInteger):[];
  const positive=runes.filter(number=>number>0);
  const first=positive.length?Math.min(...positive):65;
  return {
    ...row,
    id:first>=65?'09':String(Math.floor((first-1)/8)+1).padStart(2,'0'),
    name:row?.group_id||'',
    english:row?.english_name||'',
    description:row?.desc||'',
    runeslist:runes
  };
}

function decodeRuneText(value){
  return String(value??'')
    .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#([0-9]+);/g,(_,decimal)=>String.fromCodePoint(parseInt(decimal,10)))
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
}
function useRuneGroups(){
  const [groups,setGroups]=useState([]),[error,setError]=useState('');
  useEffect(()=>{let live=true;selectRows('silver.runes_group',{columns:GROUP_COLUMNS,limit:9,offset:0}).then(({rows})=>{if(live){setGroups((rows||[]).map(groupView).sort((a,b)=>Number(a.id)-Number(b.id)));setError('');}}).catch(reason=>{if(live)setError(reason?.message||'符文群組讀取失敗');});return()=>{live=false};},[]);
  return {groups,error};
}
function useRuneGroup(groupId){
  const [group,setGroup]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let live=true;const id=Number(groupId);if(!Number.isInteger(id)||id<1||id>9){setGroup(null);setError('找不到符文群組。');return()=>{live=false};}const anchor=id===9?65:(id-1)*8+1;selectRows('silver.runes_group',{columns:GROUP_COLUMNS,filters:[{column:'runeslist',operator:'contains',value:[anchor]}],limit:1,offset:0}).then(({rows})=>{if(live){setGroup(rows?.[0]?groupView(rows[0]):null);setError(rows?.[0]?'':'找不到符文群組。');}}).catch(reason=>{if(live)setError(reason?.message||'符文群組讀取失敗');});return()=>{live=false};},[groupId]);
  return {group,error};
}
function useRuneRows(runeNumbers){
  const key=(runeNumbers||[]).join(',');
  const [runes,setRunes]=useState([]),[error,setError]=useState('');
  useEffect(()=>{let live=true;const ids=[...new Set((runeNumbers||[]).map(Number).filter(Number.isInteger))];if(!ids.length){setRunes([]);setError('');return()=>{live=false};}selectRows('silver.runes',{columns:RUNE_COLUMNS,filters:[{column:'rune_id',operator:'in',value:ids}],orders:[{column:'rune_id',ascending:true}],limit:ids.length,offset:0}).then(({rows})=>{if(live){setRunes(rows||[]);setError('');}}).catch(reason=>{if(live)setError(reason?.message||'符文資料讀取失敗');});return()=>{live=false};},[key]);
  return {runes,error};
}
function useRuneDetail(runeNumber){
  const [card,setCard]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let live=true;if(runeNumber===null){setCard(null);setError('找不到對應符文。');return()=>{live=false};}selectRows('silver.runes',{columns:RUNE_COLUMNS+','+RUNE_DETAIL_COLUMNS,filters:[{column:'rune_id',operator:'eq',value:Number(runeNumber)}],limit:1,offset:0}).then(({rows})=>{if(live){setCard(rows?.[0]||null);setError(rows?.[0]?'':'找不到對應符文。');}}).catch(reason=>{if(live)setError(reason?.message||'符文資料讀取失敗');});return()=>{live=false};},[runeNumber]);
  return {card,error};
}

function RuneDetails({card}){
  if(!card)return null;
  return <article className="loc-card runes-rune-profile-card">
    <RuneCardInfo
      card={card}
      imageSrc={runeImage(card)}
      imageClassName="loc-rune-card-image"
      layout="profile"
    />
    <div className="runes-rune-detail-grid">
      {card.char_action?<span><strong>角色行動</strong>{decodeRuneText(card.char_action)}</span>:null}
      {card.extra_rules?<span><strong>額外規則</strong>{decodeRuneText(card.extra_rules)}</span>:null}
      {card.extra_notes?<span><strong>額外留意</strong>{decodeRuneText(card.extra_notes)}</span>:null}
    </div>
    <div className="home-draw-bubbles runes-rune-long-details" aria-label="符文延伸說明">
      {card.rune_evolution_history?<section className="loc-bubble"><strong>符文歷史</strong><p className="scope-prewrap">{decodeRuneText(card.rune_evolution_history)}</p></section>:null}
      {card.myth_story?<section className="loc-bubble"><strong>神話故事</strong><p className="scope-prewrap">{decodeRuneText(card.myth_story)}</p></section>:null}
      {card.soul_question?<section className="loc-bubble"><strong>靈魂課題</strong><p className="scope-prewrap">{decodeRuneText(card.soul_question)}</p></section>:null}
      {card.practice_challenge?<section className="loc-bubble"><strong>實踐挑戰</strong><p className="scope-prewrap">{decodeRuneText(card.practice_challenge)}</p></section>:null}
      {card.ritual_advice?<section className="loc-bubble"><strong>儀式建議</strong><p className="scope-prewrap">{decodeRuneText(card.ritual_advice)}</p></section>:null}
      {card.harmony_advice?<section className="loc-bubble"><strong>調和建議</strong><p className="scope-prewrap">{decodeRuneText(card.harmony_advice)}</p></section>:null}
    </div>
  </article>;
}

export function RuneDirectoryRoot(){
  const {groups,error}=useRuneGroups();
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><h1>月之符文圖鑑</h1><p className="loc-subtitle">從九組分類開始瀏覽，再進入各組查看符文名稱、月相、方向與基本說明。</p></header>
    <section className="loc-card"><figure className="runes-atlas-overview"><img src="/assets/lunarunes/reference/loc_runes_66_overview.jpg" alt="月之符文 66 符總圖" loading="eager"/><figcaption>月之符文 66 符總圖</figcaption></figure></section>
    <section className="loc-card"><h2>群組列表</h2>
      {error?<p className="loc-error" role="alert">符文群組讀取失敗：{error}</p>:null}
      {!error&&!groups.length?<p className="loc-note">正在讀取符文群組…</p>:null}
      <div className="runes-group-picker">{groups.map(group=><a key={group.id} className="runes-group-choice" href={listHref(`${group.id}/`)}>
        <img className="runes-group-choice-image" data-rune-group={group.id} src={groupImage(group.id)} alt={`${group.name}組概念圖`} width="144" height="96" loading="lazy"/>
        <span className="runes-group-choice-copy"><strong>{group.id} · {group.name}</strong><small>{group.description}</small></span>
      </a>)}</div>
    </section>
  </section></main>;
}

export function RuneGroupPage({groupId}){
  const {group,error:groupError}=useRuneGroup(groupId);
  const {runes:cards,error:runeError}=useRuneRows(runeNumbersForGroup(groupId));
  const error=groupError||runeError;
  if(!group&&!error)return <main className="loc-next-main"><section className="loc-view"><p className="loc-note">正在讀取符文群組…</p></section></main>;
  if(!group)return <main className="loc-next-main"><section className="loc-view"><p className="loc-error" role="alert">{error||'找不到符文群組。'}</p></section></main>;
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">第 {group.id} 組</p><h1>{group.name}組</h1><p className="loc-subtitle">{group.description}</p></header>
    <section className="loc-card">
      {error?<p className="loc-error" role="alert">符文讀取失敗：{error}</p>:null}
      {!error&&!cards.length?<p className="loc-note">正在讀取符文…</p>:null}
      <div className="runes-group-head"><img className="runes-group-choice-image" data-rune-group={group.id} src={groupImage(group.id)} alt={`${group.name}組概念圖`} width="160" height="120"/><div><h2>{group.name}組資訊</h2><p>{group.description}</p><p>符文構成：{cards.map(card=>runeName(card)).join('、')}</p></div></div>
    </section>
    <section className="loc-card"><h2>符文列表</h2><div className="runes-library-grid">
      {cards.map(card=>{const localId=localRuneId(group.id,card);return <a className="runes-library-card" key={`${group.id}-${localId}`} href={listHref(`${group.id}/${localId}/`)}><img className="runes-library-thumb" src={runeImage(card)} alt={`${runeName(card)}之符文卡`} width="72" height="72" loading="lazy"/><span className="runes-library-card-copy"><strong>{localId} · {runeName(card)}之符文</strong><small>{card.rune_description||''}</small></span></a>;})}
    </div></section>
    <nav className="loc-card"><a href={listHref()}>回符文圖鑑</a></nav>
  </section></main>;
}

export function RuneDetailPage({groupId,runeId}){
  const runeNumber=runeNumberForRoute(groupId,runeId);
  const {group,error:groupError}=useRuneGroup(groupId);
  const {card,error:runeError}=useRuneDetail(runeNumber);
  const error=groupError||runeError;
  if((!group||!card)&&!error)return <main className="loc-next-main"><section className="loc-view"><p className="loc-note">正在讀取符文…</p></section></main>;
  if(!group||!card)return <main className="loc-next-main"><section className="loc-view"><p className="loc-error" role="alert">{error||'找不到對應符文。'}</p></section></main>;
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">{group.name}組 · 第 {String(runeId).padStart(2,'0')} 枚</p><h1>{runeName(card)}之符文</h1><p className="loc-subtitle">{group.name}組</p></header>
    <RuneDetails card={card}/>
    <nav className="loc-card"><a href={listHref(`${group.id}/`)}>回{group.name}組</a> · <a href={listHref()}>回符文圖鑑</a></nav>
  </section></main>;
}
