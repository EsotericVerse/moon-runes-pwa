/* LOC PWA: public static snapshots/assets. SQL, ISR, search and auth bypass this worker. */
const IMAGE_CACHE='loc-public-images-v1';
const IMAGE_CACHE_PREFIX='loc-public-images-';
const MAX_IMAGES=200;
const BLOCK_CACHE='loc-public-blocks-v1'; // snapshot builder replaces version on publication
const BLOCK_CACHE_PREFIX='loc-public-blocks-';
const ASSET_CACHE='loc-static-assets-v1';
const SHELL_CACHE='loc-public-shell-v1';
const MAX_BLOCKS=200;
const MAX_ASSETS=300;
const MAX_SHELLS=30;
const PRIVATE_QUERY=/^(?:token|access_token|auth|authorization|jwt|key|api_key|sig|signature|expires?|policy|credential|x-amz-|x-goog-|x-ms-)/i;
const PRIVATE_PATH=/(?:^|\/)(?:api|auth|private|account|user|session|admin)(?:\/|$)/i;
const IMAGE_EXT=/\.(?:avif|gif|jpe?g|png|svg|webp|bmp|ico)$/i;

function publicImage(request){
  if(request.method!=='GET'||request.destination!=='image')return false;
  let url;
  try{url=new URL(request.url);}catch{return false;}
  if(url.username||url.password)return false;
  for(const key of url.searchParams.keys())if(PRIVATE_QUERY.test(key))return false;
  if(url.origin===self.location.origin){
    // Don't accidentally persist authenticated media routes or private images.
    return /^\/(?:pics|assets|vendor)\//.test(url.pathname);
  }
  // Other providers still display normally. Cache only obvious public images
  // over HTTPS; opaque responses cannot expose their cache-control headers.
  return url.protocol==='https:'&&!PRIVATE_PATH.test(url.pathname)&&IMAGE_EXT.test(url.pathname);
}

function publicBlock(request){
  if(request.method!=='GET')return false;
  const url=new URL(request.url);
  return url.origin===self.location.origin&&!url.search
    &&(/^(?:\/_loc\/blocks\/[a-z][a-z0-9]{0,14}\/[a-z0-9_-]+|\/_loc\/config\/[a-z][a-z0-9]{0,14}|\/_loc\/site-bootstrap)\.json$/.test(url.pathname));
}

function publicAsset(request){
  if(request.method!=='GET')return false;
  const url=new URL(request.url);
  return url.origin===self.location.origin&&!url.search&&/^\/_next\/static\//.test(url.pathname);
}

// Only static public shells: never cache user account, management, search,
// live draw/duel state, ISR or API responses.
function publicShell(request){
  if(request.method!=='GET'||request.mode!=='navigate')return false;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||url.search)return false;
  return /^\/(?:lo3rwang\/?)?$/.test(url.pathname)
    ||/^\/lrunes\/(?:game\/?|list\/?|list2\/?|list\/[^/]+\/?|list\/[^/]+\/[^/]+\/?|)?$/.test(url.pathname);
}

function cacheableStatic(response,type){
  if(!response?.ok||response.type==='opaque')return false;
  if(/\b(?:private|no-store|no-cache)\b/i.test(response.headers.get('cache-control')||''))return false;
  if(response.headers.get('set-cookie'))return false;
  const mime=response.headers.get('content-type')||'';
  return type==='blocks'?/^application\/json\b/i.test(mime)
    :type==='shell'?/^text\/html\b/i.test(mime)
    :/^(?:text\/css|(?:application|text)\/javascript|font\/|application\/font)/i.test(mime);
}

async function publicStaticCache(event,cacheName,max,type,networkFirst=false){
  const request=event.request;
  let cache=null,hit=null;
  try{
    cache=await caches.open(cacheName);
    hit=await cache.match(request);
    if(hit&&!networkFirst)return hit;
  }catch{/* Cache access is optional; never break navigation. */}
  try{
    const response=await fetch(request);
    if(cache&&cacheableStatic(response,type))
      event.waitUntil(rememberLimited(cache,request,response.clone(),max).catch(()=>{}));
    return response;
  }catch(error){
    if(hit)return hit;
    throw error;
  }
}

async function rememberLimited(cache,request,response,max){
  await cache.put(request,response);
  const keys=await cache.keys();
  for(const old of keys.slice(0,Math.max(0,keys.length-max)))await cache.delete(old);
}

function cacheable(response){
  if(!response||(response.type!=='opaque'&&!response.ok))return false;
  if(response.type==='opaque')return true;
  const policy=response.headers.get('cache-control')||'';
  if(/\b(?:no-store|private|no-cache)\b/i.test(policy))return false;
  const contentType=response.headers.get('content-type')||'';
  return !contentType||/^image\//i.test(contentType);
}

async function remember(cache,request,response){
  await cache.put(request,response);
  const keys=await cache.keys();
  for(const old of keys.slice(0,Math.max(0,keys.length-MAX_IMAGES)))await cache.delete(old);
}

self.addEventListener('install',event=>{
  // No precaching: do not download an image before the user actually opens it.
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(name=>
      (name.startsWith(IMAGE_CACHE_PREFIX)&&name!==IMAGE_CACHE)
      ||(name.startsWith(BLOCK_CACHE_PREFIX)&&name!==BLOCK_CACHE)
      ||(name.startsWith('loc-static-assets-')&&name!==ASSET_CACHE)
      ||(name.startsWith('loc-public-shell-')&&name!==SHELL_CACHE)
    ).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='LOC_BLOCKS_INVALIDATE')return;
  const key=String(event.data.key||'');
  if(!/^[a-z][a-z0-9]{0,14}:[a-z0-9_-]+$/.test(key))return;
  const [id,page]=key.split(':');
  event.waitUntil(caches.open(BLOCK_CACHE).then(cache=>cache.delete(new Request(self.location.origin+'/_loc/blocks/'+id+'/'+page+'.json'))).catch(()=>{}));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(publicBlock(request)){
    event.respondWith(publicStaticCache(event,BLOCK_CACHE,MAX_BLOCKS,'blocks'));
    return;
  }
  if(publicAsset(request)){
    event.respondWith(publicStaticCache(event,ASSET_CACHE,MAX_ASSETS,'asset'));
    return;
  }
  if(publicShell(request)){
    event.respondWith(publicStaticCache(event,SHELL_CACHE,MAX_SHELLS,'shell',true));
    return;
  }
  if(!publicImage(request))return;
  event.respondWith((async()=>{
    let cache;
    try{
      cache=await caches.open(IMAGE_CACHE);
      const hit=await cache.match(request);
      if(hit)return hit;
    }catch{
      // A disabled or full browser cache must never prevent images loading.
    }
    const response=await fetch(request);
    if(cache&&cacheable(response)){
      event.waitUntil(remember(cache,request,response.clone()).catch(()=>{}));
    }
    return response;
  })());
});
