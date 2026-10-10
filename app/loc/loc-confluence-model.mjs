// LOC read-only confluence of two independent sources:
// LunaRunes daily draws and the author's published Galaxy/Galaxy Media works.
const KIND_LABELS=Object.freeze({
  main:'主抽',supplement:'補抽',history_1:'歷史紀錄一',history_2:'歷史紀錄二'
});
const KIND_ORDER=Object.freeze({main:0,supplement:1,history_1:2,history_2:3});
export const LOC_CONFLUENCE_PAGE_SIZE=20;
export function confluenceDay(value){return String(value||'').slice(0,10);}
export function confluenceNextDay(value){
  const date=new Date(confluenceDay(value)+'T00:00:00Z');
  if(Number.isNaN(date.getTime()))return '';
  date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString().slice(0,10);
}
export function confluenceDrawLabel(draw){
  return [KIND_LABELS[draw.draw_kind]||draw.draw_kind||'歷史紀錄',
    draw.rune_name||String(draw.rune_number||''),draw.direction,draw.phase].filter(Boolean).join(' · ');
}
export function sortConfluenceDraws(draws=[]){
  return [...draws].sort((a,b)=>
    confluenceDay(b.record_date).localeCompare(confluenceDay(a.record_date))||
    (KIND_ORDER[a.draw_kind]??9)-(KIND_ORDER[b.draw_kind]??9)||
    Number(a.rune_number)-Number(b.rune_number)
  );
}
export function buildLocConfluenceRiver({draws=[],distribution=[],anchors=[],startDate='',endDate=''}={}){
  const within=date=>date&&(!startDate||date>=startDate)&&(!endDate||date<=endDate);
  const runesByDay=new Map();
  for(const draw of draws){
    const date=confluenceDay(draw.record_date);
    if(!within(date))continue;
    if(!runesByDay.has(date))runesByDay.set(date,[]);
    runesByDay.get(date).push(draw);
  }
  const runeItems=[...runesByDay.entries()].map(([date,values])=>{
    const ordered=sortConfluenceDraws(values);
    const text=ordered.map(confluenceDrawLabel).join('／');
    return {
      id:'loc-confluence:runes:'+date,
      entry_id:'loc-confluence:runes:'+date,
      entry_type:'loc_daily_runes',
      start_date:date,
      group_key:'loc-confluence:runes',
      group_label:'符韻 · 每日符文',
      group_order:1,
      display_label:'●',
      title:date+' · '+text,
      daily_draws:ordered,
      item_count:0
    };
  });
  const workItems=distribution.filter(row=>
    String(row?.scope_id)==='lo3rwang'&&within(confluenceDay(row?.start_date))
  ).map(row=>{
    const date=confluenceDay(row.start_date);
    return {
      id:'loc-confluence:works:'+date,
      entry_id:'loc-confluence:works:'+date,
      entry_type:'loc_personal_works_density',
      start_date:date,
      end_date:confluenceNextDay(date),
      group_key:'loc-confluence:works',
      group_label:'個人 · 作品與媒體',
      group_order:2,
      item_count:Number(row.item_count)||0,
      density_ratio:Math.min(1,(Number(row.item_count)||0)/10),
      display_label:'',
      title:date+' · 個人作品／媒體 '+Number(row.item_count||0)+' 項'
    };
  });
  const anchorItems=anchors.filter(row=>
    row?.entry_type==='anchor'&&within(confluenceDay(row?.start_date))&&
    ['lrunes','lo3rwang'].includes(String(row?.scope_id||''))
  ).map((row,index)=>{
    const date=confluenceDay(row.start_date);
    const drawn=runesByDay.get(date)||[];
    const detail=drawn.map(confluenceDrawLabel).join('／');
    const owner=row.scope_id==='lrunes'?'符韻':'個人';
    const name=String(row.display_label||row.title||'正式定錨點');
    return {
      id:'loc-confluence:anchor:'+row.scope_id+':'+String(row.record_id||row.id||index),
      entry_id:'loc-confluence:anchor:'+row.scope_id+':'+String(row.record_id||row.id||index),
      entry_type:'loc_confluence_anchor',
      start_date:date,
      group_key:'loc-confluence:anchors',
      group_label:'雙方 · 定錨點',
      group_order:0,
      display_label:'◆ '+name+(detail?'｜'+detail:''),
      title:date+' · '+owner+'定錨：'+name+(detail?' · 當日符文：'+detail:''),
      item_count:0
    };
  });
  return [...anchorItems,...runeItems,...workItems].sort((a,b)=>
    a.start_date.localeCompare(b.start_date)||a.group_order-b.group_order
  );
}
export function confluenceRuneListRows(draws=[]){
  return sortConfluenceDraws(draws).map((draw,index)=>({
    key:'rune:'+draw.record_date+':'+draw.draw_kind+':'+draw.rune_number+':'+index,
    entry_type:'loc_daily_rune',
    record_date:draw.record_date,
    date:confluenceDay(draw.record_date),
    scope_id:'lrunes',
    title:confluenceDrawLabel(draw),
    description:draw.phase_inferred?'月相依抽取日期推算':'',
    draw
  }));
}
export function confluenceWorkListRow(work){
  return {
    ...work,
    key:'author:'+String(work.key||work.entry_id||work.uid||''),
    date:confluenceDay(work.createtime||work.start_date||work.date),
    scope_id:'lo3rwang'
  };
}
export function confluenceRowDate(row){
  return confluenceDay(row?.date||row?.record_date||row?.createtime||row?.start_date);
}
