import {existsSync,readdirSync,statSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {buildScopeRoutePolicyV2} from './scope-route-policy.mjs';

const root=process.cwd();
const appRoot=resolve(root,'app');
const failures=[];
const policy=buildScopeRoutePolicyV2();

function normalizePath(value='/'){
  const out='/' + String(value||'/').split('/').filter(Boolean).join('/');
  return out==='/'?'/':out;
}

function pageRouteFromFile(file){
  const rel=relative(appRoot,file).replaceAll('\\','/');
  const parts=rel.split('/');
  if(parts.at(-1)!=='page.jsx')return null;
  parts.pop();
  const routeParts=parts.map(part=>{
    const dynamic=part.match(/^\[([^\]]+)\]$/);
    return dynamic?':'+dynamic[1]:part;
  });
  return normalizePath(routeParts.join('/'));
}

function walk(dir,out=[]){
  for(const name of readdirSync(dir)){
    const file=join(dir,name);
    const stat=statSync(file);
    if(stat.isDirectory())walk(file,out);
    else if(name==='page.jsx')out.push(file);
  }
  return out;
}

function patternMatches(pattern,route){
  const expected=normalizePath(pattern).split('/').filter(Boolean);
  const actual=normalizePath(route).split('/').filter(Boolean);
  if(expected.length!==actual.length)return false;
  return expected.every((segment,index)=>{
    if(segment.startsWith(':'))return actual[index]?.startsWith(':')||Boolean(actual[index]);
    return segment===actual[index];
  });
}

function ownersFor(route){
  const owners=[];
  for(const [host,entry] of Object.entries(policy.hosts||{})){
    if(entry.allow?.includes(route))owners.push({host,type:'allow'});
    if(entry.compatibility?.includes(route))owners.push({host,type:'compatibility'});
    for(const pattern of entry.patterns||[]){
      if(patternMatches(pattern,route))owners.push({host,type:'pattern',pattern});
    }
  }
  return owners;
}

if(!existsSync(appRoot)){
  failures.push('app/ directory missing');
}else{
  const pages=walk(appRoot);
  for(const file of pages){
    const route=pageRouteFromFile(file);
    const owners=ownersFor(route);
    if(!owners.length){
      failures.push('unowned public route shell: '+relative(root,file).replaceAll('\\','/')+' -> '+route);
    }
  }
}

if(failures.length){
  console.error('[route-ownership] violations:\n'+failures.join('\n'));
  process.exit(1);
}

console.log('[route-ownership] every Next page route is owned by Registry-derived edge policy');
