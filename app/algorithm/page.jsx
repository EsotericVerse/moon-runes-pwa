import { ScopeCardV2 } from '../modular-v2/PageShellV2';
import FeaturePageV2 from '../modular-v2/FeaturePageV2';

export const metadata = { title: '符文解牌原理｜月之符文' };

const sections = [
  { title: '全域', model: '詞彙層 → 卡片位置層 → 治理層 → 時間修飾層', note: '後層時間的月相交互只作修飾，不覆蓋符文本義。' },
  { title: '單卡', model: '符文本義＋卡牌方向＋月相交互', note: '月相交互只作低權重時間修飾。' },
  { title: '兩卡', model: '因＋果＋月相交互', note: '交互描述兩個主題因果如何作用，不單獨決定吉凶。' },
  { title: '三卡', model: '源（因）＋轉（意外因素）＋合（果）＋月相交互', note: '形成「源起、變因、顯化」的完整圖景。源回答事情從何而起；轉回答事情如何轉化；合是結果顯化、整合方向與當下建議，不是絕對宿命判決。' },
  { title: '五卡', model: '兩張過去成因＋一個意外變化＋兩張現在狀況＋月相交互', note: '不是兩卡＋三卡的拼接，是雙卡＋單卡＋雙卡的組合。過去成因與現在狀況由雙卡組合而成；意外變化由單卡告知，一個因素就足夠；月相交互列於最後作小修正。' },
  { title: 'OW3gs', model: '1–6 因的描述層＋7–11 果的判定層＋月相交互', note: '十一張牌不是等權並列。1–6 為源兩張、轉兩張、合兩張，分析產生問題的可能狀態；7–11 使用五卡基本規則，作為結果與建議的判定層。讀取順序是先成因分析，再判斷分析，最後套月相交互；治理原則分成兩個模型，鑑古知今。' },
  { title: '符文交互', model: '治理解牌方式：共鳴、互補、衝突與語氣張力', note: '月符沙盒專用，符文關係為平等，不以單一符文壓過另一個符文。' },
  { title: '月相交互', model: '卡片月相與真實月相的交互作用', note: '真實月相是低權重時間情境修飾，可能使語氣稍強或稍弱，不覆蓋符文本義。' },
  { title: '例外解說', model: '延伸語意不取代基本語意', note: '抽到花卡與枝卡，不是該吃花枝；四卡連續可稱為「鏡花水月」；水土可先理解為地方，再延伸到地之符文。這些是語意延伸與趣味解說，不是強制判定。' }
];

export default function RuneAlgorithmPage() {
  return <main className="loc-next-main"><FeaturePageV2 featureId="governance" subtitle="月之符文固定的解牌模型與閱讀原理。">
    <ScopeCardV2 eyebrow="Rune Algorithm" title="符文解牌原理">
      <p>符文本義先於卡片位置，卡片位置再形成組合模型；月相只作低權重的時間修飾，不覆蓋符文本義，也不單獨決定吉凶。</p>
    </ScopeCardV2>
    {sections.map(section => <ScopeCardV2 key={section.title} eyebrow="Rune Algorithm" title={section.title}>
      <p><strong>{section.model}</strong></p>
      <p>{section.note}</p>
    </ScopeCardV2>)}
  </FeaturePageV2></main>;
}
