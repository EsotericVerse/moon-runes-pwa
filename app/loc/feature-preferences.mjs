// One existing api.user_settings text_value, never a new table or index.
// User-only display filters; nothing here changes the underlying Scope data.
export const FEATURE_PREFERENCES_KEY='loc-feature-filters-v1';
export const FEATURE_PREFERENCES_EVENT='loc-feature-filters-changed';
export const FEATURE_DEFAULTS=Object.freeze({
  keywordChoice:'none',
  cultureTime:'era',cultureDisplay:'density',cultureUnit:'day',cultureSort:'desc',
  statisticsDisplay:'source',statisticsUnit:'day',statisticsSort:'desc',
  traceDisplay:'anchor',traceTime:'none',traceSort:'desc',
  searchField:'content',searchSort:'asc'
});
export const FEATURE_CHOICES=Object.freeze({
  cultureTime:['anchor','period','era'],
  cultureDisplay:['density','keywords'],
  cultureUnit:['day','week','month','year'],
  cultureSort:['desc','asc'],
  statisticsDisplay:['source','media_type'],
  statisticsUnit:['day','week','month','year'],
  statisticsSort:['desc','asc'],
  traceDisplay:['anchor','path','trace'],
  traceTime:['none','period','era'],
  traceSort:['desc','nearest'],
  searchField:['content','title'],
  searchSort:['asc','desc']
});
export function normalizeFeaturePreferences(input){
  let raw=input;
  if(typeof raw==='string'){try{raw=JSON.parse(raw);}catch{raw={};}}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  const output={...FEATURE_DEFAULTS};
  for(const [key,allowed] of Object.entries(FEATURE_CHOICES)){
    if(allowed.includes(raw[key]))output[key]=raw[key];
  }
  const selected=String(raw.keywordChoice||'');
  if(selected==='none'||/^(lo3rwang|lrunes):[A-Za-z0-9]{4}$/.test(selected))
    output.keywordChoice=selected||'none';
  return output;
}
export function selectedKeywordForScope(preferences,scopeId){
  const selected=String(preferences?.keywordChoice||'none');
  return selected.startsWith(scopeId+':')?selected.slice(scopeId.length+1):'';
}
