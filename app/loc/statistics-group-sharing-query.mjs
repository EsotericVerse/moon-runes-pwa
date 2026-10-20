import {selectRows} from './db-query.mjs';

// Public metadata for Galaxy group-source opt-outs only. No choice retains existing statistics; Daily Rune is independent.
export async function selectCrossScopeSharing(){
  const [categories,aliases,scopeSources,permissions]=await Promise.all([
    selectRows('silver.statistics_source_categories',{columns:'category_code,display_name,enabled',limit:250}),
    selectRows('silver.statistics_source_aliases',{columns:'source_key,category_code',limit:250}),
    selectRows('silver.scope_source_rules',{columns:'scope_id,source_key,category_code,display_name,enabled',
      filters:[{column:'kind',operator:'eq',value:'subcategory'}],limit:1000}),
    selectRows('silver.scope_source_rules',{columns:'scope_id,category_code,enabled',
      filters:[{column:'kind',operator:'eq',value:'group_share'}],limit:1000})
  ]);
  return {
    categories:categories.rows,aliases:aliases.rows,scopeSources:scopeSources.rows,
    permissions:permissions.rows.map(row=>({scope_id:row.scope_id,category_code:row.category_code,share_enabled:row.enabled}))
  };
}
