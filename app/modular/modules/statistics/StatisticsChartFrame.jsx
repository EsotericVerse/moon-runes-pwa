'use client';

import StatisticsZoomControls from './StatisticsZoomControls';

// Shared chart-side layout for LOC, Scope statistics, intersections and the
// standalone Daily Rune statistics. Never place zoom in the option toolbar.
export default function StatisticsChartFrame({children,level=0,onChange,range={},idPrefix='loc-stat'}){
  return <div className="scope-stat-chart-frame">
    <div className="scope-stat-chart-frame__canvas">{children}</div>
    <StatisticsZoomControls level={level} onChange={onChange} range={range} idPrefix={idPrefix}/>
  </div>;
}
