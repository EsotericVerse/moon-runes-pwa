import { galaxy, groups } from '../../js/galaxy.js';

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
        <p>同一套 Neon canonical relations 可依 Scope 與功能讀取符文、文學、音樂、時期、統計、KM、FAQ 與演算法；Galaxy 只是其中一個瀏覽入口。</p>
      </header>
      <section className="card">
        <h2>All-data Aggregation Layer</h2>
        <p>Galaxy 已重用 Rune core：{groups.length} 組。已註冊延伸體系：{registeredSystems}。</p>
      </section>
    </main>
  );
}
