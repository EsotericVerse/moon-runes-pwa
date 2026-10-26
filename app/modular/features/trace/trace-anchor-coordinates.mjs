// Semantic spatial anchors may be created before coordinates are known.
// Never turn empty/null GPS fields into the real-world coordinate (0, 0).
const absent=value=>value==null||(typeof value==='string'&&value.trim()==='');
export function validTraceCoordinates(longitude,latitude){
  if(absent(longitude)||absent(latitude))return false;
  if(!['string','number'].includes(typeof longitude)||!['string','number'].includes(typeof latitude))return false;
  const lng=Number(longitude),lat=Number(latitude);
  return Number.isFinite(lng)&&Number.isFinite(lat)
    &&lng>=-180&&lng<=180&&lat>=-90&&lat<=90;
}
export function normalizedTraceCoordinates(longitude,latitude){
  if(absent(longitude)&&absent(latitude))return {longitude:null,latitude:null};
  if(!validTraceCoordinates(longitude,latitude))
    throw Error('請同時填寫有效經緯度，或兩欄都留空等待確認。');
  return {longitude:Number(longitude),latitude:Number(latitude)};
}
