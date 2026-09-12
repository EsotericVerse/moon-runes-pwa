export default function AboutView(){
  return <section className="loc-view">
    <header className="loc-hero">
      <div>
        <p className="loc-eyebrow">月典（LOC, Luna Codex）&gt; 語言模型框架(Language Model Framework)</p>
        <h1>LOC月典</h1>
        <p className="loc-core-line">從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演，累積後再選擇怎麼進化。</p>
        <p>月典(LOC,LunaCodex)是一套用來分析、整理、搜尋與推演語言的系統。月之符文(LunaRunes)是一套有自己獨立的語言方式。月典以月之符文開始，把文字、作品、脈絡與時間串起來判斷分析，讓累積的資料可以繼續被理解、比較分析與推演。</p>
        <div className="loc-actions">
          <a className="loc-button primary" href="/runes">月之符文</a>
          <a className="loc-button" href="/search">搜尋作品</a>
          <a className="loc-button" href="/statics">查看統計</a>
          <a className="loc-button" href="/governance">治理原則</a>
        </div>
      </div>

      <aside className="hero-note" aria-label="核心概念">
        <div className="moon" aria-hidden="true"></div>
        <strong>月之符文是種子，但不是使用門檻。</strong>
        <p>不必先知道月之符文，不必先懂得解牌，也不必先理解什麼是語言系統。你可以先抽牌、找作品、看脈絡分析、看關鍵字統計排行；想深入時，月典(LOC)再把底層結構展開給你。</p>
      </aside>
    </header>

    <section className="loc-card">
      <p className="loc-eyebrow">Start Here</p>
      <h2>第一次來，可以照這個順序開始</h2>
      <p>這裡不是再放一次首頁入口，而是給第一次接觸 LOC 的使用順序：先理解，再試用，再往資料與架構深入。</p>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">LunaRunes · 月之符文籤詩系統</p>
      <h2>問一件事，或讓語言自己成長</h2>
      <p>月之符文由 66 個中文單一字構成。可以從一個問題開始，也可以沒有問題直接抽取，再依需要選擇不同的抽牌方式。</p>
      <div className="loc-actions">
        <a className="loc-button primary" href="/runes">開始抽牌／查看圖鑑</a>
        <a className="loc-button" href="/context">查看符文脈絡</a>
      </div>
    </section>

    <section className="loc-card">
      <strong>不知道怎麼說，也沒關係。</strong>
      <p>月之符文可以成為語意起點：問事、整理感受，或在沒有靈感時提供新的創作路徑。</p>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">LunaRunes Context Evolution</p>
      <h2>月之符文的語言脈絡</h2>
      <p>月之符文由基本語彙出發，進入關係與脈絡分析，結合占卜使用的方法體系，演化出全新的語言表達作品。</p>
    </section>

    <section className="loc-grid two">
      <article className="loc-card">
        <p className="loc-eyebrow">Local-first</p>
        <h2>分類、Library、我的風格</h2>
        <p>個人分類先在本機完成：群組設定決定規則，分類器處理文字，Library 保存原文與結果，「我的風格」再從累積資料看分布與關鍵詞。原始資料不因重新分類而被改寫。</p>
        <div className="loc-actions"><a className="loc-button" href="/classify">分類</a><a className="loc-button" href="/library">Library</a><a className="loc-button" href="/my-style">我的風格</a></div>
      </article>
      <article className="loc-card">
        <p className="loc-eyebrow">Governance</p>
        <h2>治理不是附錄，而是系統本身</h2>
        <p>先依詞類判斷功能，再依主體性確認語意對象，以群組確定定位，最後映射個別符文；有爭議時保留候選與理由，而不是硬塞例外。關鍵詞是 evidence，不是 Canon 本身。</p>
        <a className="loc-button" href="/governance">查看完整治理</a>
      </article>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Language Evolution</p>
      <h2>從資料累積到推演</h2>
      <p>LOC 的方向不是把人生或創作固定成單一模式，而是把原本散落、只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可比較、可分析的結構。治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。</p>
      <div className="loc-actions"><a className="loc-button" href="/statics">統計</a><a className="loc-button primary" href="/evolution">推演</a></div>
    </section>
  </section>;
}
