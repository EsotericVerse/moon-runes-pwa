import {timePeriodContainsDate} from './time-anchor-ranges.mjs';
// Select the first-river camera from true Time records without inventing an end anchor.
// This is a pure presentation rule. Periods and independent anchors retain native IDs.
// An independent anchor may sit outside every Period. Only the last anchor
// determines the unclassified fallback window; never infer a saved end anchor.
export function structurePeriodPreference(periods=[],items=[]){
  const anchors=items.filter(item=>item?.entry_type==='anchor'&&/^\d{4}-\d{2}-\d{2}$/.test(String(item?.start_date||'')))
    .sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
  const lastAnchor=anchors.at(-1)||null;
  const date=String(lastAnchor?.start_date||'');
  // A disjoint period contains a date only when one actual saved interval does.
  // The envelope between its first and last anchor is NOT a continuous period.
  const containing=date?[...periods].reverse().find(item=>{
    if(Array.isArray(item.ranges))return timePeriodContainsDate(item,date,{today:date});
    // Backward-compatible presentation for legacy callers/tests with no
    // segments. Canonical SQL Time rows always provide actual anchor ranges.
    const start=String(item.start_date||''),end=String(item.end_date||'');
    return Boolean(start&&start<=date&&(!end||date<=end));
  }):null;
  const fallback=!lastAnchor?([...periods].reverse().find(item=>
    item.open_end&&item.ranges?.some(range=>range.open_end&&range.start_date))||periods.at(-1)):null;
  return {lastAnchor,preferredKey:containing||fallback?String((containing||fallback)?.period||(containing||fallback)?.era_id||(containing||fallback)?.id||'').trim():lastAnchor?'after':'all'};
}
