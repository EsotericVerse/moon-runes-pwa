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
        <nav className="runes-home-nav" aria-label="月之符文功能">
          <a className="loc-button" href={runeHref('duel/one')}>單卡抽籤</a>
          <a className="loc-button" href={runeHref('list')}>符文圖鑑</a>
          <a className="loc-button" href={runeHref('game')}>符文遊戲</a>
          <a className="loc-button" href={runeHref('daily/log')}>每日符文紀錄</a>
        </nav>
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">
        <iframe src="https://www.instagram.com/reel/DMA-ZxLTINw/embed" title="月之符文說明" loading="eager" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" />
      </figure>
    </header>

    <section className="loc-card rune-basics">
      <h2>基本判讀順序</h2>
      <div className="basic-grid">
        <div className="basic-item"><strong>先看符文本義</strong><span>先確認每張符文最基本的語意，不先被吉凶或結論帶走。</span></div>
        <div className="basic-item"><strong>再看卡牌方向</strong><span>正位、半正位、半逆位、逆位描述同一語彙在當下狀態中的不同表現。</span></div>
        <div className="basic-item"><strong>依卡位讀結構</strong><span>雙卡、三卡、五卡與 OW3gs 都有自己的位置責任，不能混成同一種讀法。</span></div>
        <div className="basic-item"><strong>最後才看月相</strong><span>真實月相是次要的時間修飾，不應推翻符文本義、方向與主要卡位。</span></div>
      </div>
    </section>

    <section className="loc-card rune-basics">
      <h2>命運句基本結構</h2>
      <div className="reading-ref-grid">
        <article className="reading-ref-card"><h3>單卡</h3><p>回答當下最核心的語意或狀態。</p></article>
        <article className="reading-ref-card"><h3>雙卡</h3><p><strong>因 → 果</strong>。第一張描述造成狀況的來源，第二張描述主要結果或落點。</p></article>
        <article className="reading-ref-card"><h3>三卡</h3><p><strong>源 → 轉 → 合</strong>。從來源、轉折到整合結果，形成一條最基本的語意鏈。</p></article>
        <article className="reading-ref-card"><h3>五卡</h3><p><strong>雙卡＋單卡＋雙卡</strong>。兩張過去成因＋一個意外變化＋兩張現在狀況，不是「兩卡＋三卡」的拼接。</p></article>
        <article className="reading-ref-card"><h3>OW3gs</h3><p><strong>1–6 因的描述層＋7–11 果的判定層</strong>。先讀 7–11 的核心判定，再回看 1–6 補足造成現況的背景與條件。</p></article>
      </div>
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
