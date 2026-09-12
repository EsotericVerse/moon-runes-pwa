const modules=[
  ['LOC1','LunaRunes／月之符文','66 個中文單一字構成的符號式語言模型；提供圖鑑、方向、抽牌與籤詩指引。','/runes'],
  ['LOC2','Context／脈絡','把語彙放進事件、關係與 Graph，觀察語意如何在脈絡中形成連結。','/context'],
  ['LOC3','Music／音樂','收納歌曲、歌詞、ERA、曲風與創作脈絡，讓作品可搜尋、比較與分析。','/search'],
  ['LOC4','Literary／文字創作','小說、文字作品與符文延伸文本進入同一個可檢索、可分析的語料層。','/search'],
  ['LOC5','Media／多媒體','把影像、影音、作品連結與文字資料放回同一套語言脈絡。','/library'],
  ['LOC6','Algorithm／演算法','治理分類、關鍵詞、語意邊界與演算規則，讓系統知道如何判斷而不是只會搜尋。','/governance'],
  ['LOC7','Module／模組','把可重複使用的語言能力整理成模組，供分類、Library、Graph 與其他工具共用。','/classify'],
  ['LOC8','Evolution／推演','把資料重新放回時間，觀察時期、趨勢與演化，再決定下一步如何調整。','/evolution']
];

const starts=[
  ['01','先使用','完全不懂 LOC 也沒關係，先從月之符文或遊戲開始，先用再理解。','/runes','月之符文'],
  ['02','再找資料','搜尋作品、關鍵詞與內容，看看 LOC 已經整理了哪些語料。','/search','搜尋'],
  ['03','看脈絡','進一步看 Graph、事件與關係，理解資料不是單獨存在。','/context','脈絡'],
  ['04','最後看治理','需要深入時再看分類、語意邊界、資料治理與演算法。','/governance','治理']
];

export default function AboutView(){
  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">LOC · Luna Codex · Language System Model</p>
      <h1>LOC 月典</h1>
      <p className="loc-core-line">從語彙開始，讓脈絡、作品與時間彼此連結，最後形成可搜尋、可分析、可治理、可推演的語言系統。</p>
      <p>LOC（月典／Luna Codex）是一套用來分析、整理、搜尋與推演語言的 Language System Model。月之符文 LunaRunes 是它最早的語彙種子，也是目前可直接運作的 Symbolic Language Model；但使用 LOC 不需要先學會符文或理解完整理論。</p>
      <div className="loc-actions">
        <a className="loc-button primary" href="/runes">月之符文</a>
        <a className="loc-button" href="/search">搜尋作品</a>
        <a className="loc-button" href="/statics">查看統計</a>
        <a className="loc-button" href="/governance">治理原則</a>
      </div>
    </header>

    <section className="loc-card">
      <p className="loc-eyebrow">Start Here</p>
      <h2>第一次來，可以照這個順序開始</h2>
      <p>月之符文是種子，但不是使用門檻。你可以先抽牌、玩遊戲、找作品、看脈絡或排行榜；想深入時，再讓 LOC 把底層結構展開。</p>
      <div className="loc-grid two">
        {starts.map(([no,title,copy,href,label])=><article className="loc-card" key={no}>
          <p className="loc-eyebrow">{no}</p><h2>{title}</h2><p>{copy}</p><a className="loc-button" href={href}>{label}</a>
        </article>)}
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">LunaRunes</p>
      <h2>月之符文：66 個中文單一字構成的語言入口</h2>
      <p>可以從一個問題開始，也可以沒有問題直接抽取。單卡提供語意起點；雙卡讀因 → 果；三卡讀源 → 轉 → 合；五卡加入過去、現在、未來顯化、周圍環境與自己心境；OW3gs 11 卡則以 7–11 為核心判定層。</p>
      <div className="loc-actions">
        <a className="loc-button primary" href="/runes">開始抽牌／查看圖鑑</a>
        <a className="loc-button" href="/context">查看符文脈絡</a>
      </div>
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Structure of LOC</p>
      <h2>LOC1–8 語言系統模組</h2>
      <p>八個模組不是層級，而是同一套 Language System Model 的八種功能分工。資料可以從任一入口進入，再依需要跨模組流動。</p>
      <div className="loc-grid two">
        {modules.map(([id,title,copy,href])=><a className="loc-link-card" href={href} key={id}>
          <strong>{id} · {title}</strong><span>{copy}</span>
        </a>)}
      </div>
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
