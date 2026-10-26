// Facebook Takeout *text* place metadata, not EXIF or media file lookup.
// Never infer a check-in from post prose, filename, GPS or generic post title.
const PLACE_KEYS=['place','location','checkin','check_in','venue'];
const asName=value=>{
  if(typeof value!=='string')return '';
  const text=value.trim();
  return text&&text.length<=200&&!/[\r\n\u0000-\u001f]/u.test(text)?text:'';
};
function namedPlace(value){
  if(typeof value==='string')return asName(value);
  if(!value||typeof value!=='object'||Array.isArray(value))return '';
  for(const field of ['name','place_name','title','address','full_address']){
    const text=asName(value[field]);
    if(text)return text;
  }
  // Meta variants can nest place metadata under location/place.
  for(const field of ['place','location']){
    if(value[field]&&value[field]!==value){
      const text=namedPlace(value[field]);
      if(text)return text;
    }
  }
  return '';
}
// Meta's labelled export can be UTF-8 bytes written as Latin-1 characters.
// Decode only field labels to recognize an explicit check-in; keep the
// original place value for the existing import encoding repair.
function labelText(value){
  const raw=String(value||'').trim();
  if([...raw].some(char=>char.charCodeAt(0)>255))return raw;
  try{return new TextDecoder('utf-8',{fatal:true})
    .decode(Uint8Array.from(raw,char=>char.charCodeAt(0)));}
  catch{return raw;}
}
function explicitTaggedPlaces(row){
  const found=[];
  for(const field of Array.isArray(row?.label_values)?row.label_values:[]){
    for(const landmark of Array.isArray(field?.dict)?field.dict:[]){
      if(labelText(landmark?.title)!=='地標')continue;
      for(const detail of Array.isArray(landmark?.dict)?landmark.dict:[]){
        if(labelText(detail?.label)!=='名稱')continue;
        const name=asName(detail?.value);
        if(name)found.push(name);
      }
    }
  }
  return found;
}
function placeCandidates(row){
  const direct=PLACE_KEYS.map(field=>namedPlace(row?.[field])).filter(Boolean);
  if(direct.length)return direct; // Explicit post location outranks attachment metadata.
  const found=explicitTaggedPlaces(row);
  // Some text-only Meta exports place the check-in on data[i], not an
  // attachment. These are location metadata, never inferred from post prose.
  for(const item of Array.isArray(row?.data)?row.data:[]){
    for(const field of PLACE_KEYS){
      const name=namedPlace(item?.[field]);
      if(name)found.push(name);
    }
  }
  const attachments=[...(Array.isArray(row?.attachments)?row.attachments:[]),
    ...(Array.isArray(row?.data)?row.data:[]).flatMap(item=>
      Array.isArray(item?.attachments)?item.attachments:[])];
  for(const item of attachments){
    for(const field of PLACE_KEYS){
      const name=namedPlace(item?.[field]);
      if(name)found.push(name);
    }
    for(const sub of Array.isArray(item?.data)?item.data:[]){
      for(const field of PLACE_KEYS){
        const name=namedPlace(sub?.[field]);
        if(name)found.push(name);
      }
    }
  }
  return found;
}
export function facebookBackupPlace(row){
  if(!row||typeof row!=='object'||Array.isArray(row))return '';
  const names=[...new Set(placeCandidates(row))];
  return names.length===1?names[0]:'';
}

// Plain Facebook JSON imports may contain posts under data[0].post,
// rather than under Galaxy's generic content/body aliases.
export function facebookBackupPostText(row){
  if(!row||typeof row!=='object'||Array.isArray(row))return '';
  for(const candidate of [row.content,row.text,row.caption,row.title,row.description,
    ...(Array.isArray(row.data)?row.data.flatMap(item=>[item?.post,item?.text]):[])]){
    if(typeof candidate==='string'&&candidate.trim())return candidate.trim();
  }
  return '';
}
export function facebookBackupTimestamp(row){
  const direct=row?.timestamp??row?.creation_timestamp??row?.created_at??
    row?.string_map_data?.['Creation Time']?.timestamp;
  if(direct!==undefined&&direct!==null)return direct;
  // This is a real Meta "visited place" timestamp, not a fabricated
  // date inferred from coordinates or other posts.
  const labeled=(Array.isArray(row?.label_values)?row.label_values:[])
    .find(item=>labelText(item?.label)==='造訪時間');
  return labeled?.timestamp_value??null;
}

// Stable source-record ID for repeat imports. No external IDs are conflated
// with the owner's Trace UID; this is only the Galaxy article's 8-char ID.
const UID_CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export function facebookBackupImportUid(row){
  // Plain JSON has no outer archive key; use a deterministic source key so
  // the same backup is not assigned new random Galaxy IDs on every import.
  const native=String(row?.id||row?.post_id||row?.fbid||'').trim();
  return facebookArchiveUid('facebook:json:'+(native||JSON.stringify(row||{})));
}
export function facebookArchiveUid(key){
  const text=String(key||'');
  if(!text)throw Error('Facebook 紀錄缺少來源識別，無法安全重複匯入。');
  let value=0xcbf29ce484222325n;
  for(let i=0;i<text.length;i++){
    value=BigInt.asUintN(64,(value^BigInt(text.charCodeAt(i)))*0x100000001b3n);
  }
  let number=value%(36n**8n),output='';
  for(let i=0;i<8;i++){output=UID_CHARS[Number(number%36n)]+output;number/=36n;}
  return output;
}
export function facebookArchiveGalaxyRow(record){
  if(record?.platform!=='facebook'||record?.kind!=='post')return null;
  const source_place=asName(record.sourcePlace)||facebookBackupPlace(record.raw);
  const original=String(record.text||'').trim();
  // A place-only check-in is still a post; accurately label its metadata,
  // rather than inventing an author-written caption.
  const content=original||(source_place?'Facebook 打卡地點：'+source_place:'');
  if(!content)return null;
  const title=(original.split(/\r?\n/)[0]||'').slice(0,120)||('Facebook 打卡：'+source_place).slice(0,120);
  return {
    uid:facebookArchiveUid(record.key),title,content,
    createtime:record.createdAt||null,
    ...(source_place?{source_place}:{}),
  };
}
