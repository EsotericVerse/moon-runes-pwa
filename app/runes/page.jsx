import './rune-atlas-governance.css';
import './runes-content.css';
import RuneDrawClient from './RuneDrawClient';
import RuneAtlasHome from './RuneAtlasHome';

export const metadata = {
  title: '月之符文｜LOC',
  description: '月之符文說明、抽牌與符文圖鑑。'
};

export default function RunesPage() {
  return <main className="loc-next-main">
    <header className="loc-hero runes-home-hero">
      <p className="loc-eyebrow">LunaRunes · 月之符文</p>
      <h1>月之符文</h1>
      <p><strong>不知道怎麼開始？先抽張牌。</strong></p>
      <p>月之符文是 LOC 的語彙種子；不用先背完所有符文，抽完有興趣再往下看。</p>
    </header>
    <RuneDrawClient />
    <RuneAtlasHome />
  </main>;
}
