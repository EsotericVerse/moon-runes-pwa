const DEFAULT_STATE=Object.freeze({
  primaryLabel:'Supabase',
  backupLabel:'Neon',
  activeSource:'primary',
  degraded:false,
  unavailable:false,
  failingResources:[],
  unavailableResources:[],
  primaryError:'',
  fallbackSince:null
});

let labels={primaryLabel:DEFAULT_STATE.primaryLabel,backupLabel:DEFAULT_STATE.backupLabel};
const failures=new Map();
// Resources where the backup read also failed after the primary read failed.
// Tracked separately so "primary degraded, backup covering" can be told apart
// from "primary and backup both failed" instead of both reporting as 'backup'.
const backupFailures=new Map();
const listeners=new Set();
let manualReadLabel='';

function snapshot(){
  const failingResources=[...failures.keys()].sort();
  const unavailableResources=failingResources.filter(key=>backupFailures.has(key));
  const first=[...failures.values()][0]||null;
  const degraded=Boolean(manualReadLabel||failingResources.length);
  const unavailable=Boolean(unavailableResources.length);
  return Object.freeze({
    ...labels,
    backupLabel:manualReadLabel||labels.backupLabel,
    activeSource:unavailable?'unavailable':(degraded?'backup':'primary'),
    degraded,
    unavailable,
    failingResources,
    unavailableResources,
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
export function setManualReadSource(label=''){
  const next=String(label||'').trim();
  if(manualReadLabel===next)return;
  manualReadLabel=next;
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
  // A healthy primary read means any stale backup-failure record for this
  // same resource is no longer relevant to the overall status.
  const hadPrimary=failures.delete(key);
  const hadBackup=backupFailures.delete(key);
  if(!hadPrimary&&!hadBackup)return;
  emit();
}
export function markBackupReadFailed(resource,error){
  const key=String(resource||'public-read');
  const existing=backupFailures.get(key);
  backupFailures.set(key,{
    message:String(error?.message||error||'Backup public read failed'),
    since:existing?.since||new Date().toISOString()
  });
  emit();
}
export function markBackupReadSucceeded(resource){
  const key=String(resource||'public-read');
  if(!backupFailures.delete(key))return;
  emit();
}
export function getDbSourceStatus(){return current;}
export function subscribeDbSourceStatus(listener){
  listeners.add(listener);
  return()=>listeners.delete(listener);
}
