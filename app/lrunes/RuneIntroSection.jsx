import RuneDrawModeBubbles from './RuneDrawModeBubbles';

export default function RuneIntroSection(){
  return <section className="loc-card home-copy-block home-rune-section">
    <div className="home-section-heading">
      <p className="loc-eyebrow">LunaRunes(Symbolic Language)</p>
      <h2>月之符文籤詩系統</h2>
      <p className="loc-subtitle">不涉及神秘學，為單純的指引籤詩<br/>不保證一定就是註定，你擁有選擇權。</p>
    </div>
    <div className="home-rune-layout">
      <div className="home-rune-preview" aria-label="命之符文示例">
        <img src="/assets/lunarunes/cards/66_命.png" alt="命之符文" loading="lazy" decoding="async" />
        <div className="home-rune-card-data">
          <div className="home-rune-card-title">
            <strong>命之符文</strong>
            <span className="home-rune-glyph">⟁</span>
            <span>(Fate)</span>
          </div>
          <p>定論的所有可能 / 命定者</p>
          <details className="home-rune-keywords">
            <summary>關鍵詞（點擊展開）</summary>
            <p>正面：定論、必然、法則</p>
            <p>負面：—</p>
          </details>
          <p>所屬分組：特殊 / 卡片屬性：未知</p>
          <p>卡片月相：無 / 真實月相：空亡</p>
          <p className="home-rune-direction">卡片面向：<strong>正位</strong></p>
        </div>
      </div>
      <div className="home-rune-copy home-rune-copy-plain">
        <p>不知道怎麼說的話，往下抽牌就對了！</p>
        <p>沒什麼想問的，抽個每日符文看看吧！</p>
        <p>月之符文的特有66符文字會給你提示籤詩，指引你的可能未來，</p>
        <p>能是祝福可能是警告，你當然擁有選擇權。</p>
        <p>抽牌讓這符文成語意種子，成為語意起點，<br/>用你想要的方式，成長成為完整語意的成熟果實。</p>
        <p>最後的選擇權仍然在你的手上！</p>
        <RuneDrawModeBubbles />
      </div>
    </div>
  </section>;
}
