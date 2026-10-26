// View model for the first Culture Time river.
// Y axis: time_trace, expanded time_period children.
// X axis: actual anchor.address dates only. Trace rows show separate
// event intervals; expanded child rows show the real endpoint anchor points.
// Neither a single anchor nor multiple disjoint events imply an open range.
const text=value=>String(value||'').trim();
const list=value=>Array.isArray(value)?value:[];
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(text(value).slice(0,10));
const uniqueByUid=rows=>{
  const byUid=new Map();
  for(const row of list(rows)){
    const key=text(row?.scope_id)+':'+text(row?.uid);
    if(row?.uid&&!byUid.has(key))byUid.set(key,row);
  }
  return [...byUid.values()];
};
export function buildTimeTraceRiver(source=[],expandedTraceIds=[]){
  const traces=uniqueByUid(source.filter(row=>row?.entry_type==='period'));
  const events=new Map(uniqueByUid(source.filter(row=>row?.entry_type==='event'))
    .map(row=>[text(row.scope_id)+':'+text(row.uid),row]));
  const anchors=new Map(uniqueByUid(source.filter(row=>row?.entry_type==='anchor'))
    .map(row=>[text(row.scope_id)+':'+text(row.uid),row]));
  const expanded=new Set(list(expandedTraceIds).map(text));
  const items=[],groups=[];
  for(const [traceIndex,trace] of traces.entries()){
    const scope=text(trace.scope_id),id=text(trace.uid);
    const groupId='trace:'+scope+':'+id;
    const isExpanded=expanded.has(groupId);
    const eventIds=list(trace.anchor_ids).map(text).filter(Boolean);
    groups.push({id:groupId,label:text(trace.title)||'時間痕跡 '+id,
      collapsible:true,expanded:isExpanded,order:traceIndex*10000,
      className:'scope-time-trace-parent'});
    const seenEvents=new Set();
    for(const [position,eventId] of eventIds.entries()){
      // A repeated link is a single event, not duplicated work/density.
      if(seenEvents.has(eventId))continue;
      seenEvents.add(eventId);
      const event=events.get(scope+':'+eventId);
      const eventGroup='trace-event:'+scope+':'+id+':'+eventId;
      if(isExpanded)groups.push({id:eventGroup,order:traceIndex*10000+position+1,
        label:'事件｜'+(event?.title||'失效連線 '+eventId),
        className:'scope-time-trace-child'});
      if(!event)continue;
      const slices=list(event.ranges);
      for(const [segment,range] of slices.entries()){
        const from=text(range?.start_date).slice(0,10);
        if(!validDate(from))continue;
        const until=text(range?.end_date).slice(0,10);
        const validEnd=validDate(until)&&until>from&&!range.invalid;
        // Main trace lane uses only the true event interval, never an
        // envelope spanning different events and never a fake now endpoint.
        items.push({id:groupId+':'+eventId+':'+segment+':period',
          uid:event.uid,scope_id:scope,entry_type:'event',
          group_key:groupId,group_label:trace.title,
          start_date:from,...(validEnd?{end_date:until}:{}),
          display_label:event.title||eventId,title:event.title||eventId,
          description:event.summary||event.description||'',
          time_trace_uid:id,time_period_uid:eventId,
          invalid_anchor_links:range.missing_anchor_ids||[],
          group_order:traceIndex*10000,
          ...(range.invalid?{class_name:'scope-time-trace-broken'}:{})});
        if(!isExpanded)continue;
        const references=[range.start_anchor_id,range.end_anchor_id]
          .filter(Boolean).map(text);
        const seenAnchors=new Set();
        for(const anchorId of references){
          if(seenAnchors.has(anchorId))continue;
          seenAnchors.add(anchorId);
          const anchor=anchors.get(scope+':'+anchorId);
          const date=text(anchor?.start_date).slice(0,10);
          if(!validDate(date))continue;
          items.push({id:eventGroup+':'+segment+':'+anchorId,
            uid:anchor.uid,scope_id:scope,entry_type:'anchor',
            group_key:eventGroup,group_label:event.title,
            start_date:date,display_label:anchor.title||anchorId,
            title:anchor.title||anchorId,
            description:anchor.summary||anchor.description||'',
            time_trace_uid:id,time_period_uid:eventId,
            group_order:traceIndex*10000+position+1});
        }
      }
    }
  }
  return {items,groups};
}
