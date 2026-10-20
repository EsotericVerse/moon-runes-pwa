import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const locales=['zh_tw','zh_cn','en','ja'];
// Feature-only strings live in features.<language>.json (loaded by those features); check them as part of the same dictionary.
const dictionaries=Object.fromEntries(locales.map(locale=>[locale,{...JSON.parse(read('app/i18n/'+locale+'.json')),...JSON.parse(read('app/i18n/features.'+locale+'.json'))}]));
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
// Every UI key a component references statically must exist in all four
// languages. (Whether a component also contains literal Chinese is not checked:
// authored text and Rune names are data, and wording is not a contract.)
import {readdirSync,statSync} from 'node:fs';
const sources=[];
const walk=dir=>{for(const name of readdirSync(new URL(dir,root))){
  const path=dir+name;
  if(statSync(new URL(path,root)).isDirectory())walk(path+'/');else if(/\.(jsx|js)$/.test(name))sources.push(path);
}};
walk('app/');
for(const file of sources){
  const text=read(file);
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
console.log('[ui-i18n] 4 locale JSON structures and static UI keys passed');
