import LocApp from '../loc/LocApp';
export const metadata={title:'治理｜LOC 月典'};

export default function GovernancePage(){
  return <>
    <section className="loc-view" aria-label="LOC 治理架構摘要">
      <section className="loc-card">
        <p className="loc-eyebrow">Governance Architecture</p>
        <h2>治理架構</h2>
        <p className="loc-subtitle">治理是跨模組的共同邊界，不是第九個功能模組。</p>
        <p className="loc-core-line">Identity · Schema · Ownership · Provenance · Versioning · Permission</p>
        <p>Canon／Base66、來源紀錄、Registry 與衍生 View 各自保有權責；跨模組以資料契約交換，遞迴分析只新增可追溯關係，不覆寫上游事實。</p>
        <p>呈現採漸進揭露：入口層先說明概念與用途，深入層再展開系統責任、技術、治理與證據；同一概念可以在不同深度出現，但不複製同一段文字。</p>
      </section>
    </section>
    <LocApp/>
  </>;
}
