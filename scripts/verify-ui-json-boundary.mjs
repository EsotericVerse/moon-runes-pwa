import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Components should contain ASCII UI keys, never inline Chinese UI wording.
// Authored texts, Rune canonical names and DB media metadata are deliberately
// outside this guard: they are not interface translation resources.
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const locales=['zh_tw','zh_cn','en','ja'];
const dictionaries=Object.fromEntries(locales.map(locale=>[locale,JSON.parse(read('app/i18n/'+locale+'.json'))]));
const zh=dictionaries.zh_tw;
function keysOf(node,prefix=''){
  return Object.entries(node||{}).flatMap(([key,value])=>{
    const path=prefix?prefix+'.'+key:key;
    return typeof value==='object'&&value!==null?keysOf(value,path):[path];
  });
}
const mainSections=['common','nav','features','scope','search','statistics','culture','governance','work','management','admin','dailyRune','privateFiles','itemConfluence','timelineEditor'];
for(const locale of locales){
  const dict=dictionaries[locale];
  for(const section of mainSections)assert.deepEqual(keysOf(dict[section]).sort(),keysOf(zh[section]).sort(),
    locale+' must keep the same core UI dictionary structure for '+section);
  assert.deepEqual(keysOf(dict.fields).sort(),keysOf(zh.fields).sort(),
    locale+' is missing a FieldText translation key.');
  assert.deepEqual(keysOf(dict.uiExtra).sort(),keysOf(zh.uiExtra).sort(),
    locale+' is missing a functional UI string. All four dictionaries share the same keys.');
  for(const section of ['fields','formatMessages','dailyRune','privateFiles','itemConfluence','timelineEditor','keywordPanel']){
    assert.deepEqual(keysOf(dict[section]).sort(),keysOf(zh[section]).sort(),
      locale+' dictionary keys differ in '+section);
  }
}
// Locales must preserve named placeholders used by UI composition. A missing
// placeholder can silently break counts, error details, and timeline tooltips.
const atPath=(node,path)=>path.split('.').reduce((current,key)=>current?.[key],node);
const placeholders=value=>[...String(value).matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/gu)].map(match=>match[1]).sort();
for(const locale of locales){
  for(const key of keysOf(zh)){
    const source=atPath(zh,key);
    const target=atPath(dictionaries[locale],key);
    assert.equal(typeof target,typeof source,locale+' changed UI leaf type: '+key);
    if(typeof source==='string')assert.deepEqual(placeholders(target),placeholders(source),
      locale+' changed UI interpolation placeholders: '+key);
  }
}
const cleared=[
  'app/loc/ScopeGroupManagement.jsx',
  'app/loc/ScopeGroupOverview.jsx',
  'app/loc/views/GenericScopeHomeView.jsx',
  'app/modular/features/KeywordSettings.jsx',
  'app/loc/LocApp.jsx',
  'app/loc/ScopeSettingsPanel.jsx',
  'app/modular/features/Search.jsx',
  'app/modular/features/Statistics.jsx',
  'app/modular/modules/statistics/ScopeGroupStatistics.jsx',
  'app/modular/modules/statistics/MediaCrossTagStatistics.jsx',
  'app/loc/ManagementImportPanel.jsx',
  'app/loc/SunoImportPanel.jsx',
  'app/loc/ScopeEditableBlocks.jsx',
  'app/loc/GlobalSettings.jsx',
  'app/loc/SourceCategoryEditor.jsx',
  'app/modular/modules/statistics/StatisticsMultiChart.jsx',
  'app/modular/modules/statistics/MediaFacetStatistics.jsx',
  'app/loc/ScopeGroupStatisticsSharing.jsx',
  'app/loc/ManagementArticlePublisher.jsx',
  'app/modular/ui.jsx',
  'app/lrunes/DailyRuneAnalytics.jsx',
  'app/loc/PrivateLocalFiles.jsx',
  'app/modular/features/LocItemConfluence.jsx',
  'app/modular/features/CultureTimelineEditor.jsx'
];
for(const file of cleared){
  const text=read(file);
  assert.ok(!/[\u3400-\u9fff]/u.test(text),
    file+' contains hard-coded Chinese. Put interface strings into locale JSON and use ASCII keys.');
  for(const match of text.matchAll(/['"]((?:uiExtra|features|scope|common|nav|search|statistics|culture|management|dailyRune|privateFiles|itemConfluence|timelineEditor)\.[\w.]+)['"]/gu)){
    const key=match[1];
    const tail=text.slice(match.index+match[0].length).trimStart();
    if(key.endsWith('.')||tail.startsWith('+'))continue; // dynamic UI key composed with a runtime suffix
    for(const locale of locales){
      const value=key.split('.').reduce((node,segment)=>node?.[segment],dictionaries[locale]);
      assert.ok(typeof value==='string'&&value.length>0,file+': '+locale+' missing UI key '+key);
    }
  }
}
console.log('[ui-i18n] 4 locale JSON structures, static keys and 21 hardcode-free UI files passed');
