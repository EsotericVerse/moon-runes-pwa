import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=source('supabase/migrations/20261029226100_keyword_tree_readers.sql');
const trace=source('supabase/migrations/20261029226000_trace_keyword_uid_groups.sql');
const panel=source('app/loc/KeywordLibraryPanel.jsx');
const analysis=source('app/loc/keyword-analysis.js');

test('Class share settings live in the existing Scope config, never in a new table',()=>{
  assert.match(panel,/class_shares:/);
  assert.match(panel,/saveClassShare\(activeClass\.uid/);
  assert.match(panel,/keyword_meta:\{\.\.\.\(config\.keyword_meta\|\|\{\}\),by_class:\{\}\}/);
  assert.doesNotMatch(sql,/^\s*CREATE\s+(?:TEMP\s+|UNLOGGED\s+)?TABLE\b/im);
  assert.doesNotMatch(trace,/^\s*CREATE\s+(?:TEMP\s+|UNLOGGED\s+)?TABLE\b/im);
});

test('all public keyword readers authorize the requested Class UID',()=>{
  assert.equal((sql.match(/silver\.keyword_class_is_shared\(v_scope,v_class\)/g)||[]).length,2);
  assert.match(trace,/silver\.keyword_class_is_shared\(v_scope,v_class_uid\)/);
  assert.match(sql,/RETURN coalesce\(\(v_meta->'class_shares'->>p_class_uid\)::boolean,false\)/);
});

test('shared category identity is derived, not persisted',()=>{
  assert.match(sql,/encode\(sha256\(convert_to\(\$1\|\|':'\|\|c\.uid::text,'UTF8'\)\),'hex'\)/);
  assert.match(sql,/CASE WHEN \$2 THEN c\.uid::text/);
  assert.match(sql,/read_shared_keyword_classes/);
});

test('no module-level Keyword or Galaxy analysis result caching',()=>{
  assert.doesNotMatch(analysis,/analysisPromises\s*=\s*new Map/);
  assert.doesNotMatch(analysis,/analysisPromises\.set/);
});

test('legacy Neon shares are discovered by Class UID without a staging table',()=>{
  assert.match(sql,/DISTINCT ON \(class_uid\) class_uid::text AS uid,class_name AS name/);
  assert.match(sql,/attname='uid'/);
  assert.match(trace,/attname='uid'/);
  assert.match(sql,/coalesce\(keyword_meta->'class_shares','\{\}'::jsonb\)/);
});

test('shared Class directory uses authorized reader for owner and public reader for guest',async()=>{
  const contract=source('app/loc/db-contract.mjs');
  const definition=contract.match(/  async function readSharedKeywordClasses\(scopeId\)\{[\s\S]*?\n  \}/)?.[0];
  assert.ok(definition);
  let authCalls=0,publicCalls=0;
  const classes=[{classUid:'eeCc'},{classUid:'IeG0'}];
  const authorized={schema:()=>({rpc:async(name,args)=>{
    authCalls++;
    assert.equal(name,'read_shared_keyword_classes');
    assert.equal(args.p_scope_id,'lo3rwang');
    return {data:classes,error:null};
  }})};
  const guest={schema:()=>({rpc:async()=>{publicCalls++;return {data:classes.slice(0,1),error:null};}})};
  const make=new Function('authClient','publicClient','verifiedKeywordOwner','normalizeScopeId',
    definition+';return readSharedKeywordClasses;');
  const owner=make(authorized,guest,async()=>true,id=>id);
  assert.deepEqual(await owner('lo3rwang'),classes);
  assert.equal(authCalls,1);
  assert.equal(publicCalls,0);
  const anonymous=make(authorized,guest,async()=>false,id=>id);
  assert.deepEqual(await anonymous('lo3rwang'),classes.slice(0,1));
  assert.equal(authCalls,1);
  assert.equal(publicCalls,1);
  const failing=make({schema:()=>({rpc:async()=>({data:null,error:{message:'denied'}})})},
    guest,async()=>true,id=>id);
  await assert.rejects(failing('lo3rwang'),/denied/);
});

test('music genres belong to selectable Keyword Classes, not fixed Statistics dimensions',()=>{
  const stats=source('app/modular/features/Statistics.jsx');
  const match=stats.match(/const STAT_TYPES=\[([^\]]+)\]/);
  assert.ok(match,'Statistics dimensions must be present');
  assert.doesNotMatch(match[1],/media_style/);
  assert.match(stats,/value:'keywords',textKey:'uiExtra\.statisticsUI\.keywordClass'/);
  assert.match(stats,/availableKeywordClasses\.map\(item=><option/);
  assert.match(stats,/\[item\.categoryName,item\.name\]/);
  assert.match(stats,/setSelectedKeywordClassUid\(event\.target\.value\)/);
  assert.match(stats,/classUid:resolvedKeywordClassUid/);
  assert.doesNotMatch(stats,/STYLE_FILTERS[^\n]*rune66/);
  assert.match(stats,/keywordAccount\.user\?\.id\|\|'guest'/);
  assert.doesNotMatch(stats,/read_music_style_tree/);
});

test('private Keyword Class directory is read only through existing owner RLS',()=>{
  assert.match(analysis,/dbAuthRelation\(scope\.keywords\)/);
  assert.match(analysis,/\.in\('type',\['category','class'\]\)/);
  const directory=source('app/loc/keyword-class-directory.mjs');
  assert.match(directory,/row\.type==='category'/);
  assert.match(directory,/row\.type==='class'/);
  assert.match(directory,/classUid:uid/);
  assert.match(analysis,/keywordClassDirectory\(shared,authorizedRows,id\)/);
  assert.match(analysis,/const shared=await readSharedKeywordClasses\(id\)/);
  assert.doesNotMatch(analysis,/dbPublicRelation\(scope\.keywords\)/);
});

test('authorized owner sees all existing category/Class choices, guest only shared ones',async()=>{
  const {keywordClassDirectory}=await import('../app/loc/keyword-class-directory.mjs');
  const shared=[{classUid:'eeCc',name:'符文66'}];
  const tree=[
    {uid:'ALmS',type:'category',name:'音樂',lists:['9jlA','IeG0']},
    {uid:'9U3L',type:'category',name:'符文',lists:['eeCc']},
    {uid:'9jlA',type:'class',name:'Electronic'},
    {uid:'IeG0',type:'class',name:'Pop'},
    {uid:'eeCc',type:'class',name:'符文66'},
  ];
  assert.deepEqual(keywordClassDirectory(shared,[],'lo3rwang').map(row=>row.classUid),['eeCc']);
  const owner=keywordClassDirectory(shared,tree,'lo3rwang');
  assert.equal(owner.length,3);
  assert.deepEqual(owner.filter(row=>row.categoryName==='音樂').map(row=>row.name).sort(),['Electronic','Pop']);
  assert.equal(owner.find(row=>row.classUid==='eeCc').categoryName,'符文');
  assert.equal(owner.find(row=>row.classUid==='IeG0').classUid,'IeG0');
  assert.deepEqual(keywordClassDirectory([],[],'lo3rwang'),[]);
});
