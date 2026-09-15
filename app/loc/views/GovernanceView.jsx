export default function GovernanceView(){
  return <section className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">Governance</p>
      <h1>治理</h1>
      <p className="loc-subtitle">分類、判斷、歷史保存與語意邊界</p>
      <p>LOC 的治理不是把規則藏在文件裡，而是直接說明系統怎麼分類、怎麼判斷、怎麼保存歷史、怎麼避免語意污染，以及哪些地方由使用者保留最後決定權。</p>
    </header>

    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-eyebrow">Principles</p><h2>基本原則</h2><p className="loc-subtitle">先確定治理邊界，再進入資料與實作</p>
        <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
        <p><strong>LOC 保持客觀與中立。</strong> 不預設宗教、政治、道德或人生價值立場，也不要求任何人接受作者的信仰、觀念或生活方式。</p>
        <p><strong>客觀是為了保留主體性。</strong> 系統先整理可觀察的資料、脈絡與變化，讓使用者看見自己的位置，再由使用者決定什麼適合自己；適合一個人的方向，不必成為適合所有人的規則。</p>
        <p><strong>工具，不是理念傳達系統。</strong> LOC 作為模組化語言框架，負責依資料與規則整理、比較、歸納、分析並顯示結果；即使進一步比較不同時期的軌跡與趨勢，也只呈現由已知紀錄可觀察到的未來可能，不主動批判、定義或宣告未來應該是什麼。</p>
        <p><strong>每個人都有自己的文化定位與未來。</strong> 系統提供可查閱、可比較的結果與參考座標；如何命名、分類、理解與選擇，仍屬於使用者自己的設定與判斷。</p>
        <p><strong>分析不等於命令。</strong> 月之符文保留符文、抽籤與籤詩的文化形式，但結果只是把不確定性整理成可理解、可比較、可選擇的可能；最後決定仍由使用者自己做。</p>
        <p><strong>歷史保留，現行定義優先。</strong> 舊版本、事件與來源保留，但不得因為歷史存在，就把舊名或舊語意重新污染現行 Canon。</p>
        <p><strong>Spec 優先。</strong> 高歧義字詞先界定主體與語意邊界，再進入關鍵詞、方向與延伸說明。</p>
        <p><strong>先治理，再實作。</strong> 語意、分類與顯示規則先確定，再套進資料、Search、Graph、RAG、介面與推演。</p>
      </section>

      <section className="loc-card" id="temporal-oscillation">
        <p className="loc-eyebrow">Temporal Oscillation</p><h2>軌跡與擺盪</h2><p className="loc-subtitle">脈絡經過遞迴形成軌跡，軌跡經過時間顯出擺盪</p>
        <p><strong>過去不可竄改，現在可以重新解析。</strong> 原始紀錄與當時狀態保留；當分類規則、文化座標或治理版本改變，可以用現行規則重新分析同一份歷史資料，但不得覆寫原始來源。</p>
        <p><strong>現在是一個持續移動的觀測位置。</strong> 同一個詞、分類或文化定位可能在不同時期上升、下降、拆分、合併、反轉或回歸。LOC 記錄不同時間點的結果，觀察變化本身，而不宣告其中某一個位置永遠正確。</p>
        <p><strong>Oscillation 是軌跡中的可觀察變化。</strong> 遞迴分析既有脈絡，保留各時期的分類與規則版本，讓變化累積成可回查的軌跡；再由軌跡整理過去的趨勢、理解現在的位置，並看見未來可能發展的方向。</p>
        <p className="loc-core-line">遞迴脈絡分析 → 時間軌跡 → Oscillation → 現在位置 → 未來可能</p>
      </section>

      <section className="loc-card" id="culture-positioning">
        <p className="loc-eyebrow">Cultural Positioning</p><h2>文化定位與風格</h2><p className="loc-subtitle">同一套框架，可以使用不同的文化分類標準</p>
        <p><strong>月之符文是參考實作，不是唯一標準。</strong> 它用一套符號、群組與關鍵詞展示 LOC 如何建立文化定位；相同方法也可以套用在一個人、一套理念、一種作品風格或其他文化分類體系。</p>
        <p><strong>文化定位來自可治理的設定。</strong> 使用者可以建立自己的關鍵詞、群組與規則，再讓 LOC 對資料進行一致的分類與統計。系統顯示的是依該設定得到的結果，而不是把某一套文化觀點宣告成普遍真理。</p>
        <p><strong>文化紀錄形成風格軌跡。</strong> 當同一套設定持續作用於不同時期的資料，就可以比較關鍵詞、群組與作品分布的變化，形成可回查的文化紀錄與風格軌跡。</p>
        <p className="loc-core-line">文化設定 → 資料分類 → 統計比較 → 時期文化 → 歷史軌跡 → 現在觀察 → 未來可能</p>
      </section>

      <section className="loc-card" id="classification">
        <p className="loc-eyebrow">Classification Governance</p><h2>分類治理</h2><p className="loc-subtitle">先看文字功能與主體，再決定群組與符文</p>
        <p><strong>分類不是看到字就直接命中。</strong> 符文名稱、關鍵詞與反向關鍵詞都只是 evidence，不是 trigger。</p>
        <p className="loc-core-line">詞類 → 主體性 → 群組 → 符文</p>
        <p>第一步先確認詞彙在句內扮演什麼角色；第二步確認描述的主體；第三步才決定八個一般群組或特殊組；最後才映射個別符文。</p>
        <p><strong>每個語意單位只有一個正式群組值。</strong> 可以保留候選與分布，但正式 `group` 只能有一個。若沒有足夠證據，就留在「特殊」，不為了提高覆蓋率強迫分類。</p>
        <p><strong>特殊組是預設值，不是垃圾桶。</strong> 它承接尚未能穩定落入一般八組的內容，也承接需要後續消歧的案例。</p>
        <p><strong>接近結果要標記爭議。</strong> 第一與第二候選太接近時，仍保留一個目前最合理值，同時標記 disputed、候選、證據與排除原因，留給之後校準。</p>
      </section>

      <section className="loc-card" id="keyword-governance">
        <p className="loc-eyebrow">Keyword Governance</p><h2>關鍵詞治理</h2><p className="loc-subtitle">關鍵詞用來縮小候選，不替文字下最後定義</p>
        <p>關鍵詞資料庫提供候選、排除與可解釋證據，複雜推演再交給 Graph、規則或外部 AI。</p>
        <p><strong>不要把三個近義詞塞滿同一個符文。</strong> 關鍵詞應表現該字的不同語意面向，而不是重複堆同義詞。</p>
        <p><strong>NOR 是群組內排除。</strong> 它只否決目前群組，不是全域黑名單。</p>
        <p><strong>使用者可完全換掉分類意義。</strong> 系統提供八組結構，不規定八組意義。LunaRunes 只是符號型語言模板；群組名稱、說明、keywords 與 NOR 都可以由使用者自己定義。</p>
        <p><strong>精確比對優先。</strong> 基礎個人分類不做 fuzzy、embedding、同義詞自動擴張或自動翻譯；需要的詞就明確加入。</p>
      </section>

      <section className="loc-card" id="semantic-boundaries">
        <p className="loc-eyebrow">Semantic Boundaries</p><h2>語意邊界</h2><p className="loc-subtitle">Canon 與現行 Spec 高於一般字面直覺</p>
        <div className="loc-rule-list">
          <p><strong>水 = Water</strong>；「流動」核心歸氣，不因出現流動就判水。</p>
          <p><strong>氣 = Air</strong>；<strong>暗 = Shadow</strong>；<strong>空 = Space</strong>。</p>
          <p><strong>無 = Blank / all possibilities</strong>；<strong>虛 = Void</strong>，兩者不得混用。</p>
          <p><strong>玄 = Chaos</strong>；不可回退為 Mystery，也不能把一般混亂或失序都自動判玄。</p>
          <p><strong>誤 = Error</strong>。</p>
          <p><strong>辰</strong>重在時期；<strong>時</strong>重在時間；<strong>緣</strong>可承接時機／契機，三者不可混成一般「時間」語義。</p>
        </div>
        <p>若同義衝突仍存在，採用：<strong>直接表達該語意方向的符文，優先於透過相反符文反面間接表達。</strong></p>
      </section>

      <section className="loc-card" id="local-first">
        <p className="loc-eyebrow">Local-first</p><h2>本機優先與可重跑</h2><p className="loc-subtitle">基礎分類能在本機完成就不呼叫 API</p>
        <p>固定資料、詞類、群組主體性、關鍵詞與規則先完成初步分類，再進入統計、Search、Graph 或更高階分析。</p>
        <p>分類結果應保留 `group`、候選、證據、排除、爭議標記與規則版本，讓同一份原文在規則更新後可以重新分類，而<strong>不修改原始資料</strong>。</p>
        <p>個人 Library、群組設定與我的風格以 local-first 為主；遠端存讀只作使用者主動啟用的 OAuth 備份，不建立會員資料庫與背景同步。</p>
      </section>

      <section className="loc-card" id="flow">
        <p className="loc-eyebrow">System Flow</p><h2>分類到推演</h2><p className="loc-subtitle">簡單層保留證據，複雜層處理關係與可能路徑</p>
        <p className="loc-core-line">原始文字 → 候選關鍵詞 → 群組分類 → 符文候選 → 結構化狀態 → Graph / 規則 / AI → 推演</p>
        <p>簡單層負責把資料整理乾淨、保留證據與爭議；複雜層只在需要時處理關係、前後因果、衝突、轉折與可能路徑。這樣複雜模型不會反過來覆蓋前面的治理。</p>
      </section>

      <section className="loc-card" id="copyright">
        <p className="loc-eyebrow">Copyright · Copyleft</p><h2>版權</h2><p className="loc-subtitle">公開核心內容，同時保留來源、作者與 Canon 關係</p>
        <p>LOC 與 LunaRunes 採 Copyleft 思路公開核心內容。歡迎閱讀、研究、參考與依既有授權條件延伸，但來源、作者與原始系統關係應保留。</p>
        <p>衍生版本可以不同意、修改或擴充，但不會自動成為 upstream Canon。商業顧問、系統架構、治理設計與個案實作屬另外的合作範圍。</p>
        <a className="loc-link-card" href="https://github.com/EsotericVerse/moon-runes-pwa"><strong>Repository</strong><span>原始碼、COPYLEFT 與版本紀錄。</span></a>
      </section>

      <section className="loc-card" id="documents">
        <p className="loc-eyebrow">Canonical References</p><h2>必要規格</h2><p className="loc-subtitle">網站與 machine-readable JSON 是現行治理入口</p>
        <p>治理內容以網站與 machine-readable JSON 為主，不再把一般規則拆成大量 Markdown。需要閱讀完整模型定義時，使用 Canon；需要程式判斷時，使用 Registry / JSON。</p>
        <div className="loc-link-list">
          <a className="loc-link-card" href="/docs/LOC_Canon_1.0.docx"><strong>LOC Canon</strong><span>現行架構、定義與治理基準。</span></a>
          <a className="loc-link-card" href="/data/loc-governance.json"><strong>Governance Registry</strong><span>頁面、資料、責任與治理入口。</span></a>
          <a className="loc-link-card" href="/data/loc-module-registry.json"><strong>Module Registry</strong><span>LOC1–LOC8 模組與責任邊界。</span></a>
        </div>
      </section>
    </div>
  </section>;
}
