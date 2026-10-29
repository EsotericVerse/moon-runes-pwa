// Flat public source classification, published with Scope Config.
import {sourceTaxonomyFromArrays} from '../loc/source-classification.mjs';
export const PUBLISHED_SOURCE_LISTS=Object.freeze({
  loc:{system:['Facebook','Threads','Instagram'],personal:[]},
  lo3rwang:{system:['Facebook','Threads','Instagram'],personal:['suno','kkcity','其他','方格子vocus','ptt','無名wretch','pixnet']},
  lrunes:{system:['Facebook','Threads','Instagram'],personal:['vocus','others','suno']}
});
// A few display names were renamed without rewriting site in Galaxy.
// Preserve their literal stored strings as read-only aliases, not new tables.
const SOURCE_DISPLAY_ALIASES=Object.freeze({
  lo3rwang:{'其他':'others','方格子vocus':'vocus','無名wretch':'wretch'}
});
export const PUBLISHED_SOURCE_TAXONOMY=Object.freeze(Object.fromEntries(
  Object.entries(PUBLISHED_SOURCE_LISTS).map(([id,lists])=>{
    const taxonomy=sourceTaxonomyFromArrays(lists.system,lists.personal);
    const displayAliases=SOURCE_DISPLAY_ALIASES[id]||{};
    return [id,{
      ...taxonomy,
      groupAliases:[
        ...taxonomy.groupAliases,
        ...taxonomy.groups.flatMap(group=>{
          const sourceKey=displayAliases[group.display_name];
          return sourceKey?[{source_key:sourceKey,group_code:group.group_code}]:[];
        })
      ]
    }];
  })
));
export function publishedSourceTaxonomy(scopeId){
  return Object.prototype.hasOwnProperty.call(PUBLISHED_SOURCE_TAXONOMY,scopeId)?PUBLISHED_SOURCE_TAXONOMY[scopeId]:null;
}

// The same published, flat source catalogue powers both Culture and Statistics.
// Present a display-level grouping only; neither table nor stored IDs exist.
export function publishedSourceCategoryCatalog(scopeId){
  const taxonomy=publishedSourceTaxonomy(scopeId);
  if(!taxonomy)return null;
  return {
    categories:[...taxonomy.categories,...taxonomy.groups.map(row=>({
      category_code:row.group_code,display_name:row.display_name,enabled:row.enabled
    }))],
    aliases:[...taxonomy.aliases,...taxonomy.groupAliases.map(row=>({
      source_key:row.source_key,category_code:row.group_code
    }))]
  };
}
