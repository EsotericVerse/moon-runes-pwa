import './rune-atlas-governance.css';
import './runes-content.css';
import RuneDrawClient from './RuneDrawClient';
import RuneAtlasHome from './RuneAtlasHome';

export const metadata = {
  title: '月之符文｜LOC',
  description: '月之符文說明、抽牌、符文關聯、演算法與文化入口。'
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

    <section className="loc-card runes-content-section" id="context">
      <div className="runes-content-heading">
        <p className="loc-eyebrow">Context · 脈絡</p>
        <h2>符文演算法</h2>
        <p className="loc-subtitle">符文不是只看單張，而是透過組合、位置、方向與脈絡逐步形成完整語意。</p>
      </div>
      <p>單卡保留特質種子，雙卡看關係與因果，三卡以源－轉－合加入變化，五卡延伸情境，OW3gs 11 卡再整合成更完整的分析。想深入時，再查看符文脈絡與演算法細節。</p>
      <div className="links"><a href="/context">查看符文脈絡</a><a href="/search?q=符文演算法">搜尋符文演算法</a></div>
    </section>

    <section className="loc-card runes-content-section" id="culture">
      <div className="runes-content-heading">
        <p className="loc-eyebrow">Culture · 文化</p>
        <h2>符文文學與歌曲</h2>
        <p className="loc-subtitle">同一組符文，可以成為文字、故事、歌詞與不同時期的創作種子。</p>
      </div>
      <p>月之符文除了抽牌，也會進入小說、短文、歌詞與音樂創作。想看符文怎麼變成作品，可以直接從有興趣的文學或歌曲開始，不必先理解完整系統。</p>
      <div className="links"><a href="/search?q=符文文學">看符文文學</a><a href="/search?q=符文歌曲">看符文歌曲</a><a href="/evolution">看符文文化</a></div>
    </section>
  </main>;
}
