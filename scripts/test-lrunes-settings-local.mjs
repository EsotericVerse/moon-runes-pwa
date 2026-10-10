import assert from 'node:assert/strict';
import test from 'node:test';
import {settingsRunePolicy} from '../app/lrunes/settings-rune-policy.mjs';
import {buildRuneAppOverview} from '../app/lrunes/rune-app-dashboard.mjs';
import {inspectRuneSQLite,RUNE_SQLITE_MAGIC,RUNE_SQLITE_MARKER} from '../app/lrunes/local-rune-sqlite.mjs';

test('settings draw rights require app environment OR OAuth, but recording additionally requires LunaRunes Scope',()=>{
  assert.deepEqual(settingsRunePolicy({native:true,authenticated:false}),{
    canDraw:true,canRecord:false,canImport:false,canExport:false
  });
  assert.deepEqual(settingsRunePolicy({native:false,authenticated:false}),{
    canDraw:false,canRecord:false,canImport:false,canExport:false
  });
  const signedIn=settingsRunePolicy({native:false,authenticated:true,scopeManager:false});
  assert.equal(signedIn.canDraw,true);
  assert.equal(signedIn.canRecord,false);
  assert.equal(signedIn.canImport,false);
  const manager=settingsRunePolicy({native:true,authenticated:true,scopeManager:true});
  assert.equal(manager.canRecord,true);
  assert.equal(manager.canImport,true);
  assert.equal(manager.canExport,true);
  assert.equal(settingsRunePolicy({native:true,authenticated:true,scopeManager:true,loading:true}).canDraw,false);
});

test('daily App dashboard derives defensible recent direction trends, not symbolic fake energy scores',()=>{
  const daily=[
    {record_date:'2026-10-10',direction:'正位'},
    {record_date:'2026-10-10',direction:'正位'},
    {record_date:'2026-10-09',direction:'半正位'},
    {record_date:'2026-10-08',direction:'半逆位'},
    {record_date:'2026-10-02',direction:'逆位'}
  ];
  const week=buildRuneAppOverview(daily,'2026-10-11',7);
  assert.equal(week.total,4);
  assert.equal(week.daysWithRecord,3);
  assert.equal(week.forward,3);
  assert.equal(week.blocked,1);
  assert.equal(week.forwardRatio,75);
  assert.equal(week.tendency,'偏向推進');
  assert.equal(week.daily.length,7);
  assert.equal(week.daily[6].count,0);
  const month=buildRuneAppOverview(daily,'2026-10-11',30);
  assert.equal(month.total,5);
  assert.equal(month.counts['逆位'],1);
  assert.equal(buildRuneAppOverview([], '2026-10-11',7).tendency,'資料不足');
});

async function makeValidBackup(){
  const {default:initSQL}=await import('sql.js/dist/sql-asm.js');
  const SQL=await initSQL();
  const db=new SQL.Database();
  db.run('CREATE TABLE rune_file_meta (format TEXT PRIMARY KEY,version INTEGER);CREATE TABLE rune_draw_history (draw_id TEXT PRIMARY KEY,draw_key TEXT,created_at TEXT,moon_phase TEXT,cards_json TEXT,reading TEXT);CREATE TABLE lrunes_daily (record_date TEXT,draw_kind TEXT,rune_number INTEGER,direction TEXT,recorded_phase TEXT,source TEXT);');
  db.run('INSERT INTO rune_file_meta VALUES(?,1)',[RUNE_SQLITE_MARKER]);
  db.run('INSERT INTO lrunes_daily VALUES(?,?,?,?,?,?)',['2026-10-10','main',7,'正位','滿月','local']);
  db.run('INSERT INTO rune_draw_history VALUES(?,?,?,?,?,?)',['draw-test','daily','2026-10-10T04:00:00Z','滿月',JSON.stringify([{rune_number:7,direction:'正位'}]),'今天繼續前進。']);
  const bytes=db.export();
  db.close();
  return bytes;
}

test('SQLite importer accepts binary SQLite with validated marker, tables and rows',async()=>{
  const bytes=await makeValidBackup();
  assert.equal(new TextDecoder().decode(bytes.subarray(0,16)),RUNE_SQLITE_MAGIC);
  const result=await inspectRuneSQLite(bytes);
  assert.equal(result.daily.length,1);
  assert.equal(result.draws.length,1);
  assert.equal(result.daily[0][2],7);
  assert.equal(result.draws[0][1],'daily');
});
test('renamed JSON and unmarked SQLite are refused instead of being accepted by extension',async()=>{
  await assert.rejects(()=>inspectRuneSQLite(new TextEncoder().encode('{"rows":[]}')),/SQLite/);
  const bytes=await makeValidBackup();
  const {default:initSQL}=await import('sql.js/dist/sql-asm.js');
  const SQL=await initSQL();
  const db=new SQL.Database(bytes);
  db.run("UPDATE rune_file_meta SET format='wrong'");
  const wrong=db.export();
  db.close();
  await assert.rejects(()=>inspectRuneSQLite(wrong),/不相容/);
});
