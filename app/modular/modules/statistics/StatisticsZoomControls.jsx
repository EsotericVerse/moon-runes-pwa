'use client';

// A chart-side zoom rail, not a member of the graph/options toolbar.
// The time range is announced accessibly and is already visible in the
// statistics summary. Keep these controls attached to the chart itself.
export default function StatisticsZoomControls({level=0,onChange,range={},children}){
  return <div className="scope-stat-chart-with-zoom">
    <div className="scope-stat-chart-plot">{children}</div>
    <div className="scope-stat-zoom-rail" role="group" aria-label="時間縮放">
      <span className="scope-stat-zoom-range" aria-live="polite">
        {range.startDate&&range.endDate?range.startDate+' ～ '+range.endDate:'尚無可用日期'}
        {range.fullHistory?' · 全部資料':''}
      </span>
      <button id="loc-stat-zoom-out" type="button" className="loc-button"
        aria-label="擴大觀察範圍" title="擴大觀察範圍"
        disabled={!range.canZoomOut} onClick={()=>onChange?.(level-1)}>－</button>
      <button id="loc-stat-zoom-in" type="button" className="loc-button"
        aria-label="縮小觀察範圍" title="縮小觀察範圍"
        disabled={!range.canZoomIn} onClick={()=>onChange?.(level+1)}>＋</button>
    </div>
  </div>;
}
