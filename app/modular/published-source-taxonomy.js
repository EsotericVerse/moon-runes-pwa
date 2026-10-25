// Flat public source classification, published with Scope Config.
import {sourceTaxonomyFromArrays} from '../loc/source-classification.mjs';
export const PUBLISHED_SOURCE_LISTS=Object.freeze({
  loc:{system:['facebook','threads','instagram'],personal:[]},
  lo3rwang:{system:['facebook','threads','instagram'],personal:['suno','kkcity','其他','方格子vocus','ptt','無名wretch','pixnet']},
  lrunes:{system:['facebook','threads','instagram'],personal:['vocus','others','suno']}
});
export const PUBLISHED_SOURCE_TAXONOMY=Object.freeze(Object.fromEntries(
  Object.entries(PUBLISHED_SOURCE_LISTS).map(([id,lists])=>[id,sourceTaxonomyFromArrays(lists.system,lists.personal)])
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
