'use client';

import {useQuery} from '@tanstack/react-query';
import {selectHomeMetricSnapshots} from '../neon-metric-snapshots';

const METRIC_KEYS=Object.freeze(['text_characters','data_units']);

function formatValue(value){
  const number=Number(value);
  return Number.isFinite(number)?new Intl.NumberFormat('zh-Hant').format(number):'—';
}

export default function HomeMetricsV2({scopeId='loc'}){
  const query=useQuery({
    queryKey:['home-metric-snapshots',scopeId,METRIC_KEYS],
    queryFn:()=>selectHomeMetricSnapshots(scopeId),
    staleTime:60_000,
    retry:1
  });
  const byKey=new Map((query.data||[]).map(row=>[row.metric_key,row]));
  const text=byKey.get('text_characters');
  const units=byKey.get('data_units');

  return <div className="home-progress-grid" aria-label="即時資料概況">
    <article className="home-progress-item">
      <strong>目前文字總量</strong>
      <span>{formatValue(text?.metric_value)} 字，涵蓋文章、小說章節、歌詞與其他可搜尋文字紀錄。</span>
    </article>
    <article className="home-progress-item">
      <strong>資料規模</strong>
      <span>{formatValue(units?.metric_value)} 個可整理資料單位；依內容類型使用篇、章、首等自然單位。</span>
    </article>
  </div>;
}
