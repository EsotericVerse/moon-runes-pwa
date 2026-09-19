import { ScopeCardV2 } from '../modular-v2/PageShellV2';
import FeaturePageV2 from '../modular-v2/FeaturePageV2';

export const metadata = { title: '符文解牌原理｜月之符文' };

const sections = [
  ['全域', '詞彙層 → 卡片位置層 → 時間修飾層', '後層時間的月相交互只作修飾，不覆蓋符文本義。'],
  ['單卡', '符文本義＋卡牌方向＋月相交互', '月相交互只作低權重時間修飾。'],
  ['兩卡', '因＋果＋月相交互', '交互描述兩個主題因果如何作用，不單獨決定吉凶。'],
  ['三卡', '源（因）＋轉（意外因素）＋合（果）＋月相交互', '形成源起、變因、顯化的完整圖景。'],
  ['五卡', '兩張過去成因＋一個意外變化＋兩張現在狀況＋月相交互', '不是兩卡與三卡的拼接，而是雙卡＋單卡＋雙卡的組合。'],
  ['OW3gs', '1–6 因的描述層＋7–11 果的判定層＋月相交互', '十一張牌不是等權並列；先讀成因分析，再讀判斷分析，最後套月相交互。'],
  ['符文交互', '描述兩個符文語義主題的共鳴、互補、衝突與語氣張力', '月符沙盒專用，符文關係為平等。'],
  ['月相交互', '卡片月相與真實月相的交互作用', '真實月相是低權重的時間情境修飾。']
];

export default function RuneAlgorithmPage() {
  return <main className="loc-next-main"><FeaturePageV2 featureId="governance" subtitle="月之符文目前使用的解牌模型與閱讀原理。">
    {sections.map(([title, model, note]) => <ScopeCardV2 key={title} eyebrow="Rune Algorithm" title={title}><p><strong>{model}</strong></p><p>{note}</p></ScopeCardV2>)}
  </FeaturePageV2></main>;
}
