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
          <div className="home-rune-meta">
            <strong>命</strong>
            <span>卡片位向：正位</span>
          </div>
        </div>

        <div className="home-rune-copy">
          <div className="rune-intro-note">
            <strong>不知道怎麼開始沒關係，就抽一張牌吧！</strong>
            <p>可以是問事，可以是生活風格主題。</p>
            <p>不知道怎麼說的話，<a href="/runes">抽牌</a>就對了！</p>
            <p>月之符文的66符文字會給你提示籤詩，指引你的未知路線方式。</p>
          </div>

          <div className="loc-copy">
            <p>抽牌讓這語意種子，成為語意起點，</p>
            <p>用你想要的方式，成長成為完整語意的成熟果實。</p>
          </div>

          <div className="loc-panel">
            <h3>抽牌</h3>
            <p>可以從一個問題開始，也可以沒有問題直接抽取，再依需要選擇不同的抽牌方式。</p>
            <h3>選擇抽牌方式</h3>
            <div className="loc-chip-list">
              <span>單張</span><span>每日指示</span><span>兩張</span><span>三張</span><span>五張</span><span>11張</span>
            </div>
          </div>
        </div>
      </div>

      <div className="loc-actions home-rune-links">
        <a className="loc-button" href="/runes">符文圖鑑</a>
        <a className="loc-button" href="/context">符文脈絡</a>
        <a className="loc-button" href="/governance">符文規則</a>
      </div>
    </section>

    <section className="loc-card home-copy-block">
      <p className="loc-eyebrow">LunaRunes Context Evolution</p>
      <h2>月之符文的語言脈絡</h2>
      <p>月之符文由基本語彙出發，進入關係與脈絡分析，結合占卜使用的方法體系，演化出全新的語言表達作品。</p>
    </section>
  </section>;
}
