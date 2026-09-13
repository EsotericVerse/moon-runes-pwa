'use client';

import { useEffect, useState } from 'react';

const FRAMEWORK_ITEMS={
  LOC1:{english:'LunaRunes',title:'月之符文',tab:'月之符文',copy:'月之符文是月典的起點，但不是使用月典的門檻。它以 66 個月之符文形成可閱讀、可比較、可組合的符號式語言。',extra:[
    '核心：66 個月之符文構成固定語意骨架；第 0 符「德」是作者與系統的基準符，不參與一般抽取。',
    '方向：正位、半正位、半逆位與逆位是四種獨立語意狀態，用來描述同一符文在不同情境中的表現，不等同於單純的好與壞。',
    '抽取：單卡、雙卡、三卡、五卡與 OW3gs 11 張各自具有不同的組合方式，從單一語意起點一路延伸到多層次判讀。',
    '結構：雙卡可形成前後或因果關係，三卡可形成「源 → 轉 → 合」，更長的抽取則用更多位置補足時間、內外與核心判定。',
    '用途：可以用來問事、整理感受、建立創作起點，也可以單純把符文當作一組可被分析與交叉組合的語彙。',
    '入口：月之符文是月典最早形成的語彙種子，但使用月典並不需要先學會全部符文，也不需要先理解抽牌規則。'
  ],href:'/runes',label:'月之符文'},
  LOC2:{english:'Context',title:'脈絡',tab:'脈絡',copy:'把語彙、作品、事件與概念放回關係與情境中，讓單一內容能和前後文、其他節點與事件一起被理解。',extra:[
    '關係：關係圖(Graph)用節點與連結呈現內容彼此怎麼連，不只顯示單一資料，而是讓相關文字、作品、事件與概念能一起被觀察。',
    '情境：脈絡不只回答「這是什麼」，也補上「它在什麼情況下出現、前後發生了什麼、和哪些內容一起出現」。',
    '事件：事件資料可以和作品、時間與語彙交叉連結，讓同一個概念回到真實發生過的情境中，而不是被孤立成一個標籤。',
    '搜尋：搜尋結果可以沿著已治理的關係繼續展開，從命中的文字回到來源，再從來源查看相關節點與其他內容。',
    '比較：同一個詞或概念可以跨時期、跨作品與跨來源比較，觀察它在不同脈絡中的角色與意義是否發生變化。',
    '互動：脈絡沙盒是其中一種互動實作，把已整理的關係放進可操作的情境，讓使用者直接觀察語意如何互相影響。'
  ],href:'/context',label:'脈絡'},
  LOC3:{english:'Music',title:'音樂',tab:'音樂',copy:'把歌詞、作品、曲風與創作時期納入語言資料，使聲音作品可以被搜尋、比較，並和其他文本建立連結。',extra:[
    '內容：歌曲不只保存歌名與連結，也保存歌詞、主題、曲風、創作時期與作品之間的關係，使音樂可以當成完整語言資料處理。',
    '歌詞：歌詞本身是可分析文本，可以和其他文章、小說、符文與生活文字一起搜尋與比較，而不是只作為歌曲附件。',
    '標籤：曲風、主題與標籤(hashtag)可作為直接分類資料，用來統計作品分布，也可以和語意搜尋結果交叉使用。',
    '時期：作品放回創作時期後，可以觀察某個階段常出現的語彙、情緒、題材與寫作方式，並和前後時期比較。',
    '連結：同一首歌可以同時連到文字創作、多媒體、人物、事件與脈絡，使音樂不再是獨立資料孤島。',
    '用途：除了直接找歌，也可以從情緒、主題、情境或一句記得的文字重新找到作品，讓累積的音樂資料可以持續被使用。'
  ],href:'/search?q=音樂',label:'搜尋音樂'},
  LOC4:{english:'Literary',title:'文字創作',tab:'文字創作',copy:'保存與分析小說、文章、散文及其他文字作品，並保留來源、版本、發表與改寫之間的關係。',extra:[
    '內容：小說、文章、散文、生活文字與其他文字作品都保留為原始作品，不因進入分析系統就被改寫成治理文件或摘要資料。',
    '來源：每份作品盡量保留原始來源、首次發表位置與時間，使後續搜尋與分析仍能回到最初文本確認。',
    '版本：同一作品的原稿、公開版本與後續改寫可以分開治理，既保留歷史，也避免不同版本彼此覆蓋造成語意混淆。',
    '主題：同一個主題可以跨不同作品持續出現，透過搜尋與脈絡連結，可以看到它如何在不同時間被重新描述與發展。',
    '跨媒介：文字作品可以和歌曲、圖像、影片與其他多媒體互相連結，保留同一概念在不同媒介中的延伸方式。',
    '用途：文字內容可以進入搜尋、脈絡與文化觀察，但作品本身仍然是作品，分析結果不取代原文，也不反過來改寫原始文本。'
  ],href:'/search?q=文字創作',label:'搜尋文字'},
  LOC5:{english:'Multimedia',title:'多媒體',tab:'多媒體',copy:'把語言延伸到圖像、影音與其他媒介，觀察同一概念如何在文字、聲音與畫面之間轉換與重組。',extra:[
    '內容：多媒體包含圖像、短影片(Reels)、影片、音樂影片(MV)與系統視覺化，不只把檔案依格式分類，而是保留它們承載的語意。',
    '跨媒介：同一個概念可以同時存在於文字、歌曲與影像中，系統保留這些版本之間的關係，而不是把它們拆成互不相干的素材。',
    '表達：畫面、聲音、節奏與文字會改變同一概念的感受方式，因此多媒體重點是觀察轉換後增加、減少或改變了哪些訊息。',
    '來源：公開影片與圖像保留來源與作品關係，讓分析可以回到實際作品，不以單一截圖或摘要取代完整內容。',
    '搜尋：多媒體可以透過作品名稱、主題、文字描述、相關歌曲與其他已治理資料被找到，而不必只靠檔名或平台分類。',
    '用途：它讓文字系統延伸到畫面與聲音，並提供跨媒介比較的入口，用來觀察同一語意在不同形式中的共振與差異。'
  ],href:'/search?q=多媒體',label:'搜尋多媒體'},
  LOC6:{english:'Algorithm',title:'演算法',tab:'演算法',copy:'把語言治理原則轉成可重複判斷與處理的規則，負責分類、比較、排序、判定與其他可解釋的處理流程。',extra:[
    '原則：先確定治理規則，再把規則轉成演算法；不應該先讓模型產生結果，再反過來為結果補一套看似合理的說明。',
    '分類：分類會先看文字本身的語意角色與既有規則，再做群組歸屬，避免只因單一關鍵字出現就直接判定類別。',
    '判定：分類、比較、排序與判定都應該能被重複執行，並能說明依據，讓同一份資料在相同規則下得到一致結果。',
    '無應用程式介面(No API)：可以使用不調用外部應用程式介面(API)的確定性方法完成分析，保留可解釋、可重現與可離線執行的能力。',
    '外部技術：需要時仍可接入其他模型或服務，但外部技術只負責執行或補充能力，不取代已經確定的語言治理規則。',
    '用途：演算法不是單一模型，而是一組把治理原則落實成可執行步驟的方法，讓不同模組可以使用同一套判定基礎。'
  ],href:'/governance',label:'演算法與治理'},
  LOC7:{english:'Module',title:'模組',tab:'模組',copy:'把演算法、資料來源與介面組成可重複使用的功能模組，讓搜尋、分類、關聯與分析可以獨立組裝與延伸。',extra:[
    '封裝：模組把一項可以重複使用的能力包起來，讓資料來源、處理規則與介面可以有清楚邊界，不需要每個頁面重新實作一次。',
    '組合：搜尋(Search)、檢索增強生成(RAG)、關係圖(Graph)與分類器可以是不同模組，需要時再依任務組合，而不是全部綁死在同一流程。',
    '替換：模組可以被替換或升級，只要輸入、輸出與治理規則維持一致，就不應因為更換模型或服務而迫使其他功能一起重寫。',
    '資料：同一份治理後資料可以被不同模組重用，避免每一個功能都建立自己的副本，降低版本分裂與內容互相污染的風險。',
    '介面：頁面只負責呈現與操作，核心能力盡量留在模組中，使功能可以被首頁、搜尋、工具或其他未來介面共同使用。',
    '用途：模組化讓系統可以逐步增加能力，同時保留既有功能，不綁定單一模型、單一應用程式介面(API)或單一前端頁面。'
  ],href:'/search',label:'查看模組實作'},
  LOC8:{english:'Culture',title:'文化',tab:'文化',copy:'把語言、作品與事件放回時間中，治理已知、觀察文化，再決定可能；文化是文字累積後形成的演化結果。',extra:[
    '時期(Period)：把相對穩定的一段時間視為一個觀察單位，用來比較不同階段的語彙、作品、事件與表達方式，而不是只看單一日期。',
    '時間線(Timeline)：把作品、事件與資料重新放回發生順序，使變化可以沿著時間被追蹤，而不是把所有內容混在同一個現在。',
    '趨勢(Trend)：比較不同時期中反覆出現或逐漸改變的語彙與主題，用累積資料觀察方向，但不把統計變化直接解讀成必然結果。',
    '軌跡(Trajectory)：描述某個概念、作品或語言狀態如何一路轉變，保留中間階段，而不是只比較最早與最新兩個端點。',
    '治理：已經發生的資料可以整理、校正與保留版本；觀察文化時必須區分史實、分析與推測，避免後來的解讀回寫污染原始資料。',
    '用途：文化觀察建立在既有資料上，目的是理解文字如何累積與演化，再決定可能的下一步；它提供參考，但不等於預言。'
  ],href:'/evolution',label:'符文文化'}
};

