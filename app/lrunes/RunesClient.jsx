import {scopeOrigin} from '../modular/scope-registry';
import {RUNE_CUSTOM_DRAW_MODES} from './rune-draw-modes.mjs';
import CustomDrawSelector from './CustomDrawSelector';

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

    <section className="loc-card rune-basics">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Draw a Rune</p>
        <h2>選擇抽牌</h2>
        <p className="loc-subtitle">先從你想看的問題範圍開始。張數越多，語意結構越完整；不是越多越準，而是用不同結構看不同層次。</p>
      </div>
      <div className="home-draw-bubbles" aria-label="選擇抽牌方式">
        <a className="loc-bubble" href={runeHref('duel/one')}>
          <strong>單卡</strong>
          <p>一個問題，一個語意起點。適合第一次抽牌、快速確認主題，或只需要一個核心提示時使用。</p>
        </a>
        <a className="loc-bubble" href={runeHref('duel/daily')}>
          <strong>每日抽牌</strong>
          <p>一天一張，作為當日生活主題。依符文、方向與真實月相顯示當日狀況、提醒、引導與祝福。</p>
        </a>
        <a className="loc-bubble" href={runeHref('duel/two')}>
          <strong>雙卡</strong>
          <p>以「因 → 果」觀看兩者關係。第一張作為起因，第二張作為結果，適合確認事件最基本的因果方向。</p>
        </a>
        <a className="loc-bubble" href={runeHref('duel/three')}>
          <strong>三卡</strong>
          <p>以「源 → 轉 → 合」形成語意路徑。從起點、變化到收束，適合觀察事情如何發展與轉折。</p>
        </a>
        <a className="loc-bubble" href={runeHref('duel/five')}>
          <strong>五卡</strong>
          <p>以「2 / 1 / 2」組成兩個因果模組，中間加入一個變數。適合看兩側條件如何透過核心因素彼此影響。</p>
        </a>
        <a className="loc-bubble" href={runeHref('duel/ow3gs')}>
          <strong>11 卡 OW3gs</strong>
          <p>以兩個因果模組進行綜合判讀。適合因素較多、關係較複雜，需要把多個條件放在同一個結構裡一起看的問題。</p>
        </a>
      </div>
      <p className="loc-subtitle">需要其他張數時，可使用下方指定抽牌數量；4、6、7、8、9、10 張會依各自的模組結構進行判讀。</p>
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
