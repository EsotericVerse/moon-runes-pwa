'use client';

import { useMemo, useState } from 'react';
import { CARDS, EVENTS, coverage, deltaFor, drawToFive, shuffle } from '../model/game-data';

const playerName = index => index ? 'B' : 'A';

function freshPlayer() {
  return drawToFive({ de: 0, deck: shuffle(CARDS), hand: [], selected: [], acted: false });
}

function freshGame() {
  const eventDeck = shuffle(EVENTS);
  return {
    players: [freshPlayer(), freshPlayer()],
    eventDeck,
    event: eventDeck[eventDeck.length - 1],
    turn: 0,
    resolved: [false, false],
    winner: null,
    logs: ['新遊戲開始。'],
    result: '每位玩家每回合先選三張牌。'
  };
}

export default function GameView() {
  const [state, setState] = useState(null);
  const active = state?.players[state.turn];
  const canNext = state?.resolved.every(Boolean) && state?.winner === null;

  const status = useMemo(() => {
    if (!state) return '按「開始新遊戲」建立牌局。';
    if (state.winner !== null) return `Player ${playerName(state.winner)} 已達 16 De，取得本 Alpha 對局勝利。`;
    return `目前：Player ${playerName(state.turn)}。請選三張符文回答事件。`;
  }, [state]);

  function start() {
    setState(freshGame());
  }

  function toggleCard(playerIndex, cardIndex) {
    setState(previous => {
      if (!previous || previous.winner !== null || previous.turn !== playerIndex || previous.resolved[playerIndex]) return previous;
      const players = previous.players.map((player, index) => index === playerIndex ? {
        ...player,
        selected: player.selected.includes(cardIndex)
          ? player.selected.filter(value => value !== cardIndex)
          : (player.selected.length < 3 ? [...player.selected, cardIndex] : player.selected)
      } : player);
      return { ...previous, players };
    });
  }

  function submit() {
    setState(previous => {
      if (!previous) return previous;
      const playerIndex = previous.turn;
      const player = previous.players[playerIndex];
      if (player.selected.length !== 3 || previous.resolved[playerIndex]) return previous;

      const chosen = player.selected.map(index => player.hand[index]);
      const covered = coverage(chosen, previous.event.req);
      const result = deltaFor(covered.hits, covered.total);
      let nextPlayer = {
        ...player,
        de: Math.max(0, player.de + result.delta),
        hand: player.hand.filter((_, index) => !player.selected.includes(index)),
        selected: []
      };
      nextPlayer = drawToFive(nextPlayer);

      const players = previous.players.map((value, index) => index === playerIndex ? nextPlayer : value);
      const resolved = previous.resolved.map((value, index) => index === playerIndex ? true : value);
      const winner = players.findIndex(value => value.de >= 16);
      const names = chosen.map(card => `${card.name}(${card.aspect})`).join('、');

      return {
        ...previous,
        players,
        resolved,
        winner: winner >= 0 ? winner : null,
        turn: winner >= 0 ? playerIndex : (playerIndex ? 0 : 1),
        result: `Player ${playerName(playerIndex)}：${result.label}，覆蓋 ${covered.hits}/${covered.total}，De ${result.delta >= 0 ? '+' : ''}${result.delta}`,
        logs: [`Player ${playerName(playerIndex)} 出牌：${names} → ${result.label}（${covered.hits}/${covered.total}）`, ...previous.logs]
      };
    });
  }

  function interact(kind) {
    setState(previous => {
      if (!previous || previous.winner !== null) return previous;
      const playerIndex = previous.turn;
      const player = previous.players[playerIndex];
      if (!previous.resolved[playerIndex] || player.acted) return previous;

      const players = previous.players.map(value => ({ ...value }));
      if (kind === 'resonate') players[playerIndex].de += 1;
      else players[playerIndex ? 0 : 1].de = Math.max(0, players[playerIndex ? 0 : 1].de - 2);
      players[playerIndex].acted = true;
      const winner = players.findIndex(value => value.de >= 16);

      return {
        ...previous,
        players,
        winner: winner >= 0 ? winner : null,
        logs: [`Player ${playerName(playerIndex)} ${kind === 'resonate' ? '自我共振：De +1' : '破壞性共振：對手 De −2'}`, ...previous.logs]
      };
    });
  }

  function nextEvent() {
    setState(previous => {
      if (!previous || !previous.resolved.every(Boolean)) return previous;
      let deck = [...previous.eventDeck];
      deck.pop();
      if (!deck.length) deck = shuffle(EVENTS);
      const event = deck[deck.length - 1];
      const players = previous.players.map(player => drawToFive({ ...player, selected: [], acted: false }));
      return {
        ...previous,
        eventDeck: deck,
        event,
        players,
        resolved: [false, false],
        turn: 0,
        result: '每位玩家每回合先選三張牌。',
        logs: [`下一事件：${event.id} ${event.name}`, ...previous.logs]
      };
    });
  }

  return <section className="loc-view loc-game">
    <header className="loc-hero">
      <p className="loc-eyebrow">LOC2 · Semantic Playground</p>
      <h1>脈絡沙盒遊戲</h1>
      <p>兩位玩家各自使用 1–64 符文牌庫回答事件；先取得並守住 16 De 的玩家勝利。遊戲資料與狀態只在進入此 View 時載入。</p>
    </header>
    <div className="loc-actions">
      <button className="loc-button primary" onClick={start}>開始新遊戲</button>
      <button className="loc-button" onClick={nextEvent} disabled={!canNext}>下一事件</button>
    </div>
    <p className="loc-status">{status}</p>
    <div className="loc-legend">
      <span><b>SL</b> 靈魂／生命</span>
      <span><b>ML</b> 連結／礦物</span>
      <span><b>NE</b> 自然／元素</span>
      <span><b>OC</b> 秩序／無序</span>
    </div>
    {state && <>
      <div className="loc-game-board">
        {[0, 1].map(playerIndex => <section className={`loc-player ${state.turn === playerIndex && state.winner === null ? 'is-turn' : ''}`} key={playerIndex}>
          <p className="loc-eyebrow">PLAYER {playerName(playerIndex)}</p>
          <div className="loc-score">{state.players[playerIndex].de} <small>De</small></div>
          <p>牌庫 {state.players[playerIndex].deck.length}</p>
          <div className="loc-hand">
            {state.players[playerIndex].hand.map((card, cardIndex) => <button
              key={`${card.id}-${cardIndex}`}
              className={`loc-rune ${state.players[playerIndex].selected.includes(cardIndex) ? 'selected' : ''}`}
              disabled={state.turn !== playerIndex || state.resolved[playerIndex] || state.winner !== null}
              onClick={() => toggleCard(playerIndex, cardIndex)}
            >
              <b>{card.name}</b><span>{card.group}</span><em>{card.aspect}</em>
            </button>)}
          </div>
        </section>)}
        <section className="loc-event">
          <p className="loc-eyebrow">{state.event.id}</p>
          <h2>{state.event.name}</h2>
          <p className="loc-event-req">{state.event.req.join(' + ')}</p>
          <p>{state.event.desc}</p>
          <div className="loc-actions">
            <button className="loc-button primary" onClick={submit} disabled={state.winner !== null || state.resolved[state.turn] || active.selected.length !== 3}>送出三張符文</button>
            <button className="loc-button" onClick={() => interact('resonate')} disabled={state.winner !== null || !state.resolved[state.turn] || active.acted}>自我共振 +1</button>
            <button className="loc-button" onClick={() => interact('disrupt')} disabled={state.winner !== null || !state.resolved[state.turn] || active.acted}>破壞性共振 −2</button>
          </div>
          <p className="loc-status">{state.result}</p>
        </section>
      </div>
      <section className="loc-card">
        <h2>對局紀錄</h2>
        <div className="loc-log">{state.logs.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}</div>
      </section>
    </>}
  </section>;
}
