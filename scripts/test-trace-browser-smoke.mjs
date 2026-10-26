// Local-only, read-only Guest rendering check using existing Chrome and Node CDP.
// No deployment or live write. The Next server starts only on 127.0.0.1.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const temp=mkdtempSync(join(tmpdir(),'trace-browser-'));
const children=[];
const webPort=3307,chromePort=9337;
function start(command,args){
  const child=spawn(command,args,{stdio:['ignore','ignore','pipe'],env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
  let stderr='',startError='';
  child.stderr.on('data',data=>{stderr=(stderr+String(data)).slice(-4000)});
  child.on('error',error=>{startError=String(error)});
  children.push({child,getError:()=>startError+' '+stderr});return child;
}
async function until(fn,timeout=30000){
  const end=Date.now()+timeout;let error;
  while(Date.now()<end){try{const result=await fn();if(result)return result}catch(e){error=e}await pause(300)}
  throw Error('Timeout: '+String(error?.message||'not ready'));
}
let socket,serial=0;const inflight=new Map();
function command(method,params={}){
  const id=++serial;
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{inflight.delete(id);reject(Error('Chrome command timeout '+method))},15000);
    inflight.set(id,{resolve:obj=>{clearTimeout(timeout);resolve(obj)},reject});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function inspect(){
  const expression='('+function(){
    const panel=document.querySelector('.loc-trace-panel');
    const frame=document.querySelector('.loc-trace-map-frame');
    const bounds=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,right:r.right,width:r.width}};
    const body=document.body.innerText||'';
    return {path:location.pathname,
      route:body.includes('成長路線'),
      selector:[...document.querySelectorAll('select option')].some(o=>o.textContent.includes('成長路線')),
      error:document.querySelector('.scope-error')?.textContent?.slice(0,180)||'',
      width:document.documentElement.clientWidth,
      scrollWidth:document.documentElement.scrollWidth,
      frame:bounds(frame),panel:bounds(panel)};
  }.toString()+')()';
  const result=await command('Runtime.evaluate',{expression,returnByValue:true});
  if(result.exceptionDetails)throw Error('CDP evaluation exception');
  return result.result?.value;
}
async function visit(path,width){
  await command('Emulation.setDeviceMetricsOverride',{width,height:860,deviceScaleFactor:1,mobile:width<=430});
  await command('Page.navigate',{url:'http://127.0.0.1:'+webPort+path});
  const d=await until(async()=>{
    const v=await inspect();
    if(v.path!==path||!v.selector||!v.route)return null;
    if(v.error)throw Error('Guest page error '+v.error);
    return v;
  },40000);
  if(d.scrollWidth>d.width+3)throw Error('Horizontal overflow: '+JSON.stringify(d));
  if(!d.panel||!d.frame)throw Error('Trace card or map missing: '+JSON.stringify(d));
  if(d.frame.x<d.panel.x-3||d.frame.right>d.panel.right+3)
    throw Error('Trace map exceeds main card: '+JSON.stringify(d));
  console.log('GUEST-RENDER PASS '+JSON.stringify({path,width,route:d.route,
    pageScrollWidth:d.scrollWidth,frame:d.frame,panel:d.panel}));
}
try{
  const server=start(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(webPort)]);
  await until(async()=>{
    if(server.exitCode!=null)throw Error('Next server exited '+children[0].getError());
    return (await fetch('http://127.0.0.1:'+webPort+'/trace/')).status===200;
  },40000);
  const binaries=[process.env.CHROME_BIN,'google-chrome','google-chrome-stable','chromium','chromium-browser'].filter(Boolean);
  const chromeBin=binaries.map(bin=>spawnSync('which',[bin],{encoding:'utf8'}))
    .find(check=>check.status===0)?.stdout.trim();
  if(!chromeBin)throw Error('No Chrome/Chromium binary installed on runner: '+binaries.join(','));
  console.log('TRACE-BROWSER chrome binary:',chromeBin);
  const browser=start(chromeBin,[
    '--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-first-run',
    '--remote-allow-origins=*','--remote-debugging-port='+chromePort,
    '--user-data-dir='+join(temp,'chrome'),'about:blank']);
  const page=await until(async()=>{
    if(browser.exitCode!=null||browser.signalCode||children[1].getError().includes('ENOENT'))
      throw Error('Chrome exited '+children[1].getError());
    let tabs;
    try{tabs=await (await fetch('http://127.0.0.1:'+chromePort+'/json')).json()}
    catch(error){throw Error('Chrome CDP not ready: '+String(error.message||error)+' / '+children[1].getError())}
    return tabs.find(t=>t.type==='page'&&t.webSocketDebuggerUrl);
  },35000);
  socket=new WebSocket(page.webSocketDebuggerUrl);
  socket.onmessage=e=>{
    const msg=JSON.parse(String(e.data));
    if(!inflight.has(msg.id))return;
    const task=inflight.get(msg.id);inflight.delete(msg.id);
    if(msg.error)task.reject(Error(JSON.stringify(msg.error)));else task.resolve(msg.result);
  };
  await until(()=>socket.readyState===WebSocket.OPEN,10000);
  await command('Page.enable');await command('Runtime.enable');
  await visit('/trace/',1280);
  await visit('/trace/',390);
  await visit('/trace/',320);
  await visit('/lo3rwang/trace/',390);
}finally{
  socket?.close();for(const entry of children.reverse())entry.child.kill('SIGTERM');
  rmSync(temp,{recursive:true,force:true});
}
