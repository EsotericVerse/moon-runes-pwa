export default function SearchView() {
  return (
    <section className="loc-next-view">
      <div className="hero"><p>LOC Search</p><h1>搜尋</h1><p>跨資料源搜尋的單一入口。大型 corpus、索引與來源統計只在使用搜尋時載入。</p></div>
      <div className="card"><h2>Lazy boundary</h2><p>搜尋 UI 與搜尋 runtime 獨立成 chunk；LOC 首頁不再預先載入大型搜尋程式與資料。</p></div>
    </section>
  );
}
