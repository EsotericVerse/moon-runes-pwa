'use client';

import {useEffect,useState} from 'react';
import {selectRuneDetail,selectRuneGroup,selectRuneGroupCatalog,selectRuneRows} from '../loc/rune-repository';
import {groupImage,localRuneId,runeImage,runeName,runeNumberForRoute,runeNumbersForGroup} from './rune-directory.mjs';
import {scopeHrefV2} from '../modular-v2/scope-registry.v2';

const listHref=(path='')=>scopeHrefV2('lunarunes',`list${path?'/'+String(path).replace(/^\/+/, ''):''}`);

function decodeRuneText(value){
  return String(value??'')
    .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#([0-9]+);/g,(_,decimal)=>String.fromCodePoint(parseInt(decimal,10)))
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
}
function useRuneGroups(){
  const [groups,setGroups]=useState([]),[error,setError]=useState('');
  useEffect(()=>{let live=true;selectRuneGroupCatalog().then(rows=>{if(live){setGroups(rows||[]);setError('');}}).catch(reason=>{if(live)setError(reason?.message||'Neon 符文群組讀取失敗');});return()=>{live=false};},[]);
  return {groups,error};
}
function useRuneGroup(groupId){
  const [group,setGroup]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let live=true;selectRuneGroup(groupId).then(row=>{if(live){setGroup(row);setError('');}}).catch(reason=>{if(live)setError(reason?.message||'Neon 符文群組讀取失敗');});return()=>{live=false};},[groupId]);
  return {group,error};
}
function useRuneRows(runeNumbers){
  const key=(runeNumbers||[]).join(',');
  const [runes,setRunes]=useState([]),[error,setError]=useState('');
  useEffect(()=>{let live=true;selectRuneRows(runeNumbers).then(rows=>{if(live){setRunes(rows||[]);setError('');}}).catch(reason=>{if(live)setError(reason?.message||'Neon canonical 讀取失敗');});return()=>{live=false};},[key]);
  return {runes,error};
}
function useRuneDetail(runeNumber){
  const [card,setCard]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let live=true;if(runeNumber===null){setCard(null);setError('找不到對應符文。');return()=>{live=false};}selectRuneDetail(runeNumber).then(row=>{if(live){setCard(row);setError(row?'':'找不到對應符文。');}}).catch(reason=>{if(live)setError(reason?.message||'Neon canonical 讀取失敗');});return()=>{live=false};},[runeNumber]);
  return {card,error};
}

function RuneDetails({card}){
  if(!card)return null;
  return <article className="loc-card runes-rune-profile-card">
    <div className="runes-rune-profile">
      <img className="loc-rune-card-image" src={runeImage(card)} alt={`${runeName(card)}之符文卡`}/>
      <div className="runes-rune-profile-copy">
        <h2>{String(Number(card.rune_number)).padStart(2,'0')} · {runeName(card)}之符文 · {decodeRuneText(card.english_name)}</h2>
        {card.rune_description?<p>{decodeRuneText(card.rune_description)}</p>:null}
        {card.personality_archetype?<p>{decodeRuneText(card.personality_archetype)}</p>:null}
      </div>
    </div>
    <div className="runes-rune-detail-grid">
      <span><strong>所屬分組</strong>{decodeRuneText(card.group_name||'—')}</span>
      <span><strong>月相</strong>{decodeRuneText(card.moon_phase||'—')}</span>
      <span><strong>卡片屬性</strong>{decodeRuneText(card.card_attribute||'—')}</span>
      <span><strong>正向關鍵詞</strong>{decodeRuneText(card.positive_keywords||'—')}</span>
      <span><strong>反向關鍵詞</strong>{decodeRuneText(card.negative_keywords||'—')}</span>
      {card.character_action?<span><strong>角色行動</strong>{decodeRuneText(card.character_action)}</span>:null}
      {card.extra_rules?<span><strong>額外規則</strong>{decodeRuneText(card.extra_rules)}</span>:null}
      {card.extra_notes?<span><strong>額外留意</strong>{decodeRuneText(card.extra_notes)}</span>:null}
    </div>
    <div className="loc-context-list runes-rune-long-details">
      {card.rune_evolution_history?<section className="loc-context-item"><strong>符文歷史</strong><span>{decodeRuneText(card.rune_evolution_history)}</span></section>:null}
      {card.myth_story?<section className="loc-context-item"><strong>神話故事</strong><span>{decodeRuneText(card.myth_story)}</span></section>:null}
      {card.soul_question?<section className="loc-context-item"><strong>靈魂課題</strong><span>{decodeRuneText(card.soul_question)}</span></section>:null}
      {card.practice_challenge?<section className="loc-context-item"><strong>實踐挑戰</strong><span>{decodeRuneText(card.practice_challenge)}</span></section>:null}
      {card.ritual_advice?<section className="loc-context-item"><strong>儀式建議</strong><span>{decodeRuneText(card.ritual_advice)}</span></section>:null}
      {card.harmony_advice?<section className="loc-context-item"><strong>調和建議</strong><span>{decodeRuneText(card.harmony_advice)}</span></section>:null}
    </div>
  </article>;
}

