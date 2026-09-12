import canonicalRows from '../data/json/core/runes.json';

// Canonical source policy:
// - data/json/core/runes.json is the highest-level runtime source.
// - This module only derives runtime shape/group metadata from that source.
// - Do not duplicate rune rows into generated JS files.

const GROUP_DEFS = [
  {id:'soul',group_zh:'靈魂',group_en:'Soul',from:1,to:8,description:'從個體之靈延伸至群體之魂，描繪意識、記憶與存在邊界的層次。',trait:'意識與存在層次',style_module:'個體與群體',possible_tone:['意識','記憶','邊界','內在'],style:['spirit','existence']},
  {id:'link',group_zh:'連結',group_en:'Link',from:9,to:16,description:'描繪人、事、物之間的方向、連結與分離，以及理解、啟發與誤解的變化。',trait:'關係與連結變化',style_module:'關係脈絡',possible_tone:['方向','關係','連結','分離','理解'],style:['relation','context']},
  {id:'life',group_zh:'生命',group_en:'Life',from:17,to:24,description:'涵蓋生老病死與心愛語韻，描繪生命歷程、身心狀態與情感表達。',trait:'生命歷程',style_module:'生命狀態',possible_tone:['生老病死','身心','情感','表達'],style:['life','somatic']},
  {id:'nature',group_zh:'自然',group_en:'Nature',from:25,to:32,description:'取象於樹花葉草、根種實枝，呈現生命生長、繁衍與自然形態的循環。',trait:'生長與自然形態',style_module:'自然生長',possible_tone:['自然','生長','繁衍','循環','形態'],style:['nature','growth']},
  {id:'mineral',group_zh:'礦物',group_en:'Mineral',from:33,to:40,description:'取象於金玉晶石與大地礦藏，呈現材質、價值、稀有、堅實與沉積等物質特性。',trait:'物質與價值特性',style_module:'物質特性',possible_tone:['材質','價值','稀有','堅實','沉積'],style:['value','material']},
  {id:'element',group_zh:'元素',group_en:'Element',from:41,to:48,description:'由光暗、水火、風土、雷氣構成，描繪世界中不同性質的基本力量與作用形式。',trait:'風格特徵',style_module:'風格表現',possible_tone:['風格','氣質','特色','表現方式'],style:['style','trait']},
  {id:'order',group_zh:'秩序',group_en:'Order',from:49,to:56,description:'由日月星辰、明時空因構成，描繪週期、時間、空間與因果所形成的規律結構。',trait:'規律結構',style_module:'時空規律',possible_tone:['週期','時間','空間','因果','規律'],style:['order','structure']},
  {id:'disorder',group_zh:'無序',group_en:'Disorder',from:57,to:64,description:'涵蓋福禍、無夢幻緣、虛果，描繪規律之外的不確定、變化、可能與結果。',trait:'非規律與潛意識',style_module:'未定、潛意識變化',possible_tone:['潛意識','未定','意外','夢幻','機緣','結果'],style:['disorder','subconscious']},
  {id:'special',group_zh:'特殊',group_en:'Special',from:65,to:66,description:'收納超出 1–64 基本八組之外的特殊符文，包含玄、命，以及作為誌銘的德。',trait:'系統特殊定位',style_module:'系統特殊',possible_tone:['混沌','命運','誌銘','系統基準'],style:['system','special']}
];

export const groups = GROUP_DEFS.map(({from,to,...group}) => ({
  ...group,
  runes:[
    ...canonicalRows.filter(r => Number(r.編號) >= from && Number(r.編號) <= to).map(r => ({id:Number(r.編號),zh:r.符文名稱,en:r.英文})),
    ...(group.id === 'special' ? [{id:0,zh:'德',en:'Virtue'}] : [])
  ]
}));

const groupByZh = new Map(groups.map(group => [group.group_zh, group]));

function toRuntimeRow(row) {
  const id = Number(row.編號);
  const name = row.符文名稱;
  const groupMeta = groupByZh.get(row.所屬分組) || null;
  const positiveKeywords = row.正向關鍵詞 ?? '';
  const reverseKeywords = row.反向關鍵詞 ?? '';
  return {
    ...row,
    分組英文: groupMeta?.group_en ?? '',
    分組說明: groupMeta?.description ?? '',
    群組特質: groupMeta?.trait ?? '',
    風格模組: groupMeta?.style_module ?? '',
    可能語氣: groupMeta?.possible_tone ?? [],
    group_style: groupMeta?.style ?? [],
    group_meta: groupMeta,
    關鍵詞: positiveKeywords,
    反向關鍵字: reverseKeywords,
    圖檔名稱: id > 0 && name ? `${String(id).padStart(2, '0')}_${name}.png` : null,
    drawable: id >= 1 && id <= 66
  };
}

export const rune = [null];
for (const row of canonicalRows) rune[Number(row.編號)] = toRuntimeRow(row);

export const runeRows = canonicalRows;
