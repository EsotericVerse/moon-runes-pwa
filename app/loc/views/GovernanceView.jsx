export default function GovernanceView(){
  return <section className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">Governance</p>
      <h1>治理</h1>
      <p>LOC 的治理不是把規則藏在文件裡，而是直接說明系統怎麼分類、怎麼判斷、怎麼保存歷史、怎麼避免語意污染，以及哪些地方由使用者保留最後決定權。</p>
    </header>

    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <p className="loc-eyebrow">Principles</p><h2>基本原則</h2>
        <p className="loc-core-line">尊重 · 和平 · 包容 · 友善</p>
        <p><strong>LOC 保持客觀與中立。</strong> 不預設宗教、政治、道德或人生價值立場，也不要求任何人接受作者的信仰、觀念或生活方式。</p>
        <p><strong>分析不等於命令。</strong> 月之符文保留符文、抽籤與籤詩的文化形式，但結果只是把不確定性整理成可理解、可比較、可選擇的可能；最後決定仍由使用者自己做。</p>
        <p><strong>歷史保留，現行定義優先。</strong> 舊版本、事件與來源保留，但不得因為歷史存在，就把舊名或舊語意重新污染現行 Canon。</p>
        <p><strong>Spec 優先。</strong> 高歧義字詞先界定主體與語意邊界，再進入關鍵詞、方向與延伸說明。</p>
        <p><strong>先治理，再實作。</strong> 語意、分類與顯示規則先確定，再套進資料、Search、Graph、RAG、介面與推演。</p>
      </section>

      <section className="loc-card" id="classification">
        <p className="loc-eyebrow">Classification Governance</p><h2>分類治理</h2>
        <p><strong>分類不是看到字就直接命中。</strong> 符文名稱、關鍵詞與反向關鍵詞都只是 evidence，不是 trigger。真正判斷要先看文字中的功能與主體，再決定群組與符文。</p>
        <p className="loc-core-line">詞類 → 主體性 → 群組 → 符文</p>
        <p>第一步先確認詞彙在句內扮演什麼角色；第二步確認描述的主體；第三步才決定八個一般群組或特殊組；最後才映射個別符文。</p>
        <p><strong>每個語意單位只有一個正式群組值。</strong> 可以保留候選與分布，但正式 `group` 只能有一個。若沒有足夠證據，就留在「特殊」，不為了提高覆蓋率強迫分類。</p>
        <p><strong>特殊組是預設值，不是垃圾桶。</strong> 它承接尚未能穩定落入一般八組的內容，也承接需要後續消歧的案例。</p>
        <p><strong>接近結果要標記爭議。</strong> 第一與第二候選太接近時，仍保留一個目前最合理值，同時標記 disputed、候選、證據與排除原因，留給之後校準。</p>
      </section>

      <section className="loc-card" id="keyword-governance">
        <p className="loc-eyebrow">Keyword Governance</p><h2>關鍵詞治理</h2>
        <p>關鍵詞資料庫的目的，是<strong>縮小候選範圍</strong>，不是替文字下最後定義。它提供候選、排除與可解釋證據，複雜推演再交給 Graph、規則或外部 AI。</p>
        <p><strong>不要把三個近義詞塞滿同一個符文。</strong> 關鍵詞應表現該字的不同語意面向，而不是重複堆同義詞。</p>
        <p><strong>NOR 是群組內排除。</strong> 它只否決目前群組，不是全域黑名單。</p>
        <p><strong>使用者可完全換掉分類意義。</strong> 系統提供八組結構，不規定八組意義。LunaRunes 只是符號型語言模板；群組名稱、說明、keywords 與 NOR 都可以由使用者自己定義。</p>
        <p><strong>精確比對優先。</strong> 基礎個人分類不做 fuzzy、embedding、同義詞自動擴張或自動翻譯；需要的詞就明確加入。</p>
      </section>

      <section className="loc-card" id="semantic-boundaries">
        <p className="loc-eyebrow">Semantic Boundaries</p><h2>語意邊界</h2>
        <p>Canon 與現行 Spec 高於一般字面直覺。以下是目前重要的排他例：</p>
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
        <p className="loc-eyebrow">Local-first</p><h2>本機優先與可重跑</h2>
        <p>基礎分類能在本機完成就不呼叫 API。固定資料、詞類、群組主體性、關鍵詞與規則先完成初步分類，再進入統計、Search、Graph 或更高階分析。</p>
        <p>分類結果應保留 `group`、候選、證據、排除、爭議標記與規則版本，讓同一份原文在規則更新後可以重新分類，而<strong>不修改原始資料</strong>。</p>
        <p>個人 Library、群組設定與我的風格以 local-first 為主；遠端存讀只作使用者主動啟用的 OAuth 備份，不建立會員資料庫與背景同步。</p>
      </section>

      <section className="loc-card" id="flow">
        <p className="loc-eyebrow">System Flow</p><h2>分類到推演</h2>
        <p className="loc-core-line">原始文字 → 候選關鍵詞 → 群組分類 → 符文候選 → 結構化狀態 → Graph / 規則 / AI → 推演</p>
        <p>簡單層負責把資料整理乾淨、保留證據與爭議；複雜層只在需要時處理關係、前後因果、衝突、轉折與可能路徑。這樣複雜模型不會反過來覆蓋前面的治理。</p>
      </section>

      <section className="loc-card" id="copyright">
        <p className="loc-eyebrow">Copyright · Copyleft</p><h2>版權</h2>
        <p>LOC 與 LunaRunes 採 Copyleft 思路公開核心內容。歡迎閱讀、研究、參考與依既有授權條件延伸，但來源、作者與原始系統關係應保留。</p>
        <p>衍生版本可以不同意、修改或擴充，但不會自動成為 upstream Canon。商業顧問、系統架構、治理設計與個案實作屬另外的合作範圍。</p>
        <a className="loc-link-card" href="https://github.com/EsotericVerse/moon-runes-pwa"><strong>Repository</strong><span>原始碼、COPYLEFT 與版本紀錄。</span></a>
      </section>

      <section className="loc-card" id="documents">
        <p className="loc-eyebrow">Canonical References</p><h2>必要規格</h2>
        <p>治理內容以網站與 machine-readable JSON 為主，不再把一般規則拆成大量 Markdown。需要閱讀完整模型定義時，使用 Canon；需要程式判斷時，使用 Registry / JSON。</p>
        <div className="loc-link-list">
          <a className="loc-link-card" href="/docs/LOC_Canon_1.0.docx"><strong>LOC Canon</strong><span>現行架構、定義與治理基準。</span></a>
          <a className="loc-link-card" href="/style-groups"><strong>群組設定</strong><span>本機自訂分類規則。</span></a>
          <a className="loc-link-card" href="/classify"><strong>分類</strong><span>直接測試目前分類規則。</span></a>
        </div>
      </section>
    </div>
  </section>;
}
