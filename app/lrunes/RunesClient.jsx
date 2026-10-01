'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {selectNeonRows} from '../loc/neon-query';
import { useNeonSetting } from '../loc/use-neon-setting';
import { realMoonPhase } from '../loc/model/moon-phase';
import { buildRuneGraph, searchRuneGraph } from '../loc/model/rune-graph-core.js';
import {scopeHrefV2,scopeOriginV2} from '../modular-v2/scope-registry.v2';
import RuneSingleReading from './RuneSingleReading';
import RuneCardInfo from './RuneCardInfo';
import {RUNE_RITUAL_DELAY_MS,RUNE_RITUAL_STEP_MS,runeRitualMessages} from './rune-ritual';
import {RUNE_DRAW_MODES as MODES} from './rune-draw-modes.mjs';

const ROTATION_CLASSES=['rune-rotate-0','rune-rotate-90','rune-rotate-n90','rune-rotate-180'];
const RUNE_DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);

function randomIndex(max){
  if(max<=1)return 0;
  if(globalThis.crypto?.getRandomValues){
    const limit=Math.floor(0x100000000/max)*max;
    const value=new Uint32Array(1);
    do globalThis.crypto.getRandomValues(value);while(value[0]>=limit);
    return value[0]%max;
  }
  return Math.floor(Math.random()*max);
}
function drawRuneSession(items,count){
  if(!Number.isInteger(count)||count<0||count>items.length)throw new Error(`無效的抽牌數量：${count}`);
  const pool=[...items],cards=[];
  for(let index=0;index<count;index+=1){
    const pick=randomIndex(pool.length);
    cards.push(pool.splice(pick,1)[0]);
  }
  const directionIndexes=cards.map(()=>randomIndex(4));
  return {cards,directionIndexes,directions:directionIndexes.map(index=>RUNE_DIRECTIONS[index])};
}
const RUNE_COLUMNS='rune_id,rune_name,english_name,group_name,moon_phase,card_attr,rune_description,positive_keywords,negative_keywords,extra_rules,extra_notes';
const DRAW_RUNE_COLUMNS=RUNE_COLUMNS+',totem,archetype';
const MOON_PHASE_LABELS=Object.freeze({1:'新月',2:'上弦',3:'滿月',4:'下弦'});
function directionNo(direction){return RUNE_DIRECTIONS.indexOf(direction)+1;}
async function loadDrawCards(pairs,types){
  const ids=[...new Set(pairs.map(item=>Number(item.runeNumber)))];
  const [runeResult,etcResult]=await Promise.all([
    selectNeonRows('silver.runes',{
      columns:DRAW_RUNE_COLUMNS,
      filters:[{column:'rune_id',operator:'in',value:ids}],
      limit:ids.length,
      offset:0
    }),
    selectNeonRows('silver.runes_etc',{
      columns:'rune_id,dir,type,desc',
      filters:[{column:'type',operator:'in',value:types}],
      orFilter:pairs.map(item=>`and(rune_id.eq.${Number(item.runeNumber)},dir.eq.${Number(item.dir)})`).join(','),
      limit:Math.max(1,pairs.length*types.length),
      offset:0
    })
  ]);
  const map=new Map((runeResult.rows||[]).map(row=>[Number(row.rune_id),{...row,rune_etc:{}}]));
  for(const row of etcResult.rows||[]){
    const rune=map.get(Number(row.rune_id));
    if(!rune)continue;
    rune.rune_etc[row.type]??={};
    rune.rune_etc[row.type][Number(row.dir)]=String(row.desc||'');
  }
  return [...map.values()];
}
function runeEtcText(card,type,direction){
  return String(card?.rune_etc?.[type]?.[directionNo(direction)]||'').trim();
}

