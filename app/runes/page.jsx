import { rune, groups } from '../../lib/runes.js';

const drawable = rune.filter(Boolean).filter(row => Number(row?.編號 ?? row?.id) > 0);

export const metadata = {
  title: '月之符文｜LOC',
  description: 'LunaRunes unified application route.'
};

export default function RunesPage() {
  return (
    <main className="page">
      <header className="hero">
        <p>LunaRunes</p>
        <h1>月之符文</h1>
        <p>統一入口：抽牌、每日符文、66 符資料、新手上路、FAQ、脈絡、治理與推演將逐步由既有頁面搬入此 route。</p>
      </header>
      <section className="card">
        <h2>Canonical Rune Data</h2>
        <p>可抽符文 {drawable.length} 枚；群組 {groups.length} 組。最高級資料來源固定為 data/json/core/runes.json，Next build 只在建置階段產生需要的 runtime shape，不再維護第二份符文 JS 資料。</p>
      </section>
    </main>
  );
}
