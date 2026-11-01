// Recurring anniversary of an actual fixed calendar date. This is a
// read-only projection: Time anchor UID and date remain unchanged.
function dayParts(value){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
  if(!m)return null;
  const [year,month,date]=m.slice(1).map(Number);
  const parsed=new Date(Date.UTC(year,month-1,date));
  if(parsed.getUTCFullYear()!==year||parsed.getUTCMonth()!==month-1||
      parsed.getUTCDate()!==date)return null;
  return {year,month,date};
}
const iso=(year,month,date)=>
  String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(date).padStart(2,'0');
function localToday(){
  const now=new Date();
  return iso(now.getFullYear(),now.getMonth()+1,now.getDate());
}
export function anniversaryForDay(date,today=localToday()){
  const origin=dayParts(date),current=dayParts(today);
  if(!origin||!current||date>today)return null;
  // In a non-leap year, February 29 remains February 29: no invented
  // February 28 or March 1 anniversary.
  for(let year=current.year;year<=current.year+8;year++){
    const candidate=iso(year,origin.month,origin.date);
    if(candidate<=date||candidate<today||!dayParts(candidate))continue;
    const years=year-origin.year;
    if(years>=1)return {nextDate:candidate,years,
      monthDay:candidate.slice(5),originalDate:date};
  }
  return null;
}
