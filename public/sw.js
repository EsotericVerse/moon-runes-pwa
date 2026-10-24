/* LOC PWA: public app HTML, Scope Blocks, and public images.
 * Search documents/results, SQL, private API data and authentication are never cached.
 * Capacitor native is intentionally not controlled by this worker. */
const IMAGE_CACHE='loc-public-images-v1', IMAGE_PREFIX='loc-public-images-', MAX_IMAGES=200;
const PAGE_CACHE='loc-public-html-v1', PAGE_PREFIX='loc-public-html-', MAX_PAGES=80;
const BLOCK_CACHE='loc-public-blocks-v1';
const BLOCK_PREFIX='loc-public-blocks-', MAX_BLOCKS=200;
const BLOCK_AGE='loc-public-block-age-v1', BLOCK_TTL=24*60*60*1000;
const STATIC_CACHE='loc-public-static-v1', STATIC_PREFIX='loc-public-static-', MAX_STATIC=150;
const PRIVATE_QUERY=/^(?:token|access_token|auth|authorization|jwt|key|api_key|sig|signature|expires?|policy|credential|x-amz-|x-goog-|x-ms-)/i;
const PRIVATE_PATH=/(?:^|\/)(?:auth|private|account|user|session)(?:\/|$)/i;
const IMAGE_EXT=/\.(?:avif|gif|jpe?g|png|svg|webp|bmp|ico)$/i;
const BLOCK_PATH=/^\/_loc\/blocks\/[a-z][a-z0-9]{0,14}\/[a-z0-9_-]+\.json$/;
const METADATA_PATH=/^\/_loc\/(?:site-bootstrap\.json|config\/[a-z][a-z0-9]{0,14}\.json)$/;

