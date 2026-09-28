'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Select from 'react-select';
import {selectRuneCatalog} from '../loc/rune-repository';
import {selectScopeCultureData} from '../loc/neon-culture-client';
import { useLocalStore } from '../loc/local-store';
import {resolveSpreadState} from '../loc/model/semantic-state.mjs';
import { realMoonPhase } from '../loc/model/moon-phase';
import { buildRuneGraph, searchRuneGraph } from '../loc/model/rune-graph-core.js';
import RuneAtlas from './RuneAtlas';
import {scopeHrefV2,scopeOriginV2} from '../modular-v2/scope-registry.v2';
import {drawRuneSession,makeRuneDrawId} from './rune-draw-engine';
import RuneSingleReading from './RuneSingleReading';
import {RUNE_RITUAL_DELAY_MS,RUNE_RITUAL_STEP_MS,runeRitualMessages} from './rune-ritual';
import HomeContentBlocksV2 from '../modular-v2/HomeContentBlocksV2';

const ROTATION_CLASSES=['rune-rotate-0','rune-rotate-90','rune-rotate-n90','rune-rotate-180'];
const GROUP_ORDER=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const runeHref=path=>`${scopeOriginV2('lunarunes')}/${String(path||'').replace(/^\/+/, '')}`;
const HOME_FUNCTION_OPTIONS=Object.freeze([
  {value:'list',label:'符文圖鑑',href:runeHref('list')},
  {value:'draw',label:'符文抽籤',href:runeHref('')},
  {value:'daily',label:'每日符文',href:runeHref('duel/daily')},
  {value:'log',label:'每日紀錄',href:runeHref('daily/log')},
  {value:'trend',label:'每日趨勢',href:runeHref('daily/trend')},
  {value:'game',label:'符文遊戲',href:runeHref('game')}
]);
const MODES=[
  {key:'single',count:1,label:'單卡',description:'符文本義＋卡牌方向＋月相交互。',positions:['核心'],path:'duel/one'},
  {key:'daily',count:1,label:'每日',description:'以今日為時間範圍的一張符文。',positions:['今日'],path:'duel/daily'},
  {key:'2card',count:2,label:'雙卡',description:'以「因 → 果」觀看兩者關係。',positions:['因','果'],path:'duel/two'},
  {key:'3card',count:3,label:'三卡',description:'以「源 → 轉 → 合」形成語意路徑。',positions:['源','轉','合'],path:'duel/three'},
  {key:'5card',count:5,label:'五卡',description:'兩張過去成因＋一個意外變化＋兩張現在狀況。',positions:['過去成因 1','過去成因 2','意外變化','現在狀況 1','現在狀況 2'],path:'duel/five'},
  {key:'ow3gs',count:11,label:'11卡 OW3gs',description:'1–6 因的描述層＋7–11 果的判定層。',positions:['1','2','3','4','5','6','7','8','9','10','11'],path:'duel/ow3gs'}
];

function runeCardImage(card){const number=String(Number(card?.rune_number)||0).padStart(2,'0');const name=String(card?.rune_name||'').replace(/之符文$/,'').trim();return `/assets/lunarunes/cards/${number}_${name}.png`;}
function initialMode(){if(typeof window==='undefined')return 'single';const value=new URLSearchParams(window.location.search).get('mode')||'single';return MODES.some(item=>item.key===value)?value:'single';}
function initialSection(){return 'draw';}
function directionText(card,direction){const field=({'正位':'positive_meaning','半正位':'half_positive_meaning','半逆位':'half_reverse_meaning','逆位':'reverse_meaning'})[direction];return card?.[field]||'';}

