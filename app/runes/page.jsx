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
        <h2>Canonical Rune Module</h2>
        <p>可抽符文 {drawable.length} 枚；群組 {groups.length} 組。資料直接 import JS module，不經 runtime JSON parse。</p>
      </section>
    </main>
  );
}
