import {selectRows} from './db-query.mjs';

// Public metadata for Galaxy group-source opt-outs only. No choice retains existing statistics; Daily Rune is independent.
export async function selectCrossScopeSharing(){
  const [categories,aliases,scopeSources,permissions]=await Promise.all([
    selectRows('silver.statistics_source_categories',{columns:'category_code,display_name,enabled',limit:250}),
    selectRows('silver.statistics_source_aliases',{columns:'source_key,category_code',limit:250}),
    selectRows('silver.scope_source_subcategories',{columns:'scope_id,source_key,category_code,display_name,enabled',limit:1000}),
    selectRows('silver.scope_group_source_sharing',{columns:'scope_id,category_code,share_enabled',limit:1000})
  ]);
  return {
    categories:categories.rows,aliases:aliases.rows,scopeSources:scopeSources.rows,
    permissions:permissions.rows
  };
}
