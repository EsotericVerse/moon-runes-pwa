import './rune-atlas-governance.css';
import './runes-content.css';
import RuneAtlasHome from './RuneAtlasHome';

export const metadata={title:'月之符文｜LunaRunes',description:'月之符文圖鑑與玩法入口。'};
const RUNE_ORIGIN='https://lrunes.lo3rwang.cc';

export default function RunesPage(){return <main className="loc-next-main">
 <header className="loc-hero runes-home-hero"><p className="loc-eyebrow">LunaRunes</p><h1>月之符文</h1></header>
 <section className="loc-card runes-content-section"><div className="runes-highlight-grid">
  <a className="runes-highlight-bubble interactive" href={`${RUNE_ORIGIN}/list`}><strong>符文圖鑑</strong><span>瀏覽月之符文。</span></a>
  <a className="runes-highlight-bubble interactive" href={`${RUNE_ORIGIN}/duel`}><strong>抽牌</strong><span>進入單卡、每日、雙卡、三卡、五卡、OW3gs 與卡牌拓展桌遊。</span></a>
 </div></section>
 <RuneAtlasHome />
 </main>}
