// Galaxy article visibility lives in eight independent database BOOLEAN columns.
// Scope configuration's separate `able` field is not part of this cutover.
export const GALAXY_ABLE_KEYS=Object.freeze([
  'statics','culture','search','trace','list','keyword','others','extract'
]);
const LEGACY_NAMES=Object.freeze({
  statics:'statics',culture:'culture',search:'search',trace:'trace',
  list:'list',keyword:'keywords',others:'game',extract:'extract'
});
const LEGACY_COLUMN_NAMES=Object.freeze(Object.fromEntries(
  Object.entries(LEGACY_NAMES).map(([column,legacy])=>[legacy,column])
));
export const GALAXY_COLUMN_LIST=GALAXY_ABLE_KEYS.join(',');

export function legacyGalaxyAble(row={}){
  const searchable=row.searchable!==false;
  const statistics=row.statistics_able!==false;
  return {statics:statistics,culture:statistics,search:searchable,trace:searchable&&statistics,
    list:searchable,keywords:searchable&&statistics,game:true,extract:true};
}
// Compatibility-only presentation for existing editors. Never persist an `able` object.
export function galaxyAble(row={}){
  const fallback=legacyGalaxyAble(row);
  const old=row.able&&typeof row.able==='object'&&!Array.isArray(row.able)?row.able:{};
  return Object.fromEntries(Object.entries(LEGACY_NAMES).map(([column,legacy])=>[
    legacy,typeof row[column]==='boolean'?row[column]:
      typeof old[legacy]==='boolean'?old[legacy]:fallback[legacy]
  ]));
}
export function isScopedGalaxy(table){
  return /^silver\.[a-z][a-z0-9]{0,14}_galaxy$/.test(String(table||''));
}
function splitGalaxyFeatures(row={},includeDefaults=false){
  const {able,searchable,statistics_able,...fields}=row;
  const legacy=galaxyAble(row);
  for(const column of GALAXY_ABLE_KEYS){
    const name=LEGACY_NAMES[column];
    if(includeDefaults||Object.hasOwn(row,column)||
      (able&&typeof able==='object'&&Object.hasOwn(able,name))){
      fields[column]=legacy[name];
    }
  }
  return fields;
}
export function prepareGalaxyInsertRows(table,rows=[]){
  return isScopedGalaxy(table)?rows.map(row=>splitGalaxyFeatures(row,true)):rows;
}
export function prepareGalaxyUpdateValues(table,values){
  return isScopedGalaxy(table)?splitGalaxyFeatures(values||{},false):values;
}
export function galaxySelectColumns(table,columns){
  if(!isScopedGalaxy(table))return columns;
  const parts=Array.isArray(columns)?columns:String(columns||'').split(',');
  if(!parts.some(part=>String(part).trim()==='able'))return columns;
  const selected=[...new Set(parts.flatMap(part=>
    String(part).trim()==='able'?GALAXY_ABLE_KEYS:[String(part).trim()]).filter(Boolean))];
  return Array.isArray(columns)?selected:selected.join(',');
}
export function galaxyFilterColumns(table,filters=[]){
  if(!isScopedGalaxy(table))return filters;
  return filters.map(filter=>{
    const match=String(filter.column||'').match(/^able->>([a-z]+)$/);
    if(!match)return filter;
    const column=LEGACY_COLUMN_NAMES[match[1]];
    if(!column)throw new Error('Unsupported legacy Galaxy feature filter');
    const value=filter.value==='true'?true:filter.value==='false'?false:filter.value;
    return {...filter,column,value};
  });
}
export function restoreGalaxyPresentation(table,rows=[],requestedColumns=''){
  if(!isScopedGalaxy(table))return rows;
  const parts=Array.isArray(requestedColumns)?requestedColumns:String(requestedColumns||'').split(',');
  if(!parts.some(part=>String(part).trim()==='able'))return rows;
  return rows.map(row=>({...row,able:galaxyAble(row)}));
}
