// Density is only a COUNT of articles associated with displayed Point UIDs.
// No route topology, article list or point order is needed.
const UID=/^[A-Za-z0-9]{8}$/;
export function pointDensityGroups(anchors=[]){
  const groups=new Map();
  for(const point of anchors||[]){
    const members=Array.isArray(point.members)&&point.members.length?point.members:[point];
    for(const member of members){
      const scope=String(member.source_scope||point.source_scope||'');
      const uid=String(member.uid||'');
      if(!/^[a-z][a-z0-9]{0,14}$/.test(scope)||!UID.test(uid))continue;
      if(!groups.has(scope))groups.set(scope,new Set());
      groups.get(scope).add(uid);
    }
  }
  return [...groups].map(([scope,ids])=>({scope,ids:[...ids].sort()}));
}
export function pointHaloCounts(anchors=[],rows=[]){
  const counts=new Map();
  for(const row of rows||[]){
    const scope=String(row.source_scope||''),uid=String(row.category||'');
    const n=Number(row.item_count);
    if(!Number.isFinite(n)||n<=0)continue;
    const key=scope+':'+uid;
    counts.set(key,(counts.get(key)||0)+n);
  }
  return (anchors||[]).map(point=>{
    const members=Array.isArray(point.members)&&point.members.length?point.members:[point];
    const seen=new Set();
    const count=members.reduce((sum,member)=>{
      const key=String(member.source_scope||point.source_scope||'')+':'+String(member.uid||'');
      if(seen.has(key))return sum;
      seen.add(key);
      return sum+(counts.get(key)||0);
    },0);
    return {uid:String(point.uid||''),source_scope:String(point.source_scope||''),count};
  }).filter(row=>row.uid&&row.count>0);
}
const formatDay=ms=>{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',
    year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(ms);
  const get=type=>parts.find(part=>part.type===type)?.value||'';
  return get('year')+'-'+get('month')+'-'+get('day');
};
export function traceDensityDates(period='12m',start='',end='',now=new Date()){
  const endDay=formatDay(now);
  if(period==='all')return {start:null,end:null,valid:true};
  if(period==='custom'){
    const valid=/^\d{4}-\d{2}-\d{2}$/.test(start)&&
      /^\d{4}-\d{2}-\d{2}$/.test(end)&&
      !Number.isNaN(Date.parse(start))&&!Number.isNaN(Date.parse(end))&&start<=end;
    return {start:start||null,end:end||null,valid};
  }
  const from=new Date(endDay+'T00:00:00Z');
  from.setUTCMonth(from.getUTCMonth()-(period==='3m'?3:12));
  return {start:formatDay(from),end:endDay,valid:true};
}
