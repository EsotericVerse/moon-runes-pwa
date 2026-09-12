export default function GameView() {
  return (
    <section className="loc-next-view">
      <div className="hero"><p>LOC2</p><h1>遊戲</h1><p>Semantic Playground 的互動玩法入口。遊戲 runtime 將由此 view 獨立載入，不再佔用 LOC 首頁初始化時間。</p></div>
      <div className="card"><h2>Next migration</h2><p>目前保留舊遊戲 runtime 作為遷移來源；下一步把狀態管理與事件牌邏輯直接轉為 React component。</p></div>
    </section>
  );
}