export default function RunesClient(){
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [data,setData]=useState(null),[error,setError]=useState(''),[modeKey,setModeKey]=useState('single'),[draw,setDraw]=useState(null),[group,setGroup]=useState(''),[activeSection,setActiveSection]=useState('draw'),[ritualStep,setRitualStep]=useState(-1),[graphQuery,setGraphQuery]=useState(''),[graphGroup,setGraphGroup]=useState(''),[graphEdge,setGraphEdge]=useState(''),[nodePage,setNodePage]=useState(1),[edgePage,setEdgePage]=useState(1);const timers=useRef([]);
  useEffect(()=>{setModeKey(initialMode());setActiveSection(initialSection());let live=true;Promise.all([selectRuneCatalog(),selectScopeCultureData('lo3rwang')]).then(([runes,culture])=>{if(!live)return;const canonicalRunes=(runes||[]).filter(row=>Number(row?.rune_number)>=1&&Number(row?.rune_number)<=66);if(canonicalRunes.length<66)throw new Error(`核心符文資料只有 ${canonicalRunes.length} 枚，無法安全抽牌。`);setData({runes:canonicalRunes,eras:culture?.periods||[]});setError('');}).catch(err=>live&&setError(`月之符文核心資料載入失敗：${err?.message||'未知錯誤'}`));return()=>{live=false;timers.current.forEach(clearTimeout);};},[]);
  const selectedMode=useMemo(()=>MODES.find(item=>item.key===modeKey)||MODES[0],[modeKey]);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  const instantDraw=uiSettings?.draw_response==='instant';
  const groups=useMemo(()=>{const available=new Set((data?.runes||[]).map(row=>row.group_name).filter(Boolean));return GROUP_ORDER.filter(name=>available.has(name));},[data]);
  const moonPhase=useMemo(()=>realMoonPhase(),[]);const graph=useMemo(()=>data?buildRuneGraph(data.runes,[],{eras:data.eras}):null,[data]);const rawGraphView=useMemo(()=>graph?searchRuneGraph(graph,graphQuery,graphGroup):{nodes:[],edges:[]},[graph,graphQuery,graphGroup]);const edgeTypes=useMemo(()=>[...new Set((graph?.edges||[]).map(edge=>edge.type))].sort(),[graph]);const graphView=useMemo(()=>{if(!graphEdge)return rawGraphView;const edges=rawGraphView.edges.filter(edge=>edge.type===graphEdge);const ids=new Set(edges.flatMap(edge=>[edge.source,edge.target]));return {nodes:rawGraphView.nodes.filter(node=>ids.has(node.id)),edges};},[rawGraphView,graphEdge]);
  useEffect(()=>{setNodePage(1);setEdgePage(1);},[graphQuery,graphGroup,graphEdge,pageSize]);
  function chooseMode(key){timers.current.forEach(clearTimeout);setRitualStep(-1);setError('');setModeKey(key);setDraw(null);setActiveSection('draw');if(typeof window!=='undefined'){const url=new URL(window.location.href);url.searchParams.set('mode',key);window.history.replaceState({},'',`${url.pathname}${url.search}#draw`);}}
  function openSection(){setActiveSection('draw');}
  function finishDraw(){try{if(!data?.runes?.length)throw new Error('符文資料尚未載入完成。');if(data.runes.length<selectedMode.count)throw new Error(`可抽取符文不足 ${selectedMode.count} 張。`);const {cards,directionIndexes,directions}=drawRuneSession(data.runes,selectedMode.count),reading=resolveSpreadState(cards,directions,modeKey),createdAt=new Date().toISOString();setDraw({id:makeRuneDrawId(modeKey),createdAt,cards,directionIndexes,directions,reading,guidance:reading.guidance});setError('');}catch(err){setDraw(null);setError(`抽牌失敗：${err?.message||'未知錯誤'}`);}finally{setRitualStep(-1);}}
  function executeDraw(){if(!data||ritualStep>=0)return;setError('');setDraw(null);setActiveSection('draw');timers.current.forEach(clearTimeout);timers.current=[];if(instantDraw){finishDraw();return;}setRitualStep(0);[1,2,3,4].forEach(step=>timers.current.push(setTimeout(()=>setRitualStep(step),step*RUNE_RITUAL_STEP_MS)));timers.current.push(setTimeout(finishDraw,RUNE_RITUAL_DELAY_MS));}
  const ritualMessages=runeRitualMessages(modeKey);const nodePages=Math.max(1,Math.ceil(graphView.nodes.length/pageSize)),edgePages=Math.max(1,Math.ceil(graphView.edges.length/pageSize));const shownNodes=graphView.nodes.slice((nodePage-1)*pageSize,nodePage*pageSize),shownEdges=graphView.edges.slice((edgePage-1)*pageSize,edgePage*pageSize);

  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero scope-home-hero-with-visual" id="intro">
      <div className="scope-home-hero-copy">
        <p className="loc-eyebrow">LunaRunes</p>
        <div className="home-title-row">
          <h1>月之符文</h1>
          <p className="loc-subtitle">以月的角度紀錄。</p>
        </div>
        <p>66個單一中文字 × 九組符文分組 × 四卡牌方向 × 月相交互</p>
        <p>可以問一件事，也可以沒有問題直接抽取。</p>
        <div className="runes-home-function-select" aria-label="月之符文功能選單">
          <Select
            inputId="lunarunes-home-function"
            className="scope-v2-react-select"
            classNamePrefix="scope-v2-react-select"
            unstyled
            isSearchable={false}
            options={HOME_FUNCTION_OPTIONS}
            value={null}
            placeholder="符文功能"
            onChange={option=>option?.href&&window.location.assign(option.href)}
          />
        </div>
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">
        <iframe src="https://www.instagram.com/reel/DMA-ZxLTINw/embed" title="月之符文說明" loading="eager" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
      </figure>
    </header>
    <HomeContentBlocksV2 scopeId="lunarunes"/>
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

    <section className="loc-card" id="draw" data-draw-keyword="lunarunes-draw" data-draw-mode={modeKey} data-draw-action="execute"><p className="loc-eyebrow">Draw · 抽籤</p><h2>占卜抽籤</h2><div className="runes-mode-nav" aria-label="選擇抽牌方式">{MODES.map(item=><a key={item.key} href={runeHref(item.path)} data-draw-mode={item.key} className={`loc-button ${modeKey===item.key?'primary':''}`}><strong>{item.label}</strong><span>{item.description}</span></a>)}</div></section>
    {ritualStep>=0&&<section className="loc-card runes-ritual" data-draw-stage="ritual" data-draw-mode={modeKey} aria-live="polite"><div className="runes-ritual-card"><img src="/assets/lunarunes/cards/65_玄.png" alt="玄之符文"/><strong>玄之符文</strong><span>Chaos</span></div><div className="runes-ritual-copy"><p className="loc-eyebrow">等待片刻</p><h2>{ritualMessages[ritualStep]}</h2><p>真實月相：{moonPhase}</p></div></section>}
    {draw&&<><section className="loc-card" id="result" data-draw-stage="result" data-draw-mode={modeKey}><div className="loc-result-meta"><span>{selectedMode.label}</span><span>真實月相：{moonPhase}</span></div><div className="loc-draw-grid">{draw.cards.map((card,index)=><article className="loc-context-item compact loc-draw-card" data-rune-id={card.rune_number} data-draw-position={selectedMode.positions[index]||index+1} key={`${card.rune_number}-${index}`}><small>{selectedMode.positions[index]||`第 ${index+1} 張`}</small><img className={`loc-rune-card-image ${ROTATION_CLASSES[draw.directionIndexes[index]]}`} src={runeCardImage(card)} alt={`${card.rune_name}符文卡`}/><b>{card.rune_name}</b><small>{card.english_name||'—'}</small><span>所屬群組：{card.group_name||'—'}</span><span>{draw.directions[index]} · 卡片月相：{card.moon_phase||'—'}</span><small>{directionText(card,draw.directions[index])||card.rune_description}</small><div className="runes-draw-keywords"><span><strong>正向關鍵詞</strong>{card.positive_keywords||'—'}</span><span><strong>反向關鍵詞</strong>{card.negative_keywords||'—'}</span></div></article>)}</div><div className="loc-actions runes-retry"><button type="button" className="loc-button" data-draw-action="retry" onClick={executeDraw}>再抽一次</button></div></section>
      {modeKey==='single'&&<section className="loc-card" data-draw-reading="single"><p className="loc-eyebrow">Lots · 單卡籤詩</p><h2>{draw.cards[0].rune_name} · {draw.directions[0]}</h2><RuneSingleReading card={draw.cards[0]} direction={draw.directions[0]}/></section>}
      {modeKey==='daily'&&<section className="loc-card" data-draw-reading="daily"><p className="loc-eyebrow">Daily · 每日指示</p><h2>{draw.cards[0].rune_name} · {draw.directions[0]} · {moonPhase}</h2><RuneSingleReading card={draw.cards[0]} direction={draw.directions[0]}/></section>}
      <MultiReading draw={draw} mode={modeKey} phase={moonPhase}/>
      {modeKey==='ow3gs'&&<section className="loc-card runes-ow3gs-core" data-draw-reading="ow3gs"><p className="loc-eyebrow">OW3gs · 雙模型判讀</p><h2>1–6 因的描述層 → 7–11 果的判定層</h2><p>先讀成因分析，後讀判斷分析，最後套用月相交互。十一張牌不是等權並列。</p><p><strong>1–6 因的描述層：</strong>源兩張、轉兩張、合兩張，共六張；以雙卡與三卡綜合判斷產生問題的可能狀態。</p><p><strong>7–11 果的判定層：</strong>使用五卡的基本規則，共五張；以五卡方式判斷建議如何行動的治理原則。</p><div className="loc-context-list">{draw.cards.slice(6,11).map((card,index)=><div className="loc-context-item" key={`core-${card.rune_number}-${index}`}><strong>第 {index+7} 張 · {card.rune_name} · {draw.directions[index+6]}</strong><span>{directionText(card,draw.directions[index+6])||card.rune_description}</span></div>)}</div><p>月相交互最後才套用，只作次要時間修飾。有時可與每日符文交替比照，重點是模型關聯，不是增加抽牌維度的複雜化。</p></section>}
      {modeKey!=='single'&&modeKey!=='daily'?<section className="loc-card" data-draw-stage="guidance"><p className="loc-eyebrow">Lots · 籤詩</p><h2>籤詩指引</h2><p>{draw.reading?.guidance||'結果未知。'}</p>{Array.isArray(draw.reading?.advice)?<div className="runes-advice-grid">{draw.reading.advice.map(item=><article key={item.label}><strong>{item.label}</strong><span>{item.text}</span></article>)}</div>:null}</section>:null}
    </>}
  </section></main>;
}
