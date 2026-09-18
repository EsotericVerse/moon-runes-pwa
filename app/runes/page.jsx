import { FAQ_LINKS } from '../loc/system-links';
import './runes-content.css';

export const metadata={
  title:'月之符文｜LunaRunes',
  description:'月之符文說明、脈絡、文化與延伸體系入口。'
};

const SYSTEMS=[
  {
    title:'符文圖鑑',
    href:'https://lrunes.lo3rwang.cc/list',
    text:'查看 66 符的名稱、分組、基本定義與卡片資料。'
  },
  {
    title:'符文音樂',
    href:'https://lrunes.lo3rwang.cc/music',
    text:'查看由真實符文抽牌與治理資料確認的符文歌曲。'
  },
  {
    title:'符文文學',
    href:'https://lrunes.lo3rwang.cc/literary',
    text:'查看符文與小說、章節、短文及其他文學作品的關聯。'
  },
  {
    title:'符文多媒體',
    href:'https://lrunes.lo3rwang.cc/multimedia',
    text:'查看符文在圖像、影音、Reels 與其他跨媒介作品中的延伸。'
  }
];

export default function RunesPage(){
  return <main className="loc-next-main"><section className="loc-view loc-home scope-home-composition runes-home">
    <header className="loc-hero runes-home-hero">
      <div className="runes-home-hero-copy">
        <p className="loc-eyebrow">LunaRunes</p>
        <h1>月之符文</h1>
        <p className="loc-subtitle">月之符文是一套符號式語言，以 66 個固定符文作為語意種子，透過牌位、方向與組合形成可以被閱讀、分析與延伸的語意結構。</p>
        <p>第一次來，如果什麼都不知道，也沒關係。先看影片介紹，再依自己的需要進入 FAQ、抽牌、脈絡或延伸體系。</p>
      </div>
      <div className="runes-home-reels" aria-label="月之符文介紹影片">
        <article className="runes-home-reel">
          <iframe
            src="https://www.instagram.com/reel/DMA9yDAzeRK/embed/"
            title="月之符文介紹 Reels"
            loading="eager"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
          <a href="https://www.instagram.com/reel/DMA9yDAzeRK/" target="_blank" rel="noopener noreferrer">在 Instagram 看完整影片</a>
        </article>
      </div>
    </header>

    <section className="loc-card home-copy-block" id="beginner">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Start here</p>
        <h2>新手上路</h2>
        <p className="loc-subtitle">不用先把 66 個符文全部背起來，也不用先學會解牌。</p>
      </div>
      <div className="home-author-copy">
        <p>如果只是想先知道月之符文怎麼使用，可以先看 <a href={FAQ_LINKS.runes}>FAQ</a>。想直接體驗，則進入獨立的<a href="/duel">抽牌頁面</a>。</p>
        <p>首頁只負責帶你認識這套符號式語言與它能延伸到哪些內容，不在這裡塞入完整抽牌、圖鑑或資料庫。</p>
      </div>
    </section>

    <section className="loc-card home-copy-block" id="context">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Context</p>
        <h2>脈絡</h2>
        <p className="loc-subtitle">從單一符文進一步看詞、位置、方向、事件與關係如何連起來。</p>
      </div>
      <div className="home-author-copy">
        <p>月之符文不只是一張一張獨立閱讀。雙卡、三卡、五卡與 OW3gs 都有固定 Grammar，可以把符文組合成可追溯的語意脈絡。</p>
        <p>脈絡頁負責關鍵詞、事件與關係；符文演算法則整理固定牌位與組合規則；脈絡對戰則把這些關係轉成可互動的 Semantic Playground。</p>
      </div>
      <div className="loc-actions">
        <a className="loc-button" href="/context">符文脈絡</a>
        <a className="loc-button" href="/algorithm">符文演算法</a>
        <a className="loc-button" href="/duel/fight">脈絡對戰</a>
      </div>
    </section>

    <section className="loc-card home-copy-block" id="culture">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Culture</p>
        <h2>文化</h2>
        <p className="loc-subtitle">符文進入創作、作品與時間之後，才形成可以被觀察的文化軌跡。</p>
      </div>
      <div className="home-author-copy">
        <p>文化頁不重新定義符文，而是觀察月之符文如何進入作品、時期與事件，在不同媒介中留下可比較的語意痕跡。</p>
        <p>需要看時期、趨勢與文字演化時，再從文化頁深入。</p>
      </div>
      <div className="loc-actions"><a className="loc-button" href="/culture">查看符文文化</a></div>
    </section>

    <section className="loc-card home-copy-block" id="systems">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Systems</p>
        <h2>符文體系</h2>
        <p className="loc-subtitle">首頁只保留四個主要展示入口，讓不同內容各自分流。</p>
      </div>
      <div className="loc-link-list">
        {SYSTEMS.map(item=><a className="loc-link-card" href={item.href} key={item.href}>
          <strong>{item.title}</strong>
          <span>{item.text}</span>
        </a>)}
      </div>
    </section>

    <section className="loc-card home-copy-block" id="manager-note">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Management</p>
        <h2>管理者的話</h2>
        <p className="loc-subtitle">月之符文維持固定核心資料，延伸內容則可以持續增加。</p>
      </div>
      <div className="home-author-copy">
        <p>66 符的 Current 定義、群組與基礎資料維持治理；圖鑑、作品、文化與脈絡各自使用自己的資料來源，不讓展示頁反過來修改核心符文。</p>
        <p>網站首頁只提供理解與分流。完整規則、設定、授權與管理入口統一放在治理頁。</p>
      </div>
      <div className="loc-actions"><a className="loc-button" href="/governance">符文治理</a></div>
    </section>
  </section></main>;
}
