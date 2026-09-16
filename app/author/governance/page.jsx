export const metadata={title:'作者治理｜Lucas Oscar Wang 政德'};

const GOVERNANCE_ROOT = [
  ['鑑古知今，求同存異','最高原則：保留歷史、理解現在；尋找共同點，同時允許差異並存。'],
  ['不在其位，不謀其政','權責邊界：可以讀取、引用與分析其他 Scope，但不因可見而取得治理權。'],
  ['隨心所欲，而不逾己','自我底線：自由首先約束自己；Calibrator 校對的是自己的「德」，不是替別人決定人生。']
];

export default function AuthorGovernancePage(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Author Scope · Current</p><h1>作者治理</h1><p className="loc-subtitle">只治理作者身份、政德風、作品脈絡與個人歷史；原則與 LOC 共用，但主體與權威獨立</p><p>不必先讀完全部作品或理解完整作者脈絡。可以從有興趣的 Feature 開始，例如文筆／政德風介紹、單篇作品、關鍵字、某個 ERA 或作品列表，再依需要展開更多歷史與治理資訊。</p></header>

    <section className="loc-card" id="author-root"><p className="loc-eyebrow">Governance Root · 24</p><h2>24 字人生觀</h2>{GOVERNANCE_ROOT.map(([root,note])=><p key={root}><strong>{root}</strong><br/>{note}</p>)}<p>這 24 字是作者的自我治理與人生觀，不要求讀者、評論者或其他使用者採用相同價值判斷。</p></section>

    <div className="loc-grid two">
      <section className="loc-card"><h2>治理範圍</h2><p className="loc-core-line">Author Identity → 政德風 → Works／Keywords → ERA／History</p><p>作者治理管理作者身份、保留名稱、政德風、作品索引、關鍵字、作者 ERA、公開自我描述與相關歷史。這些內容屬 Author Scope，不因被 LOC 搜尋或分析而改變所有權。</p></section>
      <section className="loc-card"><h2>自我描述與外部分析</h2><p>Wordsmith、Moon Resonator、Calibrator、政德風及其他作者稱號首先都是作者自我描述。作者可以自我命名與分類，但不要求外部接受相同分類。</p><p>外部分析可以不同、可以並存，也可以提出其他風格名稱；只要保留來源與觀點主體，就不需要被強迫統一。外部分析同樣不能反向改寫作者的自我描述。</p></section>
      <section className="loc-card"><h2>稱號語意</h2><p><strong>Wordsmith</strong>：文字與語言創作。</p><p><strong>Moon Resonator</strong>：作者對月、符文、聲音、文字與創作之間共響關係的自我命名。</p><p><strong>Calibrator</strong>：只校對自己的「德」、界線與選擇；不是 Time Calibrator，也不是替別人校正人生。</p></section>
      <section className="loc-card"><h2>與 LOC／LunaRunes 的邊界</h2><p>LOC 可以分析、分類、索引與統合作者資料，但不能把作者個人觀點自動升格為 LOC Canon。LunaRunes 可以作為作者作品與語言分析的工具或來源，但符文本體、66／67、Grammar 與符文語意仍歸 LunaRunes Governance。</p></section>
      <section className="loc-card"><h2>Current 與歷史</h2><p>作者 Current 只代表目前有效的身份、作品治理與自我描述。舊名稱、舊作品分類、舊時期與過去文字應保留 provenance，不因新說法而被靜默改寫。</p><p>歷史資料可以被重新分析，但重新分析結果必須和原始紀錄分開，並標明分析時間、規則版本與來源。</p></section>
      <section className="loc-card"><h2>治理與歷史入口</h2><p>本頁只管理 Author Scope。跨 Scope 的歷史查詢統一放在 LOC Governance，查詢結果保留 Author／LunaRunes／LOC 等來源標記。</p><p><a href="/author">作者首頁</a></p><p><a href="/governance">LOC 全域治理總覽</a></p><p><a href="/governance/history">歷史查詢／治理紀錄</a></p><p><a href="/runes/governance">LunaRunes 符文治理</a></p></section>
    </div>
  </section></main>;
}
