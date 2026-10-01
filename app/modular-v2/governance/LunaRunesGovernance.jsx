export const LUNARUNES_GOVERNANCE_SUBTITLE='說明月之符文的使用原則、恆定定義、權利與管理方式。';

export default function LunaRunesGovernance({canEdit=false}){
  return <>
    <div className="loc-grid two">
      <section className="loc-card" id="principles">
        <h2>使用原則</h2>
        <p>月之符文，是一套符號式語言宇宙。</p>
        <p><strong>符文名稱與定義永遠恆定。</strong></p>
        <div className="loc-context-list">
          <p><strong>靈魂 Soul（1–8）：</strong>靈 Spirit · 魂 Soul · 彩 Spectrum · 憶 Memory · 界 Boundary · 域 Domain · 鏡 Mirror · 核 Core</p>
          <p><strong>連結 Link（9–16）：</strong>向 Path · 斷 Sever · 封 Seal · 鍊 Chain · 啟 Awaken · 分 Separation · 悟 Insight · 誤 Error</p>
          <p><strong>生命 Life（17–24）：</strong>生 Birth · 老 Aging · 病 Illness · 死 Death · 心 Heart · 愛 Love · 語 Language · 韻 Resonance</p>
          <p><strong>自然 Nature（25–32）：</strong>樹 Tree · 花 Blossom · 葉 Leaf · 草 Grass · 根 Root · 種 Seed · 實 Fruit · 枝 Branch</p>
          <p><strong>礦物 Mineral（33–40）：</strong>金 Gold · 玉 Jade · 晶 Crystal · 地 Land · 石 Stone · 鑽 Diamond · 礦 Ore · 塵 Dust</p>
          <p><strong>元素 Element（41–48）：</strong>光 Radiance · 暗 Shadow · 水 Water · 火 Flame · 風 Wind · 土 Earth · 雷 Thunder · 氣 Air</p>
          <p><strong>秩序 Order（49–56）：</strong>日 Sun · 月 Moon · 星 Star · 辰 Phase · 明 Clarity · 時 Time · 空 Space · 因 Reason</p>
          <p><strong>無序 Disorder（57–64）：</strong>福 Blessing · 禍 Calamity · 無 Blank · 夢 Dream · 幻 Illusion · 緣 Karma · 虛 Void · 果 Result</p>
          <p><strong>特殊 Special：</strong>65 玄 Chaos · 66 命 Fate · 0 德 Virtue</p>
        </div>
      </section>
      <section className="loc-card" id="neutrality">
        <h2>使用邊界</h2>
        <p>抽牌、籤詩與解牌內容只供參考，不是命令，也不是唯一答案。</p>
        <p>系統協助整理當下的符號、文字與可能脈絡，但不替使用者決定身份、價值判斷或下一步行動。最後的判斷與選擇仍由使用者自己決定。</p>
      </section>
    </div>
    <section className="loc-card" id="rights">
      <h2>著作權與授權</h2>
      <p>月之符文的符文體系設計、核心語彙、規則結構、原創文字、籤詩產生系統、解牌結構與相關原創內容受著作權保護。</p>
      <p>引用、改作、衍生、再利用與商業使用，依月之符文自己的治理規則與作者明示授權處理。</p>
      <p>未經明示授權，不因公開展示、研究、使用或衍生討論而取得核心語言系統的所有權或其他未授予權利。</p>
    </section>
    <section className="loc-card" id="core-buyout">
      <h2>核心買斷原則</h2>
      <p>LunaRunes 的核心語言系統不出售。</p>
      <p>若必須為其完整永久買斷指定一個有限價格，則以 LunaRunes 本身的完整變化空間作為定義：</p>
      <p><strong>66! × 4⁶⁶</strong></p>
      <p>即：66 張符文全部有序抽取，並計入每張符文的四向狀態。</p>
      <p>不另行換算，不提供折價，也不以一般市場估值取代此原則。</p>
      <p>LunaRunes 可以被使用、研究、延伸與創作；核心所有權，你買得起就買看看，我出價過了。</p>
    </section>
  </>;
}
