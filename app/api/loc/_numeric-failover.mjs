// Public summaries retry only availability failures: never turn an
// authorization, invalid-parameter or disabled-ISR response into a failover.
export function isAvailabilityFailure(result){
  const error=result?.error||result;
  const status=Number(result?.status||error?.status||0);
  if(status===429||status>=500)return true;
  if(status&&status<500)return false;
  const code=String(error?.code||'');
  if(code.startsWith('08')||code==='53300'||code==='PGRST000')return true;
  return /network|fetch failed|failed to fetch|timeout|timed out|connection|econn|unavailable|aborterror/i
    .test(String(error?.message||error||''));
}
export async function tryPublicSources(sources,run){
  for(let i=0;i<sources.length;i++){
    const source=sources[i];
    try{
      const result=await run(source.schema());
      if(result?.retryable&&i+1<sources.length)continue;
      return {...result,source:source.id};
    }catch(error){
      if(!isAvailabilityFailure(error)||i+1===sources.length)throw error;
    }
  }
  throw new Error('No public summary source configured');
}
