'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {selectNeonRows} from '../loc/neon-query';
import { useNeonSetting } from '../loc/use-neon-setting';
import { realMoonPhase } from '../loc/model/moon-phase';
import {scopeHrefV2} from '../modular-v2/scope-registry.v2';
import RuneSingleReading from './RuneSingleReading';
import RuneCardInfo from './RuneCardInfo';
import {RUNE_RITUAL_DELAY_MS,RUNE_RITUAL_STEP_MS,runeRitualMessages} from './rune-ritual';
import {RUNE_DRAW_MODES as DRAW_TYPES} from './rune-draw-modes.mjs';

const ROTATION_CLASSES = ['rune-rotate-0', 'rune-rotate-90', 'rune-rotate-n90', 'rune-rotate-180'];
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
const RUNE_COLUMNS='rune_id,rune_name,english_name,totem,group_name,moon_phase,card_attr,rune_description,archetype,positive_keywords,negative_keywords,extra_rules,extra_notes';
const MOON_PHASE_LABELS=Object.freeze({1:'新月',2:'上弦',3:'滿月',4:'下弦'});
function directionNo(direction){return RUNE_DIRECTIONS.indexOf(direction)+1;}
async function loadDrawCards(pairs,types){
  const ids=[...new Set(pairs.map(item=>Number(item.runeNumber)))];
  const [runeResult,etcResult]=await Promise.all([
    selectNeonRows('silver.runes',{
      columns:RUNE_COLUMNS,
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

const UI_SETTINGS_KEY = 'loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS = { draw_response: 'ritual' };
const DRAW_PATHS = Object.freeze({
  single: scopeHrefV2('lunarunes','duel/one'),
  daily: scopeHrefV2('lunarunes','duel/daily'),
  '2card': scopeHrefV2('lunarunes','duel/two'),
  '3card': scopeHrefV2('lunarunes','duel/three'),
  '5card': scopeHrefV2('lunarunes','duel/five'),
  ow3gs: scopeHrefV2('lunarunes','duel/ow3gs')
});


function runeCardImage(card) {
  const number = String(Number(card?.rune_id) || 0).padStart(2, '0');
  const name = String(card?.rune_name || '').replace(/之符文$/, '').trim();
  return `/assets/lunarunes/cards/${number}_${name}.png`;
}

function directionText(card, direction) {
  return runeEtcText(card,'direction',direction)||String(card?.rune_description||'').trim();
}

function dailyGuidance(card, direction) {
  return runeEtcText(card,'daily',direction);
}

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

function MultiReading({ draw, mode, phase }) {
  if (!draw) return null;
  const cards = draw.cards;
  const directions = draw.directions;
  if (mode === '2card' || mode === '3card') {
    const labels = mode === '2card' ? ['因', '果'] : ['源', '轉', '合'];
    return <section className="loc-card" data-draw-reading={mode}>
      <p className="loc-eyebrow">完整解讀</p>
      <h2>{mode === '2card' ? '因 → 果' : '源 → 轉 → 合'}</h2>
      <p><strong>完整現況：</strong>{cards.map((card, index) => `${labels[index]}「${card.rune_name}」${directions[index]}`).join('、')}。目前真實月相為{phase}。</p>
      <p><strong>閱讀方式：</strong>{mode === '2card' ? '先看造成現況的「因」，再看它導向的「果」。' : '依序閱讀「源 → 轉 → 合」，先找起點，再看轉化，最後看收束。'}</p>
      <div className="loc-context-list">{cards.map((card, index) => <div className="loc-context-item" key={`${mode}-${card.rune_id}-${index}`}><strong>{labels[index]}：{card.rune_name}・{directions[index]}</strong><span>{directionText(card, directions[index])}</span></div>)}</div>
    </section>;
  }
  if (mode === '5card') {
    const [past1, past2, unexpected, current1, current2] = cards;
    return <section className="loc-card" data-draw-reading="5card">
      <p className="loc-eyebrow">五卡完整解讀</p>
      <h2>雙卡＋單卡＋雙卡</h2>
      <p><strong>過去的成因：</strong>「{past1.rune_name}」{directions[0]}：{directionText(past1, directions[0])}；「{past2.rune_name}」{directions[1]}：{directionText(past2, directions[1])}。兩張牌共同描述事情形成的背景與潛因。</p>
      <p><strong>意外變化：</strong>「{unexpected.rune_name}」{directions[2]}：{directionText(unexpected, directions[2])}。單張只提供一個意外因素，不與雙卡拼接。</p>
      <p><strong>現在狀況：</strong>「{current1.rune_name}」{directions[3]}：{directionText(current1, directions[3])}；「{current2.rune_name}」{directions[4]}：{directionText(current2, directions[4])}。兩張牌共同描述現在以後可能形成的結論。</p>
      <p><strong>閱讀補充：</strong>這組結構延伸雙卡與三卡的讀法；月相放在最後，只作次要的時間修飾，可能稍強也可能稍弱。本次真實月相為{phase}。</p>
    </section>;
  }
  return null;
}

export default function RuneDrawClient({ drawKey = 'single' }) {
  const { value: uiSettings } = useNeonSetting(UI_SETTINGS_KEY, DEFAULT_UI_SETTINGS);
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
      const rows=await loadDrawCards(pairs,types);
      const byNumber=new Map(rows.map(row=>[Number(row.rune_id),row]));
      const cards=runeNumbers.map(number=>byNumber.get(Number(number))).filter(Boolean);
      if(cards.length!==runeNumbers.length)throw new Error('抽中的符文資料不完整。');
      const reading=buildFixedReading(cards,directions,drawKey);
      const createdAt=new Date().toISOString();
      setDraw({id:`rune-draw:${drawKey}:${Date.now()}`,createdAt,cards,directionIndexes,directions,reading});
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
        <p className="loc-eyebrow">月之符文</p>
        <h1>月之符文</h1>
        <p>月之符文由 66 枚核心符文組成。選擇抽牌方式後，系統會依符文、方向與固定組句規則產生籤詩；結果只供參考，你仍保有自己的判斷與選擇。</p>
      </header>

      <section className="loc-card" id="draw" data-draw-keyword="lunarunes-draw" data-draw-mode={drawKey}>
        <p className="loc-eyebrow">抽籤</p>
        <h2>{selectedMode.label}抽牌</h2>
        <p className={`loc-status ${error ? 'error' : ''}`}>{error || (ritualStep >= 0 ? '抽牌倒數進行中…' : `${selectedMode.label}：${selectedMode.positions.join(' → ')}${drawKey === 'daily' ? `／真實月相：${moonPhase}` : ''}`)}</p>
        <div className="runes-mode-nav" aria-label="抽牌模式">
          {DRAW_TYPES.map(item => <a key={item.key} href={DRAW_PATHS[item.key]} data-draw-mode={item.key} className={`loc-button ${drawKey === item.key ? 'primary' : ''}`}><strong>{item.label}</strong><span>{item.description}</span></a>)}
        </div>
      </section>

      {ritualStep >= 0 && <section className="loc-card runes-ritual" data-draw-stage="ritual" data-draw-mode={drawKey} aria-live="polite">
        <div className="runes-ritual-card"><img src="/assets/lunarunes/cards/65_玄.png" alt="玄之符文"/><strong>玄之符文</strong></div>
        <div className="runes-ritual-copy"><p className="loc-eyebrow">等待片刻</p><h2>{ritualMessages[ritualStep]}</h2><p>真實月相：{moonPhase}</p></div>
      </section>}

      {draw && <>
        <section className="loc-card" id="result" data-draw-stage="result" data-draw-mode={drawKey}>
          <div className="loc-result-meta"><span>{selectedMode.label}</span><span>真實月相：{moonPhase}</span></div>
          <div className="loc-draw-grid" data-draw-layout={drawKey}>
            {draw.cards.map((card, index) => <RuneCardInfo
              key={`${card.rune_id}-${index}`}
              card={card}
              imageSrc={runeCardImage(card)}
              imageClassName={`loc-rune-card-image ${ROTATION_CLASSES[draw.directionIndexes[index]]}`}
              positionLabel={selectedMode.positions[index] || `第 ${index + 1} 張`}
              direction={draw.directions[index]}
              realMoonPhase={moonPhase}
              dataRuneId={card.rune_id}
              dataDrawPosition={selectedMode.positions[index] || index + 1}
            />)}
          </div>
          <div className="loc-actions runes-retry">
            <button type="button" className="loc-button" data-draw-action="retry" onClick={executeDraw}>再抽一次</button>
          </div>
        </section>

        {drawKey === 'single' && <section className="loc-card" data-draw-reading="single">
          <p className="loc-eyebrow">單卡籤詩</p>
          <h2>{draw.cards[0].rune_name} · {draw.directions[0]}</h2>
          <RuneSingleReading card={draw.cards[0]} direction={draw.directions[0]}/>
        </section>}

        {drawKey === 'daily' && <section className="loc-card" data-draw-reading="daily">
          <p className="loc-eyebrow">每日指示</p>
          <h2>{draw.cards[0].rune_name} · {draw.directions[0]} · {moonPhase}</h2>
          <p className="runes-reading-lead"><strong>今日指引</strong><span>{dailyGuidance(draw.cards[0], draw.directions[0]) || directionText(draw.cards[0], draw.directions[0]) || '目前沒有這個位向的每日指示。'}</span></p>
        </section>}

        <MultiReading draw={draw} mode={drawKey} phase={moonPhase}/>

        {drawKey === 'ow3gs' && <section className="loc-card runes-ow3gs-core" data-draw-reading="ow3gs">
          <p className="loc-eyebrow">OW3gs · 雙模型判讀</p><h2>1–6 因的描述層 → 7–11 果的判定層</h2><p>第 7–11 張為核心判定。</p>
          <p>先讀成因分析，後讀判斷分析，最後套用月相交互。十一張牌不是等權並列。</p>
          <p><strong>1–6 因的描述層：</strong>源兩張、轉兩張、合兩張，共六張；依固定卡位組合前因。</p>
          <p><strong>7–11 果的判定層：</strong>使用五卡的基本規則，共五張；依固定五卡結構組合結果。</p>
          <div className="loc-context-list">{draw.cards.slice(6, 11).map((card, index) => <div className="loc-context-item" key={`core-${card.rune_id}-${index}`}><strong>第 {index + 7} 張 · {card.rune_name} · {draw.directions[index + 6]}</strong><span>{directionText(card, draw.directions[index + 6]) || card.rune_description}</span></div>)}</div>
          <p>月相交互最後才套用，只作次要時間修飾；重點是模型關聯，不是增加抽牌維度的複雜化。</p>
        </section>}

        {drawKey!=='single'&&drawKey!=='daily'&&<section className="loc-card" data-draw-stage="lots">
          <p className="loc-eyebrow">籤詩</p><h2>籤詩指引</h2>
          <p>{draw.reading?.sentence||'資訊不足。'}</p>
          {Array.isArray(draw.reading?.domains)?<div className="runes-advice-grid">
            {draw.reading.domains.map(item=><article key={item.label}><strong>{item.label}</strong><span>{item.text}</span></article>)}
          </div>:null}
        </section>}
      </>}
    </section>
  </div>;
}
