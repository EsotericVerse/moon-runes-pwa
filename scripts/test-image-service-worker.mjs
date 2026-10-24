import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');

function createHarness(){
  const listeners=new Map();
  const stored=new Map();
  const requests=[];
  const deleted=[];
  let online=true;
  let networkHeaders={'content-type':'image/webp'};
  const makeCache=name=>{
    if(!stored.has(name))stored.set(name,new Map());
    const map=stored.get(name);
    return {
      match:async request=>map.get(request.url),
      put:async(request,response)=>{map.set(request.url,response);},
      keys:async()=>[...map.keys()].map(url=>({url})),
      delete:async request=>{deleted.push(request.url);return map.delete(request.url);}
    };
  };
  const cacheStorage={
    open:async name=>makeCache(name),
    keys:async()=>[...stored.keys()],
    delete:async name=>stored.delete(name)
  };
  const response=(type='basic',headers={})=>({
    type,ok:true,status:200,redirected:false,headers:{get:name=>headers[name.toLowerCase()]??null},
    clone(){return response(type,headers);}
  });
  const context=vm.createContext({
    URL,Promise,Request,Response,caches:cacheStorage,
    self:{
      location:{origin:'https://loc.lo3rwang.cc'},
      addEventListener:(name,fn)=>listeners.set(name,fn),
      skipWaiting:async()=>{},
      clients:{claim:async()=>{}}
    },
    fetch:async request=>{
      requests.push(request.url);
      if(!online)throw new Error('network unavailable');
      return response(request.url.startsWith('https://remote.example')?'opaque':'basic',networkHeaders);
    }
  });
  vm.runInContext(source,context,{filename:'public/sw.js'});
  async function dispatch(name,request){
    const pending=[];
    let handled;
    const event={
      request,data:name==='message'?request:undefined,
      respondWith:value=>{handled=Promise.resolve(value);},
      waitUntil:value=>pending.push(Promise.resolve(value))
    };
    listeners.get(name)(event);
    const result=handled?await handled:null;
    await Promise.all(pending);
    return {result,handled:Boolean(handled)};
  }
  const req=(url,destination='image',method='GET')=>({url,method,destination});
  return {dispatch,req,requests,stored,deleted,setOnline:value=>{online=value;},
    setResponseHeaders:value=>{networkHeaders=value;}};
}

test('picture cache: first network hit, repeat without network, and offline reuse',async()=>{
  const h=createHarness();
  await h.dispatch('install');
  await h.dispatch('activate');
  const url='https://loc.lo3rwang.cc/pics/LOC-PicAll.webp';
  assert.equal((await h.dispatch('fetch',h.req(url))).handled,true);
  assert.deepEqual(h.requests,[url]);
  await h.dispatch('fetch',h.req(url));
  assert.deepEqual(h.requests,[url]);
  h.setOnline(false);
  assert.ok((await h.dispatch('fetch',h.req(url))).result);
  assert.deepEqual(h.requests,[url]);
});

test('never intercept documents, SQL/API, or private and signed URLs',async()=>{
  const h=createHarness();
  for(const request of [
    h.req('https://loc.lo3rwang.cc/','document'),
    h.req('https://loc.lo3rwang.cc/api/loc/site-bootstrap'),
    h.req('https://loc.lo3rwang.cc/pics/private.webp?token=secret'),
    h.req('https://loc.lo3rwang.cc/admin/profile.webp'),
    h.req('https://remote.example/get-image?id=1'),
    h.req('https://remote.example/image.webp?X-Amz-Signature=secret'),
    h.req('https://remote.example/private/hidden.webp')
  ]){
    assert.equal((await h.dispatch('fetch',request)).handled,false,request.url);
  }
  assert.equal(h.requests.length,0);
});

test('public external HTTPS image URLs can be cached including opaque responses',async()=>{
  const h=createHarness();
  const url='https://remote.example/photos/distant.webp';
  await h.dispatch('fetch',h.req(url));
  await h.dispatch('fetch',h.req(url));
  assert.deepEqual(h.requests,[url]);
});

