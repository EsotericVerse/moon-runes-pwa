import {scopeHrefV2} from '../../modular-v2/scope-registry.v2';

const RUNES_LINKS=Object.freeze({
  home:scopeHrefV2('lunarunes'),
  single:scopeHrefV2('lunarunes','duel/one'),
  daily:scopeHrefV2('lunarunes','duel/daily'),
  two:scopeHrefV2('lunarunes','duel/two'),
  three:scopeHrefV2('lunarunes','duel/three'),
  five:scopeHrefV2('lunarunes','duel/five'),
  ow3gs:scopeHrefV2('lunarunes','duel/ow3gs')
});

export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero scope-home-hero-with-visual">
      <div className="scope-home-hero-copy">
        <p className="loc-eyebrow">LOC (Language Architecture Framework)</p>
        <div className="home-title-row">
          <h1>LOC月典</h1>
          <p className="loc-subtitle">以多面向語言結構與時間維度，整理、搜尋並呈現語言建築。</p>
        </div>
        <div className="loc-hero-copy">
          <p>以微月光為鑑，即為月典(LOC,Luna Codex)，</p>
		  <p>用於分析整理，顯示在時間長河內，文字發光的作品。</p>
          <p>當微光慢慢集中變亮，你也將綻放屬於自己的光芒。</p>
        </div>
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">
        <img src="/pics/LOC-PicAll.png?v=9a46a595" alt="LOC 月典語言架構框架視覺理念圖" loading="eager" />
      </figure>
    </header>

    <section className="loc-card home-copy-block home-beginner" id="beginner">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Start here</p><h2>新手上路</h2>
        <p className="loc-subtitle">不知道怎麼開始沒關係，就抽張牌吧！</p>
      </div>
      <div className="home-rune-layout">
        <div className="home-author-copy">
		<p>月典(LOC)，是一套用來分析的語言建築框架。始於月之符文。</p>
		<p>月之符文(LunaRunes)是個具有獨特方式的符號式語言。與月典相輔相成。</p>
		<br/>
          <p>太複雜了！當然可以不用管月之符文是什麼，<a href={RUNES_LINKS.single}>抽了就知道！</a></p>
		  <p>可以是問事，可以是決定當日生活主題風格的<a href={RUNES_LINKS.daily}>每日符文</a>。</p>
          <p>完全不了解符文？沒關係！抽看看如何？抽到之後再看當下的文字、方向與說明就可以。</p>
          <p>不想了解符文？當然可以！</p>
		  <p>當然也可以完全不抽牌，直接跳過符文籤詩系統。到達下一個架構圖說明。</p>
          <p><strong>那就開始吧！</strong></p>
        </div>
        <figure className="home-framework-figure"><img src="/pics/LunaRunes.png" alt="LunaRunes 月之符文" loading="lazy" /></figure>
      </div>
    </section>

    <section className="loc-card home-copy-block home-rune-section">
      <div className="home-section-heading"><p className="loc-eyebrow">LunaRunes(Symbolic Language)</p><h2>月之符文籤詩系統</h2><p className="loc-subtitle">不涉及神秘學，為單純的指引籤詩
	  <br/>不保證一定就是註定，你擁有選擇權。</p></div>
      <div className="home-rune-layout">
        <div className="home-rune-preview" aria-label="命之符文示例">
          <img src="/assets/lunarunes/cards/66_命.png" alt="命之符文" />
          <div className="home-rune-card-data"><div className="home-rune-card-title"><strong>命之符文</strong><span className="home-rune-glyph">⟁</span><span>(Fate)</span></div><p>定論的所有可能 / 命定者</p><details className="home-rune-keywords"><summary>關鍵詞（點擊展開）</summary><p>正面：定論、必然、法則</p><p>負面：—</p></details><p>所屬分組：特殊 / 卡片屬性：未知</p><p>卡片月相：無 / 真實月相：空亡</p><p className="home-rune-direction">卡片面向：<strong>正位</strong></p></div>
        </div>
        <div className="home-rune-copy home-rune-copy-plain">
          <p>不知道怎麼說的話，往下抽牌就對了！</p><p>沒什麼想問的，抽個每日符文看看吧！</p><p>月之符文的特有66符文字會給你提示籤詩，指引你的可能未來，</p><p>能是祝福可能是警告，你當然擁有選擇權。</p><p>抽牌讓這符文成語意種子，成為語意起點，<br/>用你想要的方式，成長成為完整語意的成熟果實。</p><p>最後的選擇權仍然在你的手上！</p>
          <div className="home-draw-bubbles" aria-label="選擇抽牌方式">
            <a className="loc-bubble" href={RUNES_LINKS.single}>單卡<p>一個問題，一個語意起點。</p></a>
            <a className="loc-bubble" href={RUNES_LINKS.daily}>抽每日指示<p>一天一張，觀看當日提示。</p></a>
            <a className="loc-bubble" href={RUNES_LINKS.two}>抽兩張<p>以「因 → 果」觀看兩者關係。</p></a>
            <a className="loc-bubble" href={RUNES_LINKS.three}>抽三張<p>以「源 → 轉 → 合」形成語意路徑。</p></a>
            <a className="loc-bubble" href={RUNES_LINKS.five}>抽五張<p>以兩個因果為基礎，加上一個變數。</p></a>
            <a className="loc-bubble" href={RUNES_LINKS.ow3gs}>抽11張<p>OW3gs：兩個因果模組綜合的演算法。</p></a>
          </div>
        </div>
      </div>
    </section>

    <section className="loc-card home-framework home-architecture-presentation" id="framework-map">
      <div className="home-architecture-layout">
        <div className="home-architecture-copy">
          <div className="home-section-heading">
            <p className="loc-eyebrow">LOC Architecture</p><h2>LOC架構</h2>
          </div>
          <div className="home-author-copy">
			<p>第一次來不需要管完整架構。可以先找到自己有感的內容，再慢慢來看，文字、時間與關聯如何被整理，進而自己做！</p>
            <p><strong>文化：</strong>以時間長河呈現作品在不同時期的分佈與密度，觀察文字如何隨時間累積與變化。</p>
            <p><strong>統計：</strong>將文字作品依來源、分類與時間區間整理成統計結果，協助看見整體分佈與變化。</p>
            <p><strong>搜尋：</strong>以精準關鍵詞尋找文字、作品與相關資料，快速回到原始內容與前後脈絡。</p>
            <p><strong>治理：</strong>提供管理頁面的設定與功能選項，並集中說明系統使用原則與法律資訊。</p>
			<p>自己也可以整理自己的風格標籤！我以我個人作品的文字分佈做展示，當然可以自己用來整理自己的！</p>
			<p>LOC本身有建議功能，可以自動找出某幾個文字風格變化的關鍵時間點(定錨點)，並給予建議！</p>
			<p>找出個人風格很重要！但最特別的是，可以找出趨勢跟隱患！藉由建議點探查出你所不知道或忘記時間點的改變！</p>
			<p>LOC完全不會武斷批判！要怎麼選擇自己的路，怎麼選擇風格，掌握權在使用的你手上！</p>
          </div>
        </div>
        <figure className="home-architecture-figure">
          <img src="/pics/ChaosGalaxy.png" alt="LOC 月典架構：時間長河、玄子、玄裂與玄宇宙" loading="lazy" />
        </figure>
      </div>
    </section>

    <section className="loc-card home-copy-block home-progress" id="progress">
      <div className="home-section-heading">
        <p className="loc-eyebrow">System Status</p><h2>系統狀態</h2>
        <p className="loc-subtitle">目前 LOC 的文字資料、系統架構與主要模組。</p>
      </div>
      <div className="home-draw-bubbles home-status-bubbles" aria-label="LOC 系統狀態">
        <div className="loc-bubble">
          <strong>文字系統</strong>
          <p>總文字數：4,505,362 字<br/>文字時間：2005-04-12 ～ 2026-09-30<br/>資料來源：Facebook · Threads · KKCity · Vocus · Suno · PTT · Pixnet · Wretch</p>
        </div>
        <div className="loc-bubble">
          <strong>系統模組</strong>
          <p>Next.js + React + PostgreSQL</p>
          <details className="home-status-details">
            <summary>架構</summary>
            <p>Next.js 負責網站結構與頁面路由，React 負責互動介面，PostgreSQL（Neon）負責保存與查詢文字、時間及關聯資料。<br/>Next.js 16.3.5 · React 19.3.0 · PostgreSQL（Neon） · Neon SDK 0.7.0-beta</p>
          </details>
          <details className="home-status-details">
            <summary>模組</summary>
            <p>關鍵詞與搜尋：FlexSearch 0.8.212<br/>文化時間長河：vis-timeline 8.5.4<br/>統計：Recharts 3.10.1<br/>管理框架：vis-network 10.1.0<br/>安全認證：Zod 4.6.0 / Neon Auth<br/>頁面：Motion 13.4.4<br/>多媒體搜尋：TanStack Query 5.103.1</p>
          </details>
        </div>
      </div>
    </section>

    <section className="loc-card home-copy-block home-skills" id="skills">
      <div className="home-section-heading"><p className="loc-eyebrow">LOC GPT Skills</p><h2>Skills</h2>
	  <p className="loc-subtitle">把月典延伸可以重複使用的工作流程。<br/>把語言治理與治理資料儲存庫，封裝成可直接調用的 AI Skills。</p></div>
      <div className="home-author-copy"><p><strong>loc-km-governance</strong>：檢查 Canon、KM、FAQ、Registry、Base66、術語一致性、資料權威。</p>
	  <p><strong>loc-repo-health-check</strong>：檢查儲存庫結構、路徑、API／搜尋、部署與效能風險等。</p>
	  <p>Skills 不是另一套理論，而是把 LOC 已形成的治理管理理念跟方法，轉成GPT可以重複執行的工作流程。</p></div>

    </section>

    <section className="loc-card home-author-words" id="author-words">
      <div className="home-section-heading"><p className="loc-eyebrow">About me</p><h2>作者的話</h2><p className="loc-subtitle">整理治理過去的已知，是為了把時間還給現在，對未知的未來做好準備。</p></div>
      <div className="home-about-layout"><div className="home-author-copy">
	  <p>文字資料經過基本解析以後，分析出關鍵詞。將關鍵詞整理分類以後，並配合時間線的可能風格變化，進一步解析成為該區間內的風格。</p>
<p>人總會因為各種狀況導致文字風格突變，例如當兵，例如車禍意外等等。改變是循序漸進，突變也有其因素影響，從文字可見一斑。</p>
<p>其實做整套架構，本來只是用於自己總數三百多萬中文字作品的展示整理，不自覺的整理出了兩項東西，一套是歸納的系統架構論LOC，一套是有點偏神秘學的月之符文。</p>
<p>整合出月典，並不是為了把現有人生，固定成某種發展模式，也不是完全為了賺錢，</p>
<p>而是把散落、原本只能靠直覺掌握的經驗，整理成可回看、可搜尋、可解析的方式，才能進一步面對未來的各種可能，做到風險管理。</p>
<p>我的原則：敬畏未知，尊重異者，專業為先。</p>
<p>立於無限減一的謙遜，但要有無限減一的專業。保有探索未知的好奇，尊重無限未知的領域，進而才能學習到更多的知識。</p>
<p> 2026.09.26.</p>
<p>想要了解作者請點右上方的作者網頁。</p>
	  </div>
	  <figure className="home-about-figure"><img src="/pics/aboutme.png?v=20260914" alt="作者 Lucas Oscar Wang 政德" loading="eager" decoding="async" />
	  </figure></div>
    </section>
  </section>;
}
