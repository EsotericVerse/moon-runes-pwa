import ScopeEditableBlocks from '../../loc/ScopeEditableBlocks';

export const LUNARUNES_GOVERNANCE_SUBTITLE='說明月之符文的使用原則、恆定符文、著作權與核心所有權原則。';

export default function LunaRunesGovernance({scopeId='lrunes'}){
  return <ScopeEditableBlocks
    scopeId={scopeId}
    page="governance"
    className="loc-grid two governance-grid"
    headingLevel={2}
    fallbackDocuments={[
      [
        {type:'heading',props:{level:2},content:'使用原則與邊界'},
        {type:'paragraph',content:'月之符文，是一套符號式語言宇宙。'},
        {type:'paragraph',content:'符文名稱與定義永遠恆定。'},
        {type:'paragraph',content:'籤詩產生系統的抽牌、籤詩與解牌內容只供參考，不是命令，也不是唯一答案。'},
        {type:'paragraph',content:'月之符文提供的是語言與可能性；如何理解、是否採用，以及下一步如何行動，仍由使用者自己決定。'}
      ],
      [
        {type:'heading',props:{level:2},content:'恆定符文'},
        {type:'paragraph',content:'靈魂 Soul（1–8）：靈 Spirit · 魂 Soul · 彩 Spectrum · 憶 Memory · 界 Boundary · 域 Domain · 鏡 Mirror · 核 Core'},
        {type:'paragraph',content:'連結 Link（9–16）：向 Path · 斷 Sever · 封 Seal · 鍊 Chain · 啟 Awaken · 分 Separation · 悟 Insight · 誤 Error'},
        {type:'paragraph',content:'生命 Life（17–24）：生 Birth · 老 Aging · 病 Illness · 死 Death · 心 Heart · 愛 Love · 語 Language · 韻 Resonance'},
        {type:'paragraph',content:'自然 Nature（25–32）：樹 Tree · 花 Blossom · 葉 Leaf · 草 Grass · 根 Root · 種 Seed · 實 Fruit · 枝 Branch'},
        {type:'paragraph',content:'礦物 Mineral（33–40）：金 Gold · 玉 Jade · 晶 Crystal · 地 Land · 石 Stone · 鑽 Diamond · 礦 Ore · 塵 Dust'},
        {type:'paragraph',content:'元素 Element（41–48）：光 Radiance · 暗 Shadow · 水 Water · 火 Flame · 風 Wind · 土 Earth · 雷 Thunder · 氣 Air'},
        {type:'paragraph',content:'秩序 Order（49–56）：日 Sun · 月 Moon · 星 Star · 辰 Phase · 明 Clarity · 時 Time · 空 Space · 因 Reason'},
        {type:'paragraph',content:'無序 Disorder（57–64）：福 Blessing · 禍 Calamity · 無 Blank · 夢 Dream · 幻 Illusion · 緣 Karma · 虛 Void · 果 Result'},
        {type:'paragraph',content:'特殊 Special：65 玄 Chaos · 66 命 Fate · 0 德 Virtue'}
      ],
      [
        {type:'heading',props:{level:2},content:'著作權與授權'},
        {type:'paragraph',content:'月之符文的符文體系設計、核心語彙、規則結構、原創文字、籤詩產生系統、解牌結構與相關原創內容受著作權保護。'},
        {type:'paragraph',content:'引用、改作、衍生、再利用與商業使用，依月之符文自己的治理規則與作者明示授權處理。'},
        {type:'paragraph',content:'未經明示授權，不因公開展示、研究、使用或衍生討論而取得核心語言系統的所有權或其他未授予權利。'}
      ],
      [
        {type:'heading',props:{level:2},content:'核心買斷原則'},
        {type:'paragraph',content:'LunaRunes 的核心語言系統不出售。'},
        {type:'paragraph',content:'若必須為其完整永久買斷指定一個有限價格，則以 LunaRunes 本身的完整變化空間作為定義：66! × 4⁶⁶。'},
        {type:'paragraph',content:'不另行換算，不提供折價，也不以一般市場估值取代此原則。'},
        {type:'paragraph',content:'LunaRunes 可以被使用、研究、延伸與創作；核心所有權，你買得起就買看看，我出價過了。'}
      ]
    ]}
  />;
}
