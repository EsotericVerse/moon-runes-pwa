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
      <h2>判讀與回測原則</h2>
      <div className="reading-ref-grid">
        <article className="reading-ref-card"><h3>過程不等於結果</h3><p>過程順利、互動正向或局部條件成立，不代表最後一定形成預期結果。</p></article>
        <article className="reading-ref-card"><h3>多個結果可以並存</h3><p>成果、延遲、成本、補償與限制可以同時成立，不把複合事件壓成單一吉凶。</p></article>
        <article className="reading-ref-card"><h3>主結果與代價分開</h3><p>是否完成、完成品質、時間、金錢、情緒與體力成本應分開判讀。</p></article>
        <article className="reading-ref-card"><h3>不知道就保留未知</h3><p>尚未走完的時間跨度、證據不足或原始解析遺失時，不事後補造答案。</p></article>
      </div>
    </section>
  </section></main>;
}
