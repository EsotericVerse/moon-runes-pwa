export default function StaticsView() {
  return (
    <section className="loc-next-view">
      <div className="hero"><p>LOC Statistics</p><h1>統計</h1><p>來源統計、符文統計、每日紀錄與排行榜集中於此；統計資料只在進入本 view 時載入。</p></div>
      <div className="card"><h2>Lazy boundary</h2><p>統計 dashboard 與其資料請求獨立，不再增加 LOC 首頁首次載入成本。</p></div>
    </section>
  );
}
