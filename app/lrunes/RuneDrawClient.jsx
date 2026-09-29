'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {selectRuneDrawRows} from '../loc/rune-repository';
import { useLocalStore } from '../loc/local-store';
import {resolveSpreadState} from '../loc/model/semantic-state.mjs';
import { realMoonPhase } from '../loc/model/moon-phase';
import {scopeHrefV2} from '../modular-v2/scope-registry.v2';
import {drawRuneSession} from './rune-draw-engine';
import RuneSingleReading from './RuneSingleReading';
import {RUNE_RITUAL_DELAY_MS,RUNE_RITUAL_STEP_MS,runeRitualMessages} from './rune-ritual';

const ROTATION_CLASSES = ['rune-rotate-0', 'rune-rotate-90', 'rune-rotate-n90', 'rune-rotate-180'];
const UI_SETTINGS_KEY = 'loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS = { draw_response: 'ritual' };
const DRAW_TYPES = [
  { key: 'single', count: 1, label: '單卡', positions: ['核心'] },
  { key: 'daily', count: 1, label: '每日', positions: ['今日'] },
  { key: '2card', count: 2, label: '雙卡', positions: ['因', '果'] },
  { key: '3card', count: 3, label: '三卡', positions: ['源', '轉', '合'] },
  { key: '5card', count: 5, label: '五卡', positions: ['過去成因 1', '過去成因 2', '意外變化', '現在狀況 1', '現在狀況 2'] },
  { key: 'ow3gs', count: 11, label: '11卡 OW3gs', positions: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'] }
];
const DRAW_PATHS = Object.freeze({
  single: scopeHrefV2('lunarunes','duel/one'),
  daily: scopeHrefV2('lunarunes','duel/daily'),
  '2card': scopeHrefV2('lunarunes','duel/two'),
  '3card': scopeHrefV2('lunarunes','duel/three'),
  '5card': scopeHrefV2('lunarunes','duel/five'),
  ow3gs: scopeHrefV2('lunarunes','duel/ow3gs')
});


function runeCardImage(card) {
  const number = String(Number(card?.rune_number) || 0).padStart(2, '0');
  const name = String(card?.rune_name || '').replace(/之符文$/, '').trim();
  return `/assets/lunarunes/cards/${number}_${name}.png`;
}

function directionText(card, direction) {
  const field = ({ '正位': 'positive_meaning', '半正位': 'half_positive_meaning', '半逆位': 'half_reverse_meaning', '逆位': 'reverse_meaning' })[direction];
  return card?.[field] || card?.rune_description || '';
}

function dailyGuidance(card, direction) {
  const field = ({ '正位': 'daily_positive', '半正位': 'daily_half_positive', '半逆位': 'daily_half_reverse', '逆位': 'daily_reverse' })[direction];
  return String(card?.[field] || '').trim();
}

function MultiReading({ draw, mode, phase }) {
  if (!draw) return null;
  const cards = draw.cards;
  const directions = draw.directions;
  if (mode === '2card' || mode === '3card') {
    const labels = mode === '2card' ? ['因', '果'] : ['源', '轉', '合'];
    return <section className="loc-card" data-draw-reading={mode}>
      <p className="loc-eyebrow">Reading · 完整解讀</p>
      <h2>{mode === '2card' ? '因 → 果' : '源 → 轉 → 合'}</h2>
      <p><strong>完整現況：</strong>{cards.map((card, index) => `${labels[index]}「${card.rune_name}」${directions[index]}`).join('、')}。目前真實月相為{phase}。</p>
      <p><strong>閱讀方式：</strong>{mode === '2card' ? '先看造成現況的「因」，再看它導向的「果」。' : '依序閱讀「源 → 轉 → 合」，先找起點，再看轉化，最後看收束。'}</p>
      <div className="loc-context-list">{cards.map((card, index) => <div className="loc-context-item" key={`${mode}-${card.rune_number}-${index}`}><strong>{labels[index]}：{card.rune_name}・{directions[index]}</strong><span>{directionText(card, directions[index])}</span></div>)}</div>
    </section>;
  }
  if (mode === '5card') {
    const [past1, past2, unexpected, current1, current2] = cards;
    return <section className="loc-card" data-draw-reading="5card">
      <p className="loc-eyebrow">Reading · 五卡完整解讀</p>
      <h2>雙卡＋單卡＋雙卡</h2>
      <p><strong>過去的成因：</strong>「{past1.rune_name}」{directions[0]}：{directionText(past1, directions[0])}；「{past2.rune_name}」{directions[1]}：{directionText(past2, directions[1])}。兩張牌共同描述事情形成的背景與潛因。</p>
      <p><strong>意外變化：</strong>「{unexpected.rune_name}」{directions[2]}：{directionText(unexpected, directions[2])}。單張只提供一個意外因素，不與雙卡拼接。</p>
      <p><strong>現在狀況：</strong>「{current1.rune_name}」{directions[3]}：{directionText(current1, directions[3])}；「{current2.rune_name}」{directions[4]}：{directionText(current2, directions[4])}。兩張牌共同描述現在以後可能形成的結論。</p>
      <p><strong>模組應用：</strong>雙卡與三卡的共同語意延伸；月相交互列於最後，只作天時關係的小幅修正，可能稍強也可能稍弱。本次真實月相為{phase}。</p>
    </section>;
  }
  return null;
}

export default function RuneDrawClient({ drawKey = 'single' }) {
  const { value: uiSettings } = useLocalStore(UI_SETTINGS_KEY, DEFAULT_UI_SETTINGS);
  const [error, setError] = useState('');
  const [draw, setDraw] = useState(null);
  const [ritualStep, setRitualStep] = useState(-1);
  const timers = useRef([]);
  const autoStarted = useRef(false);

  const selectedMode = useMemo(() => DRAW_TYPES.find(item => item.key === drawKey) || DRAW_TYPES[0], [drawKey]);
  const instantDraw = uiSettings?.draw_response === 'instant';
  const moonPhase = useMemo(() => realMoonPhase(), []);
  const ritualMessages = runeRitualMessages(drawKey);

  async function finishDraw() {
    try {
      const runePool=Array.from({length:66},(_,index)=>index+1);
      const {cards:runeNumbers,directionIndexes,directions}=drawRuneSession(runePool,selectedMode.count);
      const pairs=runeNumbers.map((runeNumber,index)=>({runeNumber:Number(runeNumber),dir:Number(directionIndexes[index])+1}));
      const types=drawKey==='daily'?['direction','daily']:['direction','lots'];
      const rows=await selectRuneDrawRows(pairs,{types});
      const byNumber=new Map(rows.map(row=>[Number(row.rune_number),row]));
      const cards=runeNumbers.map(number=>byNumber.get(Number(number))).filter(Boolean);
      if(cards.length!==runeNumbers.length)throw new Error('抽中的符文資料不完整。');
      const reading=resolveSpreadState(cards,directions,drawKey);
      const createdAt=new Date().toISOString();
      setDraw({id:`rune-draw:${drawKey}:${Date.now()}`,createdAt,cards,directionIndexes,directions,reading,guidance:reading.guidance});
      setError('');
    } catch (err) {
      setDraw(null);
      setError(`抽牌失敗：${err?.message || '未知錯誤'}`);
    } finally {
      setRitualStep(-1);
    }
  }

  function executeDraw() {
    if (ritualStep >= 0) return;
    setError('');
    setDraw(null);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (instantDraw) {
      finishDraw();
      return;
    }
    setRitualStep(0);
    [1, 2, 3, 4].forEach(step => timers.current.push(setTimeout(() => setRitualStep(step), step * RUNE_RITUAL_STEP_MS)));
    timers.current.push(setTimeout(finishDraw, RUNE_RITUAL_DELAY_MS));
  }

  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    executeDraw();
  }, [drawKey]);

  return <div className="runes-draw-surface">
    <section className="loc-view">
      <header className="loc-hero" id="intro">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h1>月之符文</h1>
        <p>月之符文以固定 66 枚核心符文提供抽牌與語意指引。抽牌、四向判讀與籤詩指引在瀏覽器完成；紀錄與管理功能統一由 Governance Management 處理。</p>
      </header>

      <section className="loc-card" id="draw" data-draw-keyword="lunarunes-draw" data-draw-mode={drawKey}>
        <p className="loc-eyebrow">Draw · 抽籤</p>
        <h2>{selectedMode.label}抽牌</h2>
        <div className="runes-mode-nav" aria-label="抽牌模式">
          {DRAW_TYPES.map(item => <a key={item.key} href={DRAW_PATHS[item.key]} data-draw-mode={item.key} className={`loc-button ${drawKey === item.key ? 'primary' : ''}`}>{item.label}</a>)}
        </div>
        <p className={`loc-status ${error ? 'error' : ''}`}>{error || (ritualStep >= 0 ? '抽牌倒數進行中…' : `${selectedMode.label}：${selectedMode.positions.join(' → ')}${drawKey === 'daily' ? `／真實月相：${moonPhase}` : ''}`)}</p>
      </section>

      {ritualStep >= 0 && <section className="loc-card runes-ritual" data-draw-stage="ritual" data-draw-mode={drawKey} aria-live="polite">
        <div className="runes-ritual-card"><img src="/assets/lunarunes/cards/65_玄.png" alt="玄之符文"/><strong>玄之符文</strong><span>Chaos</span></div>
        <div className="runes-ritual-copy"><p className="loc-eyebrow">等待片刻</p><h2>{ritualMessages[ritualStep]}</h2><p>真實月相：{moonPhase}</p></div>
      </section>}

      {draw && <>
        <section className="loc-card" id="result" data-draw-stage="result" data-draw-mode={drawKey}>
          <div className="loc-result-meta"><span>{selectedMode.label}</span><span>真實月相：{moonPhase}</span></div>
          <div className="loc-draw-grid">
            {draw.cards.map((card, index) => <article className="loc-context-item compact loc-draw-card" data-rune-id={card.rune_number} data-draw-position={selectedMode.positions[index] || index + 1} key={`${card.rune_number}-${index}`}>
              <small>{selectedMode.positions[index] || `第 ${index + 1} 張`}</small>
              <img className={`loc-rune-card-image ${ROTATION_CLASSES[draw.directionIndexes[index]]}`} src={runeCardImage(card)} alt={`${card.rune_name}符文卡`}/>
              <b>{card.rune_name}</b>
              <small>{card.english_name || '—'}</small>
              <span>所屬群組：{card.group_name || '—'}</span>
              <span>{draw.directions[index]} · 卡片月相：{card.moon_phase || '—'}</span>
              <small>{directionText(card, draw.directions[index]) || card.rune_description}</small>
              <div className="runes-draw-keywords"><span><strong>正向關鍵詞</strong>{card.positive_keywords || '—'}</span><span><strong>反向關鍵詞</strong>{card.negative_keywords || '—'}</span></div>
            </article>)}
          </div>
          <div className="loc-actions runes-retry">
            <button type="button" className="loc-button" data-draw-action="retry" onClick={executeDraw}>再抽一次</button>
          </div>
        </section>

        {drawKey === 'single' && <section className="loc-card" data-draw-reading="single">
          <p className="loc-eyebrow">Lots · 單卡籤詩</p>
          <h2>{draw.cards[0].rune_name} · {draw.directions[0]}</h2>
          <RuneSingleReading card={draw.cards[0]} direction={draw.directions[0]}/>
        </section>}

        {drawKey === 'daily' && <section className="loc-card" data-draw-reading="daily">
          <p className="loc-eyebrow">Daily · 每日指示</p>
          <h2>{draw.cards[0].rune_name} · {draw.directions[0]} · {moonPhase}</h2>
          <p className="runes-reading-lead"><strong>今日指引</strong><span>{dailyGuidance(draw.cards[0], draw.directions[0]) || directionText(draw.cards[0], draw.directions[0]) || '目前沒有這個位向的每日指示。'}</span></p>
        </section>}

        <MultiReading draw={draw} mode={drawKey} phase={moonPhase}/>

        {drawKey === 'ow3gs' && <section className="loc-card runes-ow3gs-core" data-draw-reading="ow3gs">
          <p className="loc-eyebrow">OW3gs · 雙模型判讀</p><h2>1–6 因的描述層 → 7–11 果的判定層</h2><p>第 7–11 張為核心判定。</p>
          <p>先讀成因分析，後讀判斷分析，最後套用月相交互。十一張牌不是等權並列。</p>
          <p><strong>1–6 因的描述層：</strong>源兩張、轉兩張、合兩張，共六張；以雙卡與三卡綜合判斷產生問題的可能狀態。</p>
          <p><strong>7–11 果的判定層：</strong>使用五卡的基本規則，共五張；以五卡方式判斷建議如何行動的治理原則。</p>
          <div className="loc-context-list">{draw.cards.slice(6, 11).map((card, index) => <div className="loc-context-item" key={`core-${card.rune_number}-${index}`}><strong>第 {index + 7} 張 · {card.rune_name} · {draw.directions[index + 6]}</strong><span>{directionText(card, draw.directions[index + 6]) || card.rune_description}</span></div>)}</div>
          <p>月相交互最後才套用，只作次要時間修飾；重點是模型關聯，不是增加抽牌維度的複雜化。</p>
        </section>}

        {drawKey!=='single'&&drawKey!=='daily'&&<section className="loc-card" data-draw-stage="lots">
          <p className="loc-eyebrow">Lots · 籤詩</p><h2>籤詩指引</h2>
          <p>{draw.reading?.guidance||'結果未知。'}</p>
          {Array.isArray(draw.reading?.advice)?<div className="runes-advice-grid">
            {draw.reading.advice.map(item=><article key={item.label}><strong>{item.label}</strong><span>{item.text}</span></article>)}
          </div>:null}
        </section>}
      </>}
    </section>
  </div>;
}
