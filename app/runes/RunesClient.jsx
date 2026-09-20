'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchLocJson, fetchLocJsonBatch, LOC_DATA } from '../loc/data';
import { deleteNeonRecord, listNeonRecords, putNeonRecord } from '../loc/neon-user-storage';
import { useNeonAccount } from '../loc/use-neon-account';
import { useLocalStore } from '../loc/local-store';
import { evaluateSpread, finalGuidance, splitDomainGuidance } from '../loc/model/semantic-guidance';
import { realMoonPhase } from '../loc/model/moon-phase';
import { buildRuneGraph, searchRuneGraph } from '../../js/rune-graph-core.js';
import RuneAtlas from './RuneAtlas';
import {scopeHrefV2,scopeOriginV2} from '../modular-v2/scope-registry.v2';

const DIRECTIONS=['正位','半正位','半逆位','逆位'];
const ROTATION_CLASSES=['rune-rotate-0','rune-rotate-90','rune-rotate-n90','rune-rotate-180'];
const GROUP_ORDER=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const runeHref=path=>`${scopeOriginV2('runes')}/${String(path||'').replace(/^\/+/, '')}`;
const MODES=[
  {key:'single',count:1,label:'單卡',description:'符文本義＋卡牌方向＋月相交互。',positions:['核心'],path:'duel/one'},
  {key:'daily',count:1,label:'每日',description:'以今日為時間範圍的一張符文。',positions:['今日'],path:'duel/daily'},
  {key:'2card',count:2,label:'雙卡',description:'以「因 → 果」觀看兩者關係。',positions:['因','果'],path:'duel/two'},
  {key:'3card',count:3,label:'三卡',description:'以「源 → 轉 → 合」形成語意路徑。',positions:['源','轉','合'],path:'duel/three'},
  {key:'5card',count:5,label:'五卡',description:'兩張過去成因＋一個意外變化＋兩張現在狀況。',positions:['過去','現在','未來','外在','內在'],path:'duel/five'},
  {key:'ow3gs',count:11,label:'11卡 OW3gs',description:'1–6 因的描述層＋7–11 果的判定層。',positions:['1','2','3','4','5','6','7','8','9','10','11'],path:'duel/ow3gs'}
];
const RITUAL_MESSAGES={
  single:['您目前使用的是「單卡占卜模式」。','正在找尋那命運之線……','微弱的月光，會在漆黑的夜裡，帶領你找到方向。','抽牌完成。'],
  daily:['您目前使用的是「單卡每日抽牌模式」。','這是一張屬於今日節奏與提醒的指引牌。','正在對照今日真實月相。','今日月符已經抽取完成。'],
  '2card':['您目前使用的是「雙卡占卜模式」。','第一張卡牌為「因」，第二張卡牌為「果」。','正在整理兩張牌的因果位置。','抽牌完成。'],
  '3card':['您目前使用的是「三卡占卜模式」。','第一張為「源」，第二張為「轉」，第三張為「合」。','正在整理源、轉、合的語法位置。','抽牌完成。'],
  '5card':['您目前使用的是「五卡占卜模式」。','依序觀看過去、現在、未來顯化、周圍環境與自己心境。','正在整理時間主線與內外狀態。','抽牌完成。'],
  ow3gs:['您目前使用的是「OW3gs 11卡模式」。','1–6 建立事件描述層，7–11 進入核心判定。','正在整理兩段模型。','十一張命運絲線已經整理完成。']
};

