export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero">
      <p className="loc-eyebrow">LOC · 月典 · Language Model Framework</p>
      <div className="home-title-row">
        <h1>LOC月典</h1>
        <p className="loc-core-line">把語言整理成可理解、可搜尋、可推演的結構。</p>
      </div>
      <div className="loc-hero-copy">
        <p>月典(LOC,LunaCodex)是一套用來分析、整理、搜尋與推演語言的系統。<br/>月之符文(LunaRunes)是一套有自己獨立的語言方式。</p>
        <p>月典以月之符文開始，把文字、作品、脈絡與時間串起來判斷分析，<br/>讓累積的資料可以繼續被理解、比較分析與推演。</p>
      </div>
      <figure className="home-hero-visual">
        <img src="/pics/LOC-PicAll.png" alt="LOC 月典語言模型框架視覺理念圖" loading="eager" />
      </figure>
    </header>

    <section className="loc-card home-copy-block home-beginner" id="beginner">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Start Here · 新手上路</p>
        <h2>新手上路</h2>
        <p className="loc-subtitle">不知道怎麼開始沒關係，就抽一張牌吧！</p>
      </div>
      <div className="home-rune-layout">
        <div className="home-author-copy">
          <p>不用管符文是什麼，抽了就知道！可以是問事，可以是生活風格主題的每日符文。</p>
          <p>抽到之後再看當下的文字、方向與說明就可以；想多了解一點，再慢慢往下看。</p>
          <p>你也可以完全不抽牌，直接在符文面跳過，往下看或看上面連結的脈絡、統計、文化，<br/>或直接搜尋自己有興趣的文字與資料。</p>
          <p><strong>那就開始吧！</strong></p>
          <div className="loc-actions">
            <a className="loc-button primary" href="/runes">抽牌</a>
            <a className="loc-button" href="/statics">排行榜</a>
          </div>
        </div>
        <figure className="home-framework-figure">
          <img src="/pics/LOC-FrameworkPic.png" alt="LOC 框架步驟圖" loading="lazy" />
        </figure>
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
            <a className="loc-button" href="/runes#reference">符文脈絡</a>
          </div>
        </div>
      </div>
    </section>

    <section className="loc-card home-copy-block home-context" id="context">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Context · 脈絡</p>
        <h2>脈絡，文字的關係與分析</h2>
      </div>
      <div className="home-author-copy">
        <p>不只整理資料，而是讓文字可以被搜尋、比較、追蹤變化，再回到原始內容確認證據。</p>
        <p>藉由分析關聯性，找出情境、事件與互動關係圖，形成可觀察、可互動的脈絡。</p>
      </div>
      <p className="loc-subtitle">可以從自然語言查詢作品、文字、知識與時間脈絡，再沿已治理的關係查看相關內容；排行中的詞也能直接回查命中的文章、作品與紀錄。</p>
      <div className="home-progress-grid" aria-label="脈絡資料與知識">
        <article className="home-progress-item">
          <strong>可比對資料</strong>
          <span>總文字 2,939,214 字，內有24,509 筆資料。<br/>包含 2,356,594 字文章正文、400 首歌詞共 196,624 字，<br/>以及 26 份唯一 KM 知識文件共 385,996 字；<br/>圖片與影片不計字數。筆數與各來源、內容類型及日期分項統一放在多元搜尋的「資料來源」頁面。</span>
        </article>
        <article className="home-progress-item">
          <strong>系統內建 KM 至少 515 個知識單元</strong>
          <span>目前已登記 31 個 Knowledge Assets；FAQ 單獨即有 90 條。去除檢索投影、文章投影、圖片、重複文件版本與首頁統計展示後，目前有 26 份唯一 KM 知識文件，共 385,996 字。</span>
        </article>
      </div>
    </section>

    <section className="loc-card home-copy-block home-culture" id="culture">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Culture · 文化</p>
        <h2>文化，文字的演化</h2>
        <p className="loc-subtitle">文字留下風格，風格經過時間累積，才看得見文化的變化。</p>
      </div>
      <div className="home-author-copy">
        <p>LOC 把脈絡重新放回時間中，透過時期、事件、趨勢與語彙軌跡，觀察語言如何累積、改變與延伸。</p>
        <p>過去與現在可以整理，未來仍然有變數；因此月典不是替未來下定論，而是治理已知、觀察演化，再推演可能。</p>
        <p><a href="/statics">排行榜</a>可先看全部，再切 Facebook、Threads、Suno，並依現行時期邊界動態重新聚合；時期日期微調時不必重做固定排行。</p>
      </div>
      <div className="home-progress-grid" aria-label="文化搜尋、治理與演化">
        <article className="home-progress-item">
          <strong>結合搜尋跟脈絡圖關聯</strong>
          <span>可以從自然語言查詢作品、文字、知識與時間脈絡，再沿已治理的關係查看相關內容；排行中的詞也能直接回查命中的文章、作品與紀錄。</span>
        </article>
        <article className="home-progress-item">
          <strong>治理</strong>
          <span>授權內容可以用全文做搜尋與分析；公開結果則依內容治理顯示片段、全文或僅 metadata。Facebook 與 Threads 預設採片段展示，歌詞不直接公開全文。已建立系統治理、資料權責、內容版權／公開邊界與月之符文66治理文件；目前也把全文分析與公開展示、來源日期、時期動態聚合等規則納入治理層。</span>
        </article>
        <article className="home-progress-item">
          <strong>來源 × 時期 動態 Top 10</strong>
          <span>排行榜可先看全部，再切 Facebook、Threads、Suno，並依現行時期邊界動態重新聚合；時期日期微調時不必重做固定排行。</span>
        </article>
      </div>
    </section>

    <section className="loc-card home-framework" id="framework-map">
      <p className="loc-eyebrow">Structure of LOC</p>
      <h2>結構</h2>
      <p className="loc-subtitle">八個功能責任區與彼此關係</p>
      <p>它們不是八個彼此獨立的產品，也不是版本先後；而是 LOC 的八個功能責任區：月之符文、脈絡、音樂、文字創作、多媒體、演算法、演算模組與推演。</p>
      <figure className="home-framework-figure">
        <img src="/pics/LOC-structure.png" alt="月典結構圖與流程圖" loading="lazy" />
      </figure>
    </section>

    <section className="loc-card home-copy-block home-skills" id="skills">
      <div className="home-section-heading">
        <p className="loc-eyebrow">LOC GPT Skills</p>
        <h2>Skills，把月典的方法變成可以重複使用的工作流程。</h2>
        <p className="loc-subtitle">把語言治理與 Repository 治理封裝成可直接調用的 AI Skills。</p>
      </div>
      <div className="home-author-copy">
        <p><strong>loc-km-governance</strong>：檢查 Canon、KM、FAQ、Registry、Base66、術語一致性、資料權威與舊版污染。</p>
        <p><strong>loc-repo-health-check</strong>：檢查 Repository 結構、路徑、runtime projection、API／Search、legacy dependency、部署與效能風險。</p>
        <p>Skills 不是另一套理論，而是把 LOC 已形成的治理方法，轉成 GPT／Agent 可以重複執行的工作流程。</p>
        <div className="loc-actions">
          <a className="loc-button primary" href="/LOC-GPT-Skills-v1.0.0-bundle.zip">下載 LOC GPT Skills v1.0.0</a>
        </div>
      </div>
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