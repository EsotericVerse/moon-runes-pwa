export default function AboutView(){
  return <section className="loc-view">
    <header className="loc-hero loc-hero-with-note">
      <div>
        <p className="loc-eyebrow">LOC · Luna Codex · Language Model Framework</p>
        <h1>LOC月典</h1>
        <p className="loc-core-line">從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演，累積後再選擇怎麼進化。</p>
        <p>月典(LOC,LunaCodex)是一套用來分析、整理、搜尋與推演語言的系統。月之符文(LunaRunes)是一套有自己獨立的語言方式。月典以月之符文開始，把文字、作品、脈絡與時間串起來判斷分析，讓累積的資料可以繼續被理解、比較分析與推演。</p>
      </div>

      <aside className="hero-note" aria-label="核心概念">
        <div className="moon" aria-hidden="true"></div>
        <strong>月之符文是種子，但不是使用門檻。</strong>
        <p>不必先知道月之符文，不必先懂得解牌，也不必先理解什麼是語言系統。你可以先抽牌、找作品、看脈絡分析、看關鍵字統計排行；想深入時，月典(LOC)再把底層結構展開給你。</p>
      </aside>
    </header>

    <section className="loc-card">
      <p className="loc-eyebrow">Start Here</p>
      <h2>不知道從哪邊開始？沒關係！</h2>
      <p>不用先了解或知道什麼，抽張牌就知道！</p>
      <div className="loc-actions">
        <a className="loc-button primary" href="/runes">抽張牌</a>
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">LunaRunes · 月之符文籤詩系統</p>
      <h2>問一件事，或讓語言自己成長</h2>
      <p>月之符文由 66 個中文單一字構成。</p>
      <p>可以從一個問題開始，也可以沒有問題直接抽取，再依需要選擇不同的抽牌方式。</p>
      <div className="loc-actions">
        <a className="loc-button primary" href="/runes">開始抽牌／查看圖鑑</a>
        <a className="loc-button" href="/context">查看符文脈絡</a>
      </div>
    </section>

    <section className="loc-card rune-intro-note">
      <strong>不知道怎麼說，也沒關係。</strong>
      <p>月之符文可以成為語意起點：問事、整理感受，或在沒有靈感時提供新的創作路徑。</p>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">LunaRunes Context Evolution</p>
      <h2>月之符文的語言脈絡</h2>
      <p>月之符文由基本語彙出發，進入關係與脈絡分析，結合占卜使用的方法體系，演化出全新的語言表達作品。</p>
    </section>
  </section>;
}
