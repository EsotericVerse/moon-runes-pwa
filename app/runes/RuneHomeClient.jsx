'use client';

import {scopeHrefV2} from '../modular-v2/scope-registry.v2';

const DRAW_MODES=[
  ['單卡','duel/one'],
  ['每日','duel/daily'],
  ['雙卡','duel/two'],
  ['三卡','duel/three'],
  ['五卡','duel/five'],
  ['11卡 OW3gs','duel/ow3gs']
];

export default function RuneHomeClient(){
  return <main className="loc-next-main">
    <section className="loc-view">
      <header className="loc-hero">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h1>月之符文</h1>
        <p>由固定 66 枚中文單字符文構成。可直接選擇抽牌方式開始使用。</p>
      </header>

      <section className="loc-card" aria-label="月之符文介紹">
        <p className="loc-eyebrow">Introduction · 介紹</p>
        <h2>月之符文</h2>
        <div className="runes-home-reels">
          <article className="runes-home-reel">
            <iframe
              src="https://www.instagram.com/reel/DMA9yDAzeRK/embed"
              title="月之符文介紹"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />
          </article>
        </div>
      </section>

      <section className="loc-card" aria-label="抽牌方式">
        <p className="loc-eyebrow">Draw · 抽牌</p>
        <h2>直接開始</h2>
        <div className="runes-mode-nav">
          {DRAW_MODES.map(([label,path])=><a key={path} className="loc-button" href={scopeHrefV2('runes',path)}>{label}</a>)}
        </div>
      </section>
    </section>
  </main>;
}
