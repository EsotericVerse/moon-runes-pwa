import {scopeOrigin} from '../modular/scope-registry';
import {RUNE_CUSTOM_DRAW_MODES} from './rune-draw-modes.mjs';
import CustomDrawSelector from './CustomDrawSelector';
import RuneIntroSection from './RuneIntroSection';
import ScopeEditableBlocks from '../loc/ScopeEditableBlocks';
import runesHeroAsset from '../../pics/LunaRunes-hero.jpg';

const runeHref=path=>{
  const clean=String(path||'').split('/').filter(Boolean).join('/');
  return `${scopeOrigin('lrunes')}/${clean}`;
};

export default function RunesClient(){
  return <main className="loc-next-main"><section className="loc-view">
    <header className="loc-hero runes-home-hero" id="intro">
      <img
        className="runes-home-hero-image"
        src={runesHeroAsset.src}
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
      <div className="runes-home-hero-overlay" aria-hidden="true"/>
      <div className="runes-home-hero-copy">
        <p className="loc-eyebrow">LunaRunes</p>
        <div className="home-title-row">
          <h1>月之符文</h1>
          <p className="loc-subtitle">以月的角度紀錄。</p>
        </div>
        <p className="runes-home-lead">抽牌先給你一個籤詩提示，再從符文本義、卡牌方向與月相交互往下判讀。</p>
        <p className="runes-home-system">66個單一中文字 × 九組符文分組 × 四卡牌方向 × 月相交互</p>
        <p>可以問一件事，也可以沒有問題直接抽取。</p>
        <div className="runes-home-primary-actions" aria-label="開始抽牌">
          <a className="loc-button runes-home-primary-action" href={runeHref('duel/one')}>抽一張符文</a>
          <a className="loc-button" href={runeHref('duel/daily')}>每日符文</a>
        </div>
      </div>
    </header>

    <nav className="runes-home-nav runes-home-secondary-nav" aria-label="月之符文延伸功能">
      <a className="loc-button" href={runeHref('list')}>符文圖鑑</a>
      <a className="loc-button" href={runeHref('game')}>符文遊戲</a>
      <a className="loc-button" href={runeHref('daily/log')}>每日符文紀錄</a>
    </nav>

    <RuneIntroSection />

    <section className="loc-card rune-basics runes-reading-flow">
      <h2>基本判讀順序</h2>
      <ScopeEditableBlocks
        scopeId="lrunes"
        page="home"
        className="basic-grid"
        slotClassName="basic-item"
        fallbackDocuments={[
          [{type:'heading',props:{level:3},content:'1. 先看符文本義'},{type:'paragraph',content:'先確認每張符文最基本的語意，作為整體判讀的核心。'}],
          [{type:'heading',props:{level:3},content:'2. 再看卡牌方向'},{type:'paragraph',content:'正位、半正位、半逆位、逆位描述同一符文在當下狀態中的不同表現。'}],
          [{type:'heading',props:{level:3},content:'3. 看月相交互'},{type:'paragraph',content:'以當日真實月相與該符文本身的卡牌月相交互，取得當下情境中的對應狀況。'}],
          [{type:'heading',props:{level:3},content:'4. 多張再看模組'},{type:'paragraph',content:'若為多張抽牌，再依雙卡、三卡、五卡、指定張數或 OW3gs 各自的模組結構進行組合判讀。'}]
        ]}
      />
    </section>

    <section className="loc-card rune-basics runes-custom-draw-section">
      <h2>其他張數</h2>
      <CustomDrawSelector options={RUNE_CUSTOM_DRAW_MODES.map(item=>({
        count:item.count,
        description:item.description,
        href:runeHref(item.path)
      }))}/>
    </section>

    <section className="loc-card rune-basics runes-review-section">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Reading & Review</p>
        <h2>判讀與回測結果</h2>
      </div>
      <div className="runes-review-grid" aria-label="判讀與回測結果說明">
        <article className="runes-review-item">
          <strong>天時一直在改變</strong>
          <p>月之符文由於有天時設定（當前月相與卡片月相的交互作用），所以每次的判讀跟回測結果都可能會有差異。這是因為外在的時機一直在改變，符文的解析方式必須跟隨時機而動，才不會有跟不上時代的結果狀況。</p>
        </article>
        <article className="runes-review-item">
          <strong>符文推演的是可能性</strong>
          <p>而符文只是推演出未來的可能性，將一片完全未知的未來，設定好一個風格濾鏡，方便你作不同解度的切入解析。</p>
        </article>
        <article className="runes-review-item">
          <strong>命運仍然在你手上</strong>
          <p>命運的掌控始終在你手上。符文並不會替你做下決定，也不會武斷認為一定可以或一定不可以。只是提供一個解析方向，方便你在完全沒有頭緒的迷霧中，慢慢找到適合自己的方式去處理跟面對。</p>
        </article>
        <article className="runes-review-item">
          <strong>回測不是把結果刷到滿意</strong>
          <p>當然可以一直回測，如果你只是想要回測直到結果滿意，當然可以，但真正的命運並不會讓你滿意。命運即是如此。</p>
        </article>
        <article className="runes-review-item">
          <strong>符文不替你叫醒自己</strong>
          <p>如果你選擇裝睡不肯醒來，符文也沒有義務要提醒你鬧鐘設定，也不會武斷的叫你放棄或選擇繼續，只是提供一個解析的方式來做參考。</p>
        </article>
        <article className="runes-review-item">
          <strong>符文不是神秘學權威</strong>
          <p>月之符文不是神秘學權威，也不要求你把抽牌結果當成不可質疑的真理。它是一套以符文本義、卡牌方向與月相交互提供解析角度的指引籤詩；你可以把結果當作參考、提示，或重新整理問題的起點。接受或不接受、採取什麼行動，仍然是你的選擇。</p>
        </article>
      </div>
    </section>
  </section></main>;
}
