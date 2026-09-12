export default function GovernanceView() {
  return (
    <section className="loc-next-view">
      <div className="hero"><p>LOC6 · Governance</p><h1>治理</h1><p>Canon、命名、分類、版本、版權與系統治理規則集中於此。治理頁維持輕量，不預載其他分析模組。</p></div>
      <div className="card"><h2>Independent view</h2><p>治理內容與其他 runtime 解耦，可獨立更新，不再要求整個 LOC 應用重新初始化。</p></div>
    </section>
  );
}
