import ModelArchitectureExplorer from './ModelArchitectureExplorer';
import {featureHrefV2,scopeHrefV2} from '../../modular-v2/scope-registry.v2';

const RUNES_LINKS=Object.freeze({
  home:scopeHrefV2('lunarunes'),
  list:scopeHrefV2('lunarunes','list'),
  single:scopeHrefV2('lunarunes','duel/one'),
  daily:scopeHrefV2('lunarunes','duel/daily'),
  two:scopeHrefV2('lunarunes','duel/two'),
  three:scopeHrefV2('lunarunes','duel/three'),
  five:scopeHrefV2('lunarunes','duel/five'),
  ow3gs:scopeHrefV2('lunarunes','duel/ow3gs'),
  statics:featureHrefV2('lunarunes','statics'),
  governance:featureHrefV2('lunarunes','governance')
});

const MODEL_MODULES=[
  {
    key:'runes', name:'LunaRunes', zh:'月之符文', summary:'籤詩系統',
    detail:'月之符文作提供固定符文資料、組合語法與可追溯的語意參照',
    href:RUNES_LINKS.home, depth:'deep'
  },
  {
    key:'context', name:'Context', zh:'脈絡', summary:'關係圖',
    detail:'整理事件、作品、來源與既有關係，讓文字與資料可以沿來源與關係被查找、比較與理解。',
    href:'/context', depth:'deep'
  },
  {
    key:'music', name:'Music', zh:'音樂', summary:'Suno 音樂與歌詞',
    detail:'保存Suno音樂作品、歌詞、曲風、時期與來源，讓聲音作品能與文字、事件及其他資料建立脈絡。',
    href:'/music'
  },
  {
    key:'literary', name:'Literary', zh:'文字創作', summary:'文字創作',
    detail:'整理文章、文學與其他文字創作，保留原文、版本、來源與衍生分析之間的差異。',
    href:'/literary'
  },
  {
    key:'media', name:'Multimedia', zh:'多媒體', summary:'多媒體內容',
    detail:'連結圖像、影音與其他媒體來源，觀察同一語意在不同媒介中的表達與轉譯。',
    href:'/multimedia'
  },
  {
    key:'algorithm', name:'Algorithm', zh:'演算法', summary:'方法論與演算法集合',
    detail:'把既有方法論整併成可重現的演算法，用於分類、比較、搜尋、關係運算與其他語言處理。',
    href:'/algorithm', depth:'deep'
  },
  {
    key:'module', name:'Module', zh:'模組', summary:'獨立功能封裝',
    detail:'將演算法與資料結合成為可重複使用的模組，例如搜尋、Graph 與時間資料的共通功能。',
    href:'/module', depth:'deep'
  },
  {
    key:'culture', name:'Culture', zh:'文化', summary:'時間長河',
    detail:'把文字與脈絡放回時間長河內，觀察趨勢，或是因外在造成的擺盪，並且找出文字演化的可能。',
    href:'/culture', depth:'deep'
  }
];

