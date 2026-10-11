// The lunar reading uses the Taipei Chinese-calendar day, not the card's
// intrinsic moon_phase. iOS/WebKit can return Chinese day names instead of
// ASCII digits, even for a numeric DateTimeFormat request.
const LUNAR_LOCALES=[
  'en-u-ca-chinese-nu-latn',
  'zh-TW-u-ca-chinese-nu-latn',
  'zh-TW-u-ca-chinese'
];
const CHINESE_DIGITS=Object.freeze({'零':0,'〇':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9});

function parseLunarDay(value){
  const raw=String(value??'').trim().normalize('NFKC');
  if(/^\d{1,2}$/.test(raw)){
    const n=Number(raw);
    return n>=1&&n<=30?n:null;
  }
  const text=raw.replace(/^初/,'').replace(/^廿/,'二十').replace(/^卅/,'三十');
  let day=null;
  if(Object.hasOwn(CHINESE_DIGITS,text))day=CHINESE_DIGITS[text];
  else if(text==='十')day=10;
  else if(text==='二十')day=20;
  else if(text==='三十')day=30;
  else{
    const m=text.match(/^([一二三])?十([一二三四五六七八九])?$/);
    if(m)day=(m[1]?CHINESE_DIGITS[m[1]]:1)*10+(m[2]?CHINESE_DIGITS[m[2]]:0);
  }
  return day>=1&&day<=30?day:null;
}

export function realMoonPhase(date=new Date()){
  const at=date instanceof Date?date:new Date(date);
  if(!Number.isFinite(at.getTime()))return '未知';
  for(const locale of LUNAR_LOCALES){
    try{
      const formatter=new Intl.DateTimeFormat(locale,{
        calendar:'chinese',numberingSystem:'latn',
        timeZone:'Asia/Taipei',month:'numeric',day:'numeric'
      });
      // Some runtimes silently fall back to Gregorian; never use that day.
      if(formatter.resolvedOptions().calendar!=='chinese')continue;
      const lunarDay=parseLunarDay(
        formatter.formatToParts(at).find(part=>part.type==='day')?.value
      );
      if(lunarDay===null)continue;
      if(lunarDay<=7)return '新月';
      if(lunarDay<=14)return '上弦';
      if(lunarDay<=21)return '滿月';
      if(lunarDay<=28)return '下弦';
      return '空亡';
    }catch{
      // Try the next ICU locale before considering the lunar day unavailable.
    }
  }
  return '未知';
}
