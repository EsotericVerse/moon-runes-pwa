export default function EvolutionView() {
  return (
    <section className="loc-next-view">
      <div className="hero"><p>LOC8 · Evolution</p><h1>推演</h1><p>ERA、Timeline、Trend、Trajectory 與演化觀測集中於此；時間序列與推演資料只在進入本 view 時載入。</p></div>
      <div className="card"><h2>Lazy boundary</h2><p>推演資料與視覺化獨立成 chunk，避免 LOC 首頁初始化整套時間分析。</p></div>
    </section>
  );
}
