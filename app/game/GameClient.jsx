'use client';

import { useEffect, useMemo, useState } from 'react';
import { createGame, currentRound, evaluateDualCard, finalizeOpeningHand, normalizeRune } from './game-engine';
import { MACRO_STATES } from './game-data';
import './game.css';

const resultLabel = { perfect: '完美 +2', pass: '過關 +1', fair: '尚可 +0', fail: '不行 −1' };

export default function GameClient() {
  const [runes, setRunes] = useState([]);
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState([[], []]);
  const [message, setMessage] = useState('載入月之符文…');

  useEffect(() => {
    fetch('/data/json/core/runes.json').then((r) => r.json()).then((rows) => {
      const normalized = rows.map(normalizeRune);
      setRunes(normalized); setGame(createGame(normalized)); setMessage('雙方先從 8 張起手牌各棄 3 張。');
    }).catch(() => setMessage('無法載入符文資料。'));
  }, []);

  const round = useMemo(() => game ? currentRound(game) : null, [game]);
  if (!game) return <main className="game-shell"><p>{message}</p></main>;

  const toggle = (pi, id) => {
    setSelected((prev) => {
      const next = prev.map((x) => [...x]); const list = next[pi];
      if (list.includes(id)) next[pi] = list.filter((x) => x !== id); else if (list.length < (game.stage === 'setup' ? 3 : 2)) list.push(id);
      return next;
    });
  };

  const finishSetup = () => {
    try {
      const players = game.players.map((p, i) => finalizeOpeningHand(p, selected[i]));
      setGame({ ...game, players, stage: 'play' }); setSelected([[], []]); setMessage('起手完成。R1 Event Phase。');
    } catch (error) { setMessage(error.message); }
  };

  const resolveEvent = () => {
    const event = game.eventDeck[game.eventIndex];
    try {
      const outcomes = game.players.map((p, i) => evaluateDualCard(p.hand.filter((c) => selected[i].includes(c.id)), event));
      setMessage(`測試判定：A ${resultLabel[outcomes[0].result]}｜B ${resultLabel[outcomes[1].result]}。此 Match adapter 為 Alpha 可調規則。`);
    } catch (error) { setMessage(error.message); }
  };

  const event = game.eventDeck[game.eventIndex];
  return <main className="game-shell">
    <header><p className="eyebrow">Semantic Playground · Physical Playtest Alpha</p><h1>Game</h1><p>Historical LOC2 → Current Game。雙卡優先；規則變更保留可追溯性。</p></header>
    <section className="status"><strong>{game.stage === 'setup' ? '起手設定' : `R${round?.round} · ${round?.label}`}</strong><span>{message}</span></section>
    {game.stage === 'play' && round?.type === 'event' && <section className="event"><small>{event.id} · {event.group}</small><h2>{event.title}</h2><p>{event.description}</p><code>{event.signature}</code></section>}
    <section className="macro">{Object.entries(MACRO_STATES).map(([key,v]) => <span key={key}><b>{key}</b> {v.zh}</span>)}</section>
    <div className="players">{game.players.map((player, pi) => <section className="player" key={player.name}><h2>{player.name}</h2><p>De {player.de}/16 {player.star ? '★' : ''}</p><div className="hand">{player.hand.map((card) => <button type="button" className={selected[pi].includes(card.id) ? 'card selected' : 'card'} onClick={() => toggle(pi, card.id)} key={card.id}><small>{String(card.id).padStart(2,'0')} · {card.group} · {card.macro || 'SYSTEM'}</small><strong>{card.name}</strong><span>{card.action}</span></button>)}</div></section>)}</div>
    <footer>{game.stage === 'setup' ? <button className="primary" onClick={finishSetup}>雙方棄 3 張，開始</button> : round?.type === 'event' ? <button className="primary" onClick={resolveEvent}>雙卡測試判定</button> : <p>Resonance Phase 行動層將沿用 LOC2 v1.3 / Rune Action Profile 移植。</p>}</footer>
  </main>;
}
