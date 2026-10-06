import {scopeHref} from '../../modular/scope-registry';
import {SITE_IMAGES} from '../../site-images';
import RuneDrawModeBubbles from '../../lrunes/RuneDrawModeBubbles';

const RUNES_LINKS=Object.freeze({
  home:scopeHref('lrunes'),
  single:scopeHref('lrunes','duel/one'),
  daily:scopeHref('lrunes','duel/daily'),
  two:scopeHref('lrunes','duel/two'),
  three:scopeHref('lrunes','duel/three'),
  five:scopeHref('lrunes','duel/five'),
  ow3gs:scopeHref('lrunes','duel/ow3gs')
});

export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero loc-home-hero">
      <div className="loc-home-hero-copy">
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
      <figure className="home-hero-visual">
        <picture>
          <source media="(max-width: 900px)" srcSet={SITE_IMAGES.locHeroSmall.src} />
          <img src={SITE_IMAGES.locHero.src} width={SITE_IMAGES.locHero.width} height={SITE_IMAGES.locHero.height} alt="LOC 月典語言架構框架視覺理念圖" loading="lazy" decoding="async" />
        </picture>
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
          <p>太複雜了？不用先理解月之符文，<a href={RUNES_LINKS.single}>抽了就知道！</a></p>
		  <p>可以問事，也可以用<a href={RUNES_LINKS.daily}>每日符文</a>決定當日生活主題。</p>
          <p>完全不了解符文也沒關係，抽到之後再看當下的文字、方向與說明即可。</p>
		  <p>不想抽牌也沒關係，直接跳過符文籤詩系統，往下看 LOC 架構。</p>
          <p><strong>那就開始吧！</strong></p>
        </div>
        <figure className="home-framework-figure"><img src={SITE_IMAGES.lunarunes.src} width={SITE_IMAGES.lunarunes.width} height={SITE_IMAGES.lunarunes.height} alt="LunaRunes 月之符文" loading="lazy" decoding="async" /></figure>
      </div>
    </section>

    <section className="loc-card home-copy-block home-rune-section">
      <div className="home-section-heading"><p className="loc-eyebrow">LunaRunes(Symbolic Language)</p><h2>月之符文籤詩系統</h2><p className="loc-subtitle">不涉及神秘學，為單純的指引籤詩
	  <br/>不保證一定就是註定，你擁有選擇權。</p></div>
      <div className="home-rune-layout">
        <div className="home-rune-preview" aria-label="命之符文示例">
          <img src="/assets/lunarunes/cards/66_命.png" alt="命之符文" loading="lazy" decoding="async" />
          <div className="home-rune-card-data"><div className="home-rune-card-title"><strong>命之符文</strong><span className="home-rune-glyph">⟁</span><span>(Fate)</span></div><p>定論的所有可能 / 命定者</p><details className="home-rune-keywords"><summary>關鍵詞（點擊展開）</summary><p>正面：定論、必然、法則</p><p>負面：—</p></details><p>所屬分組：特殊 / 卡片屬性：未知</p><p>卡片月相：無 / 真實月相：空亡</p><p className="home-rune-direction">卡片面向：<strong>正位</strong></p></div>
        </div>
        <div className="home-rune-copy home-rune-copy-plain">
          <p>不知道怎麼說的話，往下抽牌就對了！</p><p>沒什麼想問的，抽個每日符文看看吧！</p><p>月之符文的特有66符文字會給你提示籤詩，指引你的可能未來，</p><p>能是祝福可能是警告，你當然擁有選擇權。</p><p>抽牌讓這符文成語意種子，成為語意起點，<br/>用你想要的方式，成長成為完整語意的成熟果實。</p><p>最後的選擇權仍然在你的手上！</p>
          <RuneDrawModeBubbles />
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
			<p>這裡以我的作品作為展示，同樣的架構也能用來整理自己的文字與風格標籤。</p>
			<p>LOC 會依文字與時間分佈提出可能的定錨點，協助回看風格變化較明顯的時期，也能用來觀察趨勢與值得留意的風險。</p>
			<p>這些結果是建議，不是判定或預測；最後如何理解與選擇，仍由使用者決定。</p>
          </div>
        </div>
        <figure className="home-architecture-figure">
          <img src={SITE_IMAGES.locArchitecture.src} width={SITE_IMAGES.locArchitecture.width} height={SITE_IMAGES.locArchitecture.height} alt="LOC 月典架構：時間長河、玄子、玄裂與玄宇宙" loading="lazy" decoding="async" />
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
          <p>Canon 文字欄位：8,150,917 字元（含符文）<br/>Galaxy 正文：4,318,463 字元 · Canon 資料列：40,817<br/>資料時間：2005 ～ 至今</p>
          <p className="home-status-reference"><a href={scopeHref('loc','statics')}>詳細即時總數、來源與分布以統計頁面為準 →</a></p>
        </div>
        <div className="loc-bubble">
          <strong>系統模組</strong>
          <p>Next.js + React + Supabase</p>
          <details className="home-status-details">
            <summary>架構</summary>
            <p>Next.js 負責網站結構與頁面路由，React 負責互動介面，Supabase PostgreSQL 負責保存與查詢文字、時間及關聯資料。<br/>Next.js 16.3.5 · React 19.3.0 · Supabase PostgreSQL</p>
          </details>
          <details className="home-status-details">
            <summary>模組</summary>
            <p>文化時間長河：vis-timeline 8.5.4<br/>統計：Recharts 3.10.1<br/>管理框架：vis-network 10.1.0<br/>安全認證：Zod 4.6.0 / Supabase Auth<br/>頁面：Motion 13.4.4<br/>多媒體搜尋：TanStack Query 5.103.1</p>
          </details>
        </div>
      </div>
    </section>

    <section className="loc-card home-copy-block home-skills" id="skills">
      <div className="home-section-heading"><p className="loc-eyebrow">LOC GPT Skills</p><h2>Skills</h2>
	  <p className="loc-subtitle">把月典延伸可以重複使用的工作流程。<br/>把語言治理與治理資料儲存庫，封裝成可直接調用的 AI Skills。</p></div>
      <div className="home-author-copy"><p><strong>loc-km-governance</strong>：檢查 Canon、KM、Registry、Base66、術語一致性、資料權威。</p>
	  <p><strong>loc-repo-health-check</strong>：檢查儲存庫結構、路徑、API／搜尋、部署與效能風險等。</p>
	  <p>Skills 不是另一套理論，而是把 LOC 已形成的治理管理理念跟方法，轉成GPT可以重複執行的工作流程。</p>
	  <div className="loc-actions"><a className="loc-button primary" href="/LOC-GPT-Skills-v2.0-bundle.zip">下載 LOC GPT Skills v2.0</a></div></div>

    </section>

    <section className="loc-card home-author-words" id="author-words">
      <div className="home-section-heading"><p className="loc-eyebrow">About me</p><h2>作者的話</h2><p className="loc-subtitle">整理治理過去的已知，是為了把時間還給現在，對未知的未來做好準備。</p></div>
      <div className="home-about-layout"><div className="home-author-copy">
	  <p>文字資料經過基本解析以後，分析出關鍵詞。將關鍵詞整理分類以後，並配合時間線的可能風格變化，進一步解析成為該區間內的風格。</p>
