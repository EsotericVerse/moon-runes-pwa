const MODEL_MODULES=[
  {
    key:'runes',
    name:'LunaRunes',
    zh:'月之符文',
    summary:'符號語彙與參考實作',
    detail:'以 Base66 為 Canon 語彙層，將 66 符、九群組、四向、月相、卡位與組合語法分離治理；抽取結果只消費固定定義，不反向改寫母資料。作為 LOC 第一個 Symbolic Language Model reference implementation，驗證語彙可被組合、追溯與重複運算。',
    href:'/runes',
    depth:'deep'
  },
  {
    key:'context',
    name:'Context',
    zh:'脈絡',
    summary:'關係、情境與遞迴連結',
    detail:'以 node／edge、來源與事件識別建立 Graph；跨作品、時期與資料域僅以 reference／consume 關係連結。查詢可由命中內容遞迴展開到原始證據、相鄰節點與其他脈絡，而不複製 Canon 或把推論升格為事實。',
    href:'/context',
    depth:'deep'
  },
  {
    key:'music',
    name:'Music',
    zh:'音樂',
    summary:'聲音作品與歌詞語料',
    detail:'保存作品、歌詞、曲風、時期與來源識別；讓聲音表達可被檢索並與文字、事件及媒體建立受治理的跨域關係。',
    href:'/search?q=音樂'
  },
  {
    key:'literary',
    name:'Literary',
    zh:'文字創作',
    summary:'原文、版本與敘事資產',
    detail:'以作品為 canonical owner，區分原稿、公開版本、分析投影與摘要；衍生資料保留 provenance，不取代或靜默覆寫原文。',
    href:'/search?q=文字創作'
  },
  {
    key:'media',
    name:'MultiMedia',
    zh:'多媒體',
    summary:'跨媒介表達與來源映射',
    detail:'治理圖像、影音與平台來源，透過穩定識別把同一語意在文字、聲音與畫面間的轉譯關係接回作品層。',
    href:'/search?q=多媒體'
  },
  {
    key:'methodology',
    name:'Methodology',
    zh:'方法論',
    summary:'分析座標與判讀程序',
    detail:'定義分類座標、判讀順序、證據門檻與異議處理；治理是跨資料域套用這些方法的架構能力，而非額外功能模組。',
    href:'/governance'
  },
  {
    key:'algorithm',
    name:'Algorithm',
    zh:'演算法',
    summary:'可重現處理與知識組合',
    detail:'把分類、聚合、搜尋、Graph traversal 與符文組合規則封裝為可獨立測試的處理單元；相同輸入、版本與規則產生可重現輸出。KM、RAG 或外部模型只能消費受治理資料與提出衍生結果，不越過 responsibility boundary 回寫 Canon。',
    href:'/search',
    depth:'deep'
  },
  {
    key:'culture',
    name:'Culture',
    zh:'文化',
    summary:'時間、軌跡與 Oscillation',
    detail:'把語彙、作品、事件與治理版本重新投影到 ERA／Timeline，比較跨期狀態、Trajectory、Trend 與 Oscillation。此層描述文化累積與往返變化，保留史實、分析與未來推演的證據邊界；流程箭頭本身不代表演化。',
    href:'/evolution',
    depth:'deep'
  }
];

