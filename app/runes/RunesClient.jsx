'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchLocJsonBatch, LOC_DATA } from '../loc/data';
import ThemeControl from '../loc/ThemeControl';
import { evaluateSpread, finalGuidance, splitDomainGuidance } from '../loc/model/semantic-guidance';
import { allData as dailyAdviceData } from '../../js/rune_all_data_all.js';
import { buildRuneGraph, searchRuneGraph } from '../../js/rune-graph-core.js';

const DIRECTIONS=['正位','半正位','半逆位','逆位'];
const ROTATIONS=['rotate(0deg)','rotate(90deg)','rotate(-90deg)','rotate(180deg)'];
const RITUAL_MESSAGES=['占卜中，請稍等片刻，馬上就好……','正在找尋那命運之線……','微弱的月光，會在漆黑的夜裡，帶領你找到方向。','抓到命運絲線的軌跡了，現在呈現。'];
const MODES=[
  {key:'single',count:1,label:'單卡',positions:['核心']},
  {key:'daily',count:1,label:'每日',positions:['今日']},
  {key:'2card',count:2,label:'雙卡',positions:['因','果']},
  {key:'3card',count:3,label:'三卡',positions:['源','轉','合']},
  {key:'5card',count:5,label:'五卡',positions:['過去','現在','未來','外在','內在']},
  {key:'ow3gs',count:11,label:'11卡 OW3gs',positions:['1','2','3','4','5','6','7','8','9','10','11']}
];

