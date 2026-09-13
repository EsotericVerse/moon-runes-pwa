'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJsonBatch, LOC_DATA } from '../loc/data';
import ThemeControl from '../loc/ThemeControl';
import { evaluateSpread, finalGuidance, splitDomainGuidance } from '../loc/model/semantic-guidance';

const DIRECTIONS=['正位','半正位','半逆位','逆位'];
const MODES=[
  {key:'single',count:1,label:'單卡',positions:['指引']},
  {key:'daily',count:1,label:'每日',positions:['今日']},
  {key:'2card',count:2,label:'雙卡',positions:['因','果']},
  {key:'3card',count:3,label:'三卡',positions:['源','轉','合']},
  {key:'5card',count:5,label:'五卡',positions:['過去','現在','未來顯化','周圍環境','自己心境']},
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

function sampleUnique(items,count){
  const pool=[...items];
  for(let i=pool.length-1;i>0;i--){
    const j=randomInt(i+1);
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  return pool.slice(0,count);
}

function runeCardImage(card){
  const number=String(Number(card?.['編號'])||0).padStart(2,'0');
  const name=String(card?.['符文名稱']||'').replace(/之符文$/,'').trim();
  return `/assets/lunarunes/cards/${number}_${name}.png`;
}

function realMoonPhase(date=new Date()){
  try{
    const formatter=new Intl.DateTimeFormat('zh-TW-u-ca-chinese',{year:'numeric',month:'numeric',day:'numeric'});
    const day=Number(formatter.formatToParts(date).find(part=>part.type==='day')?.value);
    if(day>=1&&day<=7)return '新月';
    if(day>=8&&day<=14)return '上弦';
    if(day>=15&&day<=21)return '滿月';
    if(day>=22&&day<=28)return '下弦';
    if(day>=29&&day<=30)return '空亡';
  }catch{}
  return '未知';
}

function initialMode(){
  if(typeof window==='undefined')return 'single';
  const value=new URLSearchParams(window.location.search).get('mode')||'single';
  return MODES.some(item=>item.key===value)?value:'single';
}

export default function RunesClient(){
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [modeKey,setModeKey]=useState('single');
  const [draw,setDraw]=useState(null);
  const [group,setGroup]=useState('全部');

  useEffect(()=>{
    setModeKey(initialMode());
    let live=true;
    fetchLocJsonBatch([LOC_DATA.RUNES,LOC_DATA.LOTS],{concurrency:2})
      .then(([runes,lots])=>{
        if(!live)return;
        const drawable=(runes||[]).filter(row=>Number(row?.['編號'])>=1&&Number(row?.['編號'])<=66);
        setData({runes:drawable,lots:lots||[]});
      })
      .catch(err=>live&&setError(err.message));
    return()=>{live=false};
  },[]);

  const selectedMode=useMemo(()=>MODES.find(item=>item.key===modeKey)||MODES[0],[modeKey]);
  const groups=useMemo(()=>['全部',...new Set((data?.runes||[]).map(row=>row['所屬分組']).filter(Boolean))],[data]);
  const libraryRunes=useMemo(()=>group==='全部'?(data?.runes||[]):(data?.runes||[]).filter(row=>row['所屬分組']===group),[data,group]);
  const moonPhase=useMemo(()=>realMoonPhase(),[]);

  function chooseMode(key){
    setModeKey(key);
    setDraw(null);
    if(typeof window!=='undefined'){
      const url=new URL(window.location.href);
      url.searchParams.set('mode',key);
      window.history.replaceState({},'',`${url.pathname}${url.search}#draw`);
    }
  }

  function executeDraw(){
    if(!data)return;
    const cards=sampleUnique(data.runes,selectedMode.count);
    const directions=cards.map(()=>DIRECTIONS[randomInt(DIRECTIONS.length)]);
    const evaluation=evaluateSpread(cards,directions);
    const lastIndex=cards.length-1;
    const guidance=finalGuidance(data.lots,cards[lastIndex],directions[lastIndex]);
    setDraw({cards,directions,evaluation,guidance});
  }

  return <>
    <header className="loc-next-header">
      <div className="loc-next-nav-stack">
        <nav className="loc-next-nav loc-next-nav-primary" aria-label="LOC 主要導覽">
          <a href="/runes" aria-current="page">月之符文</a>
          <a href="/game">遊戲</a>
          <a href="/context">脈絡</a>
          <a href="/statics">統計</a>
          <a href="/evolution">推演</a>
          <form className="loc-next-search" action="/search" method="get" role="search">
            <input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" />
            <button type="submit">搜尋</button>
          </form>
          <a className="loc-next-home" href="/">回月典首頁</a>
        </nav>
        <nav className="loc-next-nav loc-next-subnav" aria-label="顯示設定"><ThemeControl /></nav>
      </div>
    </header>

    <nav className="runes-subnav" aria-label="月之符文功能導覽">
      <a href="#intro">新手上路</a>
      <a href="#draw">占卜抽籤</a>
      <a href="#library">66 符資料</a>
      <a href="#reference">符文脈絡</a>
      <a href="/statics">符文統計</a>
      <a href="#reference">符文知識庫</a>
    </nav>

    <main className="loc-next-main">
      <section className="loc-view">
        <header className="loc-hero" id="intro">
          <p className="loc-eyebrow">LunaRunes · 月之符文</p>
          <h1>月之符文</h1>
          <p>由 66 個中文單一字構成。可以問一件事，也可以沒有問題直接抽取；抽牌、加權與籤詩指引都在瀏覽器本機完成，不需要外部 API。</p>
        </header>

        <section className="loc-card" id="draw">
          <p className="loc-eyebrow">Draw · 抽籤</p>
          <h2>選擇抽牌方式</h2>
          <div className="runes-mode-nav" aria-label="抽牌方式">
            {MODES.map(item=><button key={item.key} className={`loc-button ${modeKey===item.key?'primary':''}`} onClick={()=>chooseMode(item.key)}>{item.label}</button>)}
          </div>
          <div className="loc-actions runes-draw-action">
            <button className="loc-button primary" onClick={executeDraw} disabled={!data}>抽牌</button>
          </div>
          <p className={`loc-status ${error?'error':''}`}>{error||(!data?'載入月之符文資料中…':`${selectedMode.label}：${selectedMode.positions.join(' → ')}${modeKey==='daily'?`／真實月相：${moonPhase}`:''}`)}</p>
        </section>

        {draw&&<>
          <section className="loc-card" id="result">
            <div className="loc-result-meta"><span>{selectedMode.label}</span><span>{modeKey==='daily'?`真實月相：${moonPhase}`:'本機語意判定'}</span></div>
            <div className="loc-draw-grid">
              {draw.cards.map((card,index)=><article className="loc-context-item compact loc-draw-card" key={`${card['編號']}-${index}`}>
                <small>{selectedMode.positions[index]||`第 ${index+1} 張`}</small>
                <img className="loc-rune-card-image" src={runeCardImage(card)} alt={`${card['符文名稱']}符文卡`} />
                <b>{card['符文名稱']}</b>
                <span>{draw.directions[index]} · {card['卡片屬性']||'中平'}</span>
                <small>{card['符文說明']}</small>
              </article>)}
            </div>
            <div className="loc-actions runes-retry"><button className="loc-button" onClick={executeDraw}>再抽一次</button></div>
          </section>

          <section className="loc-card">
            <p className="loc-eyebrow">Semantic Guidance · 語意指示</p>
            <h2>整體趨勢：{draw.evaluation.range.label}</h2>
            <p>指示分數：{draw.evaluation.score.toFixed(3)}。依符文詞性、卡片位向與牌位權重計算目前組合的整體語意傾向；分數不代表吉凶、好壞或結果機率。</p>
            <div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>位置</th><th>符文</th><th>詞性</th><th>位向</th><th>權重</th><th>加權值</th></tr></thead><tbody>
              {draw.evaluation.rows.map((row,index)=><tr key={`${row.card['編號']}-${index}`}><td>{selectedMode.positions[index]||index+1}</td><td>{row.card['符文名稱']}</td><td>{row.card['卡片屬性']||'中平'}</td><td>{row.direction}</td><td>{row.weight}</td><td>{row.weighted.toFixed(2)}</td></tr>)}
            </tbody></table></div>
          </section>

          <section className="loc-card">
            <p className="loc-eyebrow">Lots · 籤詩</p>
            <h2>籤詩指引</h2>
            <p>沿用最後一張「{draw.cards.at(-1)?.['符文名稱']} · {draw.directions.at(-1)}」的既有籤詩指示。</p>
            <div className="loc-context-list">{splitDomainGuidance(draw.guidance).map((line,index)=><div className="loc-context-item" key={`${line}-${index}`}>{line}</div>)}</div>
          </section>
        </>}

        <section className="loc-card" id="library">
          <p className="loc-eyebrow">Rune Library · 符文資料</p>
          <h2>66 符圖鑑</h2>
          <p>這裡是符文資料展示，不是抽牌。可依分組瀏覽全部 66 枚符文。</p>
          <div className="loc-actions runes-library-actions">
            {groups.map(name=><button key={name} className={`loc-button ${group===name?'primary':''}`} onClick={()=>setGroup(name)}>{name}</button>)}
          </div>
          <div className="runes-library-grid">
            {libraryRunes.map(card=><article className="runes-library-card" key={card['編號']}>
              <img src={runeCardImage(card)} alt={`${card['符文名稱']}符文卡`} loading="lazy" />
              <div><small>{String(card['編號']).padStart(2,'0')} · {card['所屬分組']}</small><strong>{card['符文名稱']}</strong><span>{card['英文']||''}</span><p>{card['符文說明']||''}</p></div>
            </article>)}
          </div>
          <div className="runes-print-card">
            <div><strong>實體卡片印製／裁切 PDF</strong><p>這是月之符文實體卡製作用原始排版檔，不是新手教學文件。</p></div>
            <a className="loc-button primary" href="/LunarRunesCardCut.pdf">開啟實體卡印製 PDF</a>
          </div>
        </section>

        <section className="loc-card" id="reference">
          <p className="loc-eyebrow">Reference · 符文脈絡與知識庫</p>
          <h2>月之符文參考資料</h2>
          <p>符文資料、演化與脈絡都應由月之符文頁面統一承接；這裡保留總覽圖與後續 Graph／知識庫的專屬入口。</p>
          <div className="runes-reference-grid">
            <figure><img src="/assets/lunarunes/reference/loc_runes_66_overview.jpg" alt="月之符文66總覽" loading="lazy" /><figcaption>月之符文66總覽</figcaption></figure>
            <figure><img src="/assets/lunarunes/reference/LunaRunes64_S.png" alt="月之符文參考圖" loading="lazy" /><figcaption>月之符文參考圖</figcaption></figure>
          </div>
        </section>
      </section>
    </main>
  </>;
}
