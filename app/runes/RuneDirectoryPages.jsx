'use client';

import {useEffect,useMemo,useState} from 'react';
import {fetchLocJson,LOC_DATA} from '../loc/data';
import {GROUPS,groupById,localRuneId,runeImage,runeName} from './rune-directory.mjs';
import {scopeHrefV2} from '../modular-v2/scope-registry.v2';

const listHref=(path='')=>scopeHrefV2('runes',`list${path?'/'+String(path).replace(/^\/+/,''):''}`);
function useRunes(){
  const [rows,setRows]=useState([]);const [error,setError]=useState('');
  useEffect(()=>{let live=true;fetchLocJson(LOC_DATA.RUNES,{memory:true}).then(value=>live&&setRows((Array.isArray(value)?value:[]).filter(row=>Number(row?.編號)>=1&&Number(row?.編號)<=66))).catch(error=>live&&setError(String(error?.message||error)));return()=>{live=false};},[]);
  return{rows,error};
}
function loading(error){return <p className="scope-v2-status">{error||'符文資料從 Neon 載入中…'}</p>;}
function RuneDetails({card}){
  if(!card)return null;
  return <article className="loc-card"><div className="runes-library-card"><img className="loc-rune-card-image" src={runeImage(card)} alt={`${runeName(card)}之符文卡`}/><div className="runes-library-card-copy"><h2>{String(Number(card.編號)).padStart(2,'0')} · {runeName(card)}之符文 · {card.英文}</h2><p>{card.符文說明}</p><p>{card.人格原型}</p></div></div><div className="runes-rune-detail-grid"><span><strong>所屬分組</strong>{card.所屬分組||'—'}</span><span><strong>月相</strong>{card.月相||'—'}</span><span><strong>卡片屬性</strong>{card.卡片屬性||'—'}</span><span><strong>正向關鍵詞</strong>{card.正向關鍵詞||'—'}</span><span><strong>反向關鍵詞</strong>{card.反向關鍵詞||'—'}</span></div><div className="runes-rune-directions"><p><strong>正位：</strong>{card.正向表示||'—'}</p><p><strong>半正位：</strong>{card.半正向表示||'—'}</p><p><strong>半逆位：</strong>{card.半逆向表示||'—'}</p><p><strong>逆位：</strong>{card.逆向表示||'—'}</p></div></article>;
}
export function RuneDirectoryRoot(){
  return <main className="loc-next-main"><section className="loc-view"><header className="loc-hero"><p className="loc-eyebrow">Rune Atlas · 符文圖鑑</p><h1>月之符文圖鑑</h1><p className="loc-subtitle">總圖與群組入口；符文資料由 Neon runtime projection 載入。</p></header><section className="loc-card"><figure className="runes-atlas-overview"><img src="/assets/lunarunes/reference/loc_runes_66_overview.jpg" alt="月之符文 66 符總圖" loading="eager"/><figcaption>月之符文 66 符總圖</figcaption></figure></section><section className="loc-card"><p className="loc-eyebrow">Rune Groups</p><h2>群組列表</h2><div className="runes-group-picker">{GROUPS.map(group=><a key={group.id} className="runes-group-choice" href={listHref(`${group.id}/`)}><img className="runes-group-choice-image" data-rune-group={group.id} src={group.image} alt={`${group.name}組概念圖`} width="144" height="96" loading="lazy"/><span className="runes-group-choice-copy"><strong>{group.id} · {group.name} ({group.english})</strong><small>{group.description}</small></span></a>)}</div></section></section></main>;
}
export function RuneGroupPage({groupId}){
  const group=groupById(groupId);const {rows,error}=useRunes();
  const cards=useMemo(()=>rows.filter(row=>{const id=Number(row?.編號);return group?.id==='09'?[65,66].includes(id):id>=((Number(group?.id||1)-1)*8+1)&&id<=Number(group?.id||1)*8;}).sort((a,b)=>Number(a.編號)-Number(b.編號)),[rows,group]);
  if(!group)return null;
  return <main className="loc-next-main"><section className="loc-view"><header className="loc-hero"><p className="loc-eyebrow">Rune Group · {group.id}</p><h1>{group.name}組 · {group.english}</h1><p className="loc-subtitle">{group.description}</p></header><section className="loc-card"><div className="runes-group-head"><img className="runes-group-choice-image" data-rune-group={group.id} src={group.image} alt={`${group.name}組概念圖`} width="160" height="120"/><div><h2>{group.name}組資訊</h2><p>{group.description}</p><p>符文資料直接讀 Neon；目前顯示 {cards.length} 枚。</p></div></div></section><section className="loc-card"><p className="loc-eyebrow">Runes</p><h2>符文</h2>{error?loading(error):!cards.length?loading(''): <div className="runes-library-grid">{cards.map(card=>{const localId=localRuneId(group.id,card);return <a className="runes-library-card" key={`${group.id}-${localId}`} href={listHref(`${group.id}/${localId}/`)}><img className="runes-library-thumb" src={runeImage(card)} alt={`${runeName(card)}之符文卡`} width="72" height="72" loading="lazy"/><span className="runes-library-card-copy"><strong>{localId} · {runeName(card)}之符文 {card.英文?`(${card.英文})`:''}</strong><small>{card.符文說明||''}</small></span></a>;})}</div>}</section><nav className="loc-card"><a href={listHref()}>回符文圖鑑</a></nav></section></main>;
}
export function RuneDetailPage({groupId,runeId}){
  const group=groupById(groupId);const {rows,error}=useRunes();
  const card=useMemo(()=>rows.find(item=>group&&localRuneId(group.id,item)===String(runeId).padStart(2,'0'))||null,[rows,group,runeId]);
  if(!group)return null;
  return <main className="loc-next-main"><section className="loc-view"><header className="loc-hero"><p className="loc-eyebrow">Rune · {group.id}/{String(runeId).padStart(2,'0')}</p><h1>{card?runeName(card)+'之符文':'符文資料'}</h1><p className="loc-subtitle">{group.name}組 · {card?.英文||'Neon runtime projection'}</p></header>{error?loading(error):card?<RuneDetails card={card}/>:loading('符文資料載入中…')}<nav className="loc-card"><a href={listHref(`${group.id}/`)}>回{group.name}組</a> · <a href={listHref()}>回符文圖鑑</a></nav></section></main>;
}
