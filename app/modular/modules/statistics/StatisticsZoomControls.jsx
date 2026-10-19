'use client';
import {useUiLocale} from '../../../i18n/ui-locale';
import {translateUiField} from '../../../i18n/ui-copy';

// Chart-side zoom only: no time-unit menu or date-picker. Range is read-only
// via accessible button titles. The default is the latest year.
export default function StatisticsZoomControls({level=0,onChange,range={},idPrefix='loc-stat'}){
  const {locale}=useUiLocale();
  const t=x=>translateUiField(locale,x);
  const period=range.startDate&&range.endDate
    ?range.startDate+' ～ '+range.endDate+(range.fullHistory?'（全部資料）':'')
    :'尚無可用日期';
  return <div className="scope-stat-zoom-rail" role="group" aria-label={t('圖表時間縮放')}>
    <button id={idPrefix+'-zoom-in'} type="button" className="loc-button"
      aria-label={t('縮小觀察範圍')} title={t('縮小觀察範圍')+' · '+period}
      disabled={!range.canZoomIn} onClick={()=>onChange?.(level+1)}>＋</button>
    <button id={idPrefix+'-zoom-out'} type="button" className="loc-button"
      aria-label={t('擴大觀察範圍')} title={t('擴大觀察範圍')+' · '+period}
      disabled={!range.canZoomOut} onClick={()=>onChange?.(level-1)}>－</button>
  </div>;
}
