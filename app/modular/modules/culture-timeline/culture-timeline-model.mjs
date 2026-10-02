const DENSITY_LEVELS=Object.freeze([
  Object.freeze({minimum:1001,key:'focus-6',label:'1001 篇以上',brightness:1.4,glow:0.9}),
  Object.freeze({minimum:501,key:'focus-5',label:'501–1000 篇',brightness:1.32,glow:0.78}),
  Object.freeze({minimum:101,key:'focus-4',label:'101–500 篇',brightness:1.25,glow:0.66}),
  Object.freeze({minimum:51,key:'focus-3',label:'51–100 篇',brightness:1.18,glow:0.54}),
  Object.freeze({minimum:26,key:'focus-2',label:'26–50 篇',brightness:1.11,glow:0.42}),
  Object.freeze({minimum:11,key:'focus-1',label:'11–25 篇',brightness:1.05,glow:0.3})
]);

function densityLevelForCount(value){
  const count=Number(value)||0;
  return DENSITY_LEVELS.find(level=>count>=level.minimum)||null;
}

export function densityStyleForCount(value){
  const count=Number(value)||0;
  const level=densityLevelForCount(count);
  if(!level)return null;
  const blur=Math.min(28,6+Math.log2(count/10)*3);
  return {...level,blur:`${blur.toFixed(1)}px`};
}

export function densityStyleForRatio(value){
  const ratio=Math.max(0,Math.min(1,Number(value)||0));
  if(!ratio)return null;
  return {
    key:'relative-density',
    label:'分類內相對密度',
    brightness:1+ratio*.4,
    glow:.12+ratio*.78,
    blur:`${(4+ratio*20).toFixed(1)}px`
  };
}

export function formatCultureDateTime(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return String(value||'');
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

const WINDOWS_1252_BYTES=new Map([
  [0x20ac,0x80],[0x201a,0x82],[0x0192,0x83],[0x201e,0x84],[0x2026,0x85],
  [0x2020,0x86],[0x2021,0x87],[0x02c6,0x88],[0x2030,0x89],[0x0160,0x8a],
  [0x2039,0x8b],[0x0152,0x8c],[0x017d,0x8e],[0x2018,0x91],[0x2019,0x92],
  [0x201c,0x93],[0x201d,0x94],[0x2022,0x95],[0x2013,0x96],[0x2014,0x97],
  [0x02dc,0x98],[0x2122,0x99],[0x0161,0x9a],[0x203a,0x9b],[0x0153,0x9c],
  [0x017e,0x9e],[0x0178,0x9f]
]);

function windowsByteForChar(char){
  const point=char.codePointAt(0);
  if(point<=255)return point;
  return WINDOWS_1252_BYTES.get(point)??null;
}

function decodeWindowsUtf8Chunk(value){
  const chunk=String(value||'');
  if(!chunk)return chunk;
  const bytes=[];
  let hasHighByte=false;
  for(const char of chunk){
    const byte=windowsByteForChar(char);
    if(byte===null)return chunk;
    bytes.push(byte);
    if(byte>=0x80)hasHighByte=true;
  }
  if(!hasHighByte)return chunk;
  try{
    return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes));
  }catch{
    return chunk;
  }
}

function decodeWindowsUtf8Pass(value){
  const text=String(value||'');
  let output='';
  let encoded='';
  for(const char of text){
    if(windowsByteForChar(char)!==null){
      encoded+=char;
      continue;
    }
    output+=decodeWindowsUtf8Chunk(encoded)+char;
    encoded='';
  }
  return output+decodeWindowsUtf8Chunk(encoded);
}

export function decodeCultureText(value){
  let text=String(value||'');
  for(let pass=0;pass<3;pass+=1){
    const decoded=decodeWindowsUtf8Pass(text);
    if(decoded===text)break;
    text=decoded;
  }
  return text;
}
