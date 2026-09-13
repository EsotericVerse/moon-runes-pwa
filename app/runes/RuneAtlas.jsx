'use client';

import { useEffect, useMemo, useState } from 'react';

const GROUP_ORDER=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
const PAGE_SIZE=8;
const GROUP_ENGLISH={靈魂:'Soul',連結:'Connection',生命:'Life',自然:'Nature',礦物:'Mineral',元素:'Element',秩序:'Order',無序:'Disorder',特殊:'Special'};

function runeName(card){return String(card?.符文名稱||'').replace(/之符文$/,'').trim()}
function runeImage(card){const number=String(Number(card?.編號)||0).padStart(2,'0');return `/assets/lunarunes/cards/${number}_${runeName(card)}.png`}
function fieldText(value){return Array.isArray(value)?value.filter(Boolean).join('、'):String(value||'').trim()}
function uniqueText(cards,field,limit=24){return [...new Set(cards.map(card=>fieldText(card?.[field])).filter(Boolean))].slice(0,limit).join('、')}
function splitUnique(cards,field,limit=24){return [...new Set(cards.flatMap(card=>fieldText(card?.[field]).split(/[、,，/]/)).map(value=>value.trim()).filter(Boolean))].slice(0,limit).join('、')}

function RuneQuickCard({card}){
  const number=String(card?.編號??'').padStart(2,'0');
  const name=runeName(card);
  const definition=card?.符文說明||'';
  const archetype=card?.人格原型||'';
  const detailId=`rune-${number}`;
  const openDetail=event=>{
    event.preventDefault();
    const detail=document.getElementById(detailId);
    if(detail){detail.open=true;detail.scrollIntoView({behavior:'smooth',block:'center'});window.history.replaceState({},'',`#${detailId}`);}
  };
  return <article className="runes-library-card" data-rune-id={card?.編號}>
    <img className="runes-library-thumb" src={runeImage(card)} alt={`${name}之符文卡圖`} width="72" height="72" loading="lazy" decoding="async"/>
    <div className="runes-library-card-copy">
      <strong>{number}. <a className="runes-rune-link" href={`#${detailId}`} onClick={openDetail}>{name}之符文</a> {card?.圖騰||''} {card?.英文?`(${card.英文})`:''}</strong>
      <span>{[definition,archetype].filter(Boolean).join(' ／ ')}</span>
    </div>
    <details className="runes-rune-detail" id={detailId}>
      <summary>查看符文細部</summary>
      <div className="runes-rune-detail-grid">
        <span><strong>所屬分組</strong>{card?.所屬分組||'—'}</span>
        <span><strong>月相</strong>{card?.月相||'—'}</span>
        <span><strong>卡片屬性</strong>{card?.卡片屬性||'—'}</span>
        <span><strong>正向關鍵詞</strong>{card?.正向關鍵詞||'—'}</span>
        <span><strong>反向關鍵詞</strong>{card?.反向關鍵詞||'—'}</span>
        {card?.額外規則&&<span><strong>額外規則</strong>{card.額外規則}</span>}
        {card?.額外留意&&<span><strong>額外留意</strong>{card.額外留意}</span>}
      </div>
      <div className="runes-rune-directions">
        <p><strong>正位：</strong>{card?.正向表示||'—'}</p>
        <p><strong>半正位：</strong>{card?.半正向表示||'—'}</p>
        <p><strong>半逆位：</strong>{card?.半逆向表示||'—'}</p>
        <p><strong>逆位：</strong>{card?.逆向表示||'—'}</p>
      </div>
    </details>
  </article>;
}

function GroupRelationMap({name,cards}){
  const english=GROUP_ENGLISH[name]||name;
  const count=Math.max(cards.length,1);
  return <figure className="runes-group-relation" aria-label={`${name}組符文關聯圖`}>
    <figcaption><strong>{name} · {english}</strong><span>群組與所屬符文的語意關聯</span></figcaption>
    <div className={`runes-relation-map ${cards.length<=2?'compact':''} rune-count-${count}`}>
      <div className="runes-relation-center"><span>{name}</span><small>{english}</small></div>
      <div className="runes-relation-nodes">{cards.map((card,index)=><div className={`runes-relation-node rune-node-${index+1}`} key={card.編號}>
        <img src={runeImage(card)} alt="" width="52" height="52" loading="lazy" decoding="async"/>
        <strong>{runeName(card)}</strong>
        <small>{card?.英文||''}</small>
      </div>)}</div>
    </div>
  </figure>;
}

