export const metadata={title:'lo3rwang 治理｜Lucas Oscar Wang 政德'};

const GOVERNANCE_ROOT = [
  ['鑑古知今，求同存異','保留歷史、理解現在；尋找共同點，同時允許差異並存。'],
  ['不在其位，不謀其政','可以讀取、引用與分析其他 Scope，但不因可見而取得治理權。'],
  ['隨心所欲，而不逾己','自由先以自我治理為邊界，不把自己的選擇強加給別人。']
];

export default function Lo3rwangGovernancePage(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">lo3rwang Governance</p><h1>lo3rwang 治理</h1><p className="loc-subtitle">管理個人身份、政德風、作品脈絡、個人時期與歷史；共用 LOC 原則，但保有自己的資料與權威。</p></header>

    <section className="loc-card" id="lo3rwang-root"><p className="loc-eyebrow">Governance Root</p><h2>24 字人生觀</h2>{GOVERNANCE_ROOT.map(([root,note])=><p key={root}><strong>{root}</strong><br/>{note}</p>)}<p>這 24 字是個人自我治理與人生觀，不要求讀者、評論者或其他使用者採用相同價值判斷。</p></section>

    <div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">Scope</p><h2>治理範圍</h2><p className="loc-core-line">lo3rwang Identity → 政德風 → Works／Keywords → ERA／History</p><p>lo3rwang Scope 管理個人身份、保留名稱、政德風、作品索引、關鍵字、個人 ERA、公開自我描述與相關歷史。這些內容不因被 LOC 搜尋或分析而改變所有權。</p></section>
      <section className="loc-card"><p className="loc-eyebrow">Perspective</p><h2>自我描述與外部分析</h2><p>可以自我命名與分類；外部分析也可以提出不同的風格名稱與理解。只要保留來源與觀點主體，就不需要被強迫統一。</p></section>
      <section className="loc-card"><p className="loc-eyebrow">Roles</p><h2>目前的三個自我稱號</h2><p><strong>Wordsmith</strong>：從文字、詞句與脈絡整理自己的語意與風格。</p><p><strong>Calibrator</strong>：把文字放回來源、時間與歷史脈絡中比較，校準延續、改變、消失、矛盾與可能的污染；不替歷史宣布唯一答案。</p><p><strong>Language Governance Architect</strong>：把語彙、脈絡、文化、搜尋與治理組織成可以持續使用的語言系統。</p></section>
      <section className="loc-card"><p className="loc-eyebrow">Boundary</p><h2>與 LOC／LunaRunes 的邊界</h2><p>LOC 可以分析、分類、索引與統合 lo3rwang 資料，但不能把個人觀點自動升格為 LOC Canon。LunaRunes 可以成為作品與語言分析的工具或來源，但符文本體與符文語意仍歸 LunaRunes Governance。</p></section>
      <section className="loc-card"><p className="loc-eyebrow">History</p><h2>Current 與歷史</h2><p>lo3rwang Current 只代表目前有效的身份、作品治理與自我描述。舊名稱、舊作品分類、舊時期與過去文字保留為歷史來源，不因新說法而被靜默改寫。</p><p><strong>月之共響者（Moon Resonator）</strong>是重要的歷史創作稱號，常見於小說與創作時期，描述對月、符文、聲音與文字之間「共響」關係的自我命名。它不是錯誤或應被刪除的舊資料，而是後來 <strong>Calibrator</strong> 形成的重要前身之一：從感受與共響，逐步走向比較、校準來源、時間、歷史與文化變化。</p><p>歷史資料可以被重新分析，但新的分析結果必須和原始紀錄分開，並保留分析時間、規則版本與來源。</p></section>
      <section className="loc-card"><p className="loc-eyebrow">Links</p><h2>治理與歷史入口</h2><p>本頁管理 lo3rwang Scope；跨 Scope 的歷史查詢由 LOC Governance 統合，並保留原始來源。</p><p><a href="/lo3rwang">lo3rwang 首頁</a></p><p><a href="/governance">LOC 全域治理總覽</a></p><p><a href="/governance/history">歷史查詢／治理紀錄</a></p><p><a href="/runes/governance">LunaRunes 符文治理</a></p></section>
    </div>
  </section></main>;
}
