const DEFAULT_CACHE=['cache','','[]','{}'];

function parseJson(value,fallback,valid){
  try{
    const parsed=JSON.parse(String(value??''));
    return valid(parsed)?parsed:fallback;
  }catch{return fallback;}
}

export function decodeLocCache(cache){
  const values=Array.isArray(cache)&&cache.length===4?cache:DEFAULT_CACHE;
  const mode=String(values[0]??'');
  return {
    cache_mode:['off','cache','isr'].includes(mode)?mode:'cache',
    cache_provider:String(values[1]??''),
    isr_domains:parseJson(values[2],[],Array.isArray),
    io_limits:parseJson(values[3],{},value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value))
  };
}

export function encodeLocCache(settings){
  const mode=String(settings?.cache_mode??'cache');
  if(!['off','cache','isr'].includes(mode))throw Error('無效的快取模式');
  if(!Array.isArray(settings?.isr_domains))throw Error('ISR 網域設定必須為陣列');
  const limits=settings?.io_limits;
  if(!limits||typeof limits!=='object'||Array.isArray(limits))throw Error('I/O 限制設定格式錯誤');
  return [
    mode,
    String(settings?.cache_provider??''),
    JSON.stringify(settings.isr_domains),
    JSON.stringify(limits)
  ];
}
