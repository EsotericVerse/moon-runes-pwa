export default function ContextView() {
  return (
    <section className="loc-next-view">
      <div className="hero"><p>LOC2 · Context</p><h1>脈絡</h1><p>Graph、關係、事件與情境分析集中於此。Graph runtime 與大型關聯資料只在進入本 view 時載入。</p></div>
      <div className="card"><h2>Lazy boundary</h2><p>此 view 是 Graph 與 Context 的獨立 code-split 邊界，避免首頁先載入關係圖與分析資料。</p></div>
    </section>
  );
}