export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero">
      <div className="home-title-row">
        <h1>LOC月典</h1>
        <p className="loc-subtitle">為語言模型框架（Language Model Framework）。<br/>把語言整理成可理解、可搜尋、可推演的結構。</p>
      </div>
      <div className="loc-hero-copy">
        <p className="loc-core-line">月典(LOC,LunaCodex)是一套用來分析、整理、搜尋與推演語言的系統。<br/>月之符文(LunaRunes)是一套符號式語言，有自己獨立的說明方式。</p>
        <p>月典以月之符文開始，把文字、作品、脈絡與時間串起來判斷分析，<br/>讓累積的資料可以繼續被理解、比較分析與推演。</p>
		
      </div>
      <figure className="home-hero-visual">
        <img src="/pics/LOC-PicAll.png" alt="LOC 月典語言模型框架視覺理念圖" loading="eager" />
      </figure>
    </header>

    <section className="loc-card home-copy-block home-beginner" id="beginner">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Start here</p>
        <h2>新手上路</h2>
        <p className="loc-subtitle">不知道怎麼開始沒關係，就抽張牌吧！</p>
      </div>
      <div className="home-rune-layout">
        <div className="home-author-copy">
          <p>不用管月之符文是什麼，抽了就知道！可以是問事，可以是決定生活主題風格的每日符文。</p>
          <p>抽到之後再看當下的文字、方向與說明就可以；想多了解一點，再慢慢往下看。</p>
          <p>你也可以完全不抽牌，直接在符文面跳過，往下看或看上面連結的脈絡、統計、文化，<br/>或直接搜尋自己有興趣的文字與資料。</p>
          <p><strong>那就開始吧！</strong></p>
          <div className="loc-actions">
            <a className="loc-button primary" href="/runes?mode=single">抽一張牌</a>
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
        <p className="loc-eyebrow">LunaRunes</p>
        <h2>月之符文籤詩系統</h2>
        <p className="loc-subtitle">不涉及神秘學，為單純的指引籤詩，<br/>不保證一定就是註定，你擁有選擇權。</p>
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
          <p>不知道怎麼說的話，往下抽牌就對了！</p>
		  <p>沒什麼想問的，抽個每日符文看看吧！</p>
          <p>月之符文的特有66符文字會給你提示籤詩，指引你的可能未來，</p>
		  <p>能是祝福可能是警告，你當然擁有選擇權。</p>
          <p>抽牌讓這符文成語意種子，成為語意起點，<br/>用你想要的方式，成長成為完整語意的成熟果實。</p>
          <p>最後的選擇權仍然在你的手上！</p>
          <div className="home-draw-bubbles" aria-label="選擇抽牌方式">
            <a className="loc-bubble" href="/runes?mode=single">抽單張</a>
            <a className="loc-bubble" href="/runes?mode=daily">抽每日指示</a>
            <a className="loc-bubble" href="/runes?mode=2card">抽兩張</a>
            <a className="loc-bubble" href="/runes?mode=3card">抽三張</a>
            <a className="loc-bubble" href="/runes?mode=5card">抽五張</a>
            <a className="loc-bubble" href="/runes?mode=ow3gs">抽11張</a>
          </div>

          <div className="loc-actions home-rune-links">
            <a className="loc-button" href="/runes">符文圖鑑</a>
            <a className="loc-button" href="/runes#governance">解牌規則</a>
            <a className="loc-button" href="/runes#context">符文脈絡</a>
          </div>
        </div>
      </div>
    </section>

    <section className="loc-card home-copy-block home-context" id="context">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Context</p>
        <h2>脈絡</h2>
        <p className="loc-subtitle">關鍵詞的分析與交互的互動關係圖，才會知道種子長出根的方向。</p>
      </div>
      <div className="home-author-copy">
        <p>不只整理資料，而是讓文字可以被搜尋、比較、追蹤變化，再與原始內容比較，進而學習成長進步。</p>
        <p>藉由分析關聯性，找出情境、事件與互動關係圖，形成可觀察、可互動的脈絡。</p>
        <p>可以從自然語言查詢作品、文字、知識與時間脈絡，再沿彼此的關係查看相關內容。</p>
		<p>不感興趣也沒關係！那來看看排行榜吧！這些詞也能直接回查命中的文章、作品與紀錄。</p>
      </div>
      <div className="home-progress-grid" aria-label="脈絡資料與知識">
        <article className="home-progress-item">
          <strong>目前可比對資料資料統計</strong>
          <span>總文字 2,939,214 字，內有24,509 筆資料。<br/>包含 2,356,594 字文章正文、400 首歌詞共 196,624 字，<br/>
		  筆數與各來源、內容類型及日期分項統一放在多元搜尋的「資料來源」頁面。</span>
        </article>
        <article className="home-progress-item">
          <strong>系統內建 KM 至少 515 個知識單元</strong>
          <span>目前已登記 31 個 Knowledge Assets；FAQ 單獨即有 90 條。去除檢索投影、文章投影、圖片、重複文件版本與首頁統計展示後，目前有 26 份唯一 KM 知識文件，共 385,996 字。</span>
        </article>
      </div>
    </section>

    <section className="loc-card home-copy-block home-culture" id="culture">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Culture</p>
        <h2>文化</h2>
        <p className="loc-subtitle">文化，是文字的演化。<br/>文字留下風格，風格經過時間累積，才看得見文字風格的變化。</p>
      </div>
      <div className="home-author-copy">
        <p>LOC 把脈絡重新放回時間中，透過時期、事件、趨勢與語彙軌跡的綜合分析，觀察語言如何累積、改變的趨勢，找出延伸的未來可能性。</p>
        <p>過去可以整理，沒有人可以知道未來，現在還在手上。不是替未來下定論，而是治理已知、觀察演化，再推演的可能性。</p>
        <p><a href="/statics">排行榜</a>可先看全部，再切 Facebook、Threads、Suno，並依來源與時期觀察語彙變化。</p>
      </div>
      <div className="home-progress-grid" aria-label="文化搜尋、治理與演化">
        <article className="home-progress-item">
          <strong>結合搜尋跟脈絡圖關聯</strong>
          <span>可以從自然語言查詢作品、文字、知識與時間脈絡，再沿已治理的關係查看相關內容；排行中的詞也能直接回查命中的文章、作品與紀錄。</span>
        </article>
        <article className="home-progress-item">
          <strong>治理、管理</strong>
          <span>授權內容可用全文做搜尋與分析；公開結果則依內容治理決定顯示全文、片段或僅 metadata。Facebook、Threads 預設只顯示片段，歌詞不直接公開全文；系統並以治理管理文件約束資料權責、版權與公開邊界。</span>
        </article>
      </div>
    </section>

    <section className="loc-card home-framework" id="framework-map">
	  <div className="home-section-heading">
        <p className="loc-eyebrow">LOC Model Architecture</p>
        <h2>LOC Model Architecture｜月典模型架構</h2>
        <p className="loc-subtitle">八個功能模組共享治理邊界，依資料、處理與組合關係協作。</p>
      </div>
      <div className="home-framework-stage" aria-label="LOC 八個功能模組與治理架構">
        <div className="model-module-grid">
          {MODEL_MODULES.map(module=><a className={`model-module model-module-${module.key}${module.depth?' is-deep':''}`} href={module.href} key={module.key}>
            <span className="model-module-name">{module.name}｜{module.zh}</span>
            <strong>{module.summary}</strong>
            <p>{module.detail}</p>
          </a>)}
        </div>
        <div className="model-relationship" aria-label="架構關係">
          <span>語彙與表達資料</span><b aria-hidden="true">→</b><span>脈絡與方法處理</span><b aria-hidden="true">↔</b><span>演算法與模組組合</span><b aria-hidden="true">→</b><span>文化時間投影</span>
        </div>
        <aside className="model-governance-layer">
          <div>
            <span className="model-governance-kicker">Governance｜治理架構層</span>
            <strong>Identity · Schema · Ownership · Provenance · Versioning · Permission</strong>
            <p>Canon／Base66、來源紀錄、Registry 與衍生 View 各自保有權責；跨模組以資料契約交換，遞迴分析只新增可追溯關係，不覆寫上游事實。</p>
          </div>
          <dl className="model-engineering-evidence" aria-label="目前 repository 工程治理證據">
            <div><dt>20</dt><dd>Next.js routes</dd></div>
            <div><dt>10</dt><dd>lazy-loaded feature views</dd></div>
            <div><dt>27</dt><dd>central data-path contracts</dd></div>
            <div><dt>11</dt><dd>verification commands</dd></div>
          </dl>
        </aside>
      </div>
    </section>

    <section className="loc-card home-copy-block home-skills" id="skills">
      <div className="home-section-heading">
        <p className="loc-eyebrow">LOC GPT Skills</p>
        <h2>Skills</h2>
        <p className="loc-subtitle">把月典延伸可以重複使用的工作流程。<br/>把語言治理與治理資料儲存庫，封裝成可直接調用的 AI Skills。</p>
      </div>
      <div className="home-author-copy">
        <p><strong>loc-km-governance</strong>：檢查 Canon、KM、FAQ、Registry、Base66、術語一致性、資料權威與舊版污染。</p>
        <p><strong>loc-repo-health-check</strong>：檢查儲存庫結構、路徑、API／搜尋、部署與效能風險等。</p>
        <p>Skills 不是另一套理論，而是把 LOC 已形成的治理管理理念跟方法，轉成GPT可以重複執行的工作流程。</p>
        <div className="loc-actions">
          <a className="loc-button primary" href="/LOC-GPT-Skills-v1.0.0-bundle.zip">下載 LOC GPT Skills v1.0.0</a>
        </div>
      </div>
    </section>

    <section className="loc-card home-author-words" id="author-words">
      <div className="home-section-heading">
        <p className="loc-eyebrow">About me</p>
        <h2>作者的話</h2>
        <p className="loc-subtitle">整理治理過去的已知，是為了把時間還給現在，對未知的未來做好準備。</p>
      </div>
      <div className="home-about-layout">
        <div className="home-author-copy">
          <p>月之符文本身是占卜指示籤詩的分析建議，重在符文本身的語彙交叉分析；巧妙的是，即使轉換語系也能通用，採取的是不帶神秘學預設的中立態度，重在文字本身而不論道德。</p>
          <p>月典從月之符文開始，後來逐步演變成與月之符文相輔相成的語言模型框架；而月之符文，也在這個過程中演變成可被分析、治理與推演的符號式語言。</p>
          <p>整合出月典，並不是為了把人生固定成某種發展模式，也不是為了賺錢，而是把散落、原本只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可解析的結構，才能進一步面對未來的各種可能。</p>
        </div>
        <figure className="home-about-figure">
          <img src="/pics/aboutme.png?v=20260914" alt="作者 Lucas Oscar Wang 政德" loading="eager" decoding="async" />
        </figure>
      </div>
    </section>
  </section>;
}
