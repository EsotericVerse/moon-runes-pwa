// Source classification is two independent flat JSONB string arrays. No category IDs,
// aliases, folders or grouping rows are persisted anywhere.
export const classNames=values=>[...new Set((Array.isArray(values)?values:[])
  .map(value=>String(value??'').trim()).filter(Boolean))];
const key=value=>String(value??'').trim().toLocaleLowerCase();
export function sourceTaxonomyFromArrays(systemNames=[],personalNames=[]){
  const system=classNames(systemNames);
  const systemKeys=new Set(system.map(key));
  const personal=classNames(personalNames).filter(name=>!systemKeys.has(key(name)));
  // Lightweight view for the existing timeline/statistics aggregation API;
  // category_code/group_code are the names themselves, NOT stored IDs.
  const categories=system.map(display_name=>({category_code:key(display_name),display_name,enabled:true}));
  const aliases=system.map(name=>({source_key:key(name),category_code:key(name)}));
  const groups=personal.map(display_name=>({group_code:key(display_name),display_name,enabled:true}));
  const groupAliases=personal.map(name=>({source_key:key(name),group_code:key(name)}));
  return {categories,aliases,groups,groupAliases};
}
