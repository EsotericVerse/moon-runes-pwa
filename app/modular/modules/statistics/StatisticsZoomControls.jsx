'use client';

import {STATISTICS_ZOOM_LEVELS,statisticsZoomLevel} from './statistics-time-zoom.mjs';

// Date presets are deliberately absent: zoom is the sole time-window control.
export default function StatisticsZoomControls({level=0,onChange,range={},onEndDateChange}){
  const index=statisticsZoomLevel(level),config=STATISTICS_ZOOM_LEVELS[index];
  return <div className="scope-stat-controls" role="group" aria-label="時間縮放">
    <span className="scope-status" aria-live="polite">
      {range.startDate&&range.endDate?range.startDate+' ～ '+range.endDate:'尚無可用日期'}
      {' · '}觀察{config.label} · 依{config.bucket==='month'?'月':config.bucket==='week'?'週':'日'}統計
    </span>
    <button type="button" className="loc-button" aria-label="縮小時間範圍" title="縮小時間範圍"
      disabled={index===0} onClick={()=>onChange?.(index-1)}>－</button>
    <button type="button" className="loc-button" aria-label="放大時間範圍" title="放大時間範圍"
      disabled={index===STATISTICS_ZOOM_LEVELS.length-1} onClick={()=>onChange?.(index+1)}>＋</button>
    {onEndDateChange?<details>
      <summary>定位歷史日期</summary>
      <label>觀察截止日
        <input className="scope-input" type="date" value={range.endDate||''}
          onChange={event=>onEndDateChange(event.target.value)}/>
      </label>
    </details>:null}
  </div>;
}
