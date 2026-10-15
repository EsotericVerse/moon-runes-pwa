const defaultRouting=Object.freeze({provider:'supabase',primaryId:'supabase-current',backupId:null,backupProvider:null,mode:'single',primaryControl:true,verified:false});
let route=defaultRouting;
let resolved=false;
let pending=null;
let revision=0;
export function invalidateDatabaseRouting(){revision++;resolved=false;pending=null;route={...route,verified:false}}
export async function selectedDatabaseRouting(client){
  if(resolved)return route;
  if(pending)return pending;
  if(!client?.activeTarget){resolved=true;return route}
  const expected=revision;
  const request=(async()=>{
    try{
      const answer=await client.activeTarget();
      if(answer?.error)throw answer.error;
      const data=answer?.data||{};
      const provider=String(data.provider||'supabase');
      if(!['supabase','neon','custom'].includes(provider))throw new Error('Invalid database provider');
      if(expected===revision){
        route={
          provider,
          primaryId:String(data.primary_id||'supabase-current'),
          backupId:data.backup_id?String(data.backup_id):null,
          backupProvider:data.backup_provider?String(data.backup_provider):null,
          mode:data.mode==='db-managed'?'db-managed':'single',
          primaryControl:data.primary_control===undefined?provider==='supabase':data.primary_control===true,
          verified:true
        };
      }
    }catch{
      // Keep the last successfully resolved routing target.
    }finally{
      if(expected===revision){resolved=true;pending=null}
    }
    return route;
  })();
  pending=request;
  return request;
}
if(typeof window!=='undefined'){
  window.addEventListener('loc-database-target-changed',invalidateDatabaseRouting);
  window.addEventListener('pageshow',event=>{if(event.persisted)invalidateDatabaseRouting()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')invalidateDatabaseRouting()});
}
