import { galaxy, groups } from '../../lib/galaxy.js';

export const metadata = {
  title: 'Galaxy｜LOC',
  description: 'LOC all-data and multi-system aggregation route.'
};

export default function GalaxyPage() {
  const registeredSystems = Object.keys(galaxy.systems || {}).length;
  return (
    <main className="page">
      <header className="hero">
        <p>Galaxy</p>
        <h1>作品與多重體系</h1>
        <p>同一份底層資料可投影為符文、文學、音樂、ERA、統計、KM、FAQ 與演算法等不同體系；統計只是 Galaxy 的其中一個視圖。</p>
      </header>
      <section className="card">
        <h2>All-data Aggregation Layer</h2>
        <p>Galaxy 已重用 Rune core：{groups.length} 組。已註冊延伸體系：{registeredSystems}。</p>
      </section>
    </main>
  );
}
