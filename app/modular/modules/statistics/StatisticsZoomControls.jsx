'use client';

// No selectable period type, date fields or preset windows.
// The one-year baseline is automatic; minus goes to all real records.
export default function StatisticsZoomControls({level=0,onChange,range={}}){
  return <div className="scope-stat-controls" role="group" aria-label="時間縮放">
    <span className="scope-status" aria-live="polite">
      {range.startDate&&range.endDate?range.startDate+' ～ '+range.endDate:'尚無可用日期'}
      {range.fullHistory?' · 全部資料':''}
    </span>
    <button type="button" className="loc-button" aria-label="縮小時間範圍" title="擴大觀察區間"
      disabled={!range.canZoomOut} onClick={()=>onChange?.(level-1)}>－</button>
    <button type="button" className="loc-button" aria-label="放大時間範圍" title="縮小觀察區間"
      disabled={!range.canZoomIn} onClick={()=>onChange?.(level+1)}>＋</button>
  </div>;
}