const GROUP_ORDER=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const runeHref=path=>{const clean=String(path||'').split('/').filter(Boolean).join('/');return `${scopeOriginV2('lunarunes')}/${clean}`;};
function runeCardImage(card){const number=String(Number(card?.rune_id)||0).padStart(2,'0');const name=String(card?.rune_name||'').replace(/之符文$/,'').trim();return `/assets/lunarunes/cards/${number}_${name}.png`;}
function initialMode(){if(typeof window==='undefined')return 'single';const value=new URLSearchParams(window.location.search).get('mode')||'single';return MODES.some(item=>item.key===value)?value:'single';}
function initialSection(){return 'draw';}
function directionText(card,direction){return runeEtcText(card,'direction',direction)||String(card?.rune_description||'').trim();}
function dailyGuidance(card,direction){return runeEtcText(card,'daily',direction);}

const LOT_DOMAINS=Object.freeze(['愛情','事業','關係','健康']);

function cleanGrammarPart(value){
  return String(value||'').trim().replace(/[。；;，,\s]+$/g,'')||'資訊不足';
}
function composeFixedGrammar(values,mode){
  const parts=(values||[]).map(cleanGrammarPart);
  if(mode==='2card'&&parts.length>=2)return `因為${parts[0]}，所以${parts[1]}。`;
  if(mode==='3card'&&parts.length>=3)return `因為${parts[0]}，但會有${parts[1]}的改變，所以${parts[2]}。`;
  if(mode==='5card'&&parts.length>=5)return `因為${parts[0]}、${parts[1]}，但會有${parts[2]}的變化，所以${parts[3]}、${parts[4]}。`;
  if(mode==='ow3gs'&&parts.length>=11)return `因為（因為${parts[0]}、${parts[1]}，但會有${parts[2]}、${parts[3]}的變化，所以${parts[4]}、${parts[5]}），所以（因為${parts[6]}、${parts[7]}，但會有${parts[8]}的變化，所以${parts[9]}、${parts[10]}）。`;
  if(parts.length===1)return `${parts[0]}。`;
  return parts.length?`${parts.join('、')}。`:'資訊不足。';
}
function lotDomainText(card,direction,label){
  const text=runeEtcText(card,'lots',direction);
  if(!text)return '資訊不足';
  const match=text.match(new RegExp(label+'：\\s*([^\\n]*?)(?=(?:愛情|事業|關係|健康)：|$)'));
  return cleanGrammarPart(match?.[1]||'資訊不足');
}
function buildFixedReading(cards,directions,mode){
  const source=Array.isArray(cards)?cards:[];
  const sentence=composeFixedGrammar(source.map((card,index)=>directionText(card,directions[index])||card?.rune_description||'資訊不足'),mode);
  const domains=(mode==='single'||mode==='daily')?[]:LOT_DOMAINS.map(label=>({
    label:label+'建議',
    text:composeFixedGrammar(source.map((card,index)=>lotDomainText(card,directions[index],label)),mode)
  }));
  return {sentence,domains};
}

