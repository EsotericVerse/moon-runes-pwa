import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const wait=async(fn,timeout=20000)=>{
  const start=Date.now();
  while(Date.now()-start<timeout){
    const value=await fn();
    if(value)return value;
    await delay(150);
  }
  throw new Error('Advanced Statistics interaction timed out after '+timeout+'ms');
};
const server=spawn('python3',['-m','http.server','8769','--bind','127.0.0.1','--directory','out'],{stdio:'ignore'});
const chrome=spawn('google-chrome',[
  '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--remote-debugging-port=9225',
  '--remote-allow-origins=*','--user-data-dir='+join(tmpdir(),'loc-statistics-smoke-'+process.pid),
  'about:blank'
],{stdio:'ignore'});
let ws;
try {
  const targets=await wait(async()=>{
    try{const r=await fetch('http://127.0.0.1:9225/json/list');return r.ok?await r.json():null;}catch{return null;}
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
  await call('Page.navigate',{url:'http://127.0.0.1:8769/lo3rwang/statics/'});
  const opened=await wait(async()=>{
    return evalJs(`(()=>{
      const detail=[...document.querySelectorAll('details.scope-stat-details')]
        .find(el=>el.querySelector('summary')?.textContent.includes('深度進階統計'));
      if(!detail)return false;
      if(!detail.open)detail.open=true;
      return true;
    })()`);
  },20000);
  assert.equal(opened,true,'Cannot open Deep Advanced Statistics');
  const ready=await wait(async()=>{
    const state=await evalJs(`(()=>{
      const lanes=[...document.querySelectorAll('.scope-self-intersection-lane')];
      const picks=[...lanes[0]?.querySelectorAll('.scope-self-stat-picker select')||[]];
      return {lanes:lanes.length,pickers:picks.length,
        groups:picks[0]?.options.length||0,items:picks[1]?.options.length||0,
        titles:[...lanes[0]?.querySelectorAll('.scope-self-stat-tab')||[]]
          .map(el=>el.textContent.trim()),
        errors:document.querySelectorAll('.scope-error').length};
    })()`);
    return state.lanes>=2&&state.pickers===2&&state.groups>0&&state.items>0?state:null;
  },40000);
  assert.equal(ready.errors,0,'Advanced Statistics displayed an error');
  assert.ok(ready.titles.includes('全部'),'Missing All dimension');
  assert.ok(ready.titles.includes('作品來源'),'Missing Source dimension');
  assert.ok(ready.titles.includes('多媒體'),'Missing Media dimension');
  const start=Date.now();
  const switched=await evalJs(`(()=>{
    const first=document.querySelector('.scope-self-intersection-lane');
    const all=[...first.querySelectorAll('button.scope-self-stat-tab')]
      .find(el=>el.textContent.trim()==='全部');
    if(!all)return false;
    all.click();
    return true;
  })()`);
  assert.equal(switched,true,'Cannot select All dimension');
  const all=await wait(async()=>evalJs(`(()=>{
    const first=document.querySelector('.scope-self-intersection-lane');
    const selects=[...first.querySelectorAll('.scope-self-stat-picker select')];
    return {all:first.querySelector('button.scope-self-stat-tab[aria-pressed="true"]')?.textContent.trim(),
      categories:[...selects[0].options].filter(el=>!el.disabled).map(el=>({value:el.value,label:el.textContent})),
      itemCount:selects[1].options.length,
      errors:document.querySelectorAll('.scope-error').length};
  })()`),5000);
  assert.equal(all.all,'全部','Dimension did not switch to All');
  assert.ok(all.categories.some(o=>o.value.startsWith('source:')),'No source category in All');
  assert.ok(all.categories.some(o=>o.value.startsWith('media:')),'No media category in All');
  const current=await evalJs(`document.querySelector('.scope-self-intersection-lane .scope-self-stat-picker select')?.value`);
  const alternate=all.categories.find(o=>o.value.startsWith('media:')&&o.value!==current)
    ||all.categories.find(o=>o.value!==current);
  assert.ok(alternate,'No second usable category');
  const changed=await evalJs(`(()=>{
    const select=document.querySelector('.scope-self-intersection-lane .scope-self-stat-picker select');
    const next=${JSON.stringify(alternate.value)};
    const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
    setter.call(select,next);
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  assert.equal(changed,true);
  const category=await wait(async()=>{
    const state=await evalJs(`(()=>{
      const selects=[...document.querySelectorAll('.scope-self-intersection-lane')[0]
        .querySelectorAll('.scope-self-stat-picker select')];
      return {category:selects[0].value,items:[...selects[1].options]
        .filter(el=>!el.disabled).map(el=>({id:el.value,label:el.textContent})),
        errors:document.querySelectorAll('.scope-error').length};
    })()`);
    return state.category===${JSON.stringify(alternate.value)}&&state.items.length?state:null;
  },5000);
  assert.equal(category.errors,0);
  assert.ok(category.items.length>0,'Changing category did not update the item selector');
  const selectedItem=category.items[category.items.length>1?1:0];
  const itemSwitched=await evalJs(`(()=>{
    const select=document.querySelectorAll('.scope-self-intersection-lane')[0]
      .querySelectorAll('.scope-self-stat-picker select')[1];
    const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;
    setter.call(select,${JSON.stringify(selectedItem.id)});
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  assert.equal(itemSwitched,true);
  const selected=await wait(async()=>{
    const state=await evalJs(`(()=>{
      const lane=document.querySelector('.scope-self-intersection-lane');
      const picks=[...lane.querySelectorAll('.scope-self-stat-picker select')];
      return {item:picks[1].value,errors:document.querySelectorAll('.scope-error').length};
    })()`);
    return state.item===${JSON.stringify(selectedItem.id)}?state:null;
  },5000);
  assert.equal(selected.errors,0);
  assert.ok(Date.now()-start<5000,'Ordinary comparison selection exceeded five seconds');
  console.log('STATISTICS TWO-STAGE INTERACTION PASSED',JSON.stringify({
    renderedLanes:ready.lanes,
    allDimensionCategories:all.categories.length,
    selectedCategory:category.category,selectedItem:selected.item,
    interactionMs:Date.now()-start
  }));
}finally{
  ws?.close();
  chrome.kill('SIGTERM');
  server.kill('SIGTERM');
}
