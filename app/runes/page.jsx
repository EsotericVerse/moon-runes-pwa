import './rune-atlas-governance.css';
import './runes-content.css';
import RuneDrawClient from './RuneDrawClient';
import RuneAtlasHome from './RuneAtlasHome';

export const metadata = {
  title: '月之符文｜LOC',
  description: '月之符文說明、抽牌、符文關聯、關鍵詞脈絡與延伸體系入口。'
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
        <h2>關鍵詞與符文演算法</h2>
        <p className="loc-subtitle">從詞開始，看關鍵詞、詞義與符文之間怎麼建立聯繫。</p>
      </div>
      <p>月之符文的脈絡重點是詞與詞之間的關係：關鍵詞如何連到符文、群組、位置、方向與其他詞，再透過單卡、雙卡、三卡、五卡與 OW3gs 等演算法組合成可追溯的語意脈絡。</p>
      <p>符文遊戲是脈絡的進階互動形式，不屬於文化延伸體系；先理解或進入符文脈絡，再由脈絡往遊戲深入。</p>
      <div className="links"><a href="/context">查看符文脈絡</a><a href="/search?q=符文關鍵詞">搜尋符文關鍵詞</a><a href="/search?q=符文演算法">搜尋符文演算法</a></div>
    </section>

    <section className="loc-card runes-content-section" id="culture">
      <div className="runes-content-heading">
        <p className="loc-eyebrow">Culture · 文化</p>
        <h2>符文延伸體系</h2>
        <p className="loc-subtitle">符文從語彙種子往外延伸，形成文學、歌曲、影像與其他作品體系。</p>
      </div>
      <p>文化重點不是再解釋單一符文，而是看月之符文如何被延伸成不同形式：小說、短文、歌詞、音樂、影像與其他創作。想看哪一種，就從那個延伸體系直接進去。</p>
      <div className="links"><a href="/search?q=符文文學">看符文文學</a><a href="/search?q=符文歌曲">看符文歌曲</a><a href="/evolution">看符文文化</a></div>
    </section>
  </main>;
}
