/**
 * Read-only, locale-specific descriptions of exact source Meta Tags.
 * These labels are UI reference only. The caller must never persist them.
 */
const REFERENCE=Object.freeze({
  hopeful:Object.freeze({'zh-Hant':'希望向','zh-Hans':'希望向',en:'Hopeful mood',ja:'希望に満ちた'}),
  gentle:Object.freeze({'zh-Hant':'溫柔向','zh-Hans':'温柔向',en:'Gentle mood',ja:'穏やかな'}),
  dark:Object.freeze({'zh-Hant':'黑暗向','zh-Hans':'黑暗向',en:'Dark mood',ja:'ダークな'}),
  introspective:Object.freeze({'zh-Hant':'內省向','zh-Hans':'内省向',en:'Introspective mood',ja:'内省的な'}),
  calm:Object.freeze({'zh-Hant':'平靜向','zh-Hans':'平静向',en:'Calm mood',ja:'穏やかで静かな'}),
  cinematic:Object.freeze({'zh-Hant':'電影感','zh-Hans':'电影感',en:'Cinematic feel',ja:'映画的な'}),
  bittersweet:Object.freeze({'zh-Hant':'苦甜交織','zh-Hans':'苦甜交织',en:'Bittersweet mood',ja:'ほろ苦い'})
});

export function mediaTagLanguageReferences(metaTags,locale='zh-Hant'){
  const language=['zh-Hant','zh-Hans','en','ja'].includes(locale)?locale:'zh-Hant';
  const seen=new Set();
  const references=[];
  for(const text of String(metaTags??'').split(/[,，、;；\n\r|]+/u)){
    const tag=text.trim();
    const key=tag.normalize('NFKC').toLocaleLowerCase();
    if(!tag||seen.has(key)||!REFERENCE[key])continue;
    seen.add(key);
    references.push({tag,reference:REFERENCE[key][language]});
  }
  return references;
}