<p>人總會因為各種狀況導致文字風格突變，例如當兵，例如車禍意外等等。改變是循序漸進，突變也有其因素影響，從文字可見一斑。</p>
<p>其實做整套架構，本來只是用於自己累積數百萬字作品的展示整理，不自覺地整理出了兩項東西，一套是歸納的系統架構論LOC，一套是以符號式語言形成的月之符文。</p>
<p>整合出月典，並不是為了把現有人生，固定成某種發展模式，也不是完全為了賺錢，</p>
<p>而是把散落、原本只能靠直覺掌握的經驗，整理成可回看、可搜尋、可解析的方式，才能進一步面對未來的各種可能，做到風險管理。</p>
<p>我的原則：敬畏未知，尊重異者，專業為先。</p>
<p>立於無限減一的謙遜，但要有無限減一的專業。保有探索未知的好奇，尊重無限未知的領域，進而才能學習到更多的知識。</p>
<p>為此LOC提供一套建議方式，在每個風格改變的關鍵點，提出設定日期為定錨點的建議，進而找到關鍵。</p>
<p>用舊有被放在硬碟裡面，關站時備份的文字壓縮檔，用來分析解析，喚起過去的回憶，找回過去的自己。</p>
<p>找到舊有的文字風格，用來檢視現在的自己。進而知道該進步該前進的方向。選擇權都在自己手上。</p>
<p>退是喚醒「過去」，在人生時間長河上的銀河鐵道，人生月台的「現在」暫停區，決定前往「未來」班車的時刻。</p>
<p>Lucas Oscar Wang 政德. 2026.10.01.(ex-admin of StarRiver BBS.)</p>
<p>想要了解作者請點右上方的作者網頁。</p>
	  </div>
	  <figure className="home-about-figure"><img src={SITE_IMAGES.author.src} width={SITE_IMAGES.author.width} height={SITE_IMAGES.author.height} alt="作者 Lucas Oscar Wang 政德" loading="lazy" decoding="async" />
	  </figure></div>
    </section>
  </section>;
}
