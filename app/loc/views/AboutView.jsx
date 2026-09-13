const progressItems = [
  ['Data','可比對資料 24,509 筆・總文字 2,939,214 字','總字數包含 2,356,594 字文章正文、400 首歌詞共 196,624 字，以及 26 份唯一 KM 知識文件共 385,996 字；圖片與影片不計字數。筆數與各來源、內容類型及日期分項統一放在多元搜尋的「資料來源」頁面。'],
  ['LunaRunes','66 符語意治理與 RAG 預備完成','月之符文66已完成現行母資料正名與核心語意治理；語意引擎的極性與關鍵詞已確認，符文 RAG 的前置資料亦已完成整理。目前持續進行舊版語意污染清理與 64→66 資料路徑收斂。'],
  ['Knowledge','系統內建 KM 至少 515 個知識單元','目前已登記 31 個 Knowledge Assets；FAQ 單獨即有 90 條。去除檢索投影、文章投影、圖片、重複文件版本與首頁統計展示後，目前有 26 份唯一 KM 知識文件，共 385,996 字。'],
  ['Evolution','來源 × 時期 動態 Top 10','排行榜可先看全部，再切 Facebook、Threads、Suno，並依現行時期邊界動態重新聚合；時期日期微調時不必重做固定排行。'],
  ['Search','綜合搜尋＋脈絡圖（Graph）關聯','可以從自然語言查詢作品、文字、知識與時間脈絡，再沿已治理的關係查看相關內容；排行中的詞也能直接回查命中的文章、作品與紀錄。'],
  ['Runtime','可變資料已由 Cloudflare KV 接管','時期、每日符文、Context Event 與 Relation 已完成 Cloudflare KV 化；Context 舊資料已由 Google Sheets 搬移並完成筆數核對，以及新增、編輯、刪除 CRUD 驗證。前端 runtime 不再依賴 Google Sheets。'],
  ['Governance','全文分析與公開展示分離','授權內容可以用全文做搜尋與分析；公開結果則依內容治理顯示片段、全文或僅 metadata。Facebook 與 Threads 預設採片段展示，歌詞不直接公開全文。'],
  ['Tutorial','新手教學文件','已提供「語言模型框架入門」與「月之符文入門」兩份新手教學 Web View，讓第一次接觸 LOC 的使用者可以先理解整體架構，再進入月之符文與多卡語法。'],
  ['Governance','治理文件','已建立系統治理、資料權責、內容版權／公開邊界與月之符文66治理文件；目前也把全文分析與公開展示、來源日期、時期動態聚合等規則納入治理層。']
];