function randomInt(max){if(max<=1)return 0;if(globalThis.crypto?.getRandomValues){const limit=Math.floor(0x100000000/max)*max;const value=new Uint32Array(1);do{globalThis.crypto.getRandomValues(value)}while(value[0]>=limit);return value[0]%max;}return Math.floor(Math.random()*max);}
function sampleUnique(items,count){const pool=[...items];for(let i=pool.length-1;i>0;i--){const j=randomInt(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,count);}
function runeCardImage(card){const number=String(Number(card?.編號)||0).padStart(2,'0');const name=String(card?.符文名稱||'').replace(/之符文$/,'').trim();return `/assets/lunarunes/cards/${number}_${name}.png`;}
function initialMode(){if(typeof window==='undefined')return 'single';const value=new URLSearchParams(window.location.search).get('mode')||'single';return MODES.some(item=>item.key===value)?value:'single';}
function initialSection(){return 'draw';}
function directionText(card,direction){const field=({'正位':'正向表示','半正位':'半正向表示','半逆位':'半逆向表示','逆位':'逆向表示'})[direction];return card?.[field]||'';}
function phaseAdvice(interpretations,card,direction,phase){const row=(interpretations||[]).find(item=>item?.符文名稱===card?.符文名稱);return row?.卡牌方向?.find(item=>item?.方向===direction)?.現況?.find(item=>item?.現在月相===phase)||null;}
function narrativeCore(card,direction){return directionText(card,direction);}
function derivedFromEvolution(history){return (history?.semantic_history_cases||[]).filter(item=>item?.title&&item.title!=='混沌三兄弟').map(item=>{const parts=String(item.title).split('→').map(value=>value.trim());const target=parts.length>1?parts.at(-1):'';const resolvedRune=/^[靈魂彩憶界域鏡核向斷封鍊啟分悟誤生老病死心愛語韻樹花葉草根種實枝金玉晶地石鑽礦塵光暗水火風土雷氣日月星辰明時空因福禍無夢幻緣虛果玄命]$/.test(target)?target:null;const relation=item.kind||'derived';return {term:parts[0]||item.title,relation,resolved_rune:resolvedRune,status:relation==='balanced_ambiguity'?'ambiguous':relation.includes('out_of_domain')?'special':'confirmed',note:item.note||''};});}
function makeDrawId(mode){const suffix=globalThis.crypto?.randomUUID?.()||String(randomInt(1000000000));return `rune-draw:${mode}:${Date.now()}:${suffix}`;}
function formatRecordTime(value){try{return new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}catch{return String(value||'—');}}
function sortRecords(rows){return [...rows].sort((a,b)=>String(b?.created_at||'').localeCompare(String(a?.created_at||'')));}

function SingleAdvice({card,direction,phase,interpretations,daily=false}){const info=phaseAdvice(interpretations,card,direction,phase);if(!info)return <p>目前沒有這組月相與位向的補充資料。</p>;if(daily)return <div className="runes-advice-grid"><article><strong>今日核心</strong><span>{info.每日占卜提醒||info.狀況表達}</span></article><article><strong>狀況</strong><span>{info.狀況形容}</span></article><article><strong>表達</strong><span>{info.狀況表達}</span></article><article><strong>引導</strong><span>{info.每日占卜引導}</span></article><article><strong>祝福</strong><span>{info.每日占卜祝福}</span></article></div>;return <><p className="runes-reading-lead"><strong>占卜結論｜{card.符文名稱}・{direction}</strong><span>{directionText(card,direction)}</span></p><div className="runes-advice-grid"><article><strong>愛情</strong><span>{info.愛情建議}</span></article><article><strong>事業</strong><span>{info.事業建議}</span></article><article><strong>心理</strong><span>{info.心理建議}</span></article><article><strong>健康</strong><span>{info.健康建議}</span></article><article><strong>生活</strong><span>{info.生活建議}</span></article></div></>}

function MultiReading({draw,mode,phase}){if(!draw)return null;const cards=draw.cards,directions=draw.directions;if(mode==='2card'||mode==='3card'){const labels=mode==='2card'?['因','果']:['源','轉','合'];return <section className="loc-card" data-draw-reading={mode}><p className="loc-eyebrow">Reading · 完整解讀</p><h2>{mode==='2card'?'因 → 果':'源 → 轉 → 合'}</h2><p><strong>完整現況：</strong>{cards.map((card,index)=>`${labels[index]}「${card.符文名稱}」${directions[index]}`).join('、')}。目前真實月相為{phase}。</p><p><strong>閱讀方式：</strong>{mode==='2card'?'先看造成現況的「因」，再看它導向的「果」。':'依序閱讀「源 → 轉 → 合」，先找起點，再看轉化，最後看收束。'}</p><div className="loc-context-list">{cards.map((card,index)=><div className="loc-context-item" key={`${mode}-${card.編號}-${index}`}><strong>{labels[index]}：{card.符文名稱}・{directions[index]}</strong><span>{directionText(card,directions[index])}</span></div>)}</div></section>}
  if(mode==='5card'){const [past,present,future,external,internal]=cards;return <section className="loc-card" data-draw-reading="5card"><p className="loc-eyebrow">Reading · 五卡完整解讀</p><h2>時間主線 × 內外作用</h2><p><strong>時間主線：</strong>過去的「{past.符文名稱}」{directions[0]}：{narrativeCore(past,directions[0])}；現在的「{present.符文名稱}」{directions[1]}：{narrativeCore(present,directions[1])}；若目前條件延續，未來顯化「{future.符文名稱}」{directions[2]}：{narrativeCore(future,directions[2])}。</p><p><strong>內外作用：</strong>周圍環境「{external.符文名稱}」{directions[3]}：{narrativeCore(external,directions[3])}；自己心境「{internal.符文名稱}」{directions[4]}：{narrativeCore(internal,directions[4])}。兩者共同描述前三張時間主線的條件。</p><p><strong>閱讀原則：</strong>未來顯化描述延續目前條件後的趨勢，不作絕對結果判決。本次真實月相為{phase}。</p></section>}
  return null;
}

function DrawRecordList({records,page,pageCount,setPage,onDelete,emptyText}){if(!records.length)return <p className="loc-note">{emptyText}</p>;return <><div className="loc-context-list">{records.map(record=><article className="loc-context-item" key={record.id}><div className="loc-result-meta"><span>{record.mode_label||record.mode}</span><span>{formatRecordTime(record.created_at)}</span></div><h3>{(record.cards||[]).map(card=>`${card.position}・${card.name}・${card.direction}`).join(' ｜ ')}</h3><p>真實月相：{record.moon_phase||'—'} · 整體趨勢：{record.trend||'—'} · 分數：{Number(record.score||0).toFixed(3)}</p>{record.guidance&&<p>{record.guidance}</p>}<div className="loc-actions"><button type="button" className="loc-button" onClick={()=>onDelete(record.id)}>刪除這筆</button></div></article>)}</div><div className="runes-pager"><button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button><span>{page} / {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一頁</button></div></>}

export default function RunesClient(){
  const account=useNeonAccount();
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [data,setData]=useState(null),[interpretations,setInterpretations]=useState([]),[error,setError]=useState(''),[modeKey,setModeKey]=useState('single'),[draw,setDraw]=useState(null),[group,setGroup]=useState(''),[activeSection,setActiveSection]=useState('draw'),[ritualStep,setRitualStep]=useState(-1),[graphQuery,setGraphQuery]=useState(''),[graphGroup,setGraphGroup]=useState(''),[graphEdge,setGraphEdge]=useState(''),[nodePage,setNodePage]=useState(1),[edgePage,setEdgePage]=useState(1),[drawRecords,setDrawRecords]=useState([]),[recordStatus,setRecordStatus]=useState(''),[dailyPage,setDailyPage]=useState(1),[generalPage,setGeneralPage]=useState(1);const timers=useRef([]);
  useEffect(()=>{setModeKey(initialMode());setActiveSection(initialSection());let live=true;if(account.user)listNeonRecords('rune-draw').then(rows=>{if(live)setDrawRecords(sortRecords(rows));}).catch(()=>{if(live)setRecordStatus('Neon 抽籤紀錄讀取失敗。');});else setDrawRecords([]);fetchLocJsonBatch([LOC_DATA.RUNES,LOC_DATA.LOTS,LOC_DATA.RUNE_INTERPRETATIONS],{concurrency:2}).then(([runes,lots,interpretationRows])=>{if(!live)return;const canonicalRunes=(runes||[]).filter(row=>Number(row?.編號)>=1&&Number(row?.編號)<=66);if(canonicalRunes.length<66)throw new Error(`核心符文資料只有 ${canonicalRunes.length} 枚，無法安全抽牌。`);setData({runes:canonicalRunes,lots:Array.isArray(lots)?lots:[],evolution:{},writing:{},relationships:{},eras:{}});setInterpretations(Array.isArray(interpretationRows)?interpretationRows:[]);setError('');fetchLocJsonBatch([LOC_DATA.LUNARUNE_EVOLUTION_HISTORY,LOC_DATA.LOC4_WRITING_REGISTRY,LOC_DATA.LOC_CROSS_RELATIONSHIP_REGISTRY,LOC_DATA.LOC_ERA_REGISTRY],{concurrency:2}).then(([evolution,writing,relationships,eras])=>{if(!live)return;setData(previous=>previous?{...previous,evolution:evolution||{},writing:writing||{},relationships:relationships||{},eras:eras||{}}:previous);}).catch(()=>{});}).catch(err=>live&&setError(`月之符文核心資料載入失敗：${err?.message||'未知錯誤'}`));return()=>{live=false;timers.current.forEach(clearTimeout);};},[account.user?.id]);
  const selectedMode=useMemo(()=>MODES.find(item=>item.key===modeKey)||MODES[0],[modeKey]);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  const instantDraw=uiSettings?.draw_response==='instant';
  const groups=useMemo(()=>{const available=new Set((data?.runes||[]).map(row=>row.所屬分組).filter(Boolean));return GROUP_ORDER.filter(name=>available.has(name));},[data]);
  const moonPhase=useMemo(()=>realMoonPhase(),[]);const graph=useMemo(()=>data?buildRuneGraph(data.runes,derivedFromEvolution(data.evolution),{writing:data.writing,relationships:data.relationships,eras:data.eras}):null,[data]);const rawGraphView=useMemo(()=>graph?searchRuneGraph(graph,graphQuery,graphGroup):{nodes:[],edges:[]},[graph,graphQuery,graphGroup]);const edgeTypes=useMemo(()=>[...new Set((graph?.edges||[]).map(edge=>edge.type))].sort(),[graph]);const graphView=useMemo(()=>{if(!graphEdge)return rawGraphView;const edges=rawGraphView.edges.filter(edge=>edge.type===graphEdge);const ids=new Set(edges.flatMap(edge=>[edge.source,edge.target]));return {nodes:rawGraphView.nodes.filter(node=>ids.has(node.id)),edges};},[rawGraphView,graphEdge]);
  const dailyRecords=useMemo(()=>drawRecords.filter(record=>record.record_kind==='daily'),[drawRecords]);const generalRecords=useMemo(()=>drawRecords.filter(record=>record.record_kind!=='daily'),[drawRecords]);
  useEffect(()=>{setNodePage(1);setEdgePage(1);},[graphQuery,graphGroup,graphEdge,pageSize]);useEffect(()=>{setDailyPage(1);setGeneralPage(1);},[pageSize]);
  function chooseMode(key){timers.current.forEach(clearTimeout);setRitualStep(-1);setError('');setRecordStatus('');setModeKey(key);setDraw(null);setActiveSection('draw');if(typeof window!=='undefined'){const url=new URL(window.location.href);url.searchParams.set('mode',key);window.history.replaceState({},'',`${url.pathname}${url.search}#draw`);}}
  function openSection(){setActiveSection('draw');}
  function finishDraw(){try{if(!data?.runes?.length)throw new Error('符文資料尚未載入完成。');if(data.runes.length<selectedMode.count)throw new Error(`可抽取符文不足 ${selectedMode.count} 張。`);if(modeKey==='daily'&&!interpretations.length)throw new Error('每日符文解讀資料尚未載入完成。');const cards=sampleUnique(data.runes,selectedMode.count),directionIndexes=cards.map(()=>randomInt(4)),directions=directionIndexes.map(index=>DIRECTIONS[index]),evaluation=evaluateSpread(cards,directions),createdAt=new Date().toISOString();const guidance=finalGuidance(data.lots,cards.at(-1),directions.at(-1));setDraw({id:makeDrawId(modeKey),createdAt,cards,directionIndexes,directions,evaluation,guidance});setRecordStatus('');setError('');}catch(err){setDraw(null);setError(`抽牌失敗：${err?.message||'未知錯誤'}`);}finally{setRitualStep(-1);}}
  function executeDraw(){if(!data||ritualStep>=0)return;setError('');setRecordStatus('');setDraw(null);setActiveSection('draw');timers.current.forEach(clearTimeout);timers.current=[];if(instantDraw){finishDraw();return;}setRitualStep(0);[1,2,3].forEach(step=>timers.current.push(setTimeout(()=>setRitualStep(step),step*1000)));timers.current.push(setTimeout(finishDraw,4000));}
  const ritualMessages=RITUAL_MESSAGES[modeKey]||RITUAL_MESSAGES.single;const nodePages=Math.max(1,Math.ceil(graphView.nodes.length/pageSize)),edgePages=Math.max(1,Math.ceil(graphView.edges.length/pageSize));const shownNodes=graphView.nodes.slice((nodePage-1)*pageSize,nodePage*pageSize),shownEdges=graphView.edges.slice((edgePage-1)*pageSize,edgePage*pageSize);const liveGuidance=draw?draw.guidance||'':'';const dailyPages=Math.max(1,Math.ceil(dailyRecords.length/pageSize)),generalPages=Math.max(1,Math.ceil(generalRecords.length/pageSize));const shownDaily=dailyRecords.slice((dailyPage-1)*pageSize,dailyPage*pageSize),shownGeneral=generalRecords.slice((generalPage-1)*pageSize,generalPage*pageSize);const drawSaved=!!draw&&drawRecords.some(record=>record.id===draw.id);
  async function saveCurrentDraw(){if(!draw||drawSaved)return;if(!account.user){setRecordStatus('請先登入 Neon，再儲存抽牌紀錄。');return;}try{const record={id:draw.id,type:'rune-draw',record_kind:modeKey==='daily'?'daily':'general',created_at:draw.createdAt,mode:modeKey,mode_label:selectedMode.label,moon_phase:moonPhase,score:draw.evaluation.score,trend:draw.evaluation.range.label,guidance:liveGuidance,cards:draw.cards.map((card,index)=>({number:Number(card.編號),name:card.符文名稱,position:selectedMode.positions[index]||`第 ${index+1} 張`,direction:draw.directions[index],positive_keywords:card.正向關鍵詞||'',negative_keywords:card.反向關鍵詞||''}))};await putNeonRecord(record);setDrawRecords(current=>sortRecords([record,...current.filter(item=>item.id!==record.id)]));setRecordStatus(modeKey==='daily'?'已記錄到每日抽籤。':'已記錄到一般抽牌。');}catch(err){setRecordStatus(`Neon 紀錄失敗：${err?.message||'未知錯誤'}`);}}
  async function removeRecord(id){try{await deleteNeonRecord(id);setDrawRecords(current=>current.filter(item=>item.id!==id));setRecordStatus('已刪除 Neon 紀錄。');}catch(err){setRecordStatus(`刪除失敗：${err?.message||'未知錯誤'}`);}}

  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero" id="intro"><p className="loc-eyebrow">LunaRunes</p><h1>月之符文</h1><p className="loc-subtitle">66個單一中文字 × 九組符文分組 × 四卡牌方向 × 月相交互 × 符文演算法</p><p>可以問一件事，也可以沒有問題直接抽取，</p><nav className="scope-v2-local-menu" aria-label="月之符文小功能選單"><a href={runeHref('')}>符文抽籤</a><a href={runeHref('list')}>符文圖鑑</a><a href={runeHref('algorithm')}>符文解牌</a><a href={runeHref('game')}>符文遊戲</a></nav></header>
    <section className="loc-card runes-home-reels" aria-label="月之符文 Reels">
      <div className="runes-home-hero-copy"><p className="loc-eyebrow">Reels · 實際示範</p><h2>先看一次月之符文怎麼使用</h2><p className="loc-subtitle">短影片示範抽牌與閱讀方式；看完可以直接回到下方抽牌。</p></div>
      <div className="runes-home-reels">
        <article className="runes-home-reel"><iframe src="https://www.instagram.com/reel/DMA9yDAzeRK/embed" title="月之符文公開占卜示範" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" /></article>
        <article className="runes-home-reel"><p>第二支使用示範</p><a href="https://www.instagram.com/reel/DMA-ZxLTINw/" target="_blank" rel="noopener noreferrer">在 Instagram 查看第二支 Reels →</a></article>
      </div>
      <p className="loc-subtitle"><a href="https://www.instagram.com/reel/DMA9yDAzeRK/" target="_blank" rel="noopener noreferrer">在 Instagram 開啟第一支</a> · <a href="https://www.instagram.com/reel/DMA-ZxLTINw/" target="_blank" rel="noopener noreferrer">在 Instagram 開啟第二支</a></p>
    </section>
    <section className="loc-card rune-basics">
      <h2>基本判讀順序</h2>
      <div className="basic-grid">
        <div className="basic-item"><strong>先看符文本義</strong><span>先確認每張符文最基本的語意，不先被吉凶或結論帶走。</span></div>
        <div className="basic-item"><strong>再看卡牌方向</strong><span>正位、半正位、半逆位、逆位描述同一語彙在當下狀態中的不同表現。</span></div>
        <div className="basic-item"><strong>依卡位讀結構</strong><span>雙卡、三卡、五卡與 OW3gs 都有自己的位置責任，不能混成同一種讀法。</span></div>
        <div className="basic-item"><strong>最後才看月相</strong><span>真實月相是低權重的時間修飾，不應推翻符文本義、方向與主要卡位。</span></div>
      </div>
    </section>
    <section className="loc-card rune-basics">
      <h2>命運句基本結構</h2>
      <div className="reading-ref-grid">
        <article className="reading-ref-card"><h3>單卡</h3><p>回答當下最核心的語意或狀態。</p></article>
        <article className="reading-ref-card"><h3>雙卡</h3><p><strong>因 → 果</strong>。第一張描述造成狀況的來源，第二張描述主要結果或落點。</p></article>
        <article className="reading-ref-card"><h3>三卡</h3><p><strong>源 → 轉 → 合</strong>。從來源、轉折到整合結果，形成一條最基本的語意鏈。</p></article>
        <article className="reading-ref-card"><h3>五卡</h3><p><strong>過去 → 現在 → 未來顯化 → 周圍環境 → 自己心境</strong>。五個位置各自有責任，不是 2+3 拼接。</p></article>
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
      <p className="rune-basics-note">事後回測固定保留「原始問題／原始牌序與原解析／實際發生／語法修正」的區分；不得看到結果後反向改寫原解析。</p>
    </section>
    <section className="loc-card" id="draw" data-draw-keyword="lunarunes-draw" data-draw-mode={modeKey} data-draw-action="execute"><p className="loc-eyebrow">Draw · 抽籤</p><h2>占卜抽籤</h2><div className="runes-mode-nav" aria-label="選擇抽牌方式">{MODES.map(item=><a key={item.key} href={runeHref(item.path)} data-draw-mode={item.key} className={`loc-button ${modeKey===item.key?'primary':''}`}><strong>{item.label}</strong><span>{item.description}</span></a>)}</div></section>
    {ritualStep>=0&&<section className="loc-card runes-ritual" data-draw-stage="ritual" data-draw-mode={modeKey} aria-live="polite"><div className="runes-ritual-card"><img src="/assets/lunarunes/cards/65_玄.png" alt="玄之符文"/><strong>玄之符文</strong><span>Chaos</span></div><div className="runes-ritual-copy"><p className="loc-eyebrow">等待片刻</p><h2>{ritualMessages[ritualStep]}</h2><p>真實月相：{moonPhase}</p></div></section>}
    {draw&&<><section className="loc-card" id="result" data-draw-stage="result" data-draw-mode={modeKey}><div className="loc-result-meta"><span>{selectedMode.label}</span><span>真實月相：{moonPhase}</span></div><div className="loc-draw-grid">{draw.cards.map((card,index)=><article className="loc-context-item compact loc-draw-card" data-rune-id={card.編號} data-draw-position={selectedMode.positions[index]||index+1} key={`${card.編號}-${index}`}><small>{selectedMode.positions[index]||`第 ${index+1} 張`}</small><img className={`loc-rune-card-image ${ROTATION_CLASSES[draw.directionIndexes[index]]}`} src={runeCardImage(card)} alt={`${card.符文名稱}符文卡`}/><b>{card.符文名稱}</b><small>{card.英文||'—'}</small><span>所屬群組：{card.所屬分組||'—'}</span><span>{draw.directions[index]} · 卡片月相：{card.月相||'—'}</span><small>{directionText(card,draw.directions[index])||card.符文說明}</small><div className="runes-draw-keywords"><span><strong>正向關鍵詞</strong>{card.正向關鍵詞||'—'}</span><span><strong>反向關鍵詞</strong>{card.反向關鍵詞||'—'}</span></div></article>)}</div><div className="loc-actions runes-retry"><button type="button" className="loc-button" data-draw-action="retry" onClick={executeDraw}>再抽一次</button><button type="button" className="loc-button primary" onClick={saveCurrentDraw} disabled={drawSaved}>{drawSaved?'已記錄':modeKey==='daily'?'記錄到每日':'記錄一般抽牌'}</button></div>{recordStatus&&<p className="loc-status">{recordStatus}</p>}</section>
      {modeKey==='single'&&<section className="loc-card" data-draw-reading="single"><p className="loc-eyebrow">Reading · 單卡解讀</p><h2>{draw.cards[0].符文名稱} · {draw.directions[0]}</h2><SingleAdvice card={draw.cards[0]} direction={draw.directions[0]} phase={moonPhase} interpretations={interpretations}/></section>}
      {modeKey==='daily'&&<section className="loc-card" data-draw-reading="daily"><p className="loc-eyebrow">Daily · 每日指示</p><h2>{draw.cards[0].符文名稱} · {draw.directions[0]} · {moonPhase}</h2><SingleAdvice card={draw.cards[0]} direction={draw.directions[0]} phase={moonPhase} interpretations={interpretations} daily/></section>}
      <MultiReading draw={draw} mode={modeKey} phase={moonPhase}/>
      {modeKey==='ow3gs'&&<section className="loc-card runes-ow3gs-core" data-draw-reading="ow3gs"><p className="loc-eyebrow">OW3gs · 核心判定</p><h2>第 7–11 張為核心判定</h2><div className="loc-context-list">{draw.cards.slice(6,11).map((card,index)=><div className="loc-context-item" key={`core-${card.編號}-${index}`}><strong>第 {index+7} 張 · {card.符文名稱} · {draw.directions[index+6]}</strong><span>{directionText(card,draw.directions[index+6])||card.符文說明}</span></div>)}</div><p>整體指示分數：{draw.evaluation.score.toFixed(3)} · 整體趨勢：{draw.evaluation.range.label}</p></section>}
      <section className="loc-card" data-draw-stage="guidance"><p className="loc-eyebrow">Semantic Guidance · 語意指示</p><h2>整體趨勢：{draw.evaluation.range.label}</h2><p>指示分數：{draw.evaluation.score.toFixed(3)}。依符文詞性、卡片位向與牌位權重計算目前組合的整體語意傾向；分數不代表吉凶、好壞或結果機率。{modeKey==='ow3gs'?'第 7–11 張採核心權重。':''}</p><div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>位置</th><th>符文</th><th>詞性</th><th>位向</th><th>權重</th><th>加權值</th></tr></thead><tbody>{draw.evaluation.rows.map((row,index)=><tr key={`${row.card.編號}-${index}`}><td>{selectedMode.positions[index]||index+1}</td><td>{row.card.符文名稱}</td><td>{row.card.卡片屬性||'中平'}</td><td>{row.direction}</td><td>{row.weight}</td><td>{row.weighted.toFixed(2)}</td></tr>)}</tbody></table></div></section>
      <section className="loc-card" data-draw-stage="lots"><p className="loc-eyebrow">Lots · 籤詩</p><h2>籤詩指引</h2><p>沿用最後一張「{draw.cards.at(-1)?.符文名稱} · {draw.directions.at(-1)}」的既有籤詩指示。</p><div className="loc-context-list">{liveGuidance?splitDomainGuidance(liveGuidance).map((line,index)=><div className="loc-context-item" key={`${line}-${index}`}>{line}</div>):<div className="loc-context-item">籤詩資料仍在本機載入；抽牌與關鍵詞判定不受影響。</div>}</div></section>
    </>}
  </section></main>;
}
