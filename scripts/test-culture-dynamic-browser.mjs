import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import test from 'node:test';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const wait=async(fn,timeout=20000)=>{
  const start=Date.now();
  while(Date.now()-start<timeout){
    const value=await fn();
    if(value)return value;
    await delay(150);
  }
  throw new Error('Culture UI interaction timed out after '+timeout+'ms');
};
// A raw Node glob runs before the static export exists. That is a unit
// phase, not a meaningful browser failure; the built-page check runs explicitly
// with LOC_REQUIRE_CULTURE_BROWSER=1 after npm run build.
const builtCulture=existsSync('out/lo3rwang/culture/index.html');
if(!builtCulture&&process.env.LOC_REQUIRE_CULTURE_BROWSER!=='1'){
  test('Culture live Chrome integration (requires built static export)',
    {skip:'Run after npm run build with LOC_REQUIRE_CULTURE_BROWSER=1'},()=>{});
}else{
if(!builtCulture)throw new Error('Culture browser integration requires out/lo3rwang/culture/index.html; run npm run build first');
const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1','--directory','out'],{stdio:'ignore'});
const chrome=spawn('google-chrome',[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--remote-debugging-port=9223',
  '--remote-allow-origins=*','--user-data-dir='+join(tmpdir(),'loc-culture-smoke-'+process.pid),
  'about:blank'
],{stdio:'ignore'});
let ws;
try {
  const targets=await wait(async()=>{
    try{const r=await fetch('http://127.0.0.1:9223/json/list');return r.ok?await r.json():null;}catch{return null;}
  },10000);
  const target=targets.find(t=>t.type==='page');
  assert.ok(target?.webSocketDebuggerUrl,'Chrome CDP page target missing');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  let next=0;
  const pending=new Map(),statsRequests=[];
  ws.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.method==='Network.requestWillBeSent'&&
      String(message.params?.request?.url||'').includes('/rest/v1/rpc/read_scope_statistics'))
      statsRequests.push(message.params.request.url);
    if(message.id&&pending.has(message.id)){
      const {resolve,reject}=pending.get(message.id);
      pending.delete(message.id);
      message.error?reject(new Error(JSON.stringify(message.error))):resolve(message.result);
    }
  });
  const call=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++next;pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
  });
  const evalJs=async expression=>{
    const data=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(data.exceptionDetails)throw new Error('Chrome page error '+JSON.stringify(data.exceptionDetails));
    return data.result?.value;
  };
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Page.navigate',{url:'http://127.0.0.1:8766/lo3rwang/culture/'});
  const ready=await wait(async()=>{
    const state=await evalJs(`({
      roots:document.querySelectorAll('.scope-dual-river-root').length,
      collapsed:document.querySelectorAll('button.scope-river-group-button[aria-expanded="false"]').length,
      errors:document.querySelectorAll('.scope-error').length,
      loading:document.querySelectorAll('[role="status"]').length
    })`);
    return state?.roots>0&&state.collapsed>0?state:null;
  },20000);
  assert.equal(ready.errors,0,'Culture displayed a data error before expansion');
  await delay(500);
  const initialRpc=statsRequests.length;
  assert.ok(initialRpc>0,'Root river never loaded public SQL aggregate');
  const t=Date.now();
  const clicked=await evalJs(`(()=>{
    const button=document.querySelector('button.scope-river-group-button[aria-expanded="false"]');
    if(!button)return false;
    button.click();return true;
  })()`);
  assert.equal(clicked,true,'No expandable Culture group');
  const after=await wait(async()=>{
    const state=await evalJs(`({
      child:document.querySelectorAll('.scope-dual-river-child').length,
      expanded:document.querySelectorAll('button.scope-river-group-button[aria-expanded="true"]').length,
      errors:document.querySelectorAll('.scope-error').length
    })`);
    return state?.child>0&&state.expanded>0?state:null;
  },5000);
  assert.equal(after.errors,0,'Culture displayed a data error after expansion');
  await delay(600);
  assert.equal(statsRequests.length,initialRpc,'Expanding a child fired a duplicate aggregate RPC');
  console.log('CULTURE DYNAMIC CLICK PASSED',JSON.stringify({
    initialRootGroups:ready.roots,expandedChildren:after.child,
    clickResponseMs:Date.now()-t,rootRpcRequests:initialRpc,additionalRpcOnClick:statsRequests.length-initialRpc
  }));
}finally{
  ws?.close();
  chrome.kill('SIGTERM');
  server.kill('SIGTERM');
}
}