function urlFor(request){
  if(request.method!=='GET'||request.headers?.has('authorization'))return null;
  let url;
  try{url=new URL(request.url);}catch{return null;}
  if(url.username||url.password)return null;
  for(const key of url.searchParams.keys())if(PRIVATE_QUERY.test(key))return null;
  return url;
}
function isImage(request,url){
  if(request.destination!=='image')return false;
  if(url.origin===self.location.origin)return /^\/(?:pics|assets|vendor)\//.test(url.pathname);
  return url.protocol==='https:'&&!PRIVATE_PATH.test(url.pathname)&&IMAGE_EXT.test(url.pathname);
}
function isStaticAsset(request,url){
  return url.origin===self.location.origin&&!url.search&&
    /^\/_next\/static\/.+\.(?:js|css)$/.test(url.pathname)&&
    ['script','style',''].includes(request.destination||'');
}
function isPublicHtml(request,url){
  if(url.origin!==self.location.origin||request.mode!=='navigate'||PRIVATE_PATH.test(url.pathname))return false;
  if(/(?:^|\/)search(?:\/|$)/i.test(url.pathname))return false;
  // The dynamic Scope shell uses this nonsecret route selector. All other
  // query pages bypass the worker (e.g. OAuth, search filters, RSC requests).
  if(url.search){
    if(!/^\/scope-shell\/?$/.test(url.pathname)||[...url.searchParams.keys()].some(k=>k!=='scopeid')||
      !/^[a-z][a-z0-9]{0,14}$/.test(url.searchParams.get('scopeid')||''))return false;
  }
  return !url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/_next/');
}
function isScopeBlocks(request,url){
  return url.origin===self.location.origin&&
    !url.search&&(BLOCK_PATH.test(url.pathname)||METADATA_PATH.test(url.pathname))&&
    (!request.destination||request.destination==='empty')&&request.credentials!=='include';
}
function cacheable(response,type){
  if(!response||!response.ok||response.status!==200||response.redirected)return false;
  const headers=response.headers;
  if(/\b(?:no-store|private|no-cache)\b/i.test(headers.get('cache-control')||''))return false;
  if(/(?:^|,)\s*(?:cookie|authorization|\*)\s*(?:,|$)/i.test(headers.get('vary')||''))return false;
  return type.test(headers.get('content-type')||'');
}
function cacheableImage(response){
  if(!response||(response.type!=='opaque'&&!response.ok))return false;
  if(response.type==='opaque')return true;
  const policy=response.headers.get('cache-control')||'';
  if(/\b(?:no-store|private|no-cache)\b/i.test(policy))return false;
  return !response.headers.get('content-type')||/^image\//i.test(response.headers.get('content-type'));
}
async function keep(cache,request,response,limit){
  await cache.put(request,response);
  const keys=await cache.keys();
  const removed=keys.slice(0,Math.max(0,keys.length-limit));
  await Promise.all(removed.map(key=>cache.delete(key)));
  return removed;
}
async function staticStrategy(event){
  const request=event.request;
  let cache;
  try{cache=await caches.open(STATIC_CACHE);const hit=await cache.match(request);if(hit)return hit;}catch{}
  const response=await fetch(request);
  if(cache&&cacheable(response,/^(?:text\/css|(?:text|application)\/javascript)(?:;|$)/i))
    event.waitUntil(keep(cache,request,response.clone(),MAX_STATIC).catch(()=>{}));
  return response;
}
async function imageStrategy(event){
  const request=event.request;
  let cache;
  try{cache=await caches.open(IMAGE_CACHE);const hit=await cache.match(request);if(hit)return hit;}catch{}
  const response=await fetch(request);
  if(cache&&cacheableImage(response))event.waitUntil(keep(cache,request,response.clone(),MAX_IMAGES).catch(()=>{}));
  return response;
}
async function htmlStrategy(event){
  const request=event.request;
  let cache;
  try{cache=await caches.open(PAGE_CACHE);}catch{}
  try{
    const response=await fetch(request);
    if(cache&&cacheable(response,/^text\/html(?:;|$)/i))
      event.waitUntil(keep(cache,request,response.clone(),MAX_PAGES).catch(()=>{}));
    return response;
  }catch(error){
    const fallback=await cache?.match(request).catch(()=>null);
    if(fallback)return fallback;
    throw error;
  }
}
async function blocksStrategy(event){
  const request=event.request;
  let cache,age,hit;
  try{
    [cache,age]=await Promise.all([caches.open(BLOCK_CACHE),caches.open(BLOCK_AGE)]);
    hit=await cache.match(request);
    if(hit){
      const marker=await age.match(request);
      const stamp=marker?Number(await marker.text()):0;
      if(stamp&&Date.now()-stamp<BLOCK_TTL)return hit;
    }
  }catch{}
  try{
    const response=await fetch(request);
    if(cache&&cacheable(response,/^application\/json(?:;|$)/i)){
      event.waitUntil((async()=>{
        const removed=await keep(cache,request,response.clone(),MAX_BLOCKS);
        if(age){
          await age.put(request,new Response(String(Date.now())));
          await Promise.all(removed.map(key=>age.delete(key)));
        }
      })().catch(()=>{}));
    }
    if(hit&&response.status>=500)return hit;
    return response;
  }catch(error){if(hit)return hit;throw error;}
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>
    (name.startsWith(IMAGE_PREFIX)&&name!==IMAGE_CACHE)||
    (name.startsWith(PAGE_PREFIX)&&name!==PAGE_CACHE)||
    (name.startsWith(BLOCK_PREFIX)&&name!==BLOCK_CACHE&&name!==BLOCK_AGE)||
    (name.startsWith(STATIC_PREFIX)&&name!==STATIC_CACHE)
  ).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type!=='LOC_BLOCKS_INVALIDATE')return;
  event.waitUntil((async()=>{
    await Promise.all([caches.delete(BLOCK_CACHE),caches.delete(BLOCK_AGE)]);
    event.ports?.[0]?.postMessage({ok:true});
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=urlFor(request);
  if(!url)return;
  if(isStaticAsset(request,url))event.respondWith(staticStrategy(event));
  else if(isImage(request,url))event.respondWith(imageStrategy(event));
  else if(isPublicHtml(request,url))event.respondWith(htmlStrategy(event));
  else if(isScopeBlocks(request,url))event.respondWith(blocksStrategy(event));
});