export default function AboutView(){
  const [activeLoc,setActiveLoc]=useState(null);
  const activeItem=activeLoc?FRAMEWORK_ITEMS[activeLoc]:null;

  useEffect(()=>{
    if(!activeLoc)return undefined;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=event=>{if(event.key==='Escape')setActiveLoc(null);};
    document.addEventListener('keydown',onKeyDown);
    return ()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKeyDown);};
  },[activeLoc]);

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
        <h2>脈絡</h2>
        <p className="loc-subtitle">文字的關係與分析</p>
      </div>
      <div className="home-author-copy">
        <p>不只整理資料，而是讓文字可以被搜尋、比較、追蹤變化，再回到原始內容確認證據。</p>
        <p>藉由分析關聯性，找出情境、事件與互動關係圖，形成可觀察、可互動的脈絡。</p>
        <p>可以從自然語言查詢作品、文字、知識與時間脈絡，再沿已治理的關係查看相關內容；排行中的詞也能直接回查命中的文章、作品與紀錄。</p>
      </div>
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
        <p><a href="/statics">排行榜</a>可先看全部，再切 Facebook、Threads、Suno，並依來源與時期觀察語彙變化。</p>
      </div>
      <div className="home-progress-grid" aria-label="文化搜尋、治理與演化">
        <article className="home-progress-item">
          <strong>結合搜尋跟脈絡圖關聯</strong>
          <span>可以從自然語言查詢作品、文字、知識與時間脈絡，再沿已治理的關係查看相關內容；排行中的詞也能直接回查命中的文章、作品與紀錄。</span>
        </article>
        <article className="home-progress-item">
          <strong>治理</strong>
          <span>授權內容可用全文做搜尋與分析；公開結果則依內容治理決定顯示全文、片段或僅 metadata。Facebook、Threads 預設只顯示片段，歌詞不直接公開全文；系統並以治理文件約束資料權責、版權與公開邊界。</span>
        </article>
      </div>
    </section>

    <section className="loc-card home-framework" id="framework-map">
      <div className="home-framework-stage" aria-label="月典快速選單">
        <img src="/pics/LOC-structure.png" alt="月典結構圖與流程圖。圖上可點選八個分類查看快速說明。" loading="lazy" />
        {Object.entries(FRAMEWORK_ITEMS).map(([key,item],index)=><button key={key} className={`framework-hotspot h${index+1}`} type="button" onClick={()=>setActiveLoc(key)} aria-label={`開啟${item.tab}快速說明`}>{item.tab}</button>)}
      </div>
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
      <div className="home-section-heading">
        <p className="loc-eyebrow">About me</p>
        <h2>作者的話</h2>
        <p className="loc-subtitle">治理過去的已知，是為了把時間還給現在的未知，才有更充裕的未來。</p>
      </div>
      <div className="home-about-layout">
        <div className="home-author-copy">
          <p>月之符文本身是占卜指示籤詩的分析建議，重在符文本身的語彙交叉分析；巧妙的是，即使轉換語系也能通用，採取的是不帶神秘學預設的中立態度，重在文字本身而不論道德。</p>
          <p>月典從月之符文開始，後來逐步演變成與月之符文相輔相成的語言系統；而月之符文，也在這個過程中演變成可被分析、治理與推演的符號式語言系統。</p>
          <p>整合出月典，並不是為了把人生固定成某種發展模式，也不是為了賺錢，而是把散落、原本只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可解析的結構，才能進一步面對未來的各種可能。</p>
        </div>
        <figure className="home-about-figure">
          <img src="/pics/aboutme.png?v=20260914" alt="作者 Lucas Oscar Wang 政德" loading="eager" decoding="async" />
        </figure>
      </div>
    </section>

    {activeItem&&<div className="framework-modal" role="dialog" aria-modal="true" aria-labelledby="framework-modal-title" onClick={event=>{if(event.target===event.currentTarget)setActiveLoc(null);}}>
      <div className="framework-modal-shell">
        <div className="framework-modal-head">
          <h2 id="framework-modal-title">快速說明</h2>
          <button className="framework-modal-close" type="button" onClick={()=>setActiveLoc(null)} aria-label="關閉快速選單">×</button>
        </div>
        <div className="framework-tabs" aria-label="快速選單分類">
          {Object.entries(FRAMEWORK_ITEMS).map(([key,item])=><button key={key} className={`framework-tab${activeLoc===key?' active':''}`} type="button" onClick={()=>setActiveLoc(key)} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'2px',lineHeight:1.25}}><span>{item.tab}</span><small style={{fontSize:'.66rem',fontWeight:600,opacity:.78}}>{item.english}</small></button>)}
        </div>
        <div className="framework-detail">
          <div className="framework-kicker">{activeItem.english}</div>
          <h3>{activeItem.title}</h3>
          <p className="framework-copy">{activeItem.copy}</p>
          <ul className="framework-extra" style={{display:'grid',gridTemplateColumns:'1fr',gap:'8px'}}>{activeItem.extra.map(text=><li key={text} style={{borderRadius:'11px',padding:'9px 11px',width:'100%'}}>{text}</li>)}</ul>
          <div className="framework-detail-links"><a className="framework-detail-link" href={activeItem.href}>{activeItem.label} →</a></div>
        </div>
      </div>
    </div>}
  </section>;
}