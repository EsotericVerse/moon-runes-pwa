// LOC publishes both saved routes and trace groups; public RLS is enforced
// by readTraceMapIndex before this selection.
export function publicTraceMapChoices(rows=[],scopeId='loc'){
  return (Array.isArray(rows)?rows:[]).filter(row=>
    (row?.trace_type==='space_period'||row?.trace_type==='space_trace')&&
    (scopeId==='loc'||row?.source_scope===scopeId));
}