export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero">
      <p className="loc-eyebrow">LOC · 月典 · Language Model Framework</p>
      <div className="home-title-row">
        <h1>LOC月典</h1>
        <p className="loc-core-line">從語彙開始，讓脈絡、作品與時間彼此連結，最後產生推演，累積後再選擇怎麼進化。</p>
      </div>
      <div className="loc-hero-copy">
        <p>月典(LOC,LunaCodex)是一套用來分析、整理、搜尋與推演語言的系統。月之符文(LunaRunes)是一套有自己獨立的語言方式。</p>
        <p>月典以月之符文開始，把文字、作品、脈絡與時間串起來判斷分析，讓累積的資料可以繼續被理解、比較分析與推演。</p>
        <div className="home-intro-links" aria-label="首頁快速入口">
          <a className="loc-bubble" href="#framework-map">架構圖</a>
          <a className="loc-bubble" href="#current-progress">目前進度</a>
          <a className="loc-bubble" href="/governance">治理</a>
          <a className="loc-bubble" href="#author-words">作者的話</a>
        </div>
      </div>
      <figure className="home-hero-visual">
        <img src="/pics/LOC-PicAll.png" alt="LOC 月典語言模型框架視覺理念圖" loading="eager" />
      </figure>
    </header>

    <section className="loc-card home-copy-block home-beginner" id="beginner">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Start Here · 新手上路</p>
        <h2>不用先懂，先從你想看的地方開始。</h2>
        <p className="loc-subtitle">不懂月典沒關係，不懂月之符文也沒關係；先用、先看，一個一個慢慢來。</p>
      </div>
      <div className="home-author-copy">
        <p><strong>不知道怎麼開始沒關係，就抽一張牌吧！</strong></p>
        <p>可以是問事，可以是生活風格主題。</p>
        <p>不知道怎麼說的話，<a href="/runes">抽牌</a>就對了！</p>
        <p>月之符文的66符文字會給你提示籤詩，指引你的未知路線方式。</p>
        <p>你可以直接抽牌，不需要先記住 66 個符文，也不需要先知道每一張牌代表什麼。抽到之後再看當下的文字、方向與說明就可以；想多了解一點，再慢慢往下看。</p>
        <p>你也可以完全不抽牌，直接看脈絡、統計、文化，或直接搜尋自己有興趣的文字與資料。月之符文是月典的起點，但不是使用月典的門檻。</p>
        <p>如果你想用自己的方式整理語意，也可以。月之符文提供的是一套可參考的表現方式，不要求所有人接受同一套分類；你可以找出自己的風格關鍵詞、整理自己的語意，甚至建立自己的符文或符號系統。</p>
        <div className="loc-actions">
          <a className="loc-button primary" href="/runes">直接抽牌</a>
          <a className="loc-button" href="/context">看脈絡</a>
          <a className="loc-button" href="/statics">看統計</a>
          <a className="loc-button" href="/evolution">看文化</a>
          <a className="loc-button" href="/search">直接搜尋</a>
        </div>
      </div>
    </section>

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
            <a className="loc-button" href="/runes#reference">符文脈絡</a>
          </div>
        </div>
      </div>
    </section>

    <section className="loc-card home-copy-block home-context" id="context">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Context · 脈絡</p>
        <h2>語言放進關係，才會形成脈絡。</h2>
        <p className="loc-subtitle">把語彙放進關係、情境、事件與 Graph，形成可觀察、可互動的脈絡。</p>
      </div>
      <div className="home-author-copy">
        <p>單一的字詞只是一個語意起點。當它出現在不同的人、作品、事件與情境裡，會和其他文字建立關係，也會產生不同的作用與解讀。</p>
        <p>LOC 會把這些關係整理成事件、關係式、情境與 Graph，讓原本分散的文字可以被連起來，看見它從哪裡來、和什麼有關，以及在什麼情況下改變。</p>
        <div className="loc-actions">
          <a className="loc-button" href="/context">查看脈絡</a>
        </div>
      </div>
    </section>

    <section className="loc-card home-copy-block home-culture" id="culture">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Culture · 文化</p>
        <h2>風格加上時間，形成文化。</h2>
        <p className="loc-subtitle">文字留下風格，風格經過時間累積，才看得見文化的變化。</p>
      </div>
      <div className="home-author-copy">
        <p>文化不是單純的文風，也不是固定的關鍵詞。相同的字詞、作品與價值，在不同時期、事件與環境裡，會留下不同的使用方式與風格。</p>
        <p>LOC 把脈絡重新放回時間中，透過時期、事件、趨勢與語彙軌跡，觀察語言如何累積、改變與延伸。</p>
        <p>過去與現在可以整理，未來仍然有變數；因此月典不是替未來下定論，而是治理已知、觀察演化，再推演可能。</p>
        <div className="loc-actions">
          <a className="loc-button" href="/evolution">查看文化</a>
        </div>
      </div>
    </section>

    <section className="loc-card home-progress" id="current-progress">
      <p className="loc-eyebrow">Current Progress</p>
      <h2>目前已經可以做到什麼？</h2>
      <p className="loc-subtitle">不只整理資料，而是讓文字可以被搜尋、比較、追蹤變化，再回到原始內容確認證據。</p>
      <div className="home-progress-grid" aria-label="目前可操作功能">
        {progressItems.map(([category,title,copy],index)=><article className="home-progress-item" key={`${category}-${index}`}>
          <small>{category}</small>
          <strong>{title}</strong>
          <span>{copy}</span>
        </article>)}
      </div>
      <div className="loc-actions home-progress-actions">
        <a className="loc-button primary" href="/search">試用綜合搜尋</a>
        <a className="loc-button" href="/statics">查看關鍵字排行</a>
      </div>
    </section>

    <section className="loc-card home-framework" id="framework-map">
      <p className="loc-eyebrow">Structure of LOC</p>
      <h2>結構</h2>
      <p className="loc-subtitle">LunaRunes · Context · Music · Literary · Multimedia · Algorithm · Module · Evolution</p>
      <p>它們不是八個彼此獨立的產品，也不是版本先後；而是 LOC 的八個功能責任區：月之符文、脈絡、音樂、文字創作、多媒體、演算法、演算模組與推演。</p>
      <figure className="home-framework-figure">
        <img src="/pics/LOC-structure.png" alt="月典結構圖與流程圖" loading="lazy" />
      </figure>
    </section>

    <section className="loc-card home-author-words" id="author-words">
      <p className="loc-eyebrow">作者的話</p>
      <h2>治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。</h2>
      <div className="home-author-copy">
        <p>月之符文本身是占卜指示籤詩的分析建議，重在符文本身的語彙交叉分析；巧妙的是，即使轉換語系也能通用，採取的是不帶神秘學預設的中立態度，重在文字本身而不論道德。</p>
        <p>月典從月之符文開始，後來逐步演變成與月之符文相輔相成的語言系統；而月之符文，也在這個過程中演變成可被分析、治理與推演的符號式語言系統。</p>
        <p>整合出月典，並不是為了把人生固定成某種發展模式，也不是為了賺錢，而是把散落、原本只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可解析的結構，才能進一步面對未來的各種可能。</p>
      </div>
    </section>
  </section>;
}