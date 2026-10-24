/* LOC PWA: public images only. Documents, ISR, API, Auth and SQL bypass this worker. */
const IMAGE_CACHE='loc-public-images-v1';
const IMAGE_CACHE_PREFIX='loc-public-images-';
const MAX_IMAGES=200;
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
    await Promise.all(keys.filter(name=>name.startsWith(IMAGE_CACHE_PREFIX)&&name!==IMAGE_CACHE)
      .map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
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
