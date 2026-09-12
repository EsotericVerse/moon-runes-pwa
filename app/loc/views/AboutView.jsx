export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero">
      <p className="loc-eyebrow">月典（LOC, Luna Codex）&gt; 語言模型框架(Language Model Framework)</p>
      <h1>LOC月典</h1>
      <p className="loc-core-line">從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演，累積後再選擇怎麼進化。</p>
      <div className="loc-hero-copy">
        <p>月典(LOC,LunaCodex)是一套用來分析、整理、搜尋與推演語言的系統。月之符文(LunaRunes)是一套有自己獨立的語言方式。</p>
        <p>月典以月之符文開始，把文字、作品、脈絡與時間串起來判斷分析，讓累積的資料可以繼續被理解、比較分析與推演。</p>
      </div>
    </header>

    <section className="loc-card home-copy-block home-rune-section">
      <div className="home-section-heading">
        <p className="loc-eyebrow">LunaRunes · 月之符文籤詩系統</p>
        <h2>問一件事，或讓語言自己成長</h2>
        <p>月之符文由 66 個中文單一字構成。</p>
        <p>可以從一個問題開始，也可以沒有問題直接抽取，再依需要選擇不同的抽牌方式。</p>
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
            <strong>不知道怎麼說，也沒關係。</strong>
            <p>月之符文可以成為語意起點：問事、整理感受，或在沒有靈感時提供新的創作路徑。</p>
          </div>
          <div className="loc-actions">
            <a className="loc-button primary" href="/runes">開始抽牌／查看圖鑑</a>
            <a className="loc-button" href="/context">查看符文脈絡</a>
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
