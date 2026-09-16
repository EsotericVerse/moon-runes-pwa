'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchLocJsonBatch, LOC_DATA } from '../loc/data';
import { putLocalRecord } from '../loc/local-db';
import { useLocalStore } from '../loc/local-store';
import { evaluateSpread, finalGuidance, splitDomainGuidance } from '../loc/model/semantic-guidance';
import { realMoonPhase } from '../loc/model/moon-phase';

const DIRECTIONS = ['正位', '半正位', '半逆位', '逆位'];
const ROTATION_CLASSES = ['rune-rotate-0', 'rune-rotate-90', 'rune-rotate-n90', 'rune-rotate-180'];
const UI_SETTINGS_KEY = 'loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS = { draw_response: 'ritual' };
const MODES = [
  { key: 'single', count: 1, label: '單卡', positions: ['核心'] },
  { key: 'daily', count: 1, label: '每日', positions: ['今日'] },
  { key: '2card', count: 2, label: '雙卡', positions: ['因', '果'] },
  { key: '3card', count: 3, label: '三卡', positions: ['源', '轉', '合'] },
  { key: '5card', count: 5, label: '五卡', positions: ['過去', '現在', '未來', '外在', '內在'] },
  { key: 'ow3gs', count: 11, label: '11卡 OW3gs', positions: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'] }
];
const RITUAL_MESSAGES = {
  single: ['您目前使用的是「單卡占卜模式」。', '正在找尋那命運之線……', '微弱的月光，會在漆黑的夜裡，帶領你找到方向。', '抽牌完成。'],
  daily: ['您目前使用的是「單卡每日抽牌模式」。', '這是一張屬於今日節奏與提醒的指引牌。', '正在對照今日真實月相。', '今日月符已經抽取完成。'],
  '2card': ['您目前使用的是「雙卡占卜模式」。', '第一張卡牌為「因」，第二張卡牌為「果」。', '正在整理兩張牌的因果位置。', '抽牌完成。'],
  '3card': ['您目前使用的是「三卡占卜模式」。', '第一張為「源」，第二張為「轉」，第三張為「合」。', '正在整理源、轉、合的語法位置。', '抽牌完成。'],
  '5card': ['您目前使用的是「五卡占卜模式」。', '依序觀看過去、現在、未來顯化、周圍環境與自己心境。', '正在整理時間主線與內外狀態。', '抽牌完成。'],
  ow3gs: ['您目前使用的是「OW3gs 11卡模式」。', '1–6 建立事件描述層，7–11 進入核心判定。', '正在整理兩段模型。', '十一張命運絲線已經整理完成。']
};

function randomInt(max) {
  if (max <= 1) return 0;
  if (globalThis.crypto?.getRandomValues) {
    const limit = Math.floor(0x100000000 / max) * max;
    const value = new Uint32Array(1);
    do globalThis.crypto.getRandomValues(value); while (value[0] >= limit);
    return value[0] % max;
  }
  return Math.floor(Math.random() * max);
}

// RUNE_DRAW_ALGORITHM_INVARIANT — DO NOT OPTIMIZE INTO SHUFFLE/BATCH RANDOM.
// Drawing N runes means exactly N independent rune-selection calls. Each call
// decides only the current card; that card is removed before the next call.
// This is sequential sampling without replacement, so duplicates are impossible
// without retry/random-call inflation. Direction randomization is a separate domain.
function drawRunesSequentially(items, count, selectIndex = randomInt) {
  if (!Number.isInteger(count) || count < 0 || count > items.length) {
    throw new Error(`無效的抽牌數量：${count}`);
  }
  const pool = [...items];
  const selected = [];
  for (let drawIndex = 0; drawIndex < count; drawIndex += 1) {
    const index = selectIndex(pool.length);
    if (!Number.isInteger(index) || index < 0 || index >= pool.length) {
      throw new Error(`第 ${drawIndex + 1} 次符文亂數超出候選池範圍。`);
    }
    const [card] = pool.splice(index, 1);
    selected.push(card);
  }
  return selected;
}

function runeCardImage(card) {
  const number = String(Number(card?.編號) || 0).padStart(2, '0');
  const name = String(card?.符文名稱 || '').replace(/之符文$/, '').trim();
  return `/assets/lunarunes/cards/${number}_${name}.png`;
}

function initialMode() {
  if (typeof window === 'undefined') return 'single';
  const value = new URLSearchParams(window.location.search).get('mode') || 'single';
  return MODES.some(item => item.key === value) ? value : 'single';
}

function directionText(card, direction) {
  const field = ({ '正位': '正向表示', '半正位': '半正向表示', '半逆位': '半逆向表示', '逆位': '逆向表示' })[direction];
  return card?.[field] || '';
}

function phaseAdvice(interpretations, card, direction, phase) {
  const row = (interpretations || []).find(item => item?.符文名稱 === card?.符文名稱);
  return row?.卡牌方向?.find(item => item?.方向 === direction)?.現況?.find(item => item?.現在月相 === phase) || null;
}

function SingleAdvice({ card, direction, phase, interpretations, daily = false }) {
  const info = phaseAdvice(interpretations, card, direction, phase);
  if (!info) return <p>目前沒有這組月相與位向的補充資料。</p>;
  if (daily) {
    return <div className="runes-advice-grid">
      <article><strong>今日核心</strong><span>{info.每日占卜提醒 || info.狀況表達}</span></article>
      <article><strong>狀況</strong><span>{info.狀況形容}</span></article>
      <article><strong>表達</strong><span>{info.狀況表達}</span></article>
      <article><strong>引導</strong><span>{info.每日占卜引導}</span></article>
      <article><strong>祝福</strong><span>{info.每日占卜祝福}</span></article>
    </div>;
  }
  return <>
    <p className="runes-reading-lead"><strong>占卜結論｜{card.符文名稱}・{direction}</strong><span>{directionText(card, direction)}</span></p>
    <div className="runes-advice-grid">
      <article><strong>愛情</strong><span>{info.愛情建議}</span></article>
      <article><strong>事業</strong><span>{info.事業建議}</span></article>
      <article><strong>心理</strong><span>{info.心理建議}</span></article>
      <article><strong>健康</strong><span>{info.健康建議}</span></article>
      <article><strong>生活</strong><span>{info.生活建議}</span></article>
    </div>
  </>;
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
      <p><strong>完整現況：</strong>{cards.map((card, index) => `${labels[index]}「${card.符文名稱}」${directions[index]}`).join('、')}。目前真實月相為{phase}。</p>
      <p><strong>閱讀方式：</strong>{mode === '2card' ? '先看造成現況的「因」，再看它導向的「果」。' : '依序閱讀「源 → 轉 → 合」，先找起點，再看轉化，最後看收束。'}</p>
      <div className="loc-context-list">{cards.map((card, index) => <div className="loc-context-item" key={`${mode}-${card.編號}-${index}`}><strong>{labels[index]}：{card.符文名稱}・{directions[index]}</strong><span>{directionText(card, directions[index])}</span></div>)}</div>
    </section>;
  }
  if (mode === '5card') {
    const [past, present, future, external, internal] = cards;
    return <section className="loc-card" data-draw-reading="5card">
      <p className="loc-eyebrow">Reading · 五卡完整解讀</p>
      <h2>時間主線 × 內外作用</h2>
      <p><strong>時間主線：</strong>過去的「{past.符文名稱}」{directions[0]}：{directionText(past, directions[0])}；現在的「{present.符文名稱}」{directions[1]}：{directionText(present, directions[1])}；若目前條件延續，未來顯化「{future.符文名稱}」{directions[2]}：{directionText(future, directions[2])}。</p>
      <p><strong>內外作用：</strong>周圍環境「{external.符文名稱}」{directions[3]}：{directionText(external, directions[3])}；自己心境「{internal.符文名稱}」{directions[4]}：{directionText(internal, directions[4])}。兩者共同描述前三張時間主線的條件。</p>
      <p><strong>閱讀原則：</strong>未來顯化描述延續目前條件後的趨勢，不作絕對結果判決。本次真實月相為{phase}。</p>
    </section>;
  }
  return null;
}

