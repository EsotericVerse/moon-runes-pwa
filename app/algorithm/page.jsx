export const metadata={title:'符文演算法｜LunaRunes'};

const SPREADS=[
  ['單卡','核心','以一張符文作為單一語意核心，結合方向與低權重月相修飾。','/duel/one'],
  ['每日','今日','每日符文使用單卡結構，作為當日主題與指引。','/duel/daily'],
  ['雙卡','因 → 果','第一張描述成因，第二張描述其導向的結果。','/duel/two'],
  ['三卡','源 → 轉 → 合','先讀起點，再看轉化，最後看收束。','/duel/three'],
  ['五卡','過去成因一 → 過去成因二 → 意外變化 → 現在狀況一 → 現在狀況二','兩張前因建立背景，中間一張描述偏轉，最後兩張共同描述現在。','/duel/five'],
  ['OW3gs','源2 → 轉2 → 合2 → 核心五卡','前六張建立情境，第7–11張作核心治理／建議判定。','/duel/ow3gs']
];

export default function AlgorithmPage(){
  return <main className="loc-next-main"><section className="loc-view scope-home-composition">
    <header className="loc-hero">
      <p className="loc-eyebrow">LunaRunes · Algorithm</p>
      <h1>符文演算法</h1>
      <p className="loc-subtitle">月之符文固定的抽牌組合與閱讀結構。</p>
      <p>符文本義先成立，再依牌位形成組合情境；方向與真實月相只作修飾，不覆蓋符文本義或牌位結構。</p>
    </header>
    <section className="loc-card">
      <p className="loc-eyebrow">Grammar</p>
      <h2>固定牌陣</h2>
      <div className="loc-context-list">
        {SPREADS.map(([name,structure,description,href])=><article className="loc-context-item" key={name}>
          <h3>{name}</h3>
          <p><strong>{structure}</strong></p>
          <p>{description}</p>
          <a className="loc-button" href={href}>使用{name}</a>
        </article>)}
      </div>
    </section>
    <section className="loc-card">
      <p className="loc-eyebrow">Context</p>
      <h2>脈絡對戰</h2>
      <p>脈絡對戰不是抽牌牌陣，而是以符文處理事件、關係與互動的 Semantic Playground。</p>
      <div className="loc-actions"><a className="loc-button" href="/duel/fight">進入脈絡對戰</a></div>
    </section>
  </section></main>;
}
