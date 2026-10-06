const DEFAULT_STATE=Object.freeze({
  primaryLabel:'Supabase',
  backupLabel:'Neon',
  activeSource:'primary',
  degraded:false,
  failingResources:[],
  primaryError:'',
  fallbackSince:null
});

let labels={primaryLabel:DEFAULT_STATE.primaryLabel,backupLabel:DEFAULT_STATE.backupLabel};
const failures=new Map();
const listeners=new Set();

function snapshot(){
  const failingResources=[...failures.keys()].sort();
  const first=[...failures.values()][0]||null;
  return Object.freeze({
    ...labels,
    activeSource:failingResources.length?'backup':'primary',
    degraded:Boolean(failingResources.length),
    failingResources,
    primaryError:first?.message||'',
    fallbackSince:first?.since||null
  });
}
let current=snapshot();
function emit(){
  current=snapshot();
  for(const listener of listeners)listener();
}

export function configureDbSourceLabels(primaryLabel='Supabase',backupLabel='Neon'){
  labels={
    primaryLabel:String(primaryLabel||'Supabase'),
    backupLabel:String(backupLabel||'Neon')
  };
  emit();
}
export function markPrimaryReadFailed(resource,error){
  const key=String(resource||'public-read');
  const existing=failures.get(key);
  failures.set(key,{
    message:String(error?.message||error||'Primary public read failed'),
    since:existing?.since||new Date().toISOString()
  });
  emit();
}
export function markPrimaryReadSucceeded(resource){
  const key=String(resource||'public-read');
  if(!failures.delete(key))return;
  emit();
}
export function getDbSourceStatus(){return current;}
export function subscribeDbSourceStatus(listener){
  listeners.add(listener);
  return()=>listeners.delete(listener);
}
