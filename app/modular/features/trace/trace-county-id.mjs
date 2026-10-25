// ISO 3166-2:TW three-letter subdivision codes. Keep stable IDs independent of the UI name.
export const TRACE_OTHER_COUNTY_ID='OTHER';
export const TRACE_COUNTY_IDS=Object.freeze({
  '基隆市':'TW-KEE','臺北市':'TW-TPE','新北市':'TW-NWT','桃園市':'TW-TAO',
  '新竹市':'TW-HSZ','新竹縣':'TW-HSQ','苗栗縣':'TW-MIA','臺中市':'TW-TXG',
  '彰化縣':'TW-CHA','南投縣':'TW-NAN','雲林縣':'TW-YUN','嘉義市':'TW-CYI',
  '嘉義縣':'TW-CYQ','臺南市':'TW-TNN','高雄市':'TW-KHH','屏東縣':'TW-PIF',
  '宜蘭縣':'TW-ILA','花蓮縣':'TW-HUA','臺東縣':'TW-TTT','澎湖縣':'TW-PEN',
  '金門縣':'TW-KIN','連江縣':'TW-LIE'
});
const NAME_BY_ID=Object.freeze(Object.fromEntries(Object.entries(TRACE_COUNTY_IDS).map(([name,id])=>[id,name])));
const NAME_ALIASES=Object.freeze({'台北市':'臺北市','台中市':'臺中市','台南市':'臺南市','台東縣':'臺東縣'});
export function traceCountyId(name){
  const normalized=NAME_ALIASES[String(name||'').trim()]||String(name||'').trim();
  return TRACE_COUNTY_IDS[normalized]||null;
}
export function traceCountyName(id){return NAME_BY_ID[String(id||'')]||'未判定／其他地區';}
export function validTraceCountyId(id){return Boolean(NAME_BY_ID[String(id||'')]);}
