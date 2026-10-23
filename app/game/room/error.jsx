'use client';

import Link from 'next/link';

// Next.js App Router error boundary for a room route; no local board reset.
export default function GameRoomError({reset}){
  return <main className="loc-next-main" data-loc-scope="lrunes" data-loc-view="game">
    <section className="loc-card" role="alert">
      <h1>線上房間無法載入</h1>
      <p>遊戲頁面載入失敗。重試後仍無法進入時，可回到遊戲首頁重新加入。</p>
      <button type="button" onClick={reset}>重試載入</button>
      {' '}
      <Link href="/game/">返回遊戲首頁</Link>
    </section>
  </main>;
}
