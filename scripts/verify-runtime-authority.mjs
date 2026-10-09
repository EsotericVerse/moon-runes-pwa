import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const files={
  registry:read('app/modular/scope-registry.js'),
  runtime:read('app/modular/use-scope-runtime.js'),
  shell:read('app/AppShell.jsx'),
  locApp:read('app/loc/LocApp.jsx'),
  scopeData:read('app/loc/scope-data.js'),
  admin:read('app/loc/views/AdminHomeView.jsx'),
  library:read('app/loc/KeywordLibraryPanel.jsx'),
  layout:read('app/layout.jsx'),
  css:read('app/globals.css')
};
const checks=[
  ['Static Scope identity excludes duplicate Domain/Directory declarations',
    !/domain:\s*['"](?:loc|lrunes|admin)\.lo3rwang\.cc/.test(files.registry)&&
    !files.registry.includes('mount:Object.freeze')],
  ['Database Scope Registry owns public routes',
    files.registry.includes('setScopeRegistryRouteRows')&&
    files.registry.includes('registryRouteRows.get(id)')&&
    files.shell.includes('setScopeRegistryRouteRows(rows)')&&
    files.runtime.includes('setScopeRegistryRouteRows([row])')],
  ['Scope transitions cannot show another Scope\'s cached name',
    files.runtime.includes('registryRow?.scope_id===scopeId')&&
    files.runtime.includes('configRow?.id===scopeId')&&
    files.runtime.includes('configRow:activeConfigRow')],
  ['Scope NAV reads silver.manage Title_TW rather than Registry display_name',
    files.shell.includes("queryKey:['scope-page-copy',item.id]")&&
    files.shell.includes('row?.Title_TW')&&
    files.shell.includes('navDisplayNames[item.id]||item.nav.label')&&
    !files.shell.includes('row.display_name')&&
    files.runtime.includes('activeRegistryRow.display_name')&&
    files.locApp.includes('runtime.scope')],
  ['Public browser title/description use only manage Title_TW/Desc_TW',
    files.scopeData.includes("rpc('read_scope_page_copy'")&&
    files.shell.includes("queryKey:['scope-page-copy',scopeId]")&&
    files.shell.includes('pageCopyQuery.data?.Title_TW')&&
    files.shell.includes('pageCopyQuery.data?.Desc_TW')&&
    files.shell.includes('document.title=title')&&
    files.shell.includes('meta.setAttribute(\'content\',description)')],
  ['Scope settings and Theme palette derive from database',
    files.shell.includes('configQuery.data?.theme')&&
    files.shell.includes('queryFn:selectThemeRegistry')&&
    !files.registry.includes("mode:'fixed'")],
  ['Only the initial color scheme is bootstrapped, not duplicate palettes',
    files.layout.includes("themeBootstrap='scheme-only'")&&
    !files.layout.includes('INITIAL_SCOPE_THEMES')&&
    files.css.includes('html[data-theme-bootstrap="scheme-only"] body')],
  ['Concurrent Scope config readers share one request',
    files.scopeData.includes('scopeConfigInFlight')&&
    files.scopeData.includes('scopeConfigInFlight.set(scope.id,request)')],
  ['Rune66 Class copy is Scope-local, never global Admin',
    files.library.includes('copyRune66KeywordClass(scopeId)')&&
    files.library.includes('onClick={copyRune66}')&&
    !files.admin.includes('onClick={copyRune66}')],
  ['Domain creation rejects repeated DNS labels immediately',
    files.registry.includes('duplicateDomainLabelError')&&
    files.admin.includes('disabled={Boolean(scopeDomainError)}')&&
    files.admin.includes('網域名稱重複，拒絕建立。')]
];
const failures=checks.filter(([,ok])=>!ok).map(([label])=>label);
if(failures.length){
  console.error('[runtime-authority] failures:\\n'+failures.map(x=>'- '+x).join('\\n'));
  process.exit(1);
}
console.log('[runtime-authority] '+checks.length+' ownership and hardcoding guards verified');