export default function RuneDrawClient() {
  const { value: uiSettings } = useLocalStore(UI_SETTINGS_KEY, DEFAULT_UI_SETTINGS);
  const [data, setData] = useState(null);
  const [interpretations, setInterpretations] = useState([]);
  const [error, setError] = useState('');
  const [modeKey, setModeKey] = useState('single');
  const [draw, setDraw] = useState(null);
  const [ritualStep, setRitualStep] = useState(-1);
  const [recordStatus, setRecordStatus] = useState('');
  const timers = useRef([]);

  useEffect(() => {
    setModeKey(initialMode());
    let live = true;
    fetchLocJsonBatch([LOC_DATA.RUNES, LOC_DATA.LOTS, LOC_DATA.RUNE_INTERPRETATIONS], { concurrency: 2 })
      .then(([runes, lots, interpretationRows]) => {
        if (!live) return;
        const canonicalRunes = (runes || []).filter(row => Number(row?.編號) >= 1 && Number(row?.編號) <= 66);
        if (canonicalRunes.length < 66) throw new Error(`核心符文資料只有 ${canonicalRunes.length} 枚，無法安全抽牌。`);
        setData({ runes: canonicalRunes, lots: Array.isArray(lots) ? lots : [] });
        setInterpretations(Array.isArray(interpretationRows) ? interpretationRows : []);
        setError('');
      })
      .catch(err => live && setError(`月之符文核心資料載入失敗：${err?.message || '未知錯誤'}`));
    return () => {
      live = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const selectedMode = useMemo(() => MODES.find(item => item.key === modeKey) || MODES[0], [modeKey]);
  const instantDraw = uiSettings?.draw_response === 'instant';
  const moonPhase = useMemo(() => realMoonPhase(), []);
  const liveGuidance = draw ? draw.guidance || '' : '';
  const ritualMessages = RITUAL_MESSAGES[modeKey] || RITUAL_MESSAGES.single;

  function chooseMode(key) {
    timers.current.forEach(clearTimeout);
    setRitualStep(-1);
    setError('');
    setRecordStatus('');
    setModeKey(key);
    setDraw(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', key);
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    }
  }

  function finishDraw() {
    try {
      if (!data?.runes?.length) throw new Error('符文資料尚未載入完成。');
      if (data.runes.length < selectedMode.count) throw new Error(`可抽取符文不足 ${selectedMode.count} 張。`);
      if (modeKey === 'daily' && !interpretations.length) throw new Error('每日符文解讀資料尚未載入完成。');
      const cards = drawRunesSequentially(data.runes, selectedMode.count);
      const directionIndexes = cards.map(() => randomInt(4));
      const directions = directionIndexes.map(index => DIRECTIONS[index]);
      const evaluation = evaluateSpread(cards, directions);
      const createdAt = new Date().toISOString();
      const guidance = finalGuidance(data.lots, cards.at(-1), directions.at(-1));
      setDraw({ id: `rune-draw:local:${modeKey}:${Date.now()}`, createdAt, cards, directionIndexes, directions, evaluation, guidance });
      setRecordStatus('');
      setError('');
    } catch (err) {
      setDraw(null);
      setError(`抽牌失敗：${err?.message || '未知錯誤'}`);
    } finally {
      setRitualStep(-1);
    }
  }

  function executeDraw() {
    if (!data || ritualStep >= 0) return;
    setError('');
    setRecordStatus('');
    setDraw(null);
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (instantDraw) {
      finishDraw();
      return;
    }
    setRitualStep(0);
    [1, 2, 3].forEach(step => timers.current.push(setTimeout(() => setRitualStep(step), step * 1000)));
    timers.current.push(setTimeout(finishDraw, 4000));
  }

  async function saveCurrentDraw() {
    if (!draw) return;
    try {
      const record = {
        id: draw.id,
        type: 'rune-draw',
        record_kind: modeKey === 'daily' ? 'daily' : 'general',
        created_at: draw.createdAt,
        mode: modeKey,
        mode_label: selectedMode.label,
        moon_phase: moonPhase,
        score: draw.evaluation.score,
        trend: draw.evaluation.range.label,
        guidance: liveGuidance,
        cards: draw.cards.map((card, index) => ({
          number: Number(card.編號),
          name: card.符文名稱,
          position: selectedMode.positions[index] || `第 ${index + 1} 張`,
          direction: draw.directions[index],
          positive_keywords: card.正向關鍵詞 || '',
          negative_keywords: card.反向關鍵詞 || ''
        }))
      };
      await putLocalRecord(record);
      setRecordStatus(modeKey === 'daily' ? '已記錄到每日抽籤。' : '已記錄到一般抽牌。');
    } catch (err) {
      setRecordStatus(`本機紀錄失敗：${err?.message || '未知錯誤'}`);
    }
  }

  return <div className="runes-draw-surface">
    <section className="loc-view">
      <header className="loc-hero" id="intro">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h1>月之符文</h1>
        <p>月之符文以固定 66 枚核心符文提供抽牌與語意指引。抽牌、加權與籤詩指引在瀏覽器本機完成，不呼叫外部 API。</p>
      </header>

      <section className="loc-card" id="draw" data-draw-keyword="lunarunes-draw" data-draw-mode={modeKey}>
        <p className="loc-eyebrow">Draw · 抽籤</p>
        <h2>選擇抽牌方式</h2>
        <div className="runes-mode-nav">
          {MODES.map(item => <button key={item.key} type="button" data-draw-mode={item.key} className={`loc-button ${modeKey === item.key ? 'primary' : ''}`} onClick={() => chooseMode(item.key)}>{item.label}</button>)}
        </div>
        <div className="loc-actions runes-draw-action">
          <button type="button" className="loc-button primary" data-draw-action="execute" onClick={executeDraw} disabled={!data || ritualStep >= 0}>{ritualStep >= 0 ? '占卜中…' : '抽牌'}</button>
        </div>
        <p className={`loc-status ${error ? 'error' : ''}`}>{error || (!data ? '載入月之符文核心資料中…' : `${selectedMode.label}：${selectedMode.positions.join(' → ')}${modeKey === 'daily' ? `／真實月相：${moonPhase}` : ''}`)}</p>
      </section>

      {ritualStep >= 0 && <section className="loc-card runes-ritual" data-draw-stage="ritual" data-draw-mode={modeKey} aria-live="polite">
        <div className="runes-ritual-card"><img src="/assets/lunarunes/cards/65_玄.png" alt="玄之符文"/><strong>玄之符文</strong><span>Chaos</span></div>
        <div className="runes-ritual-copy"><p className="loc-eyebrow">等待片刻</p><h2>{ritualMessages[ritualStep]}</h2><p>真實月相：{moonPhase}</p></div>
      </section>}

      {draw && <>
        <section className="loc-card" id="result" data-draw-stage="result" data-draw-mode={modeKey}>
          <div className="loc-result-meta"><span>{selectedMode.label}</span><span>真實月相：{moonPhase}</span></div>
          <div className="loc-draw-grid">
            {draw.cards.map((card, index) => <article className="loc-context-item compact loc-draw-card" data-rune-id={card.編號} data-draw-position={selectedMode.positions[index] || index + 1} key={`${card.編號}-${index}`}>
              <small>{selectedMode.positions[index] || `第 ${index + 1} 張`}</small>
              <img className={`loc-rune-card-image ${ROTATION_CLASSES[draw.directionIndexes[index]]}`} src={runeCardImage(card)} alt={`${card.符文名稱}符文卡`}/>
              <b>{card.符文名稱}</b>
              <span>{draw.directions[index]} · {card.卡片屬性 || '中平'}</span>
              <small>{directionText(card, draw.directions[index]) || card.符文說明}</small>
              <div className="runes-draw-keywords"><span><strong>正向關鍵詞</strong>{card.正向關鍵詞 || '—'}</span><span><strong>反向關鍵詞</strong>{card.反向關鍵詞 || '—'}</span></div>
            </article>)}
          </div>
          <div className="loc-actions runes-retry">
            <button type="button" className="loc-button" data-draw-action="retry" onClick={executeDraw}>再抽一次</button>
            <button type="button" className="loc-button primary" onClick={saveCurrentDraw}>{modeKey === 'daily' ? '記錄到每日' : '記錄一般抽牌'}</button>
          </div>
          {recordStatus && <p className="loc-status">{recordStatus}</p>}
        </section>

        {modeKey === 'single' && <section className="loc-card" data-draw-reading="single"><p className="loc-eyebrow">Reading · 單卡解讀</p><h2>{draw.cards[0].符文名稱} · {draw.directions[0]}</h2><SingleAdvice card={draw.cards[0]} direction={draw.directions[0]} phase={moonPhase} interpretations={interpretations}/></section>}
        {modeKey === 'daily' && <section className="loc-card" data-draw-reading="daily"><p className="loc-eyebrow">Daily · 每日指示</p><h2>{draw.cards[0].符文名稱} · {draw.directions[0]} · {moonPhase}</h2><SingleAdvice card={draw.cards[0]} direction={draw.directions[0]} phase={moonPhase} interpretations={interpretations} daily/></section>}
        <MultiReading draw={draw} mode={modeKey} phase={moonPhase}/>

        {modeKey === 'ow3gs' && <section className="loc-card runes-ow3gs-core" data-draw-reading="ow3gs">
          <p className="loc-eyebrow">OW3gs · 核心判定</p><h2>第 7–11 張為核心判定</h2>
          <div className="loc-context-list">{draw.cards.slice(6, 11).map((card, index) => <div className="loc-context-item" key={`core-${card.編號}-${index}`}><strong>第 {index + 7} 張 · {card.符文名稱} · {draw.directions[index + 6]}</strong><span>{directionText(card, draw.directions[index + 6]) || card.符文說明}</span></div>)}</div>
          <p>整體指示分數：{draw.evaluation.score.toFixed(3)} · 整體趨勢：{draw.evaluation.range.label}</p>
        </section>}

        <section className="loc-card" data-draw-stage="guidance">
          <p className="loc-eyebrow">Semantic Guidance · 語意指示</p>
          <h2>整體趨勢：{draw.evaluation.range.label}</h2>
          <p>指示分數：{draw.evaluation.score.toFixed(3)}。依符文詞性、卡片位向與牌位權重計算目前組合的整體語意傾向；分數不代表吉凶、好壞或結果機率。{modeKey === 'ow3gs' ? '第 7–11 張採核心權重。' : ''}</p>
          <div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>位置</th><th>符文</th><th>詞性</th><th>位向</th><th>權重</th><th>加權值</th></tr></thead><tbody>{draw.evaluation.rows.map((row, index) => <tr key={`${row.card.編號}-${index}`}><td>{selectedMode.positions[index] || index + 1}</td><td>{row.card.符文名稱}</td><td>{row.card.卡片屬性 || '中平'}</td><td>{row.direction}</td><td>{row.weight}</td><td>{row.weighted.toFixed(2)}</td></tr>)}</tbody></table></div>
        </section>

        <section className="loc-card" data-draw-stage="lots">
          <p className="loc-eyebrow">Lots · 籤詩</p><h2>籤詩指引</h2>
          <p>沿用最後一張「{draw.cards.at(-1)?.符文名稱} · {draw.directions.at(-1)}」的既有籤詩指示。</p>
          <div className="loc-context-list">{liveGuidance ? splitDomainGuidance(liveGuidance).map((line, index) => <div className="loc-context-item" key={`${line}-${index}`}>{line}</div>) : <div className="loc-context-item">籤詩資料仍在本機載入；抽牌與關鍵詞判定不受影響。</div>}</div>
        </section>
      </>}
    </section>
  </div>;
}