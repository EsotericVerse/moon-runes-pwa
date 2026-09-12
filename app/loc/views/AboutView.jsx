export default function AboutView(){
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LOC · Luna Codex</p><h1>月典</h1><p>分析、組織、搜尋並推演語言的統一入口。LOC 的遊戲、脈絡、搜尋、統計、推演與治理收斂在同一個 Next.js application shell；月之符文與作者站維持獨立網域。</p></header>
    <div className="loc-grid two"><section className="loc-card"><h2>單一入口</h2><p>首頁只渲染目前使用的 View。切換功能不再重新載入整個 HTML 文件，也不要求所有模組同時初始化。</p></section><section className="loc-card"><h2>按需載入</h2><p>Graph、搜尋索引、統計資料與推演資料分開 code split；只有進入功能時才載入對應程式與資料。</p></section></div>
  </section>;
}
