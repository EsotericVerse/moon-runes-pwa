import './rune-atlas-governance.css';
import './runes-content.css';
import RuneDrawClient from './RuneDrawClient';
import RuneAtlasHome from './RuneAtlasHome';

export const metadata = {
  title: '月之符文｜LOC',
  description: '月之符文說明、抽牌、符文關聯、關鍵詞脈絡與延伸體系入口。'
};

const SINGLE_TOPICS = [
  { key: 'love', label: '愛情' },
  { key: 'career', label: '事業' },
  { key: 'mind', label: '心理' },
  { key: 'health', label: '健康' },
  { key: 'life', label: '生活' }
];

const PROMO_REELS = [
  { id: 'DMA9yDAzeRK', title: '月之符文 Reels 01' },
  { id: 'DMA-ZxLTINw', title: '月之符文 Reels 02' }
];

export default function RunesPage() {
  return <main className="loc-next-main">
    <header className="loc-hero runes-home-hero">
      <div className="runes-home-hero-copy">
        <p className="loc-eyebrow">LunaRunes</p>
        <h1>月之符文</h1>
        <p className="loc-subtitle">第一次來？不用先弄懂它是什麼。先看一支短影片，或直接抽張牌。</p>
      </div>

      <div className="runes-home-reels" aria-label="月之符文 Reels 預覽">
        {PROMO_REELS.map(reel => <article className="runes-home-reel" key={reel.id}>
          <iframe
            src={`https://www.instagram.com/reel/${reel.id}/embed/`}
            title={reel.title}
            loading="eager"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
          <a href={`https://www.instagram.com/reel/${reel.id}/`} target="_blank" rel="noopener noreferrer">在 Instagram 看完整 Reels</a>
        </article>)}
      </div>
    </header>

    <section className="loc-card runes-quick-start" aria-labelledby="runes-quick-start-title">
      <div className="runes-content-heading">
        <p className="loc-eyebrow">Quick Start</p>
        <h2 id="runes-quick-start-title">你現在最想問哪一件事？</h2>
        <p className="loc-subtitle">不用先學規則，挑一個方向，抽一張牌就可以開始。</p>
      </div>
      <div className="runes-topic-grid">
        {SINGLE_TOPICS.map(topic => <a className="runes-topic-choice" key={topic.key} href={`?mode=single&topic=${topic.key}`}>
          <strong>{topic.label}</strong>
          <span>抽一張牌</span>
        </a>)}
      </div>
      <p className="runes-quick-start-note">沒有特別想問的？也可以直接抽每日符文。</p>
      <div className="loc-actions"><a className="loc-button" href="?mode=daily">抽每日符文</a></div>
    </section>

    <RuneDrawClient />
    <RuneAtlasHome />

    <section className="loc-card runes-content-section" id="context">
      <div className="runes-content-heading">
        <p className="loc-eyebrow">Context</p>
        <h2>關鍵詞與符文演算法</h2>
        <p className="loc-subtitle">從詞與詞的關係，看符文之間怎麼連起來。</p>
      </div>
      <p>關鍵詞可以連到符文、群組、位置、方向與其他詞，再透過單卡、雙卡、三卡、五卡與 OW3gs 等演算法組合成可追溯的語意脈絡。</p>
      <p>符文遊戲是脈絡的進階互動形式，不屬於文化延伸體系；先從脈絡進入，再往遊戲深入。</p>
      <div className="links"><a href="/context">查看符文脈絡</a><a href="/search?q=符文關鍵詞">搜尋符文關鍵詞</a><a href="/search?q=符文演算法">搜尋符文演算法</a></div>
    </section>

    <section className="loc-card runes-content-section" id="culture">
      <div className="runes-content-heading">
        <p className="loc-eyebrow">Culture</p>
        <h2>符文延伸體系</h2>
        <p className="loc-subtitle">看月之符文如何延伸成小說、短文、歌曲、影像與其他作品。</p>
      </div>
      <p>文化不是再解釋單一符文，而是看符文如何進入不同形式的創作。想看哪一種，就從對應的延伸體系直接進去。</p>
      <div className="links"><a href="/search?q=符文文學">看符文文學</a><a href="/search?q=符文歌曲">看符文歌曲</a><a href="/evolution">看符文文化</a></div>
    </section>
  </main>;
}
