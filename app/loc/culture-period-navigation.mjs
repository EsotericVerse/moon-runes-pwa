// Select the first-river camera from true Time records without inventing an end anchor.
// This is a pure presentation rule. Periods and independent anchors retain native IDs.
// An independent anchor may sit outside every Period. Only the last anchor
// determines the unclassified fallback window; never infer a saved end anchor.
export function structurePeriodPreference(periods=[],items=[]){
  const anchors=items.filter(item=>item?.entry_type==='anchor'&&/^\d{4}-\d{2}-\d{2}$/.test(String(item?.start_date||'')))
    .sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)));
  const lastAnchor=anchors.at(-1)||null;
  const date=String(lastAnchor?.start_date||'');
  const containing=date?[...periods].reverse().find(item=>{
    const start=String(item.start_date||'');
    const end=String(item.end_date||'9999-12-31');
    return (!start||start<=date)&&date<=end;
  }):null;
  const fallback=!lastAnchor?([...periods].reverse().find(item=>item.open_end)||periods.at(-1)):null;
  return {lastAnchor,preferredKey:containing||fallback?String((containing||fallback)?.period||(containing||fallback)?.era_id||(containing||fallback)?.id||'').trim():lastAnchor?'after':'all'};
}
