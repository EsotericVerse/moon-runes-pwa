// LOC display model: Type -> Provider -> Link (location).
// Connection credentials remain confined to the trusted backend.
export const DATABASE_PROVIDER_CHOICES=Object.freeze([
  {value:'supabase',label:'Supabase',engines:['postgres']},
  {value:'neon',label:'Neon',engines:['postgres']},
  {value:'custom',label:'Standard SQL',engines:['postgres','mysql','mssql','sqlite']}
].map(x=>Object.freeze(x)));
export function databaseProviderChoices(engine='postgres'){
  return DATABASE_PROVIDER_CHOICES.filter(option=>option.engines.includes(engine));
}
export function normalizeDatabaseLocation(provider,link){
  const value=String(link||'').trim();
  if(!value)throw new Error('Link / Host is required');
  if(value.length>512||/\s/.test(value))throw new Error('Invalid database Link');
  if(provider==='supabase'){
    const ref=/^[a-z0-9]{20}$/.test(value)?value
      :/^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/i.exec(value)?.[1];
    if(!ref)throw new Error('Supabase Link must be a Project ID or project URL');
    return {provider,link:'https://'+ref+'.supabase.co',projectId:ref};
  }
  if(provider==='neon'){
    if(/^[a-z0-9-]+$/.test(value)&&!value.includes('.'))
      throw new Error('Neon needs a database endpoint or Data API URL, not only a project ID');
    const host=value.includes('://')?new URL(value).hostname:value.split(':')[0];
    if(!/^ep-[a-z0-9-]+\.(?:apirest\.)?[a-z0-9.-]+\.neon\.tech$/i.test(host))
      throw new Error('Neon Link must identify a Neon database endpoint');
    return {provider,link:value,host:host.replace('.apirest.','.')};
  }
  if(provider==='custom'){
    const match=/^\[([0-9a-f:]+)\](?::(\d{1,5}))?$|^([a-z0-9_.-]+)(?::(\d{1,5}))?$/i.exec(value);
    if(!match)throw new Error('Host must be an IP or hostname with an optional port');
    const host=match[1]||match[3],port=Number(match[2]||match[4]||0);
    if(port>65535||((match[2]||match[4])&&port<1))throw new Error('Invalid port');
    return {provider,link:value,host,port};
  }
  throw new Error('Unknown database provider');
}
