export const metadata={title:'抽牌｜月之符文'};

const MODES=[
  ['單卡','一張牌看核心','/duel/one'],
  ['每日符文','一天一張，作為當日主題與指引','/duel/daily'],
  ['雙卡','因 → 果','/duel/two'],
  ['三卡','源 → 轉 → 合','/duel/three'],
  ['五卡','過去成因 × 2 → 意外變化 → 現在狀況 × 2','/duel/five'],
  ['OW3gs','源2 → 轉2 → 合2 → 核心五卡','/duel/ow3gs']
];

export default function DuelHomePage(){
  return <main className="loc-next-main"><section className="loc-view scope-home-composition">
    <header className="loc-hero">
      <p className="loc-eyebrow">LunaRunes · Draw</p>
      <h1>抽牌</h1>
      <p className="loc-subtitle">選擇適合問題複雜度的牌陣，再進入獨立抽牌頁面。</p>
    </header>
    <section className="loc-card">
      <div className="loc-link-list">
        {MODES.map(([title,text,href])=><a className="loc-link-card" href={href} key={href}><strong>{title}</strong><span>{text}</span></a>)}
      </div>
    </section>
    <section className="loc-card">
      <p className="loc-eyebrow">Context Game</p>
      <h2>脈絡對戰</h2>
      <p>脈絡對戰不是牌陣，而是把符文放進事件與互動關係中使用。</p>
      <div className="loc-actions"><a className="loc-button" href="/duel/fight">進入脈絡對戰</a></div>
    </section>
  </section></main>;
}
