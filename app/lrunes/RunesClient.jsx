import {scopeOrigin} from '../modular/scope-registry';
import {RUNE_CUSTOM_DRAW_MODES} from './rune-draw-modes.mjs';
import CustomDrawSelector from './CustomDrawSelector';
import RuneIntroSection from './RuneIntroSection';

const runeHref=path=>{
  const clean=String(path||'').split('/').filter(Boolean).join('/');
  return `${scopeOrigin('lrunes')}/${clean}`;
};

export default function RunesClient(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero scope-home-hero-with-visual" id="intro">
      <div className="scope-home-hero-copy">
        <p className="loc-eyebrow">LunaRunes</p>
        <div className="home-title-row">
          <h1>月之符文</h1>
          <p className="loc-subtitle">以月的角度紀錄。</p>
        </div>
        <p>66個單一中文字 × 九組符文分組 × 四卡牌方向 × 月相交互</p>
        <p>可以問一件事，也可以沒有問題直接抽取。</p>
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">
        <iframe src="https://www.instagram.com/reel/DMA-ZxLTINw/embed" title="月之符文說明" loading="eager" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
      </figure>
    </header>

    <nav className="runes-home-nav" aria-label="月之符文功能">
      <a className="loc-button" href={runeHref('duel/one')}>單卡抽籤</a>
      <a className="loc-button" href={runeHref('list')}>符文圖鑑</a>
      <a className="loc-button" href={runeHref('game')}>符文遊戲</a>
      <a className="loc-button" href={runeHref('daily/log')}>每日符文紀錄</a>
    </nav>

    <section className="loc-card rune-basics">
      <h2>基本判讀順序</h2>
      <div className="basic-grid">
        <div className="basic-item"><strong>1. 先看符文本義</strong><span>先確認每張符文最基本的語意，作為整體判讀的核心。</span></div>
        <div className="basic-item"><strong>2. 再看卡牌方向</strong><span>正位、半正位、半逆位、逆位描述同一符文在當下狀態中的不同表現。</span></div>
        <div className="basic-item"><strong>3. 看月相交互</strong><span>以當日真實月相與該符文本身的卡牌月相交互，取得當下情境中的對應狀況。</span></div>
        <div className="basic-item"><strong>4. 多張再看模組</strong><span>若為多張抽牌，再依雙卡、三卡、五卡、指定張數或 OW3gs 各自的模組結構進行組合判讀。</span></div>
      </div>
    </section>

    <RuneIntroSection />

    <section className="loc-card rune-basics">
      <h2>其他張數</h2>
      <CustomDrawSelector options={RUNE_CUSTOM_DRAW_MODES.map(item=>({
        count:item.count,
        description:item.description,
        href:runeHref(item.path)
      }))}/>
    </section>

    <section className="loc-card rune-basics">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Reading & Review</p>
        <h2>判讀與回測結果</h2>
      </div>
      <div className="home-author-copy">
        <p>月之符文由於有天時設定（當前月相與卡片月相的交互作用），所以每次的判讀跟回測結果都可能會有差異。這是因為外在的時機一直在改變，符文的解析方式必須跟隨時機而動，才不會有跟不上時代的結果狀況。</p>
        <p>而符文只是推演出未來的可能性，將一片完全未知的未來，設定好一個風格濾鏡，方便你作不同解度的切入解析。</p>
        <p>命運的掌控始終在你手上。符文並不會替你做下決定，也不會武斷認為一定可以或一定不可以。只是提供一個解析方向，方便你在完全沒有頭緒的迷霧中，慢慢找到適合自己的方式去處理跟面對。</p>
        <p>當然可以一直回測，如果你只是想要回測直到結果滿意，當然可以，但真正的命運並不會讓你滿意。命運即是如此。</p>
        <p>如果你選擇裝睡不肯醒來，符文也沒有義務要提醒你鬧鐘設定，也不會武斷的叫你放棄或選擇繼續，只是提供一個解析的方式來做參考。</p>
        <p>符文並不是神秘學權威，而你依然擁有自己的人生。這是毫無矛盾的。</p>
      </div>
    </section>
  </section></main>;
}
