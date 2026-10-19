import ContextReturnNav from '../../modular/ContextReturnNav';
import {LrunesDailyStatisticsPanel} from '../../lrunes/DailyRuneAnalytics';
import {lunarunesMetadata} from '../../seo/metadata';

export const metadata=lunarunesMetadata({
  title:'每日符文趨勢｜月之符文',
  description:'依時間區間查看每日符文出現次數、位向趨勢及圖形分析；詳細排行榜依需求展開。',
  path:'/daily/trend/'
});

export default function DailyTrendPage(){
  return <main className="loc-view daily-rune-trend-view">
    <ContextReturnNav scopeId="lrunes" label="回符文首頁"/>
    <header className="loc-hero loc-hero-feature">
      <p className="loc-eyebrow">每日符文統計</p>
      <h1>每日符文趨勢</h1>
      <p>查看符文出現次數及位向變化，選擇時間與圖表類型；詳細列表按需展開。</p>
    </header>
    <section className="loc-card">
      <LrunesDailyStatisticsPanel/>
    </section>
  </main>;
}
