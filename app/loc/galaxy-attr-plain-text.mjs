// Galaxy metadata is typed database data, never BlockNote HTML.
// Validate only changed metadata before writing; preserve untouched existing
// values and never silently strip or rewrite the author's original text.
const TAG=/<\/?[A-Za-z][A-Za-z0-9:-]*(?=[\s/>])[^>]*>|<!--[\s\S]*?-->|<![Dd][Oo][Cc][Tt][Yy][Pp][Ee][^>]*>|<\?[A-Za-z][^>]*\?>/;
const ENTITY_LT=/&(?:lt|#0*60|#x0*3c);/gi;
const ENTITY_GT=/&(?:gt|#0*62|#x0*3e);/gi;

export function hasHtmlTag(value){
  if(typeof value!=='string')return false;
  const decoded=value.replace(ENTITY_LT,'<').replace(ENTITY_GT,'>');
  return TAG.test(decoded);
}

export function assertPlainGalaxyAttributes(attributes){
  for(const [field,value] of Object.entries(attributes||{})){
    const texts=Array.isArray(value)?value:[value];
    if(texts.some(hasHtmlTag)){
      throw new Error('文章屬性 '+field+' 只能使用純文字，不可包含 HTML 標籤。');
    }
  }
  return attributes;
}
