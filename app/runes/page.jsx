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
      <p>月之符文是符號式語言，也是 LOC 的語彙種子。你不需要先理解全部符文，可以直接抽牌，也可以從符文關聯圖開始，挑有興趣的群組再往下看。</p>
    </header>
    <RuneDrawClient />
    <RuneAtlasHome />
  </main>;
}