function GroupDetails({name,cards}){
  if(!name||name==='全部')return null;
  const english=GROUP_ENGLISH[name]||name;
  const runeNames=cards.map(runeName).filter(Boolean).join('、');
  const englishNames=cards.map(card=>card?.英文).filter(Boolean).join('、');
  const definitions=uniqueText(cards,'符文說明',12);
  const keywords=[splitUnique(cards,'正向關鍵詞',24),splitUnique(cards,'反向關鍵詞',24)].filter(Boolean).join(' ／ ');
  const archetypes=uniqueText(cards,'人格原型',12);
  const moonPhases=uniqueText(cards,'月相',8);
  const properties=uniqueText(cards,'卡片屬性',8);
  const rules=uniqueText(cards,'額外規則',12);
  const notices=uniqueText(cards,'額外留意',12);
  return <section className="runes-group-detail" aria-label={`${name}組資訊`}>
    <header className="runes-group-title"><p className="loc-eyebrow">{english} · Rune Group</p><h3>{name}組</h3><p>{cards.length} 枚符文：{runeNames||'—'}</p></header>
    <GroupRelationMap name={name} cards={cards}/>
    <div className="runes-group-meta-grid">
      <article><strong>符文構成</strong><span>{runeNames||'—'}</span></article>
      <article><strong>英文名稱</strong><span>{englishNames||'—'}</span></article>
      <article><strong>符文說明</strong><span>{definitions||'—'}</span></article>
      <article><strong>人格原型</strong><span>{archetypes||'—'}</span></article>
      <article><strong>關鍵詞彙</strong><span>{keywords||'—'}</span></article>
      <article><strong>月相</strong><span>{moonPhases||'—'}</span></article>
      <article><strong>卡片屬性</strong><span>{properties||'—'}</span></article>
      {rules&&<article><strong>額外規則</strong><span>{rules}</span></article>}
      {notices&&<article><strong>額外留意</strong><span>{notices}</span></article>}
    </div>
  </section>;
}

export default function RuneAtlas({runes=[],groups=[],group='全部',setGroup}){
  const [page,setPage]=useState(1);
  const availableGroups=new Set(groups.filter(name=>name&&name!=='全部'));
  const groupNames=[...GROUP_ORDER.filter(name=>availableGroups.has(name)),...Array.from(availableGroups).filter(name=>!GROUP_ORDER.includes(name)).sort((a,b)=>String(a).localeCompare(String(b),'zh-Hant'))];
  const sortedRunes=useMemo(()=>[...runes].sort((a,b)=>Number(a?.編號||0)-Number(b?.編號||0)),[runes]);
  const filteredRunes=useMemo(()=>group==='全部'?[]:sortedRunes.filter(card=>card?.所屬分組===group),[sortedRunes,group]);
  const pageCount=Math.max(1,Math.ceil(filteredRunes.length/PAGE_SIZE));
  const pageRunes=filteredRunes.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  useEffect(()=>setPage(1),[group]);
  useEffect(()=>{if(page>pageCount)setPage(pageCount)},[page,pageCount]);
  const chooseGroup=name=>{setPage(1);setGroup?.(name)};

  return <section className="loc-card" id="library">
    <p className="loc-eyebrow">Rune Atlas · 符文圖鑑</p>
    <h2>符文圖鑑</h2>
    <figure className="runes-atlas-overview">
      <img src="/assets/lunarunes/reference/loc_runes_66_overview.jpg" alt="月之符文66總表" loading="lazy" decoding="async"/>
      <figcaption>月之符文 66 符總表</figcaption>
    </figure>
    <p className="loc-subtitle">先選群組，再看關聯與符文；首頁不直接展開全部 66 枚。</p>

    <div className="runes-group-filter-head">
      <h3>群組分類</h3>
      {group!=='全部'&&<button type="button" className="loc-button" onClick={()=>chooseGroup('全部')}>收起群組</button>}
    </div>
    <div className="runes-group-picker">{groupNames.map(name=>{const cards=sortedRunes.filter(card=>card?.所屬分組===name);return <button key={name} type="button" className={`runes-group-choice ${group===name?'active':''}`} aria-pressed={group===name} onClick={()=>chooseGroup(name)}>
      <span className="runes-group-choice-copy"><strong>{name} <small>{GROUP_ENGLISH[name]||name}</small></strong><span>{cards.map(runeName).join('、')}</span></span>
    </button>})}</div>

    {group==='全部'?<p className="runes-atlas-empty">選擇一個群組後，才會顯示該群組的關聯圖、群組資料與符文列表。</p>:<>
      <GroupDetails name={group} cards={filteredRunes}/>
      <div className="runes-group-list"><section className="runes-group-section" data-rune-group={group}>
        <header className="runes-group-title"><h3>{group}組符文</h3><p>{filteredRunes.length} 枚；資料直接取自現行符文母資料投影。</p></header>
        <div className="runes-library-grid">{pageRunes.map(card=><RuneQuickCard card={card} key={card.編號}/>)}</div>
      </section></div>
      {pageCount>1&&<div className="runes-pager"><button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button><span>{page} / {pageCount} · 每頁固定 8 枚</span><button type="button" disabled={page>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一頁</button></div>}
    </>}
    <div className="runes-print-card">
      <div className="runes-print-preview" aria-label="實體符文卡預覽">{sortedRunes.slice(0,4).map(card=><img key={card.編號} src={runeImage(card)} alt={`${runeName(card)}之符文卡`} loading="lazy" decoding="async"/>)}</div>
      <div><strong>實體卡片印製／裁切 PDF</strong><p>這是月之符文實體卡製作用原始排版檔，不是新手教學文件。</p></div>
      <a className="loc-button primary" href="/LunarRunesCardCut.pdf">開啟實體卡印製 PDF</a>
    </div>
  </section>;
}
