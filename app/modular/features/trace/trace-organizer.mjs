// Pure, read-only grouping rules for the Trace organizer.
// Address evidence is stronger than geographic proximity; proximity alone never merges.
const REGIONS=Object.freeze(['基隆市','臺北市','新北市','桃園市','新竹市','新竹縣','苗栗縣','臺中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','臺南市','高雄市','屏東縣','宜蘭縣','花蓮縣','臺東縣','澎湖縣','金門縣','連江縣']);
const TAIWAN_ALIASES=Object.freeze({'台北市':'臺北市','台中市':'臺中市','台南市':'臺南市','台東縣':'臺東縣'});
export function normalizeAnchorAddress(value){
  return String(value||'').trim().replace(/臺/g,'台').replace(/[，,．.。；;\s　]/g,'').toLowerCase();
}
export function anchorAddress(anchor){
  const text=String(anchor?.description||'');
  return (text.match(/地址[：:]\s*([^。；;\n]+)/)?.[1]||'').trim();
}
export function countyOfAnchor(anchor){
  const title=String(anchor?.title||'');
  const note=String(anchor?.description||'');
  const address=anchorAddress(anchor);
  const text=address+' '+title+' '+note;
  const found=text.match(/(基隆市|臺北市|台北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|臺中市|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|臺南市|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)/);
  if(found)return TAIWAN_ALIASES[found[1]]||found[1];
  // Older anchor descriptions may contain only a district or a familiar station.
  const hints=[
    [/板橋|江子翠|亞東醫院|中和|永和|土城|新莊|三重|福隆|貢寮|輔仁|亞運保齡球館/,'新北市'],
    [/行天宮|臺大醫院|台大醫院/,'臺北市'],
    [/童玩節|冬山河|傳藝/,'宜蘭縣'],
    [/逢甲/,'臺中市'],
    [/臺南車站|台南車站|高鐵臺南|高鐵台南/,'臺南市'],
    [/東方工專|東方技術學院|東方設計/,'高雄市']
  ];
  for(const [pattern,county] of hints){if(pattern.test(title+' '+note))return county;}
  return /(?:國外|海外)/.test(text)?'國外':'待確認縣市';
}
export function groupAnchorsByCounty(anchors){
  const groups=new Map();
  for(const anchor of anchors||[]){
    const county=countyOfAnchor(anchor);
    if(!groups.has(county))groups.set(county,[]);
    groups.get(county).push(anchor);
  }
  const order=x=>REGIONS.indexOf(x)===-1?REGIONS.length:REGIONS.indexOf(x);
  return [...groups].sort(([a],[b])=>order(a)-order(b)||a.localeCompare(b,'zh-Hant'))
    .map(([county,items])=>({county,items:items.sort((a,b)=>String(a.title).localeCompare(String(b.title),'zh-Hant'))}));
}
function distance(a,b){
  const latA=Number(a.latitude)*Math.PI/180,latB=Number(b.latitude)*Math.PI/180;
  const lngDiff=(Number(b.longitude)-Number(a.longitude))*Math.PI/180;
  const dLat=latB-latA;
  return Math.round(2*6371008.8*Math.asin(Math.min(1,Math.sqrt(Math.sin(dLat/2)**2+
    Math.cos(latA)*Math.cos(latB)*Math.sin(lngDiff/2)**2))));
}
export function organizeAnchorCandidates(anchors){
  const list=(anchors||[]).filter(a=>a.trace_type==='anchor');
  const results=[];
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
    const a=list[i],b=list[j];
    if(a.source_scope!==b.source_scope)continue;
    const aa=anchorAddress(a),ba=anchorAddress(b);
    const match=aa&&ba&&normalizeAnchorAddress(aa)===normalizeAnchorAddress(ba);
    const both=Boolean(aa&&ba);
    const valid=[a.latitude,a.longitude,b.latitude,b.longitude].every(v=>v!=null&&Number.isFinite(Number(v)));
    const meters=valid?distance(a,b):null;
    const nameMatch=String(a.title||'').replace(/\s/g,'')===String(b.title||'').replace(/\s/g,'');
    let type='';
    if(match)type=meters!==null&&meters>350?'address-coordinate-conflict':'same-address';
    else if(meters!==null&&meters<=80)type=both?'near-different-address':'near-unverified';
    else if(nameMatch)type='same-name-different-location';
    if(type)results.push({key:[a.uid,b.uid].sort().join(':'),a,b,address:match?aa:'',meters,type,
      canMerge:type==='same-address'||type==='near-unverified'});
  }
  return results.sort((a,b)=>{
    const priority={'same-address':0,'near-unverified':1,'address-coordinate-conflict':2,'near-different-address':3,'same-name-different-location':4};
    return priority[a.type]-priority[b.type]||(a.meters??999999)-(b.meters??999999);
  });
}
