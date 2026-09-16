import './rune-atlas-governance.css';
import './runes-content.css';

export const metadata = {
  title: '月之符文｜LunaRunes',
  description: '月之符文功能入口。'
};

const ENTRIES = [
  ['抽牌', '/runes/draw', '直接開始抽牌。'],
  ['符文圖鑑', '/runes/list', '瀏覽符文資料。'],
  ['脈絡', '/runes/context', '查看符文之間的脈絡。'],
  ['統計', '/runes/statics', '查看符文資料統計。'],
  ['文化', '/runes/evolution', '查看符文文化的形成與變化。'],
  ['治理', '/runes/governance', '管理符文自己的規則與資料。'],
  ['搜尋', '/runes/search', '搜尋月之符文範圍內的資料。']
];

export default function RunesPage() {
  return <main className="loc-next-main">
    <header className="loc-hero runes-home-hero">
      <p className="loc-eyebrow">LunaRunes</p>
      <h1>月之符文</h1>
    </header>
    <section className="loc-card runes-content-section" aria-labelledby="runes-entry-title">
      <div className="runes-content-heading">
        <h2 id="runes-entry-title">今天想從哪裡開始？</h2>
      </div>
      <div className="runes-highlight-grid" aria-label="月之符文功能入口">
        {ENTRIES.map(([label, href, text]) => <a className="runes-highlight-bubble interactive" href={href} key={href}><strong>{label}</strong><span>{text}</span></a>)}
      </div>
    </section>
  </main>;
}