export default function AboutView(){
  return <section className="loc-view loc-home">
    <header className="loc-hero scope-home-hero-with-visual">
      <div className="scope-home-hero-copy">
        <p className="loc-eyebrow">LOC (Language Architecture Framework)</p>
        <div className="home-title-row">
          <h1>LOC月典</h1>
          <p className="loc-subtitle">以 3D 語言空間與時間維度，整理、搜尋並呈現語言建築。</p>
        </div>
        <div className="loc-hero-copy">
          <p>以微月光為鑑，即為月典(LOC,Luna Codex)，</p>
		  <p>用於分析整理，顯示在時間長河內，文字發光的作品。</p>
          <p>當微光慢慢集中變亮，你也將綻放屬於自己的光芒。</p>
        </div>
      </div>
      <figure className="home-hero-visual scope-home-hero-visual">
        <img src="/pics/LOC-PicAll.png" alt="LOC 月典模型化語言框架視覺理念圖" loading="eager" />
      </figure>
    </header>

    <section className="loc-card home-copy-block home-beginner" id="beginner">
      <div className="home-section-heading">
        <p className="loc-eyebrow">Start here</p><h2>新手上路</h2>
        <p className="loc-subtitle">不知道怎麼開始沒關係，就抽張牌吧！</p>
      </div>
      <div className="home-rune-layout">
        <div className="home-author-copy">
		<p>月典，是一套用來分析的語言建構框架。始於月之符文。</p>
		<p>月之符文(LunaRunes)是個具有獨特方式的符號型語言。與月典相輔相成。</p>
		<br/>
          <p>太複雜了！當然可以不用管月之符文是什麼，<a href={RUNES_LINKS.single}>抽了就知道！</a></p>
		  <p>可以是問事，可以是決定當日生活主題風格的<a href={RUNES_LINKS.daily}>每日符文</a>。</p>
          <p>抽到之後再看當下的文字、方向與說明就可以；想多了解一點，再慢慢往下看。</p>
          <p>你也可以完全不抽牌，直接跳過，</p>
		  <p>或來看<a href="/statics/">統計資料與脈絡關係圖</a>、<a href="/culture/">文化的時間長河</a>等，</p>
		  <p>或是看看<a href="/faq/">FAQ</a>，或直接搜尋自己有興趣的文字與資料。</p>
          <p><strong>那就開始吧！</strong></p>
        </div>
        <figure className="home-framework-figure"><img src="/pics/LunaRunes.jpg" alt="LunaRunes 月之符文" loading="lazy" /></figure>
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

    <section className="loc-card home-framework" id="framework-map">
      <div className="home-section-heading"><p className="loc-eyebrow">LOC Model Architecture</p><h2>LOC模型架構</h2><p className="loc-subtitle">LOC八個功能架構依資料、處理與組合關係協作。</p></div>
      <div className="home-framework-stage" aria-label="LOC 八個功能模組架構"><ModelArchitectureExplorer modules={MODEL_MODULES} /><div className="model-relationship" aria-label="架構關係"><span>語彙與表達資料</span><b aria-hidden="true">→</b><span>脈絡與方法處理</span><b aria-hidden="true">↔</b><span>演算法與模組組合</span><b aria-hidden="true">→</b><span>文化時間演變</span></div></div>
    </section>

    <section className="loc-card home-copy-block home-skills" id="skills">
      <div className="home-section-heading"><p className="loc-eyebrow">LOC GPT Skills</p><h2>Skills</h2><p className="loc-subtitle">把月典延伸可以重複使用的工作流程。<br/>把語言治理與治理資料儲存庫，封裝成可直接調用的 AI Skills。</p></div>
      <div className="home-author-copy"><p><strong>loc-km-governance</strong>：檢查 Canon、KM、FAQ、Registry、Base66、術語一致性、資料權威。</p><p><strong>loc-repo-health-check</strong>：檢查儲存庫結構、路徑、API／搜尋、部署與效能風險等。</p><p>Skills 不是另一套理論，而是把 LOC 已形成的治理管理理念跟方法，轉成GPT可以重複執行的工作流程。</p><div className="loc-actions"><a className="loc-button primary" href="/LOC-GPT-Skills-v1.0.0-bundle.zip">下載 LOC GPT Skills v1.0.0</a></div></div>

    </section>

    <section className="loc-card home-author-words" id="author-words">
      <div className="home-section-heading"><p className="loc-eyebrow">About me</p><h2>作者的話</h2><p className="loc-subtitle">整理治理過去的已知，是為了把時間還給現在，對未知的未來做好準備。</p></div>
      <div className="home-about-layout"><div className="home-author-copy"><p>
	  文字資料經過基本解析以後，分析出關鍵詞。</p><p><br/>
將關鍵詞整理分類以後，並配合時間線的可能風格變化，進一步解析成為該區間內的風格。</p><p><br/>

人總會因為各種狀況導致風格突變，例如當兵，例如車禍意外等等。</p><p>
但每個人總是世界上獨一無二的人，這些風格都應該被紀錄。</p><p>
而也都是很正常的變化，並非空穴來風或是天外飛來一筆的改變。</p><p><br/>

改變總是循序漸進，從文字可見一斑。</p><p><br/>

LOC為4D語言解析框架，將文字語言除了以語彙、關鍵詞、時間進行解析統合風格，</p><p>
並納入沒有文字紀錄的多媒體延伸。</p><p><br/>

語言本質是用於紀錄時間跟傳達文字所不能表述的各項訊息，例如情緒，例如讚嘆。</p><p>
就算文字紀錄再多，也不能忘記人類本質。</p><p>
除了舊有的文化，更應該將新興的多媒體納入紀錄的範圍。</p><p><br/>

其實做整套架構，本來只是用於自己總數三百多萬中文字作品的展示整理，</p><p>
不自覺的整理出了兩項東西，一套是歸納的系統架構論LOC，</p><p>
一套是有點偏神秘學的符文。</p><p><br/>

我的原則：</p><p>
敬畏未知，尊重異者，專業為先。</p><p><br/>

立於無限減一的謙遜，但要有無限減一的專業。</p><p>
保有探索未知的好奇，尊重無限未知的領域，進而才能學習到更多的知識。</p><p><br/>
</p><p> 2026.09.26.</p>
	  </div><figure className="home-about-figure"><img src="/pics/aboutme.png?v=20260914" alt="作者 Lucas Oscar Wang 政德" loading="eager" decoding="async" /></figure></div>
    </section>
  </section>;
}