test('updating the full image URL fetches a new version; other cache entries stay',async()=>{
  const h=createHarness();
  const first='https://loc.lo3rwang.cc/pics/cover.webp?v=1';
  const second='https://loc.lo3rwang.cc/pics/cover.webp?v=2';
  await h.dispatch('fetch',h.req(first));
  await h.dispatch('fetch',h.req(second));
  await h.dispatch('fetch',h.req(first));
  assert.deepEqual(h.requests,[first,second]);
});

test('cache limit evicts oldest pictures without intercepting any content request',async()=>{
  const h=createHarness();
  for(let i=0;i<203;i++)await h.dispatch('fetch',h.req('https://loc.lo3rwang.cc/pics/'+i+'.webp'));
  const cache=h.stored.get('loc-public-images-v1');
  assert.equal(cache.size,200);
  assert.equal(h.deleted.length,3);
  assert.equal(cache.has('https://loc.lo3rwang.cc/pics/0.webp'),false);
});

test('service worker registration only in browser, not Capacitor or HTTP remote',()=>{
  const shell=readFileSync(new URL('../app/AppShell.jsx',import.meta.url),'utf8');
  assert.match(shell,/navigator\.serviceWorker\.register\('\/sw\.js',\{scope:'\/'\}\)/);
  assert.match(shell,/Capacitor\.isNativePlatform\(\)/);
  assert.match(shell,/location\.protocol!=='https:'/);
});

test('explicit no-store and private image responses never enter the cache',async()=>{
  const h=createHarness();
  const url='https://loc.lo3rwang.cc/pics/cover.webp';
  for(const policy of ['no-store','private']){
    h.setResponseHeaders({'content-type':'image/webp','cache-control':policy});
    await h.dispatch('fetch',h.req(url));
    await h.dispatch('fetch',h.req(url));
    assert.equal(h.stored.get('loc-public-images-v1')?.size,0,policy);
  }
  assert.deepEqual(h.requests,[url,url,url,url]);
  // Only a cacheable response may be reused on subsequent navigations.
  h.setResponseHeaders({'content-type':'image/webp','cache-control':'public, max-age=3600'});
  await h.dispatch('fetch',h.req(url));
  h.setOnline(false);
  assert.ok((await h.dispatch('fetch',h.req(url))).result);
  assert.equal(h.requests.length,5);
});

test('static published Blocks and site metadata cache locally without another fetch',async()=>{
  const h=createHarness();
  h.setResponseHeaders({'content-type':'application/json','cache-control':'public, max-age=600'});
  const blocks=h.req('https://loc.lo3rwang.cc/_loc/blocks/lrunes/index.json','');
  const site=h.req('https://loc.lo3rwang.cc/_loc/site-bootstrap.json','');
  await h.dispatch('fetch',blocks);
  await h.dispatch('fetch',site);
  await h.dispatch('fetch',blocks);
  await h.dispatch('fetch',site);
  assert.equal(h.requests.length,2);
  assert.ok([...h.stored.keys()].some(k=>k.startsWith('loc-public-blocks-')));
});
test('editing invalidates one static Block cache entry without affecting other data',async()=>{
  const h=createHarness();
  h.setResponseHeaders({'content-type':'application/json'});
  const req=h.req('https://loc.lo3rwang.cc/_loc/blocks/lo3rwang/index.json','');
  await h.dispatch('fetch',req);
  await h.dispatch('message',{type:'LOC_BLOCKS_INVALIDATE',key:'lo3rwang:index'});
  await h.dispatch('fetch',req);
  assert.deepEqual(h.requests,[req.url,req.url]);
});
test('search, numeric ISR, authenticated routes and game API are never intercepted',async()=>{
  const h=createHarness();
  for(const url of [
    '/api/loc/scopes/lo3rwang/numeric/statistics',
    '/rest/v1/rpc/read_scope_statistics',
    '/search?q=test','/governance/manage',
    '/lrunes/game/api/room',
    '/auth/session'
  ]){
    const result=await h.dispatch('fetch',h.req('https://loc.lo3rwang.cc'+url,''));
    assert.equal(result.handled,false,url);
  }
  assert.equal(h.requests.length,0);
});
