// Interpret geocoder evidence only when a door-level address is present.
// This is NOT a Taiwan address parser, place identity or floor inference.
export function postalAddressFromNominatim(item){
  const a=item?.address;
  if(!a||typeof a!=='object'||Array.isArray(a))return '';
  const text=value=>typeof value==='string'?value.trim():'';
  const road=text(a.road)||text(a.pedestrian)||text(a.street);
  const number=text(a.house_number);
  // Country/state-only hits and POI labels are not verified street addresses.
  if(!road||!number)return '';
  const candidates=[a.city,a.county,a.state,a.municipality].map(text);
  const county=candidates.find(v=>/^(?:[^\s]{2,3})[縣市]$/u.test(v))||'';
  if(!county)return '';
  const district=[a.city_district,a.suburb,a.town,a.district]
    .map(text).find(v=>v!==county&&/[區鄉鎮市]$/u.test(v))||'';
  const village=[a.village,a.neighbourhood].map(text)
    .find(v=>/[村里]$/u.test(v))||'';
  const parts=[county,district,village,road,number];
  const postal=parts.join('').trim();
  return postal.length<=320?postal:'';
}