export default function RunesClient(){
  const {value:uiSettings}=useNeonSetting(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [data,setData]=useState(null),[error,setError]=useState(''),[modeKey,setModeKey]=useState('single'),[draw,setDraw]=useState(null),[group,setGroup]=useState(''),[activeSection,setActiveSection]=useState('draw'),[ritualStep,setRitualStep]=useState(-1),[graphQuery,setGraphQuery]=useState(''),[graphGroup,setGraphGroup]=useState(''),[graphEdge,setGraphEdge]=useState(''),[nodePage,setNodePage]=useState(1),[edgePage,setEdgePage]=useState(1);const timers=useRef([]);
  useEffect(()=>{setModeKey(initialMode());setActiveSection(initialSection());let live=true;selectNeonRows('silver.runes',{columns:RUNE_COLUMNS,orders:[{column:'rune_id',ascending:true}],limit:67,offset:0}).then(runeResult=>{if(!live)return;const canonicalRunes=(runeResult.rows||[]).filter(row=>Number(row?.rune_id)>=1&&Number(row?.rune_id)<=66);if(canonicalRunes.length<66)throw new Error(`核心符文資料只有 ${canonicalRunes.length} 枚，無法安全抽牌。`);setData({runes:canonicalRunes,eras:[]});setError('');}).catch(err=>live&&setError(`月之符文核心資料載入失敗：${err?.message||'未知錯誤'}`));return()=>{live=false;timers.current.forEach(clearTimeout);};},[]);
  const selectedMode=useMemo(()=>MODES.find(item=>item.key===modeKey)||MODES[0],[modeKey]);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  const instantDraw=uiSettings?.draw_response==='instant';
  const groups=useMemo(()=>{const available=new Set((data?.runes||[]).map(row=>row.group_name).filter(Boolean));return GROUP_ORDER.filter(name=>available.has(name));},[data]);
  const moonPhase=useMemo(()=>realMoonPhase(),[]);const graph=useMemo(()=>data?buildRuneGraph(data.runes,[],{eras:data.eras}):null,[data]);const rawGraphView=useMemo(()=>graph?searchRuneGraph(graph,graphQuery,graphGroup):{nodes:[],edges:[]},[graph,graphQuery,graphGroup]);const edgeTypes=useMemo(()=>[...new Set((graph?.edges||[]).map(edge=>edge.type))].sort(),[graph]);const graphView=useMemo(()=>{if(!graphEdge)return rawGraphView;const edges=rawGraphView.edges.filter(edge=>edge.type===graphEdge);const ids=new Set(edges.flatMap(edge=>[edge.source,edge.target]));return {nodes:rawGraphView.nodes.filter(node=>ids.has(node.id)),edges};},[rawGraphView,graphEdge]);
  useEffect(()=>{setNodePage(1);setEdgePage(1);},[graphQuery,graphGroup,graphEdge,pageSize]);
  function chooseMode(key){timers.current.forEach(clearTimeout);setRitualStep(-1);setError('');setModeKey(key);setDraw(null);setActiveSection('draw');if(typeof window!=='undefined'){const url=new URL(window.location.href);url.searchParams.set('mode',key);window.history.replaceState({},'',`${url.pathname}${url.search}#draw`);}}
  function openSection(){setActiveSection('draw');}
  async function finishDraw(){try{const runePool=Array.from({length:66},(_,index)=>index+1);const {cards:runeNumbers,directionIndexes,directions}=drawRuneSession(runePool,selectedMode.count);const pairs=runeNumbers.map((runeNumber,index)=>({runeNumber:Number(runeNumber),dir:Number(directionIndexes[index])+1}));const types=modeKey==='daily'?['direction','daily']:['direction','lots'];const rows=await loadDrawCards(pairs,types);const byNumber=new Map(rows.map(row=>[Number(row.rune_id),row]));const cards=runeNumbers.map(number=>byNumber.get(Number(number))).filter(Boolean);if(cards.length!==runeNumbers.length)throw new Error('抽中的符文資料不完整。');const reading=buildFixedReading(cards,directions,modeKey),createdAt=new Date().toISOString();setDraw({id:`rune-draw:${modeKey}:${Date.now()}`,createdAt,cards,directionIndexes,directions,reading});setError('');}catch(err){setDraw(null);setError(`抽牌失敗：${err?.message||'未知錯誤'}`);}finally{setRitualStep(-1);}}
  function executeDraw(){if(ritualStep>=0)return;setError('');setDraw(null);setActiveSection('draw');timers.current.forEach(clearTimeout);timers.current=[];if(instantDraw){finishDraw();return;}setRitualStep(0);[1,2,3,4].forEach(step=>timers.current.push(setTimeout(()=>setRitualStep(step),step*RUNE_RITUAL_STEP_MS)));timers.current.push(setTimeout(finishDraw,RUNE_RITUAL_DELAY_MS));}
  const ritualMessages=runeRitualMessages(modeKey);const nodePages=Math.max(1,Math.ceil(graphView.nodes.length/pageSize)),edgePages=Math.max(1,Math.ceil(graphView.edges.length/pageSize));const shownNodes=graphView.nodes.slice((nodePage-1)*pageSize,nodePage*pageSize),shownEdges=graphView.edges.slice((edgePage-1)*pageSize,edgePage*pageSize);

  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero scope-home-hero-with-visual" id="intro">
      <div className="scope-home-hero-copy">
        <p className="loc-eyebrow">月之符文</p>
        <div className="home-title-row">
          <h1>月之符文</h1>
          <p className="loc-subtitle">以月的角度紀錄。</p>
        </div>
        <p>66個單一中文字 × 九組符文分組 × 四卡牌方向 × 月相交互</p>
        <p>可以問一件事，也可以沒有問題直接抽取。</p>
        <nav className="runes-home-nav" aria-label="月之符文功能">
          <a className="loc-button" href={runeHref('duel/one')}>符文抽籤</a>
          <a className="loc-button" href={runeHref('list')}>符文圖鑑</a>
          <a className="loc-button" href={runeHref('game')}>符文遊戲</a>
          <a className="loc-button" href={runeHref('duel/daily')}>每日符文抽牌</a>
          <a className="loc-button" href={runeHref('daily/log')}>每日符文紀錄</a>
          <a className="loc-button" href={runeHref('daily/trend')}>每日符文趨勢</a>
        </nav>
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">
        <iframe src="https://www.instagram.com/reel/DMA-ZxLTINw/embed" title="月之符文說明" loading="eager" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
      </figure>
    </header>
    <section className="loc-card rune-basics">
      <h2>基本判讀順序</h2>
      <div className="basic-grid">
        <div className="basic-item"><strong>先看符文本義</strong><span>先確認每張符文最基本的語意，不先被吉凶或結論帶走。</span></div>
        <div className="basic-item"><strong>再看卡牌方向</strong><span>正位、半正位、半逆位、逆位描述同一語彙在當下狀態中的不同表現。</span></div>
        <div className="basic-item"><strong>依卡位讀結構</strong><span>雙卡、三卡、五卡與 OW3gs 都有自己的位置責任，不能混成同一種讀法。</span></div>
        <div className="basic-item"><strong>最後才看月相</strong><span>真實月相是次要的時間修飾，不應推翻符文本義、方向與主要卡位。</span></div>
      </div>
    </section>
    <section className="loc-card rune-basics">
      <h2>命運句基本結構</h2>
      <div className="reading-ref-grid">
        <article className="reading-ref-card"><h3>單卡</h3><p>回答當下最核心的語意或狀態。</p></article>
        <article className="reading-ref-card"><h3>雙卡</h3><p><strong>因 → 果</strong>。第一張描述造成狀況的來源，第二張描述主要結果或落點。</p></article>
        <article className="reading-ref-card"><h3>三卡</h3><p><strong>源 → 轉 → 合</strong>。從來源、轉折到整合結果，形成一條最基本的語意鏈。</p></article>
        <article className="reading-ref-card"><h3>五卡</h3><p><strong>雙卡＋單卡＋雙卡</strong>。兩張過去成因＋一個意外變化＋兩張現在狀況，不是「兩卡＋三卡」的拼接。</p></article>
        <article className="reading-ref-card"><h3>OW3gs</h3><p><strong>1–6 因的描述層＋7–11 果的判定層</strong>。先讀 7–11 的核心判定，再回看 1–6 補足造成現況的背景與條件。</p></article>
      </div>
    </section>
    <section className="loc-card rune-basics">
      <h2>判讀與回測原則</h2>
      <div className="reading-ref-grid">
        <article className="reading-ref-card"><h3>過程不等於結果</h3><p>過程順利、互動正向或局部條件成立，不代表最後一定形成預期結果。</p></article>
        <article className="reading-ref-card"><h3>多個結果可以並存</h3><p>成果、延遲、成本、補償與限制可以同時成立，不把複合事件壓成單一吉凶。</p></article>
        <article className="reading-ref-card"><h3>主結果與代價分開</h3><p>是否完成、完成品質、時間、金錢、情緒與體力成本應分開判讀。</p></article>
        <article className="reading-ref-card"><h3>不知道就保留未知</h3><p>尚未走完的時間跨度、證據不足或原始解析遺失時，不事後補造答案。</p></article>
      </div>
    </section>

    <section className="loc-card" id="draw" data-draw-keyword="lunarunes-draw" data-draw-mode={modeKey} data-draw-action="execute"><p className="loc-eyebrow">抽籤</p><h2>占卜抽籤</h2><div className="runes-mode-nav" aria-label="選擇抽牌方式">{MODES.map(item=><a key={item.key} href={runeHref(item.path)} data-draw-mode={item.key} className={`loc-button ${modeKey===item.key?'primary':''}`}><strong>{item.label}</strong><span>{item.description}</span></a>)}</div></section>
    {ritualStep>=0&&<section className="loc-card runes-ritual" data-draw-stage="ritual" data-draw-mode={modeKey} aria-live="polite"><div className="runes-ritual-card"><img src="/assets/lunarunes/cards/65_玄.png" alt="玄之符文"/><strong>玄之符文</strong></div><div className="runes-ritual-copy"><p className="loc-eyebrow">等待片刻</p><h2>{ritualMessages[ritualStep]}</h2><p>真實月相：{moonPhase}</p></div></section>}
    {draw&&<><section className="loc-card" id="result" data-draw-stage="result" data-draw-mode={modeKey}><div className="loc-result-meta"><span>{selectedMode.label}</span><span>真實月相：{moonPhase}</span></div><div className="loc-draw-grid">{draw.cards.map((card,index)=><RuneCardInfo
        key={`${card.rune_id}-${index}`}
        card={card}
        imageSrc={runeCardImage(card)}
        imageClassName={`loc-rune-card-image ${ROTATION_CLASSES[draw.directionIndexes[index]]}`}
        positionLabel={selectedMode.positions[index]||`第 ${index+1} 張`}
        direction={draw.directions[index]}
        realMoonPhase={moonPhase}
        dataRuneId={card.rune_id}
        dataDrawPosition={selectedMode.positions[index]||index+1}
      />)}</div><div className="loc-actions runes-retry"><button type="button" className="loc-button" data-draw-action="retry" onClick={executeDraw}>再抽一次</button></div></section>
      {modeKey==='single'&&<section className="loc-card" data-draw-reading="single"><p className="loc-eyebrow">單卡籤詩</p><h2>{draw.cards[0].rune_name} · {draw.directions[0]}</h2><RuneSingleReading card={draw.cards[0]} direction={draw.directions[0]}/></section>}
      {modeKey==='daily'&&<section className="loc-card" data-draw-reading="daily"><p className="loc-eyebrow">每日指示</p><h2>{draw.cards[0].rune_name} · {draw.directions[0]} · {moonPhase}</h2><p className="runes-reading-lead"><strong>今日指引</strong><span>{dailyGuidance(draw.cards[0],draw.directions[0])||directionText(draw.cards[0],draw.directions[0])||'目前沒有這個位向的每日指示。'}</span></p></section>}
      <MultiReading draw={draw} mode={modeKey} phase={moonPhase}/>
      {modeKey==='ow3gs'&&<section className="loc-card runes-ow3gs-core" data-draw-reading="ow3gs"><p className="loc-eyebrow">OW3gs · 雙模型判讀</p><h2>1–6 因的描述層 → 7–11 果的判定層</h2><p>先讀成因分析，後讀判斷分析，最後套用月相交互。十一張牌不是等權並列。</p><p><strong>1–6 因的描述層：</strong>源兩張、轉兩張、合兩張，共六張；依固定卡位組合前因。</p><p><strong>7–11 果的判定層：</strong>使用五卡的基本規則，共五張；依固定五卡結構組合結果。</p><div className="loc-context-list">{draw.cards.slice(6,11).map((card,index)=><div className="loc-context-item" key={`core-${card.rune_id}-${index}`}><strong>第 {index+7} 張 · {card.rune_name} · {draw.directions[index+6]}</strong><span>{directionText(card,draw.directions[index+6])||card.rune_description}</span></div>)}</div><p>月相交互最後才套用，只作次要時間修飾。有時可與每日符文交替比照，重點是模型關聯，不是增加抽牌維度的複雜化。</p></section>}
      {modeKey!=='single'&&modeKey!=='daily'?<section className="loc-card" data-draw-stage="lots"><p className="loc-eyebrow">籤詩</p><h2>籤詩</h2><p>{draw.reading?.sentence||'資訊不足。'}</p>{Array.isArray(draw.reading?.domains)?<div className="runes-advice-grid">{draw.reading.domains.map(item=><article key={item.label}><strong>{item.label}</strong><span>{item.text}</span></article>)}</div>:null}</section>:null}
    </>}
  </section></main>;
}
