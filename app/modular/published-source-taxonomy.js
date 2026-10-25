// Flat public source classification, published with Scope Config.
import {sourceTaxonomyFromArrays} from '../loc/source-classification.mjs';
export const PUBLISHED_SOURCE_LISTS=Object.freeze({
  loc:{system:['facebook','threads','instagram'],personal:[]},
  lo3rwang:{system:['facebook','threads','instagram'],personal:['suno','kkcity','others','vocus','ptt','wretch','pixnet','personal']},
  lrunes:{system:['facebook','threads','instagram'],personal:['vocus','others','suno']}
});
export const PUBLISHED_SOURCE_TAXONOMY=Object.freeze(Object.fromEntries(
  Object.entries(PUBLISHED_SOURCE_LISTS).map(([id,lists])=>[id,sourceTaxonomyFromArrays(lists.system,lists.personal)])
));
export function publishedSourceTaxonomy(scopeId){
  return Object.prototype.hasOwnProperty.call(PUBLISHED_SOURCE_TAXONOMY,scopeId)?PUBLISHED_SOURCE_TAXONOMY[scopeId]:null;
}
