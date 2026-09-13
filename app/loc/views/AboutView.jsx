export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero">
      <p className="loc-eyebrow">LOC · 月典 · (Language Model Framework)</p>
      <h1>LOC月典</h1>
      <p className="loc-core-line">從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演，累積後再選擇怎麼進化。</p>
      <div className="loc-hero-copy">
        <p>月典(LOC,LunaCodex)是一套用來分析、整理、搜尋與推演語言的系統。月之符文(LunaRunes)是一套有自己獨立的語言方式。</p>
        <p>月典以月之符文開始，把文字、作品、脈絡與時間串起來判斷分析，讓累積的資料可以繼續被理解、比較分析與推演。</p>
      </div>
    </header>

    <section className="loc-card home-copy-block home-rune-section">
      <div className="home-section-heading">
        <p className="loc-eyebrow">LunaRunes · 月之符文</p>
        <h2>符文籤詩系統</h2>
        <p className="loc-subtitle">問一件事，或讓語言自己成長</p>
      </div>

      <div className="home-rune-layout">
        <div className="home-rune-preview" aria-label="命之符文示例">
          <img src="/assets/lunarunes/cards/66_命.png" alt="命之符文" />
          <div className="home-rune-card-data">
            <div className="home-rune-card-title"><strong>命之符文</strong><span className="home-rune-glyph">⟁</span><span>(Fate)</span></div>
            <p>定論的所有可能 / 命定者</p>
            <details className="home-rune-keywords">
              <summary>關鍵詞（點擊展開）</summary>
              <p>正面：定論、必然、法則</p>
              <p>負面：—</p>
            </details>
            <p>所屬分組：特殊 / 卡片屬性：未知</p>
            <p>卡片月相：無 / 真實月相：空亡</p>
            <p className="home-rune-direction">卡片面向：<strong>正位</strong></p>
          </div>
        </div>

        <div className="home-rune-copy home-rune-copy-plain">
          <p><strong>不知道怎麼開始沒關係，就抽一張牌吧！</strong></p>
          <p>可以是問事，可以是生活風格主題。</p>
          <p>不知道怎麼說的話，<a href="/runes">抽牌</a>就對了！</p>
          <p>月之符文的66符文字會給你提示籤詩，指引你的未知路線方式。</p>
          <p>抽牌讓這語意種子，成為語意起點，<br/>用你想要的方式，成長成為完整語意的成熟果實。</p>

          <div className="home-draw-bubbles" aria-label="選擇抽牌方式">
            <a className="loc-bubble" href="/runes?mode=single">抽單張</a>
            <a className="loc-bubble" href="/runes?mode=daily">抽每日指示</a>
            <a className="loc-bubble" href="/runes?mode=2card">抽兩張</a>
            <a className="loc-bubble" href="/runes?mode=3card">抽三張</a>
            <a className="loc-bubble" href="/runes?mode=5card">抽五張</a>
            <a className="loc-bubble" href="/runes?mode=ow3gs">抽11張</a>
          </div>

          <div className="loc-actions home-rune-links">
            <a className="loc-button" href="/runes#library">符文圖鑑</a>
            <a className="loc-button" href="/governance">符文規則</a>
            <a className="loc-button" href="/context">符文脈絡</a>
          </div>
        </div>
      </div>
    </section>

    <section className="loc-card home-copy-block">
      <p className="loc-eyebrow">LunaRunes Context Evolution</p>
      <h2>月之符文的語言脈絡</h2>
      <p>月之符文由基本語彙出發，進入關係與脈絡分析，結合占卜使用的方法體系，演化出全新的語言表達作品。</p>
    </section>
  </section>;
}
