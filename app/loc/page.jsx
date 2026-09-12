const LOC_SECTIONS = [
  { id: 'about', label: 'LOC', role: 'LOC 介紹、系統定位與整體架構。' },
  { id: 'galaxy', label: 'Galaxy', role: '衍生體系、作品、多媒體、跨體系映射與全資料聚合。' },
  { id: 'evolution', label: '推演', role: 'Context、Graph、Statistics、ERA、Timeline、Trend 與 Trajectory。' },
  { id: 'algorithm', label: '演算法', role: '分類、搜尋、統計、解牌與其他可重用語言系統邏輯。' },
  { id: 'search', label: '搜尋', role: '統一搜尋入口；大型索引與 corpus 維持按需載入。' },
  { id: 'game', label: '遊戲', role: '互動玩法與規則層；功能獨立，但不再需要獨立一級頁面。' },
  { id: 'governance', label: '治理', role: 'Canon、命名、分類、版本、版權與系統治理規則。' },
  { id: 'knowledge', label: 'FAQ / KM', role: '說明、FAQ、知識庫與文件入口。' }
];

export const metadata = {
  title: 'LOC 月典',
  description: 'LOC unified application shell: one public entry with modular, on-demand features.'
};

export default function LocPage() {
  return (
    <main className="page" id="top">
      <header className="hero">
        <p>LOC</p>
        <h1>月典</h1>
        <p>LOC 的衍生體系、推演、演算法、搜尋、遊戲、治理與知識功能統一收在同一入口；頁面聚合不等於 runtime 全載。</p>
      </header>
      <section className="card">
        <h2>Unified LOC Shell</h2>
        <p>功能仍維持獨立模組與按需載入，避免首次載入把所有大型資料與互動程式一起帶入。</p>
      </section>
      {LOC_SECTIONS.map((item) => (
        <section className="card" id={item.id} key={item.id}>
          <h2>{item.label}</h2>
          <p>{item.role}</p>
        </section>
      ))}
    </main>
  );
}
