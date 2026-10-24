// Build-time literal imports allow Next.js to split public Blocks by Scope and page.
// These are first-party modules, not fetched/eval'd code or SQL.
const LOADERS={
  "lo3rwang:governance":()=>import('./lo3rwang/governance.js'),
  "lo3rwang:index":()=>import('./lo3rwang/index.js'),
  "lo3rwang:search":()=>import('./lo3rwang/search.js'),
  "loc:governance":()=>import('./loc/governance.js'),
  "loc:group_admin":()=>import('./loc/group_admin.js'),
  "loc:group_culture":()=>import('./loc/group_culture.js'),
  "loc:group_governance":()=>import('./loc/group_governance.js'),
  "loc:group_manage":()=>import('./loc/group_manage.js'),
  "loc:group_search":()=>import('./loc/group_search.js'),
  "loc:group_setting":()=>import('./loc/group_setting.js'),
  "loc:group_statics":()=>import('./loc/group_statics.js'),
  "loc:index":()=>import('./loc/index.js'),
  "loc:scope_admin":()=>import('./loc/scope_admin.js'),
  "loc:scope_culture":()=>import('./loc/scope_culture.js'),
  "loc:scope_governance":()=>import('./loc/scope_governance.js'),
  "loc:scope_manage":()=>import('./loc/scope_manage.js'),
  "loc:scope_search":()=>import('./loc/scope_search.js'),
  "loc:scope_setting":()=>import('./loc/scope_setting.js'),
  "loc:scope_statics":()=>import('./loc/scope_statics.js'),
  "loc:search":()=>import('./loc/search.js'),
  "lrunes:game":()=>import('./lrunes/game.js'),
  "lrunes:governance":()=>import('./lrunes/governance.js'),
  "lrunes:hero":()=>import('./lrunes/hero.js'),
  "lrunes:index":()=>import('./lrunes/index.js'),
  "lrunes:search":()=>import('./lrunes/search.js')
};
export async function loadPublishedBlocks(scopeId,pageName='index'){
  const key=String(scopeId||'')+':'+String(pageName||'index');
  const loader=Object.prototype.hasOwnProperty.call(LOADERS,key)?LOADERS[key]:null;
  return loader?(await loader()).default:[];
}
