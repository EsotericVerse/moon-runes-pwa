export const LANGUAGE_USER_KEY='loc-language';
export const LANGUAGE_DEFAULT_KEY='loc-language-default-v1';

export const SUPPORTED_LOCALES=[
  {id:'zh-Hant',label:'繁體中文',shortLabel:'中',enabled:true,order:1},
  {id:'en',label:'English',shortLabel:'EN',enabled:true,order:2}
];

export const DEFAULT_LOCALE='zh-Hant';

export function normalizeLocale(value){
  return SUPPORTED_LOCALES.some(item=>item.id===value&&item.enabled)?value:DEFAULT_LOCALE;
}
