'use client';

import { useMemo, useState } from 'react';
import runes from '../../data/json/core/runes.json';
import eventRegistry from '../../data/json/registries/CONTEXT_EVENT_REGISTRY.json';
import { SLOT_LABELS, drawEvent, drawHand, constructionText, runeSemanticText } from './text-construction-engine';
import './game.css';

const PLAYABLE_RUNES = runes.filter((r) => Number(r.編號) >= 1 && Number(r.編號) <= 66);
const EVENTS = eventRegistry.records || [];

export default function TextConstructionGameClient() {
  const [event, setEvent] = useState(() => drawEvent(EVENTS));
  const [hand, setHand] = useState(() => drawHand(PLAYABLE_RUNES, 7));
  const [slots, setSlots] = useState([null, null, null]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const ready = slots.every(Boolean);
  const selectedIds = useMemo(() => new Set(slots.filter(Boolean).map((r) => r.編號)), [slots]);

  function chooseRune(rune) {
    if (selectedIds.has(rune.編號)) {
      setSlots((old) => old.map((x) => x?.編號 === rune.編號 ? null : x));
      setResult(null);
      return;
    }
    const empty = slots.findIndex((x) => !x);
    if (empty < 0) return;
    setSlots((old) => old.map((x, i) => i === empty ? rune : x));
    setResult(null);
  }

  function clearSlot(index) {
    setSlots((old) => old.map((x, i) => i === index ? null : x));
    setResult(null);
  }

  function submitConstruction() {
    if (!ready) return;
    const text = constructionText(slots);
    const record = {
      eventId: event.event_id,
      eventTitle: event.title,
      text,
      runes: slots.map((r) => r.符文名稱),
    };
    setResult(record);
    setHistory((old) => [record, ...old].slice(0, 8));
  }

  function nextRound() {
    setEvent((old) => drawEvent(EVENTS, old?.event_id));
    setHand(drawHand(PLAYABLE_RUNES, 7));
    setSlots([null, null, null]);
    setResult(null);
  }

  return <main className="tcg-shell">
    <header className="tcg-hero">
      <p className="tcg-eyebrow">LunaRunes · Text Architecture · Playable Alpha</p>
      <h1>文字建造遊戲</h1>
      <p>世界提出一個 Event。從手牌選三張符文，依 <strong>源 → 轉 → 合</strong> 建造你的回答。</p>
    </header>

    <section className="tcg-event" aria-label="事件">
      <div><span>{event.event_id}</span><span>{event.event_group}</span></div>
      <h2>{event.title}</h2>
      <p>{event.description}</p>
      <small>Alpha provenance：{event.requirement_signature} 僅保留作歷史快速評估資料，不作本版自動判分。</small>
    </section>

    <section className="tcg-construction" aria-label="源轉合建造區">
      {SLOT_LABELS.map((label, index) => {
        const rune = slots[index];
        return <button className={`tcg-slot ${rune ? 'filled' : ''}`} key={label} onClick={() => rune && clearSlot(index)}>
          <span>{label}</span>
          {rune ? <><b>{rune.符文名稱}</b><em>{rune.英文} · {rune.所屬分組}</em><small>{runeSemanticText(rune)}</small></> : <><b>選擇符文</b><em>{index === 0 ? '起點／來源' : index === 1 ? '轉化／變化' : '收束／結果'}</em></>}
        </button>;
      })}
    </section>

    <section className="tcg-hand" aria-label="手牌">
      <div className="tcg-section-head"><h2>手牌</h2><span>7 選 3</span></div>
      <div className="tcg-cards">{hand.map((rune) => <button key={rune.編號} className={`tcg-rune ${selectedIds.has(rune.編號) ? 'selected' : ''}`} onClick={() => chooseRune(rune)}>
        <span>{String(rune.編號).padStart(2, '0')}</span><b>{rune.符文名稱}</b><em>{rune.所屬分組}</em><small>{rune.符文說明}</small>
      </button>)}</div>
    </section>

    <section className="tcg-actions">
      <button className="secondary" onClick={() => { setHand(drawHand(PLAYABLE_RUNES, 7)); setSlots([null, null, null]); setResult(null); }}>重抽手牌</button>
      <button disabled={!ready} onClick={submitConstruction}>完成建造</button>
      <button className="secondary" onClick={nextRound}>下一事件</button>
    </section>

    <section className="tcg-result" aria-live="polite">
      <h2>建造結果</h2>
      {result ? <><strong>{result.text}</strong><p>這一版先保留人的解讀權：系統展示結構與符文語意，不把舊 SL／ML／NE／OC coverage 當作答案正誤。</p></> : <p>依序放入三張符文，完成一個可解釋的「源 → 轉 → 合」。</p>}
    </section>

    {history.length > 0 && <section className="tcg-history"><h2>本次 Playtest Trace</h2>{history.map((x, i) => <p key={`${x.eventId}-${i}`}><span>{x.eventId} {x.eventTitle}</span><strong>{x.text}</strong></p>)}</section>}
  </main>;
}
