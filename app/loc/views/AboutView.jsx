export default function AboutView() {
  return (
    <section className="loc-next-view">
      <div className="hero">
        <p>LOC · Luna Codex</p>
        <h1>月典</h1>
        <p>分析、組織、搜尋並推演語言的統一入口。月之符文維持獨立頁；其餘 LOC 功能逐步收斂到這個 Next.js application shell。</p>
      </div>
      <div className="card">
        <h2>單一入口，模組按需載入</h2>
        <p>首頁只載入目前 view。Graph、搜尋索引、統計資料與推演資料不再因為進入 LOC 就全部初始化。</p>
      </div>
    </section>
  );
}
