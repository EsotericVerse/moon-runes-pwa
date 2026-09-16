const PRINCIPLES = [
  ['客觀與中立（Objectivity and Neutrality）','依資料、語境與公開規則判定；分析結果與作者、管理者或使用者的價值判斷分開。'],
  ['可解釋（Explainability）','判定保留規則版本、證據、候選與排除理由；可直接說明時，不以不可追溯的結果取代。'],
  ['範圍與權威（Scope and Authority）','先確認資料範圍，再依 Master Data、Canon、Spec、Registry、來源紀錄與衍生 View 的責任順序判定。衍生資料不得覆寫上游權威。'],
  ['同原則、不同主體','LOC 提供共同治理方法與分類框架；LunaRunes、Author 與其他 Scope 可以共用相同原則，但各自管理不同主體、資料與權威。'],
  ['漸進式揭露（Progressive Disclosure）','使用者不需要先理解整套 LOC、所有 LunaRunes 或作者全部作品。可從有興趣的 Feature 進入，再依需要逐步展開底層結構與治理資訊。'],
  ['現行與歷史（Current and Historical）','Current 只採用目前有效定義；歷史紀錄不可改寫。採用或呈現哪些歷史資料，由相應 Scope 管理者治理並留下紀錄。'],
  ['治理先於實作','先確定名稱、語意、權威與邊界，再更新程式、介面、索引、JSON、搜尋或推演；既有程式不得反向凍結治理。'],
  ['語意優先與分類一致性','分類依詞性／句內角色、主體性與所屬語意逐層判定，不以單字命中代替語意。需要唯一值時給出一個 Current 結果；接近候選另標爭議。'],
  ['資料歸屬與寫入審核','個人、符文、治理、作品及組織等 Scope 各自保有資料、搜尋、統計與排行榜。月典結果是統合層；跨 Scope 寫入必須經目標 Scope 審核。'],
  ['可移植（Portable）','LOC 的原則、資料契約與治理模型不依附特定網站、平台、框架、主機、資料庫或供應商；實作可以替換。'],
  ['多層治理與獨立管理','Scope 可依個人、群組、部門或組織新增、刪除、拆分、合併與調整，不存在永久唯一的 Scope 清單。每個 LOC instance 的管理權獨立；採用 LOC 不授予 LOC 作者登入權。'],
  ['多層搜尋與統計','查詢、統計與排行榜必須標明 Scope 與資料歸屬。統合結果不得抹除來源，也不得把可讀取誤當成可寫入。'],
  ['增量處理','首次進行完整分析；同筆資料未變則跳過，有差異才更新，修正標記只觸發相關局部重算。排行榜保存 Current count 並作差異更新，避免反覆全文搜尋。'],
  ['時期獨立（ERA by Scope）','ERA 屬於各自 Scope，可由該 Scope 治理修改；個人、符文、治理或組織的時期不得混成一條時間線。'],
  ['角色分離','作者、資料主體、Scope 管理者與系統管理者是不同角色；管理資料不等於取得作者身分、觀點代表權或其他 instance 的權限。'],
  ['單一導覽（Single NAV）','每個介面只有一條正式 NAV；本地入口、架構圖與快捷功能不是 NAV2 或 NAV3。導覽文字可由所屬 Scope 治理，但不得冒充全域名稱。'],
  ['衝突不猜測','權威不足、來源矛盾或規則不能判定時，標記待治理、保留證據，不拼湊看似完整的答案。'],
  ['Copyleft','基本方法論開放使用與研究時須保留必要來源、作者與修改標示；衍生商業使用須取得同意。解析介面與推演層可以收費；在正式選定前不自動套用 GPL、CC 等既有授權。']
];

export default function GovernanceView(){
  return <section className="loc-view">
    <header className="loc-hero" id="top">
      <p className="loc-eyebrow">LOC Governance · Current</p><h1>治理</h1>
      <p className="loc-subtitle">LOC 是框架與分類工具；治理原則共用，主體各自獨立</p>
      <p>LOC Governance 可總覽整個系統的 Current 原則、Scope 關係、權威邊界與歷史來源；但不取代 LunaRunes 或 Author Scope 對自身資料的治理。</p>
      <p>不必先理解全部 LOC、全部符文或全部作者作品。使用者可以直接從有興趣的 Feature 開始，再決定是否展開更多脈絡、治理與歷史。</p>
    </header>
    <section className="loc-card" id="principles">
      <p className="loc-eyebrow">Principles</p><h2>Current 治理原則</h2>
      <div className="loc-rule-list">{PRINCIPLES.map(([title,body])=><p key={title}><strong>{title}</strong><br/>{body}</p>)}</div>
    </section>
    <div className="loc-grid two">
      <section className="loc-card" id="scope-model">
        <p className="loc-eyebrow">Scope Model</p><h2>權威與統合</h2>
        <p className="loc-core-line">Current Canon → Scope Model × Feature Model → Page Composition</p>
        <p>Canon 定原則與責任邊界，不指定技術實作。Scope 保有資料與權威；Feature 可跨 Scope 重用但不取得所有權；Page 只是 Scope 與 Feature 的組合投影。</p>
        <p>LOC1–8 可保留作為功能映射、歷史紀錄與來源 lineage 的識別；它們不再定義 Current information architecture、Scope、Feature ownership、NAV taxonomy 或 Canon authority。映射本身不是污染，只有被誤升格為 Current 架構才算污染。</p>
      </section>
      <section className="loc-card" id="governance-actions">
        <p className="loc-eyebrow">Governance Space</p><h2>治理入口</h2>
        <p>LOC 放全域與跨 Scope 的治理；符文的歸 LunaRunes；作者與政德風的歸 Author。三者共用治理方法，但主體、資料與 Current 權威分開。歷史查詢集中在 Governance，並保留來源 Scope。</p>
        <div className="loc-link-list">
          <a className="loc-link-card" href="/management"><strong>管理者功能</strong><span>Scope、ERA、納入審核、修正標記與授權寫入。</span></a>
          <a className="loc-link-card" href="/governance/history"><strong>歷史查詢／治理紀錄</strong><span>跨 Scope 查詢不可改寫的歷史、來源、變更與稽核紀錄。</span></a>
          <a className="loc-link-card" href="/runes/governance"><strong>符文治理</strong><span>LunaRunes／月之符文的 Master Data、66／67、Grammar、語意與符文歷史。</span></a>
          <a className="loc-link-card" href="/author/governance"><strong>作者治理</strong><span>作者身份、政德風、作品脈絡、個人 ERA 與作者歷史。</span></a>
        </div>
      </section>
    </div>
  </section>;
}