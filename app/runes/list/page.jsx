import RuneListClient from './RuneListClient';

export const metadata={
  title:'符文圖鑑｜月之符文',
  description:'月之符文 1–66 符文圖鑑。'
};

export default function RuneListPage(){
  return <main className="loc-next-main"><section className="loc-view scope-home-composition">
    <header className="loc-hero">
      <p className="loc-eyebrow">LunaRunes · List</p>
      <h1>符文圖鑑</h1>
      <p className="loc-subtitle">依群組與總編號查看 66 個符文。卡片網址固定使用數字，不使用英文名稱。</p>
    </header>
    <section className="loc-card">
      <p>網址格式固定為 <code>/list/群組編號/符文總編號</code>，例如第一組第一號為 <code>/list/01/01</code>。</p>
    </section>
    <section className="loc-card" id="rune-list">
      <RuneListClient/>
    </section>
  </section></main>;
}
