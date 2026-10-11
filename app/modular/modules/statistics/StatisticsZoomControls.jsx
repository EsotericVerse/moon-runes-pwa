'use client';

// Chart-side zoom only: no time-unit menu or date-picker. Range is read-only
// via accessible button titles. The default is the latest year.
export default function StatisticsZoomControls({level=0,onChange,range={},idPrefix='loc-stat'}){
  const period=range.startDate&&range.endDate
    ?range.startDate+' ～ '+range.endDate+(range.fullHistory?'（全部資料）':'')
    :'尚無可用日期';
  return <div className="scope-stat-zoom-rail" role="group" aria-label="圖表時間縮放">
    <button id={idPrefix+'-zoom-in'} type="button" className="loc-button"
      aria-label="縮小觀察範圍" title={'縮小觀察範圍 · '+period}
      disabled={!range.canZoomIn} onClick={()=>onChange?.(level+1)}>＋</button>
    <button id={idPrefix+'-zoom-out'} type="button" className="loc-button"
      aria-label="擴大觀察範圍" title={'擴大觀察範圍 · '+period}
      disabled={!range.canZoomOut} onClick={()=>onChange?.(level-1)}>－</button>
  </div>;
}
