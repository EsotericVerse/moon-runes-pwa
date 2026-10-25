import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const board=readFileSync(new URL('../app/lrunes/game/GameBoard.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/lrunes/game/game-board.css',import.meta.url),'utf8');
const rules=readFileSync(new URL('../app/lrunes/game/boardgame-rules.js',import.meta.url),'utf8');

test('only local opening uses face-down animated deal, never online sync',()=>{
  assert.ok(board.includes('function OpeningDealCards({cards,roleByGroup,groupVisualByGroup})'));
  assert.ok(board.includes('const dealActive=animateLocalDeal&&G.stage===\'opening\';'));
  assert.ok(board.includes('return <Board G={G} moves={moves} rules={data} onRestart={onRestart} animateLocalDeal/>'));
  assert.ok(board.includes('restartLabel="離開房間"/>'));
  assert.ok(!board.includes('remoteEffect={remoteEffect} onRestart={onExit} restartLabel="離開房間" animateLocalDeal'));
  assert.ok(board.includes('<OpeningDealCards cards={p.hand}'));
  assert.ok(board.includes('RUNE_CARD_BACK_IMAGE'));
});

test('opening hand is visually masked until the animation finishes, not re-dealt',()=>{
  assert.ok(board.includes('const dealReady=!dealActive||completedDeal===dealToken;'));
  assert.ok(board.includes("G.round+':'+G.active+':'+dealPlayer.hand.map(card=>card.id).join(',')"));
  assert.ok(board.includes('aria-busy={dealActive&&!dealReady&&i===G.active}'));
  assert.ok(board.includes('if(!dealReady)return;'));
  assert.ok(board.includes('disabled={!dealReady||active.selected.length!==rules.config.openingDiscard}'));
  assert.ok(board.includes("data-deal-phase={dealActive&&!dealReady&&i===G.active?'dealing':undefined}"));
  assert.ok(rules.includes('const players=Array.from({length:count}'));
  assert.ok(rules.includes('freshPlayer(rules.cards'));
  assert.ok(rules.includes("stage:'opening'"));
});

test('cards fly and flip with perspective, leave game actions unobstructed',()=>{
  assert.ok(css.includes('perspective:1000px'));
  assert.ok(css.includes('@keyframes lrg-deal-arrival'));
  assert.ok(css.includes('@keyframes lrg-deal-turnover'));
  assert.ok(css.includes('transform-style:preserve-3d'));
  assert.ok(css.includes('backface-visibility:hidden'));
  assert.ok(css.includes('animation-delay:calc(var(--deal-order)'));
  assert.ok(css.includes('.lrg-deal-card{'));
  assert.ok(css.includes('pointer-events:none'));
  assert.ok(css.includes('var(--deal-source-x)'));
  assert.ok(css.includes('var(--deal-row-shift)'));
});

test('reduced motion immediately unmasks playable cards',()=>{
  assert.ok(board.includes("window.matchMedia?.('(prefers-reduced-motion: reduce)').matches"));
  assert.ok(board.includes('setCompletedDeal(dealToken);'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('.lrg-deal-card,.lrg-deal-flip{animation:none!important'));
});
