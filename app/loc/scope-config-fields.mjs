// lo3rwang uses its compact JSONB config; other Scopes retain their existing schema.
export const isJsonbScope=id=>String(id)==='lo3rwang';
export const scopeFeatureKeys=Object.freeze(['search_able','statistics_able','culture_able']);
export const scopeFeatureColumns=id=>isJsonbScope(id)?'abilities':scopeFeatureKeys.join(',');
export const scopeConfigColumns=id=>'id,display_name,search_intro,search_aliases,theme,locale,'+scopeFeatureColumns(id);
export function scopeFeatureEnabled(config,key){
  if(!scopeFeatureKeys.includes(key))return false;
  return (config?.abilities?.[key]??config?.[key])!==false;
}
export function scopeFeaturePatch(id,config){
  const values=Object.fromEntries(scopeFeatureKeys.map(key=>[key,scopeFeatureEnabled(config,key)]));
  return isJsonbScope(id)?{abilities:values}:values;
}
export const scopeTagColumn=id=>isJsonbScope(id)?'ArticleTag':String(id)==='lrunes'?'txt_class':'DefaultArticleClass';
export function scopeTagNames(id,row){
  const value=row?.[scopeTagColumn(id)];
  return Array.isArray(value)?value:[];
}