function randomInt(max){
  if(max<=1)return 0;
  if(globalThis.crypto?.getRandomValues){
    const limit=Math.floor(0x100000000/max)*max;
    const value=new Uint32Array(1);
    do{crypto.getRandomValues(value)}while(value[0]>=limit);
    return value[0]%max;
  }
  return Math.floor(Math.random()*max);
}
function sampleUnique(items,count){const pool=[...items];for(let i=pool.length-1;i>0;i--){const j=randomInt(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,count);}
function runeCardImage(card){const number=String(Number(card?.['編號'])||0).padStart(2,'0');const name=String(card?.['符文名稱']||'').replace(/之符文$/,'').trim();return `/assets/lunarunes/cards/${number}_${name}.png`;}
function realMoonPhase(date=new Date()){
  try{const formatter=new Intl.DateTimeFormat('zh-TW-u-ca-chinese',{year:'numeric',month:'numeric',day:'numeric'});const day=Number(formatter.formatToParts(date).find(part=>part.type==='day')?.value);if(day>=1&&day<=7)return '新月';if(day>=8&&day<=14)return '上弦';if(day>=15&&day<=21)return '滿月';if(day>=22&&day<=28)return '下弦';if(day>=29&&day<=30)return '空亡';}catch{}
  return '未知';
}
function initialMode(){if(typeof window==='undefined')return 'single';const value=new URLSearchParams(window.location.search).get('mode')||'single';return MODES.some(item=>item.key===value)?value:'single';}
function dailyAdvice(card,direction,phase){const row=dailyAdviceData.find(item=>item?.符文名稱===card?.符文名稱);const directionRow=row?.卡牌方向?.find(item=>item?.方向===direction);return directionRow?.現況?.find(item=>item?.現在月相===phase)||null;}
function directionText(card,direction){const field=({'正位':'正向表示','半正位':'半正向表示','半逆位':'半逆向表示','逆位':'逆向表示'})[direction];return card?.[field]||'';}
function derivedFromEvolution(history){
  return (history?.semantic_history_cases||[]).filter(item=>item?.title&&item.title!=='混沌三兄弟').map(item=>{
    const parts=String(item.title).split('→').map(value=>value.trim());const target=parts.length>1?parts.at(-1):'';
    const resolvedRune=/^[靈魂彩憶界域鏡核向斷封鍊啟分悟誤生老病死心愛語韻樹花葉草根種實枝金玉晶地石鑽礦塵光暗水火風土雷氣日月星辰明時空因福禍無夢幻緣虛果玄命]$/.test(target)?target:null;
    const relation=item.kind||'derived';const status=relation==='balanced_ambiguity'?'ambiguous':relation.includes('out_of_domain')?'special':'confirmed';
    return {term:parts[0]||item.title,relation,resolved_rune:resolvedRune,status,note:item.note||''};
  });
}

export default function RunesClient(){
  const [data,setData]=useState(null);const [error,setError]=useState('');const [modeKey,setModeKey]=useState('single');const [draw,setDraw]=useState(null);const [group,setGroup]=useState('全部');const [ritualStep,setRitualStep]=useState(-1);const [graphQuery,setGraphQuery]=useState('');const [graphGroup,setGraphGroup]=useState('');const timers=useRef([]);

  useEffect(()=>{
    setModeKey(initialMode());let live=true;
    fetchLocJsonBatch([LOC_DATA.RUNES,LOC_DATA.LOTS,LOC_DATA.LUNARUNE_EVOLUTION_HISTORY],{concurrency:3}).then(([runes,lots,evolution])=>{if(!live)return;const drawable=(runes||[]).filter(row=>Number(row?.['編號'])>=1&&Number(row?.['編號'])<=66);setData({runes:drawable,lots:lots||[],evolution:evolution||{}});}).catch(err=>live&&setError(err.message));
    return()=>{live=false;timers.current.forEach(id=>clearTimeout(id));timers.current=[];};
  },[]);

  const selectedMode=useMemo(()=>MODES.find(item=>item.key===modeKey)||MODES[0],[modeKey]);
  const groups=useMemo(()=>['全部',...new Set((data?.runes||[]).map(row=>row['所屬分組']).filter(Boolean))],[data]);
  const libraryRunes=useMemo(()=>group==='全部'?(data?.runes||[]):(data?.runes||[]).filter(row=>row['所屬分組']===group),[data,group]);
  const moonPhase=useMemo(()=>realMoonPhase(),[]);
  const graph=useMemo(()=>data?buildRuneGraph(data.runes,derivedFromEvolution(data.evolution)):null,[data]);
  const graphView=useMemo(()=>graph?searchRuneGraph(graph,graphQuery,graphGroup):{nodes:[],edges:[]},[graph,graphQuery,graphGroup]);
  const dailyInfo=useMemo(()=>draw&&modeKey==='daily'?dailyAdvice(draw.cards[0],draw.directions[0],moonPhase):null,[draw,modeKey,moonPhase]);

  function chooseMode(key){timers.current.forEach(id=>clearTimeout(id));timers.current=[];setRitualStep(-1);setModeKey(key);setDraw(null);if(typeof window!=='undefined'){const url=new URL(window.location.href);url.searchParams.set('mode',key);window.history.replaceState({},'',`${url.pathname}${url.search}#draw`);}}
  function finishDraw(){if(!data)return;const cards=sampleUnique(data.runes,selectedMode.count);const directionIndexes=cards.map(()=>randomInt(DIRECTIONS.length));const directions=directionIndexes.map(index=>DIRECTIONS[index]);const evaluation=evaluateSpread(cards,directions);const lastIndex=cards.length-1;const guidance=finalGuidance(data.lots,cards[lastIndex],directions[lastIndex]);setDraw({cards,directions,directionIndexes,evaluation,guidance});setRitualStep(-1);}
  function executeDraw(){if(!data||ritualStep>=0)return;setDraw(null);timers.current.forEach(id=>clearTimeout(id));timers.current=[];setRitualStep(0);[1,2,3].forEach((step,index)=>timers.current.push(setTimeout(()=>setRitualStep(step),(index+1)*650)));timers.current.push(setTimeout(finishDraw,2750));}

  return <>
    <header className="loc-next-header"><div className="loc-next-nav-stack"><nav className="loc-next-nav loc-next-nav-primary" aria-label="LOC 主要導覽"><a href="/runes" aria-current="page">月之符文</a><a href="/game">遊戲</a><a href="/context">脈絡</a><a href="/statics">統計</a><a href="/evolution">推演</a><form className="loc-next-search" action="/search" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" /><button type="submit">搜尋</button></form><a className="loc-next-home" href="/">回月典首頁</a></nav><nav className="loc-next-nav loc-next-subnav" aria-label="顯示設定"><ThemeControl /></nav></div></header>
    <nav className="runes-subnav" aria-label="月之符文功能導覽"><a href="#intro">新手上路</a><a href="#draw">占卜抽籤</a><a href="#library">66 符資料</a><a href="#reference">符文脈絡</a><a href="/statics">符文統計</a><a href="#reference">符文知識庫</a></nav>

    <main className="loc-next-main"><section className="loc-view">
      <header className="loc-hero" id="intro"><p className="loc-eyebrow">LunaRunes · 月之符文</p><h1>月之符文</h1><p>由 66 個中文單一字構成。可以問一件事，也可以沒有問題直接抽取；抽牌、加權與籤詩指引都在瀏覽器本機完成，不需要外部 API。</p></header>

      <section className="loc-card" id="draw"><p className="loc-eyebrow">Draw · 抽籤</p><h2>選擇抽牌方式</h2><div className="runes-mode-nav" aria-label="抽牌方式">{MODES.map(item=><button key={item.key} className={`loc-button ${modeKey===item.key?'primary':''}`} onClick={()=>chooseMode(item.key)}>{item.label}</button>)}</div><div className="loc-actions runes-draw-action"><button className="loc-button primary" onClick={executeDraw} disabled={!data||ritualStep>=0}>{ritualStep>=0?'占卜中…':'抽牌'}</button></div><p className={`loc-status ${error?'error':''}`}>{error||(!data?'載入月之符文資料中…':`${selectedMode.label}：${selectedMode.positions.join(' → ')}${modeKey==='daily'?`／真實月相：${moonPhase}`:''}`)}</p></section>

      {ritualStep>=0&&<section className="loc-card runes-ritual" aria-live="polite"><div className="runes-ritual-card"><img src="/assets/lunarunes/cards/65_玄.png" alt="玄之符文" /><strong>玄之符文</strong><span>Chaos</span></div><div className="runes-ritual-copy"><p className="loc-eyebrow">等待片刻</p><h2>{RITUAL_MESSAGES[ritualStep]}</h2><p>真實月相：{moonPhase}</p></div></section>}

      {draw&&<>
        <section className="loc-card" id="result"><div className="loc-result-meta"><span>{selectedMode.label}</span><span>{modeKey==='daily'?`真實月相：${moonPhase}`:'本機語意判定'}</span></div><div className="loc-draw-grid">{draw.cards.map((card,index)=><article className="loc-context-item compact loc-draw-card" key={`${card['編號']}-${index}`}><small>{selectedMode.positions[index]||`第 ${index+1} 張`}</small><img className="loc-rune-card-image" src={runeCardImage(card)} alt={`${card['符文名稱']}符文卡`} style={{transform:ROTATIONS[draw.directionIndexes[index]]}} /><b>{card['符文名稱']}</b><span>{draw.directions[index]} · {card['卡片屬性']||'中平'}</span><small>{directionText(card,draw.directions[index])||card['符文說明']}</small></article>)}</div><div className="loc-actions runes-retry"><button className="loc-button" onClick={executeDraw}>再抽一次</button></div></section>

        {modeKey==='daily'&&<section className="loc-card runes-daily-reading"><p className="loc-eyebrow">Daily · 每日指示</p><h2>{draw.cards[0]['符文名稱']} · {draw.directions[0]} · {moonPhase}</h2>{dailyInfo?<div className="runes-advice-grid"><article><strong>今日核心</strong><span>{dailyInfo.每日占卜提醒||dailyInfo.狀況表達}</span></article><article><strong>狀況</strong><span>{dailyInfo.狀況形容}</span></article><article><strong>表達</strong><span>{dailyInfo.狀況表達}</span></article><article><strong>引導</strong><span>{dailyInfo.每日占卜引導}</span></article><article><strong>祝福</strong><span>{dailyInfo.每日占卜祝福}</span></article></div>:<p>目前沒有這組月相與位向的每日補充資料。</p>}</section>}

        {modeKey==='ow3gs'&&<section className="loc-card runes-ow3gs-core"><p className="loc-eyebrow">OW3gs · 核心判定</p><h2>第 7–11 張為核心判定</h2><div className="loc-context-list">{draw.cards.slice(6,11).map((card,index)=><div className="loc-context-item" key={`core-${card['編號']}-${index}`}><strong>第 {index+7} 張 · {card['符文名稱']} · {draw.directions[index+6]}</strong><span>{directionText(card,draw.directions[index+6])||card['符文說明']}</span></div>)}</div><p>整體指示分數：{draw.evaluation.score.toFixed(3)} · 整體趨勢：{draw.evaluation.range.label}</p></section>}

        <section className="loc-card"><p className="loc-eyebrow">Semantic Guidance · 語意指示</p><h2>整體趨勢：{draw.evaluation.range.label}</h2><p>指示分數：{draw.evaluation.score.toFixed(3)}。依符文詞性、卡片位向與牌位權重計算目前組合的整體語意傾向；分數不代表吉凶、好壞或結果機率。OW3gs 第 7–11 張採核心權重。</p><div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>位置</th><th>符文</th><th>詞性</th><th>位向</th><th>權重</th><th>加權值</th></tr></thead><tbody>{draw.evaluation.rows.map((row,index)=><tr key={`${row.card['編號']}-${index}`}><td>{selectedMode.positions[index]||index+1}</td><td>{row.card['符文名稱']}</td><td>{row.card['卡片屬性']||'中平'}</td><td>{row.direction}</td><td>{row.weight}</td><td>{row.weighted.toFixed(2)}</td></tr>)}</tbody></table></div></section>

        <section className="loc-card"><p className="loc-eyebrow">Lots · 籤詩</p><h2>籤詩指引</h2><p>沿用最後一張「{draw.cards.at(-1)?.['符文名稱']} · {draw.directions.at(-1)}」的既有籤詩指示。</p><div className="loc-context-list">{splitDomainGuidance(draw.guidance).map((line,index)=><div className="loc-context-item" key={`${line}-${index}`}>{line}</div>)}</div></section>
      </>}

      <section className="loc-card" id="library"><p className="loc-eyebrow">Rune Library · 符文資料</p><h2>66 符圖鑑</h2><p>這裡是符文資料展示，不是抽牌。可依分組瀏覽全部 66 枚符文。</p><div className="loc-actions runes-library-actions">{groups.map(name=><button key={name} className={`loc-button ${group===name?'primary':''}`} onClick={()=>setGroup(name)}>{name}</button>)}</div><div className="runes-library-grid">{libraryRunes.map(card=><article className="runes-library-card" key={card['編號']}><img src={runeCardImage(card)} alt={`${card['符文名稱']}符文卡`} loading="lazy" decoding="async" /><div><small>{String(card['編號']).padStart(2,'0')} · {card['所屬分組']}</small><strong>{card['符文名稱']}</strong><span>{card['英文']||''}</span><p>{card['符文說明']||''}</p></div></article>)}</div><div className="runes-print-card"><div><strong>實體卡片印製／裁切 PDF</strong><p>這是月之符文實體卡製作用原始排版檔，不是新手教學文件。</p></div><a className="loc-button primary" href="/LunarRunesCardCut.pdf">開啟實體卡印製 PDF</a></div></section>

      <section className="loc-card" id="reference"><p className="loc-eyebrow">Reference · 符文脈絡與知識庫</p><h2>月之符文 Graph</h2><p>直接以現行符文、正反向關鍵詞、群組與演化紀錄建立本機關係圖，不呼叫外部 API。</p><form className="runes-graph-controls" onSubmit={event=>event.preventDefault()}><input value={graphQuery} onChange={event=>setGraphQuery(event.target.value)} type="search" placeholder="搜尋符文、關鍵詞或定義" aria-label="搜尋符文 Graph" /><select value={graphGroup} onChange={event=>setGraphGroup(event.target.value)} aria-label="依群組篩選 Graph"><option value="">全部群組</option>{groups.filter(name=>name!=='全部').map(name=><option key={name} value={name}>{name}</option>)}</select><button type="button" className="loc-button" onClick={()=>{setGraphQuery('');setGraphGroup('')}}>清除</button></form><p className="loc-status">本機 Graph · {graphView.nodes.length} 個節點 / {graphView.edges.length} 條關係</p><div className="runes-graph-columns"><div><h3>節點</h3><div className="loc-context-list">{graphView.nodes.slice(0,24).map(node=><button type="button" className="loc-context-item runes-graph-node" key={node.id} onClick={()=>setGraphQuery(node.label)}><small>{node.type} · {node.group||''}</small><strong>{node.label}</strong><span>{node.definition||node.english||''}</span></button>)}</div></div><div><h3>關係</h3><div className="loc-context-list">{graphView.edges.slice(0,24).map((edge,index)=><div className="loc-context-item" key={`${edge.source}-${edge.type}-${edge.target}-${index}`}><strong>{edge.type}</strong><span>{edge.source} → {edge.target}</span></div>)}</div></div></div><div className="runes-reference-grid"><figure><img src="/assets/lunarunes/reference/loc_runes_66_overview.jpg" alt="月之符文66總覽" loading="lazy" /><figcaption>月之符文66總覽</figcaption></figure><figure><img src="/assets/lunarunes/reference/LunaRunes64_S.png" alt="月之符文參考圖" loading="lazy" /><figcaption>月之符文參考圖</figcaption></figure></div></section>
    </section></main>
  </>;
}
