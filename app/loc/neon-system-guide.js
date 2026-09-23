import {selectNeonRows} from './neon-repository';

// Formal Neon guide tables. These replace any former JSON documentation lookup.
export const SYSTEM_GUIDE_TABLES=Object.freeze({
  tableCatalog:'silver.system_table_catalog',
  dataPrinciples:'silver.system_data_principles',
  scopeRegistry:'silver.loc_scope_registry',
  shortcutRoutes:'silver.loc_shortcut_routes',
  homeShortcuts:'silver.loc_home_shortcuts'
});

async function readGuideTable(table,limit=5000){
  return (await selectNeonRows(table,{columns:'*',limit})).rows;
}

export function selectSystemTableCatalog(options){
  return readGuideTable(SYSTEM_GUIDE_TABLES.tableCatalog,options?.limit);
}

export function selectSystemDataPrinciples(options){
  return readGuideTable(SYSTEM_GUIDE_TABLES.dataPrinciples,options?.limit);
}

export function selectLocScopeRegistry(options){
  return readGuideTable(SYSTEM_GUIDE_TABLES.scopeRegistry,options?.limit);
}

export function selectLocShortcutRoutes(options){
  return readGuideTable(SYSTEM_GUIDE_TABLES.shortcutRoutes,options?.limit);
}

export function selectLocHomeShortcuts(options){
  return readGuideTable(SYSTEM_GUIDE_TABLES.homeShortcuts,options?.limit);
}
