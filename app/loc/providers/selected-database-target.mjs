const supportedProviders=new Set(['supabase','neon']);

export function selectedDatabaseProvider(rows,{fallback='supabase'}={}){
  if(!Array.isArray(rows))throw new Error('Database target configuration is invalid');
  const selected=rows.filter(row=>row?.selected===true);
  if(selected.length>1)throw new Error('More than one database target is selected');
  const provider=selected[0]?.provider||fallback;
  if(!supportedProviders.has(provider))throw new Error('Selected database provider is not supported');
  return provider;
}
