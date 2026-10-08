/**
 * Pure, Scope-independent statistics dimensions for Galaxy Media metadata.
 * No image/audio files or lyrics are loaded. Each media row counts at most once
 * in a platform/type bucket, and once per distinct style tag.
 */
function plainText(value){return String(value??'').trim();}
function tagKey(value){return plainText(value).normalize('NFKC').toLocaleLowerCase();}
function mediaDay(value){
  const day=plainText(value).slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day)?day:'';
}
function isHost(host,domain){return host===domain||host.endsWith('.'+domain);}
function sourceFromMetadata(row={}){
  const type=tagKey(row.media_type);
  const place=tagKey(row.source_place);
  const hint=type+' '+place;
  if(/\bsuno\b/u.test(hint))return 'Suno';
  if(/\bvocus\b/u.test(hint))return 'Vocus';
  if(/instagram|reels|\big\b/u.test(hint))return /reels/u.test(hint)?'IG Reels':'Instagram';
  if(/youtube|youtu\.be/u.test(hint))return 'YouTube';
  if(/threads/u.test(hint))return 'Threads';
  if(/facebook|\bfb\b/u.test(hint))return 'Facebook';
  if(/tiktok/u.test(hint))return 'TikTok';
  return '其他／無法辨識';
}
export function mediaPlatform(row={}){
  const raw=plainText(row.url);
  if(!raw)return sourceFromMetadata(row);
  try{
    const url=new URL(/^https?:\/\//iu.test(raw)?raw:'https://'+raw);
    const host=url.hostname.toLowerCase();
    const path=url.pathname.toLowerCase();
    if(isHost(host,'instagram.com'))return /^\/reels?\//u.test(path)?'IG Reels':/^\/p\//u.test(path)?'IG 貼文':'Instagram';
    if(isHost(host,'vocus.cc'))return 'Vocus';
    if(isHost(host,'suno.com')||isHost(host,'suno.ai'))return 'Suno';
    if(isHost(host,'youtube.com'))return /^\/shorts\//u.test(path)?'YouTube Shorts':'YouTube';
    if(isHost(host,'youtu.be'))return 'YouTube';
    if(isHost(host,'facebook.com')||isHost(host,'fb.watch'))return 'Facebook';
    if(isHost(host,'threads.net')||isHost(host,'threads.com'))return 'Threads';
    if(isHost(host,'tiktok.com'))return 'TikTok';
    if(isHost(host,'open.spotify.com'))return 'Spotify';
    if(isHost(host,'soundcloud.com'))return 'SoundCloud';
  }catch{
    // Invalid URL: use canonical media metadata instead of throwing.
  }
  return sourceFromMetadata(row);
}
export function mediaStyleTags(value){
  const pieces=Array.isArray(value)?value:plainText(value).split(/[,，、;\n\r|]+/u);
  const unique=new Map();
  for(const piece of pieces){
    const tag=plainText(piece);
    const key=tagKey(tag);
    if(key&&!unique.has(key))unique.set(key,tag);
  }
  return [...unique.values()];
}
export function mediaFacetDaily(rows=[],dimension='media_platform'){
  const entries=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const day=mediaDay(row?.createtime);
    if(!day)continue;
    let categories=[];
    if(dimension==='media_type')categories=[plainText(row.media_type)||'未分類'];
    else if(dimension==='media_style')categories=mediaStyleTags(row.meta_tags);
    else if(dimension==='media_platform')categories=[mediaPlatform(row)];
    else throw new Error('Unsupported media statistics dimension: '+dimension);
    if(dimension==='media_style'&&!categories.length)categories=['未標記曲風'];
    for(const category of categories){
      const key=day+'\u0000'+tagKey(category);
      const existing=entries.get(key);
      if(existing)existing.item_count++;
      else entries.set(key,{day,category,item_count:1});
    }
  }
  return [...entries.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.category.localeCompare(b.category));
}