export function RuneDirectoryRoot(){
  const {groups,error}=useRuneGroups();
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Rune Atlas · 符文圖鑑</p><h1>月之符文圖鑑</h1><p className="loc-subtitle">總圖與群組入口。入口頁不直接展開 1–66 符文列表。</p></header>
    <section className="loc-card"><figure className="runes-atlas-overview"><img src="/assets/lunarunes/reference/loc_runes_66_overview.jpg" alt="月之符文 66 符總圖" loading="eager"/><figcaption>月之符文 66 符總圖</figcaption></figure></section>
    <section className="loc-card"><p className="loc-eyebrow">Rune Groups</p><h2>群組列表</h2>
      {error?<p className="loc-error" role="alert">符文群組讀取失敗：{error}</p>:null}
      {!error&&!groups.length?<p className="loc-note">正在從 Neon 讀取符文群組…</p>:null}
      <div className="runes-group-picker">{groups.map(group=><a key={group.id} className="runes-group-choice" href={listHref(`${group.id}/`)}>
        <img className="runes-group-choice-image" data-rune-group={group.id} src={groupImage(group.id)} alt={`${group.name}組概念圖`} width="144" height="96" loading="lazy"/>
        <span className="runes-group-choice-copy"><strong>{group.id} · {group.name} ({group.english})</strong><small>{group.description}</small></span>
      </a>)}</div>
    </section>
  </section></main>;
}

export function RuneGroupPage({groupId}){
  const {group,error:groupError}=useRuneGroup(groupId);
  const {runes:cards,error:runeError}=useRuneRows(runeNumbersForGroup(groupId));
  const error=groupError||runeError;
  if(!group&&!error)return <main className="loc-next-main"><section className="loc-view"><p className="loc-note">正在從 Neon 讀取符文群組…</p></section></main>;
  if(!group)return <main className="loc-next-main"><section className="loc-view"><p className="loc-error" role="alert">{error||'找不到符文群組。'}</p></section></main>;
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Rune Group · {group.id}</p><h1>{group.name}組 · {group.english}</h1><p className="loc-subtitle">{group.description}</p></header>
    <section className="loc-card">
      {error?<p className="loc-error" role="alert">符文讀取失敗：{error}</p>:null}
      {!error&&!cards.length?<p className="loc-note">正在從 Neon 讀取符文…</p>:null}
      <div className="runes-group-head"><img className="runes-group-choice-image" data-rune-group={group.id} src={groupImage(group.id)} alt={`${group.name}組概念圖`} width="160" height="120"/><div><h2>{group.name}組資訊</h2><p>{group.description}</p><p>符文構成：{cards.map(card=>runeName(card)).join('、')}</p></div></div>
    </section>
    <section className="loc-card"><p className="loc-eyebrow">Runes</p><h2>符文</h2><div className="runes-library-grid">
      {cards.map(card=>{const localId=localRuneId(group.id,card);return <a className="runes-library-card" key={`${group.id}-${localId}`} href={listHref(`${group.id}/${localId}/`)}><img className="runes-library-thumb" src={runeImage(card)} alt={`${runeName(card)}之符文卡`} width="72" height="72" loading="lazy"/><span className="runes-library-card-copy"><strong>{localId} · {runeName(card)}之符文 {card.english_name?`(${card.english_name})`:''}</strong><small>{card.rune_description||''}</small></span></a>;})}
    </div></section>
    <nav className="loc-card"><a href={listHref()}>回符文圖鑑</a></nav>
  </section></main>;
}

export function RuneDetailPage({groupId,runeId}){
  const runeNumber=runeNumberForRoute(groupId,runeId);
  const {group,error:groupError}=useRuneGroup(groupId);
  const {card,error:runeError}=useRuneDetail(runeNumber);
  const error=groupError||runeError;
  if((!group||!card)&&!error)return <main className="loc-next-main"><section className="loc-view"><p className="loc-note">正在從 Neon 讀取符文…</p></section></main>;
  if(!group||!card)return <main className="loc-next-main"><section className="loc-view"><p className="loc-error" role="alert">{error||'找不到對應符文。'}</p></section></main>;
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Rune · {group.id}/{String(runeId).padStart(2,'0')}</p><h1>{runeName(card)}之符文</h1><p className="loc-subtitle">{group.name}組 · {card.english_name}</p></header>
    <RuneDetails card={card}/>
    <nav className="loc-card"><a href={listHref(`${group.id}/`)}>回{group.name}組</a> · <a href={listHref()}>回符文圖鑑</a></nav>
  </section></main>;
}
