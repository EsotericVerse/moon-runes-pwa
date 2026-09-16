export const metadata={title:'符文治理｜LunaRunes'};

export default function RunesGovernancePage(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LunaRunes Scope · Current</p><h1>符文治理</h1><p className="loc-subtitle">只治理 LunaRunes／月之符文 Scope，不代表 LOC 全域治理</p></header>
    <div className="loc-grid two">
      <section className="loc-card"><h2>權威順序</h2><p className="loc-core-line">LunaRunes Scope → Master Data／Base66 → Current Canon／Spec → Registry → 衍生結果</p><p>66 符身分、位置與母資料由 LunaRunes 的權威來源管理。抽牌結果、Graph、搜尋索引、統計、說明與推演都是消費者，不得反向覆寫 Master Data。</p></section>
      <section className="loc-card"><h2>語意分類治理</h2><p>分類依詞性／句內語意角色、群組主體性，再判定符文語意歸屬。符文名稱、關鍵詞與反向關鍵詞是證據，不是看到字就命中的觸發器。</p><p>正式分類需要單一 Current 值；接近候選保留 disputed、證據與排除理由。證據不足時標記待治理，不猜測。</p></section>
      <section className="loc-card"><h2>Current 與歷史</h2><p>Current 只使用現行符文名稱、定義與規則。歷史版本、抽籤紀錄與演化事件不可改寫；是否納入 Current 呈現或重新分析，由 LunaRunes Scope 管理者決定並留下紀錄。</p><p>LunaRunes ERA 只屬符文 Scope，不混入政德個人 ERA、文章或其他 Scope 的時間線。</p></section>
      <section className="loc-card"><h2>資料與處理</h2><p>首次完整分析；同筆未變跳過，差異更新，修正標記局部重算。符文搜尋、統計與排行榜保留自己的資料歸屬；寫入 LOC 統合 Scope 前另行審核。</p><p><a href="/governance">LOC 全域治理原則</a>提供共同邊界，但不取代本 Scope 的 Master Data 與管理決定。</p></section>
    </div>
  </section></main>;
}
