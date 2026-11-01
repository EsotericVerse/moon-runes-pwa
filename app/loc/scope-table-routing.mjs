// Legacy suffixes and explicit per-Scope table names. No SQL is executed here.
const SCOPE=/^[a-z][a-z0-9]{0,14}$/;
const IDENTIFIER=/^[a-z][a-z0-9_]*$/;
function scopedTable(scope,raw,fallback){
  const token=String(raw??fallback).trim();
  if(!IDENTIFIER.test(token))throw new Error('Invalid table identifier');
  if(token===scope||token.startsWith(scope+'_'))return 'silver.'+token;
  if(token.includes('_'))throw new Error('Table belongs to another scope');
  return 'silver.'+scope+'_'+token;
}
export function resolveScopeRelations(scope,row={}){
  if(!SCOPE.test(scope))throw new Error('Invalid scope');
  const galaxy=scopedTable(scope,row.galaxy,'galaxy');
  const time=scopedTable(scope,row.time,'time');
  const root='silver.'+scope,anchor=root+'_anchor';
  const fullArticle=galaxy===root,fullAnchor=time===anchor;
  if(fullArticle!==fullAnchor)throw new Error('Article and Anchor tables must switch as a pair');
  return {
    galaxy,galaxyMedia:fullAnchor?anchor:galaxy+'_media',time,
    keywords:fullAnchor?anchor:root+'_keywords',
    trace:fullAnchor?anchor:root+'_trace',
    anchor:fullAnchor?anchor:null,unified:fullAnchor
  };
}
