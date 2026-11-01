// Same-location names must be corroborated; never treat a similar name,
// geographical proximity or a brand name as proof of the same check-in.
const ALIASES=Object.freeze({
  '板橋車站':['板橋車站 (臺灣)','台灣高鐵板橋站 THSR Banqiao Station','高鐵板橋站'],
  '板橋介壽公園':['介壽公園'],
  'World Gym 永和店':['World Gym永和旗艦店','永和world Gym'],
  '臺大醫院':['國立臺灣大學醫學院附設醫院'],
  '高鐵臺南站':['台灣高鐵台南站 THSR Tainan Station'],
  '冬山河親水公園（童玩節）':['冬山河親水公園'],
  '東方工專／東方技術學院（原校址）':['東方工專','東方技術學院','東方設計學院','東方設計大學'],
  '家樂福（三重重新店）':['三重重新店家樂福']
});
function anchorNames(anchor){
  const title=String(anchor?.title||'').trim();
  if(!title)return [];
  const description=String(anchor?.description||'');
  const explicit=[...description.matchAll(/(?:歷史名稱|打卡別名)[：:]\s*([^。\n]+)/g)]
    .flatMap(match=>match[1].split(/[、，,|]/).map(x=>x.trim()));
  return [title,...(ALIASES[title]||[]),...explicit].filter(Boolean);
}
export function traceArticlePlaces(selection,anchors=[]){
  if(!selection?.uid)return [];
  const source=selection.source_scope;
  const selected=selection.trace_type==='map'
    ?(selection.route_list?.segments||selection.anchor_list||[])
      .map(uid=>anchors.find(a=>a.uid===uid&&a.source_scope===source)).filter(Boolean)
    :[selection];
  return [...new Set(selected.flatMap(anchorNames))].slice(0,200);
}