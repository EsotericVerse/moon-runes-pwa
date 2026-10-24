import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const ROOT=new URL('../app/i18n/',import.meta.url);
const LOCALES=['zh_tw','zh_cn','en','ja'];

async function dictionary(path){
  const source=readFileSync(new URL(path,ROOT),'utf8');
  const context=vm.createContext({});
  const module=new vm.SourceTextModule(source,{identifier:path,context});
  await module.link(name=>{throw new Error('Unexpected dictionary dependency: '+name);});
  await module.evaluate();
  assert.equal(typeof module.namespace.default,'object',path+' must export a dictionary');
  return module.namespace.default;
}

function flatten(value,prefix=''){
  return Object.entries(value||{}).flatMap(([key,entry])=>{
    const path=prefix?prefix+'.'+key:key;
    return entry&&typeof entry==='object'&&!Array.isArray(entry)
      ?flatten(entry,path)
      :[path];
  });
}

async function verifyFamily(path){
  const names=LOCALES.map(locale=>path(locale));
  const dictionaries=await Promise.all(names.map(dictionary));
  const baseline=flatten(dictionaries[0]).sort();
  assert.ok(baseline.length>0,names[0]+' is empty');
  for(let i=1;i<LOCALES.length;i++){
    const actual=flatten(dictionaries[i]).sort();
    assert.deepEqual(actual,baseline,names[i]+' has missing or extra UI keys');
  }
}

test('Four core dictionaries have matching UI keys',async()=>{
  await verifyFamily(locale=>locale+'.js');
});

test('Feature dictionaries have matching UI keys',async()=>{
  await verifyFamily(locale=>'features.'+locale+'.js');
});

test('All lazy-loaded UI sections exist in all four languages and have matching keys',async()=>{
  const names=readdirSync(new URL('sections/',ROOT))
    .filter(name=>name.endsWith('.zh_tw.js'))
    .map(name=>name.slice(0,-'.zh_tw.js'.length));
  assert.ok(names.length>=25,'Expected feature-scoped locale sections');
  for(const section of names){
    await verifyFamily(locale=>'sections/'+section+'.'+locale+'.js');
  }
});

test('Interpolated chart labels retain their placeholder in every locale',async()=>{
  const entries=await Promise.all(LOCALES.map(locale=>dictionary('sections/uiExtra.statisticsView.'+locale+'.js')));
  for(const locale of entries)assert.match(locale.chartTopN,/\\{count\\}/);
});

test('Nondefault core UI packs are imported on demand, not statically bundled',()=>{
  const code=readFileSync(new URL('ui-copy.js',ROOT),'utf8');
  const eager=code.slice(0,code.indexOf('const LOADERS='));
  assert.match(eager,/import zhTw from '.\\/zh_tw\\.js'/);
  assert.doesNotMatch(eager,/import (?:en|ja|zhCn) from/);
  for(const name of ['zh_cn','en','ja'])
    assert.ok(code.includes("import('./"+name+".js')"),name+' needs a dynamic loader');
  assert.ok(!code.includes("value==='ja'?['en','ja']"),'Japanese must not prefetch English');
});
