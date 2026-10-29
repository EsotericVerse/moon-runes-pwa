// Device-local SQLite backend for the hidden "local" Scope (private article
// import: MSN / Twitter style personal archives). This NEVER writes to
// Supabase or Neon -- every table lives only in this browser's IndexedDB
// (web) or this device's native SQLite file (iOS via Capacitor), mirroring
// the dual web/native pattern already proven by ../../lrunes/local-rune-sqlite.mjs.
// That file is LunaRunes-daily-draw-settings-specific and is NOT reused or
// touched here; this is a separate, general-purpose adapter conforming to
// the SAME db-contract.mjs interface shape as providers/supabase.mjs, so
// Culture.jsx / Statistics / Search.jsx work against it unchanged.
//
// Table set (field-for-field parity with the matching Supabase `silver`
// tables, confirmed column-by-column against the live schema):
//   local               -- scope settings row (was `lo3rwang`)
//   local_galaxy        -- imported articles (was `lo3rwang_galaxy`)
//   local_galaxy_media  -- article media references (was `lo3rwang_galaxy_media`)
//   local_time          -- culture timeline anchors (was `lo3rwang_time`)
//   local_keywords      -- keyword classification rows (was `lo3rwang_keywords`)
//   local_daily         -- daily rune draw records (was `lrunes_daily`)
//   runes / runes_etc / runes_group -- shared read-only rune dictionary,
//     seeded once, same shape as the cloud `silver.runes*` tables; needed so
//     a reused rune-draw interface can resolve rune numbers to names/meanings
//     fully offline.
import {Capacitor} from '@capacitor/core';
import {sourceTaxonomyFromArrays} from '../source-classification.mjs';
import {convertLegacyTimeRows} from '../time-schema-migration.mjs';
import {generateKeywordClassUid} from '../keyword-uidlist.mjs';

const DATABASE_NAME='loc_local_scope';
const MARKER='loc.local.scope.sqlite.v1';
const SCHEMA=`
CREATE TABLE IF NOT EXISTS local (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT,
  style INTEGER,
  theme TEXT NOT NULL DEFAULT 'theme-7',
  search_able INTEGER NOT NULL DEFAULT 1,
  statistics_able INTEGER NOT NULL DEFAULT 1,
  culture_able INTEGER NOT NULL DEFAULT 1,
  txt_class TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL,
  keyword_min_chars INTEGER NOT NULL DEFAULT 32,
  keyword_min_documents INTEGER NOT NULL DEFAULT 100,
  staticstime TEXT,
  current_keyword_class_uid TEXT,
  keyword_class_share_enabled INTEGER NOT NULL DEFAULT 0,
  keyword_meta TEXT NOT NULL DEFAULT '{}',
  display_name TEXT NOT NULL DEFAULT 'local',
  search_intro TEXT NOT NULL DEFAULT '',
  search_aliases TEXT NOT NULL DEFAULT '[]',
  locale TEXT NOT NULL DEFAULT 'zh-Hant'
);
CREATE TABLE IF NOT EXISTS local_galaxy (
  uid TEXT PRIMARY KEY NOT NULL,
  title TEXT,
  content TEXT,
  createtime TEXT,
  source_place TEXT,
  searchable INTEGER NOT NULL DEFAULT 1,
  "UpdateTime" TEXT NOT NULL,
  url TEXT,
  source_id TEXT,
  target_id TEXT,
  ref_id TEXT,
  source_name TEXT,
  media_link TEXT,
  statistics_able INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS local_galaxy_media (
  uid TEXT PRIMARY KEY NOT NULL,
  media_type TEXT NOT NULL,
  title TEXT,
  url TEXT,
  meta_tags TEXT,
  createtime TEXT,
  source_place TEXT,
  rune_references TEXT
);
CREATE TABLE IF NOT EXISTS local_archive_media_exif (
  archive_id TEXT NOT NULL,
  entry_path TEXT NOT NULL,
  media_id TEXT,
  platform TEXT,
  latitude REAL,
  longitude REAL,
  camera_local_time TEXT,
  imported_at TEXT NOT NULL,
  PRIMARY KEY (archive_id,entry_path),
  CHECK((latitude IS NULL AND longitude IS NULL) OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);
CREATE TABLE IF NOT EXISTS local_time (
  uid TEXT PRIMARY KEY NOT NULL CHECK(length(uid)=4),
  type TEXT NOT NULL CHECK(type IN ('anchor','time_period','time_trace')),
  title TEXT,
  description TEXT,
  address TEXT,
  anchor_ids TEXT,
  status TEXT
);
CREATE TABLE IF NOT EXISTS local_keywords (
  keyword_id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  principle TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '[]',
  order_no INTEGER NOT NULL DEFAULT 0,
  class_name TEXT NOT NULL,
  class_group TEXT NOT NULL,
  class_enable INTEGER NOT NULL DEFAULT 1,
  class_uid TEXT NOT NULL,
  uidlist TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS local_keyword_classes (
  class_uid TEXT PRIMARY KEY NOT NULL,
  scope_id TEXT NOT NULL DEFAULT 'local',
  default_keyword_id INTEGER
);
CREATE TABLE IF NOT EXISTS local_daily (
  record_id TEXT PRIMARY KEY NOT NULL,
  record_date TEXT NOT NULL,
  draw_kind TEXT NOT NULL,
  rune_number INTEGER NOT NULL,
  direction TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  recorded_phase TEXT
);
CREATE TABLE IF NOT EXISTS runes (
  rune_id INTEGER PRIMARY KEY NOT NULL,
  rune_name TEXT,
  english_name TEXT,
  totem TEXT,
  group_name TEXT,
  moon_phase INTEGER,
  card_attr INTEGER,
  rune_description TEXT,
  archetype TEXT,
  char_action TEXT,
  positive_keywords TEXT,
  negative_keywords TEXT,
  extra_rules TEXT,
  extra_notes TEXT,
  positive_meaning TEXT,
  half_positive_meaning TEXT,
  half_reverse_meaning TEXT,
  reverse_meaning TEXT,
  rune_evolution_history TEXT,
  myth_story TEXT,
  soul_question TEXT,
  practice_challenge TEXT,
  ritual_advice TEXT,
  harmony_advice TEXT,
  class_enable INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS runes_etc (
  rune_id INTEGER NOT NULL,
  dir INTEGER NOT NULL,
  type TEXT NOT NULL,
  "desc" TEXT NOT NULL,
  current_moon TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(rune_id,dir,type)
);
CREATE TABLE IF NOT EXISTS runes_group (
  group_id TEXT PRIMARY KEY NOT NULL,
  english_name TEXT NOT NULL,
  "desc" TEXT NOT NULL,
  quality TEXT NOT NULL,
  style TEXT NOT NULL,
  runeslist TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS local_blocks (
  uid TEXT PRIMARY KEY NOT NULL,
  page_name TEXT NOT NULL,
  block_eyebrow TEXT,
  block_title TEXT,
  block_subtitle TEXT,
  block_text TEXT,
  block_order INTEGER NOT NULL DEFAULT 1,
  block_entity TEXT,
  block_image TEXT
);
CREATE TABLE IF NOT EXISTS local_file_meta (
  format TEXT PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL
);
`;
// Keep pre-cutover device data recoverable. Both SQL.js and native SQLite run
// the same validated row conversion inside a transaction before opening Time.
const TIME_TABLE_CREATE=SCHEMA.match(/CREATE TABLE IF NOT EXISTS local_time \([\s\S]*?\);/)[0];

const ARCHIVE_EXIF_TABLE_CREATE=SCHEMA.match(/CREATE TABLE IF NOT EXISTS local_archive_media_exif \([\s\S]*?\);/)[0];
const ARCHIVE_EXIF_COLUMNS=['archive_id','entry_path','media_id','platform','latitude','longitude','camera_local_time','imported_at'];
function archiveExifMigrationStatements(){
  return [
    {sql:'ALTER TABLE local_archive_media_exif RENAME TO local_archive_media_exif_backup',values:[]},
    {sql:ARCHIVE_EXIF_TABLE_CREATE,values:[]},
    {sql:'INSERT INTO local_archive_media_exif ('+ARCHIVE_EXIF_COLUMNS.join(',')+') SELECT '+ARCHIVE_EXIF_COLUMNS.join(',')+' FROM local_archive_media_exif_backup',values:[]},
    {sql:'DROP TABLE local_archive_media_exif_backup',values:[]}
  ];
}
function upgradeWebLocalArchiveExif(db){
  const columns=rowsOf(db,'PRAGMA table_info(local_archive_media_exif)');
  if(!columns.some(row=>row.name==='media_id'&&Number(row.notnull)===1))return;
  const before=Number(rowsOf(db,'SELECT count(*) n FROM local_archive_media_exif')[0]?.n)||0;
  db.run('BEGIN');
  try{
    for(const step of archiveExifMigrationStatements())db.run(step.sql,step.values);
    const after=Number(rowsOf(db,'SELECT count(*) n FROM local_archive_media_exif')[0]?.n)||0;
    if(before!==after)throw new Error('SQLite EXIF migration count mismatch');
    db.run('COMMIT');
  }catch(error){db.run('ROLLBACK');throw error;}
}
async function upgradeNativeLocalArchiveExif(conn){
  const columns=(await conn.query('PRAGMA table_info(local_archive_media_exif)')).values||[];
  if(!columns.some(row=>row.name==='media_id'&&Number(row.notnull)===1))return;
  const before=Number((await conn.query('SELECT count(*) n FROM local_archive_media_exif')).values?.[0]?.n)||0;
  await conn.beginTransaction();
  try{
    for(const step of archiveExifMigrationStatements())await conn.execute(step.sql+';');
    const after=Number((await conn.query('SELECT count(*) n FROM local_archive_media_exif')).values?.[0]?.n)||0;
    if(before!==after)throw new Error('Native SQLite EXIF migration count mismatch');
    await conn.commitTransaction();
  }catch(error){await conn.rollbackTransaction();throw error;}
}


const LOCAL_MEDIA_TABLE_CREATE=SCHEMA.match(/CREATE TABLE IF NOT EXISTS local_galaxy_media \([\s\S]*?\);/)[0];
const LOCAL_MEDIA_COLUMNS=['uid','media_type','title','url','meta_tags','createtime','source_place','rune_references'];
function legacyMediaUid(value){
  const text=String(value||'').trim().toUpperCase();
  if(/^[A-Z0-9]{8}$/.test(text))return text;
  if(!/^[0-9A-F]{8}-(?:[0-9A-F]{4}-){3}[0-9A-F]{12}$/.test(text))
    throw new Error('Unrecognized local media identifier');
  return (BigInt('0x'+text.replaceAll('-',''))%(36n**8n)).toString(36).toUpperCase().padStart(8,'0');
}
function localMediaMigrationStatements(mediaRows,articles,exifRows){
  const oldId=row=>String(row.media_id||row.uid);
  const links=new Map(mediaRows.map(row=>[oldId(row),legacyMediaUid(oldId(row))]));
  if(new Set(links.values()).size!==links.size)throw new Error('Local media UID collision');
  const byArticle=new Map();
  for(const row of mediaRows){
    if(!row.galaxy_link)continue;
    const articleUid=String(row.galaxy_link);
    if(!byArticle.has(articleUid))byArticle.set(articleUid,[]);
    byArticle.get(articleUid).push(links.get(oldId(row)));
  }
  const steps=[
    {sql:'ALTER TABLE local_galaxy_media RENAME TO local_galaxy_media_legacy_backup',values:[]},
    {sql:LOCAL_MEDIA_TABLE_CREATE,values:[]},
    ...mediaRows.map(row=>({sql:'INSERT INTO local_galaxy_media ('+LOCAL_MEDIA_COLUMNS.join(',')+') VALUES ('+LOCAL_MEDIA_COLUMNS.map(()=>'?').join(',')+')',
      values:LOCAL_MEDIA_COLUMNS.map(c=>toSqlValue(c==='uid'?links.get(oldId(row)):row[c]))}))
  ];
  for(const row of articles){
    let ids=[];
    if(row.media_link){
      try{ids=JSON.parse(row.media_link);}catch{throw new Error('Invalid legacy local media links');}
      if(!Array.isArray(ids))throw new Error('Invalid legacy local media links');
    }
    const forward=ids.map(id=>{
      if(!links.has(String(id)))throw new Error('Unresolved legacy local media link');
      return links.get(String(id));
    });
    const next=[...new Set([...forward,...(byArticle.get(String(row.uid))||[])])];
    if(next.length||row.media_link)steps.push({sql:'UPDATE local_galaxy SET media_link=? WHERE uid=?',
      values:[JSON.stringify(next),row.uid]});
  }
  for(const row of exifRows){
    if(!row.media_id)continue;
    if(!links.has(String(row.media_id)))throw new Error('Unresolved local EXIF media link');
    steps.push({sql:'UPDATE local_archive_media_exif SET media_id=? WHERE archive_id=? AND entry_path=?',
      values:[links.get(String(row.media_id)),row.archive_id,row.entry_path]});
  }
  steps.push({sql:'DROP TABLE local_galaxy_media_legacy_backup',values:[]});
  return steps;
}
function upgradeWebLocalMedia(db){
  const columns=rowsOf(db,'PRAGMA table_info(local_galaxy_media)');
  if(!columns.some(row=>row.name==='media_id'||row.name==='galaxy_link'))return;
  const rows=rowsOf(db,'SELECT * FROM local_galaxy_media');
  const articles=rowsOf(db,'SELECT uid,media_link FROM local_galaxy');
  const exif=rowsOf(db,'SELECT archive_id,entry_path,media_id FROM local_archive_media_exif WHERE media_id IS NOT NULL');
  const steps=localMediaMigrationStatements(rows,articles,exif);
  db.run('BEGIN');
  try{
    for(const step of steps)db.run(step.sql,step.values);
    if(Number(rowsOf(db,'SELECT count(*) n FROM local_galaxy_media')[0]?.n)!==rows.length)
      throw new Error('Local media migration count mismatch');
    db.run('COMMIT');
  }catch(error){db.run('ROLLBACK');throw error;}
}
async function upgradeNativeLocalMedia(conn){
  const columns=(await conn.query('PRAGMA table_info(local_galaxy_media)')).values||[];
  if(!columns.some(row=>row.name==='media_id'||row.name==='galaxy_link'))return;
  const rows=(await conn.query('SELECT * FROM local_galaxy_media')).values||[];
  const articles=(await conn.query('SELECT uid,media_link FROM local_galaxy')).values||[];
  const exif=(await conn.query('SELECT archive_id,entry_path,media_id FROM local_archive_media_exif WHERE media_id IS NOT NULL')).values||[];
  const steps=localMediaMigrationStatements(rows,articles,exif);
  await conn.beginTransaction();
  try{
    for(const step of steps){
      if(step.values.length)await conn.run(step.sql,step.values,false);
      else await conn.execute(step.sql+';');
    }
    if(Number((await conn.query('SELECT count(*) n FROM local_galaxy_media')).values?.[0]?.n)!==rows.length)
      throw new Error('Native local media migration count mismatch');
    await conn.commitTransaction();
  }catch(error){await conn.rollbackTransaction();throw error;}
}

const TIME_COLUMNS=['uid','type','title','description','address','anchor_ids','status'];
const TIME_INSERT_SQL='INSERT INTO local_time ('+TIME_COLUMNS.join(',')+') VALUES ('+TIME_COLUMNS.map(()=>'?').join(',')+')';
const oldTimePresent=columns=>columns.some(row=>row.name==='record_id')&&!columns.some(row=>row.name==='uid');
function timeMigrationStatements(oldRows){
  const {rows}=convertLegacyTimeRows(oldRows);
  return [
    {sql:'ALTER TABLE local_time RENAME TO local_time_legacy_backup',values:[]},
    {sql:TIME_TABLE_CREATE,values:[]},
    ...rows.map(row=>({sql:TIME_INSERT_SQL,values:TIME_COLUMNS.map(c=>toSqlValue(row[c]))}))
  ];
}
function upgradeWebLocalTime(db){
  const columns=rowsOf(db,'PRAGMA table_info(local_time)');
  if(!oldTimePresent(columns))return;
  const oldRows=rowsOf(db,'SELECT * FROM local_time');
  const steps=timeMigrationStatements(oldRows);
  db.run('BEGIN');
  try{
    for(const step of steps)db.run(step.sql,step.values);
    const count=Number(rowsOf(db,'SELECT count(*) AS n FROM local_time')[0]?.n)||0;
    const expected=convertLegacyTimeRows(oldRows).rows.length;
    if(count!==expected)throw new Error('SQLite Time migration count mismatch');
    db.run('COMMIT');
  }catch(error){db.run('ROLLBACK');throw error;}
}
async function upgradeNativeLocalTime(conn){
  const columns=(await conn.query('PRAGMA table_info(local_time)')).values||[];
  if(!oldTimePresent(columns))return;
  const oldRows=(await conn.query('SELECT * FROM local_time')).values||[];
  const steps=timeMigrationStatements(oldRows);
  await conn.beginTransaction();
  try{
    for(const step of steps){
      if(step.values.length)await conn.run(step.sql,step.values,false);
      else await conn.execute(step.sql+';');
    }
    const count=Number((await conn.query('SELECT count(*) AS n FROM local_time')).values?.[0]?.n)||0;
    const expected=convertLegacyTimeRows(oldRows).rows.length;
    if(count!==expected)throw new Error('Native Time migration count mismatch');
    await conn.commitTransaction();
  }catch(error){await conn.rollbackTransaction();throw error;}
}

const SCHEMA_MARKER_SQL='INSERT OR IGNORE INTO local_file_meta(format,version) VALUES(?,1)';
// A single settings row must exist (`local` has id='local') before
// read_scope_overview/statistics or keyword-classification finalize can
// read/update it -- mirrors the single `silver.lo3rwang`-style config row
// each real scope already has, seeded once on first use.
const SEED_LOCAL_ROW_SQL=`INSERT OR IGNORE INTO local(id,updated_at) VALUES('local',?)`;

// -- Low-level dual-backend plumbing (same shape as local-rune-sqlite.mjs) --
let webSQL=null;
let webDBPromise=null;
let nativeConnectionPromise=null;

async function sqliteJS(){
  if(!webSQL){
    webSQL=(async()=>{
      const imported=await import('sql.js/dist/sql-asm.js');
      const factory=imported.default||imported;
      return factory();
    })();
  }
  return webSQL;
}
function rowsOf(db,sql,params=[]){
  const stmt=db.prepare(sql,params);
  try{
    const result=[];
    while(stmt.step())result.push(stmt.getAsObject());
    return result;
  }finally{stmt.free();}
}
function legacyKeywordPlan(items=[]){
  const classes=new Map(),used=new Set();
  for(const item of items){
    const old=String(item.class_id||item.class_name||'');
    if(!old)throw new Error('Legacy local Keywords class has no identity');
    if(!classes.has(old)){
      const uid=generateKeywordClassUid([...used]);
      used.add(uid);
      classes.set(old,uid);
    }
  }
  return classes;
}
function portableKeywordStatements(items,classes){
  const statements=[{sql:"CREATE TABLE local_keywords_portable (keyword_id INTEGER PRIMARY KEY AUTOINCREMENT,group_name TEXT NOT NULL,item_name TEXT NOT NULL,principle TEXT NOT NULL DEFAULT '',keywords TEXT NOT NULL DEFAULT '[]',order_no INTEGER NOT NULL DEFAULT 0,class_name TEXT NOT NULL,class_group TEXT NOT NULL,class_enable INTEGER NOT NULL DEFAULT 1,class_uid TEXT NOT NULL,uidlist TEXT NOT NULL DEFAULT '[]')",values:[]}];
  for(const row of items)statements.push({
    sql:"INSERT INTO local_keywords_portable(keyword_id,group_name,item_name,principle,keywords,order_no,class_name,class_group,class_enable,class_uid,uidlist) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    values:[row.keyword_id,row.group_name,row.item_name,row.principle||'',row.keywords||'[]',
      row.order_no||0,row.class_name,row.class_group,row.class_enable,classes.get(String(row.class_id||row.class_name)),'[]']
  });
  statements.push({sql:"DROP TABLE local_keywords",values:[]});
  statements.push({sql:"ALTER TABLE local_keywords_portable RENAME TO local_keywords",values:[]});
  for(const [old,uid] of classes){
    const row=items.find(item=>String(item.class_id||item.class_name)===old);
    const defaultItem=items.find(item=>String(item.class_id||item.class_name)===old&&
      Number(item.item_no)===Number(row?.default_group_item_no??0));
    statements.push({sql:'INSERT OR IGNORE INTO local_keyword_classes(class_uid,scope_id,default_keyword_id) VALUES(?,?,?)',
      values:[uid,'local',defaultItem?.keyword_id||null]});
  }
  return statements;
}
function upgradeWebKeywordSchema(db){
  if(!rowsOf(db,"PRAGMA table_info(local)").some(row=>row.name==='current_keyword_class_uid'))
    db.run('ALTER TABLE local ADD COLUMN current_keyword_class_uid TEXT');
  if(rowsOf(db,"PRAGMA table_info(local_keywords)").some(row=>row.name==='class_uid'))return;
  db.run('CREATE TABLE IF NOT EXISTS local_keyword_classes(class_uid TEXT PRIMARY KEY,scope_id TEXT NOT NULL,default_keyword_id INTEGER)');
  const items=rowsOf(db,'SELECT * FROM local_keywords');
  const classes=legacyKeywordPlan(items);
  const oldCurrent=rowsOf(db,'SELECT current_keyword_class_id FROM local WHERE id=?',['local'])[0]?.current_keyword_class_id;
  db.run('BEGIN TRANSACTION');
  try{
    for(const item of portableKeywordStatements(items,classes))db.run(item.sql,item.values);
    db.run("UPDATE local SET current_keyword_class_uid=?,staticstime=NULL,keyword_meta='{}' WHERE id=?",
      [classes.get(String(oldCurrent))||null,'local']);
    db.run('COMMIT');
  }catch(error){db.run('ROLLBACK');throw error;}
}
async function upgradeNativeKeywordSchema(conn){
  let columns=(await conn.query('PRAGMA table_info(local)')).values||[];
  if(!columns.some(row=>row.name==='current_keyword_class_uid'))
    await conn.execute('ALTER TABLE local ADD COLUMN current_keyword_class_uid TEXT');
  columns=(await conn.query('PRAGMA table_info(local_keywords)')).values||[];
  if(columns.some(row=>row.name==='class_uid'))return;
  await conn.execute('CREATE TABLE IF NOT EXISTS local_keyword_classes(class_uid TEXT PRIMARY KEY,scope_id TEXT NOT NULL,default_keyword_id INTEGER)');
  const items=(await conn.query('SELECT * FROM local_keywords')).values||[];
  const classes=legacyKeywordPlan(items);
  const current=(await conn.query("SELECT current_keyword_class_id FROM local WHERE id='local'")).values?.[0]?.current_keyword_class_id;
  await conn.execute('BEGIN TRANSACTION');
  try{
    for(const item of portableKeywordStatements(items,classes)){
      if(item.values.length)await conn.run(item.sql,item.values,false);
      else await conn.execute(item.sql);
    }
    await conn.run("UPDATE local SET current_keyword_class_uid=?,staticstime=NULL,keyword_meta='{}' WHERE id='local'",
      [classes.get(String(current))||null],false);
    await conn.execute('COMMIT');
  }catch(error){await conn.execute('ROLLBACK');throw error;}
}

function createFreshSQL(SQL){
  const db=new SQL.Database();
  db.run(SCHEMA);
  db.run(SCHEMA_MARKER_SQL,[MARKER]);
  return db;
}
function idbStore(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('loc-local-scope-sqlite-v1',1);
    req.onupgradeneeded=()=>{req.result.createObjectStore('databases');};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('本機 SQLite 儲存無法開啟。'));
  });
}
async function readWebBytes(){
  const store=await idbStore();
  try{return await new Promise((resolve,reject)=>{
    const tx=store.transaction('databases','readonly');
    const req=tx.objectStore('databases').get('local');
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });}finally{store.close();}
}
async function writeWebBytes(bytes){
  const store=await idbStore();
  try{await new Promise((resolve,reject)=>{
    const tx=store.transaction('databases','readwrite');
    tx.objectStore('databases').put(bytes,'local');
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });}finally{store.close();}
}
async function webDatabase(){
  if(!webDBPromise)webDBPromise=(async()=>{
    const SQL=await sqliteJS();
    const bytes=await readWebBytes();
    const db=bytes?new SQL.Database(new Uint8Array(bytes)):createFreshSQL(SQL);
    db.run(SCHEMA);
    upgradeWebLocalTime(db);
    upgradeWebLocalArchiveExif(db);
    upgradeWebLocalMedia(db);
    upgradeWebKeywordSchema(db);
    if(!rowsOf(db,'PRAGMA table_info(local)').some(row=>row.name==='txt_class'))
      db.run("ALTER TABLE local ADD COLUMN txt_class TEXT NOT NULL DEFAULT '[]'");
    db.run(SCHEMA_MARKER_SQL,[MARKER]);
    db.run(SEED_LOCAL_ROW_SQL,[new Date().toISOString()]);
    return db;
  })().catch(e=>{webDBPromise=null;throw e;});
  return webDBPromise;
}
async function nativeDatabase(){
  if(!nativeConnectionPromise)nativeConnectionPromise=(async()=>{
    const {SQLiteConnection,CapacitorSQLite}=await import('@capacitor-community/sqlite');
    const plugin=new SQLiteConnection(CapacitorSQLite);
    const exists=await plugin.isConnection(DATABASE_NAME,false);
    const conn=exists.result?await plugin.retrieveConnection(DATABASE_NAME,false)
      :await plugin.createConnection(DATABASE_NAME,false,'no-encryption',1,false);
    await conn.open();
    for(const statement of SCHEMA.split(';').map(s=>s.trim()).filter(Boolean))await conn.execute(statement+';');
    await upgradeNativeLocalTime(conn);
    await upgradeNativeLocalArchiveExif(conn);
    await upgradeNativeLocalMedia(conn);
    await upgradeNativeKeywordSchema(conn);
    const columns=(await conn.query('PRAGMA table_info(local)')).values||[];
    if(!columns.some(row=>row.name==='txt_class'))
      await conn.execute("ALTER TABLE local ADD COLUMN txt_class TEXT NOT NULL DEFAULT '[]'");
    await conn.run(SCHEMA_MARKER_SQL,[MARKER],false);
    await conn.run(SEED_LOCAL_ROW_SQL,[new Date().toISOString()],false);
    return conn;
  })().catch(error=>{nativeConnectionPromise=null;throw error;});
  return nativeConnectionPromise;
}
async function selectLocal(sql,values=[]){
  if(Capacitor.isNativePlatform()){
    const conn=await nativeDatabase();
    return (await conn.query(sql,values)).values||[];
  }
  return rowsOf(await webDatabase(),sql,values);
}
// Returns {changes, lastRows} -- lastRows only populated on native via a
// follow-up SELECT when the caller needs inserted/updated rows back (mirrors
// PostgREST's .select() chained after a write).
async function runLocal(sql,values=[]){
  if(Capacitor.isNativePlatform()){
    const conn=await nativeDatabase();
    const result=await conn.run(sql,values,false);
    return Number(result?.changes?.changes||0);
  }
  const db=await webDatabase();
  db.run(sql,values);
  const changes=db.getRowsModified();
  await writeWebBytes(db.export());
  return changes;
}
async function runBatchLocal(statements){
  // statements: [{sql,values}]; executed as one transaction, same semantics
  // as the Postgres management_write RPC being a single statement call.
  if(Capacitor.isNativePlatform()){
    const conn=await nativeDatabase();
    await conn.beginTransaction();
    try{
      let changes=0;
      for(const {sql,values} of statements){
        const result=await conn.run(sql,values,false);
        changes+=Number(result?.changes?.changes||0);
      }
      await conn.commitTransaction();
      return changes;
    }catch(error){await conn.rollbackTransaction();throw error;}
  }
  const db=await webDatabase();
  db.run('BEGIN');
  try{
    let changes=0;
    for(const {sql,values} of statements){
      db.run(sql,values);
      changes+=db.getRowsModified();
    }
    db.run('COMMIT');
    await writeWebBytes(db.export());
    return changes;
  }catch(error){db.run('ROLLBACK');throw error;}
}

// -- SQL identifier / value helpers --
const IDENT=/^[a-zA-Z_][a-zA-Z0-9_]*$/;
function quoteIdent(name){
  if(!IDENT.test(String(name||'')))throw new Error('Invalid column/table identifier: '+name);
  return '"'+name+'"';
}
// Only `silver.<name>` relations are ever asked for; the schema prefix is
// discarded (there is exactly one local schema) and the table must be one of
// ours -- anything else is a programming error, not a permission question
// (local has no multi-user permission model to enforce).
function tableName(table){
  const name=String(table||'').split('.').pop();
  if(!IDENT.test(name))throw new Error('Invalid table name: '+name);
  return name;
}
function toSqlValue(value){
  if(value===undefined||value===null)return null;
  if(typeof value==='boolean')return value?1:0;
  if(Array.isArray(value)||(typeof value==='object'))return JSON.stringify(value);
  return value;
}

// -- PostgREST-like filter compiler (eq/neq/gt/gte/lt/lte/like/ilike/is/in/not) --
function compileFilter(column,op,value){
  const col=quoteIdent(column);
  switch(op){
    case 'eq':return value===null?{sql:col+' IS NULL',params:[]}:{sql:col+'=?',params:[toSqlValue(value)]};
    case 'neq':return value===null?{sql:col+' IS NOT NULL',params:[]}:{sql:col+'<>?',params:[toSqlValue(value)]};
    case 'gt':return {sql:col+'>?',params:[toSqlValue(value)]};
    case 'gte':return {sql:col+'>=?',params:[toSqlValue(value)]};
    case 'lt':return {sql:col+'<?',params:[toSqlValue(value)]};
    case 'lte':return {sql:col+'<=?',params:[toSqlValue(value)]};
    case 'like':return {sql:col+' LIKE ?',params:[String(value)]};
    case 'ilike':return {sql:'lower('+col+') LIKE lower(?)',params:[String(value)]};
    case 'is':return {sql:col+(value===null?' IS NULL':value===true?'=1':'=0'),params:[]};
    case 'in':return {sql:col+' IN ('+(Array.isArray(value)?value:[value]).map(()=>'?').join(',')+')',
      params:(Array.isArray(value)?value:[value]).map(toSqlValue)};
    case 'not':return {sql:'NOT ('+compileFilter(column,value.op,value.value).sql+')',params:compileFilter(column,value.op,value.value).params};
    default:throw new Error('Unsupported filter operator: '+op);
  }
}

// -- Chainable query builder matching the subset of the Supabase JS client
//    actually used by db-contract.mjs / Culture.jsx / Statistics / Search.jsx --
function queryBuilder(table){
  const name=tableName(table);
  const state={select:'*',filters:[],order:null,limitN:null,rangeFrom:null,rangeTo:null,single:false,maybeSingle:false,countRequested:null};
  async function execute(){
    try{
      const where=state.filters.map(f=>compileFilter(f.column,f.op,f.value));
      const whereSql=where.length?' WHERE '+where.map(w=>w.sql).join(' AND '):'';
      const params=where.flatMap(w=>w.params);
      let sql='SELECT '+state.select+' FROM '+quoteIdent(name)+whereSql;
      if(state.order)sql+=' ORDER BY '+quoteIdent(state.order.column)+(state.order.ascending===false?' DESC':' ASC');
      const rangeApplied=state.rangeFrom!==null||state.limitN!==null;
      if(state.rangeFrom!==null){
        const count=(state.rangeTo!==null?state.rangeTo-state.rangeFrom+1:-1);
        sql+=' LIMIT '+(count>=0?count:-1)+' OFFSET '+state.rangeFrom;
      }else if(state.limitN!==null)sql+=' LIMIT '+state.limitN;
      const rows=await selectLocal(sql,params);
      const data=rows.map(decodeRow);
      if(state.single)return {data:data[0]||null,error:data.length===1?null:{message:'Expected exactly one row'}};
      if(state.maybeSingle)return {data:data[0]||null,error:null};
      // PostgREST's `count:'exact'` reports the TOTAL rows matching the
      // filters, ignoring range/limit -- callers like selectAllRows rely on
      // this to know when to stop paginating. When no range/limit is applied,
      // data.length already IS that total, so skip the extra query. When one
      // is applied, data.length would only be the current page's size, which
      // previously made selectAllRows under-paginate and silently drop rows
      // past the first page; run a separate COUNT(*) (same WHERE, no range).
      let total=data.length;
      if(state.countRequested&&rangeApplied){
        const countRows=await selectLocal('SELECT COUNT(*) AS n FROM '+quoteIdent(name)+whereSql,params);
        total=Number(countRows?.[0]?.n)||0;
      }
      return {data,error:null,count:total};
    }catch(error){return {data:null,error:{message:String(error?.message||error)}};}
  }
  const chain={
    select(columns,options){state.select=columns?String(columns).split(',').map(c=>quoteIdent(c.trim())).join(','):'*';if(options&&options.count)state.countRequested=options.count;return chain;},
    eq(col,val){state.filters.push({column:col,op:'eq',value:val});return chain;},
    neq(col,val){state.filters.push({column:col,op:'neq',value:val});return chain;},
    gt(col,val){state.filters.push({column:col,op:'gt',value:val});return chain;},
    gte(col,val){state.filters.push({column:col,op:'gte',value:val});return chain;},
    lt(col,val){state.filters.push({column:col,op:'lt',value:val});return chain;},
    lte(col,val){state.filters.push({column:col,op:'lte',value:val});return chain;},
    like(col,val){state.filters.push({column:col,op:'like',value:val});return chain;},
    ilike(col,val){state.filters.push({column:col,op:'ilike',value:val});return chain;},
    is(col,val){state.filters.push({column:col,op:'is',value:val});return chain;},
    in(col,val){state.filters.push({column:col,op:'in',value:val});return chain;},
    not(col,op,val){state.filters.push({column:col,op:'not',value:{op,value:val}});return chain;},
    order(col,opts={}){state.order={column:col,ascending:opts.ascending!==false};return chain;},
    limit(n){state.limitN=Number(n);return chain;},
    range(from,to){state.rangeFrom=Number(from);state.rangeTo=Number(to);return chain;},
    single(){state.single=true;return chain;},
    maybeSingle(){state.maybeSingle=true;return chain;},
    // Writes mirror management_write's own semantics 1:1 (see the verified
    // silver.management_write / api.management_write SQL): insert takes an
    // array of row objects; update/delete require at least one eq filter.
    async insert(rows){
      const list=Array.isArray(rows)?rows:[rows];
      if(!list.length)return {data:[],error:null};
      try{
        const statements=list.map(row=>{
          const columns=Object.keys(row);
          const sql='INSERT INTO '+quoteIdent(name)+' ('+columns.map(quoteIdent).join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')';
          return {sql,values:columns.map(c=>toSqlValue(row[c]))};
        });
        const changes=await runBatchLocal(statements);
        return {data:list,error:null,count:changes};
      }catch(error){return {data:null,error:{message:String(error?.message||error)}};}
    },
    async upsert(rows,{onConflict}={}){
      const list=Array.isArray(rows)?rows:[rows];
      if(!list.length)return {data:[],error:null};
      try{
        const statements=list.map(row=>{
          const columns=Object.keys(row);
          const sql='INSERT INTO '+quoteIdent(name)+' ('+columns.map(quoteIdent).join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')'+
            (onConflict?' ON CONFLICT('+quoteIdent(onConflict)+') DO UPDATE SET '+columns.filter(c=>c!==onConflict).map(c=>quoteIdent(c)+'=excluded.'+quoteIdent(c)).join(',') :'');
          return {sql,values:columns.map(c=>toSqlValue(row[c]))};
        });
        const changes=await runBatchLocal(statements);
        return {data:list,error:null,count:changes};
      }catch(error){return {data:null,error:{message:String(error?.message||error)}};}
    },
    async update(values){
      if(!state.filters.length)return {data:null,error:{message:'filters are required'}};
      try{
        const where=state.filters.map(f=>compileFilter(f.column,f.op,f.value));
        const columns=Object.keys(values);
        const sql='UPDATE '+quoteIdent(name)+' SET '+columns.map(c=>quoteIdent(c)+'=?').join(',')+
          ' WHERE '+where.map(w=>w.sql).join(' AND ');
        const params=[...columns.map(c=>toSqlValue(values[c])),...where.flatMap(w=>w.params)];
        const changes=await runLocal(sql,params);
        return {data:changes?[values]:[],error:null,count:changes};
      }catch(error){return {data:null,error:{message:String(error?.message||error)}};}
    },
    async delete(){
      if(!state.filters.length)return {data:null,error:{message:'filters are required'}};
      try{
        const where=state.filters.map(f=>compileFilter(f.column,f.op,f.value));
        const sql='DELETE FROM '+quoteIdent(name)+' WHERE '+where.map(w=>w.sql).join(' AND ');
        const changes=await runLocal(sql,where.flatMap(w=>w.params));
        return {data:[],error:null,count:changes};
      }catch(error){return {data:null,error:{message:String(error?.message||error)}};}
    },
    then(resolve,reject){return execute().then(resolve,reject);},
    catch(reject){return execute().catch(reject);},
    finally(done){return execute().finally(done);}
  };
  return chain;
}
// JSON/boolean columns round-trip through TEXT/INTEGER in SQLite; decode the
// handful of columns that are arrays/objects/booleans in the real Postgres
// schema so callers see the same shapes they'd get from Supabase.
const JSON_COLUMNS=new Set(['txt_class','keyword_meta','search_aliases','block_entity','block_image',
  'target_id','media_link','anchor_ids','keywords','uidlist','runeslist','rune_references']);
const BOOL_COLUMNS=new Set(['search_able','statistics_able','culture_able','keyword_class_share_enabled',
  'searchable','class_enable']);
function decodeRow(row){
  const out={...row};
  for(const key of Object.keys(out)){
    if(JSON_COLUMNS.has(key)&&typeof out[key]==='string'){
      try{out[key]=JSON.parse(out[key]);}catch{/* leave as-is */}
    }
    if(BOOL_COLUMNS.has(key))out[key]=Boolean(Number(out[key]));
  }
  return out;
}

// -- RPC dispatch: only the handful of `silver.*` functions the three
//    features (Culture/Statistics/Search) and db-contract.mjs actually call
//    are implemented locally; see db-contract.mjs's full rpc() call list. --
async function managementWriteLocal(payload){
  const {p_table:table,p_operation:op,p_rows:rows,p_values:values,p_filters:filters=[]}=payload||{};
  try{
    const name=tableName(table);
    if(op==='insert'){
      const list=Array.isArray(rows)?rows:[];
      if(!list.length)return {data:{count:0},error:null};
      const statements=list.map(input=>{
        // PostgreSQL fills UpdateTime on import; SQLite needs the same value.
        const row=name==='local_galaxy'&&input.UpdateTime==null
          ?{...input,UpdateTime:new Date().toISOString()}:input;
        const columns=Object.keys(row);
        return {sql:'INSERT INTO '+quoteIdent(name)+' ('+columns.map(quoteIdent).join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')',
          values:columns.map(c=>toSqlValue(row[c]))};
      });
      return {data:{count:await runBatchLocal(statements)},error:null};
    }
    if(op==='update'){
      if(!filters.length)throw new Error('filters are required');
      const columns=Object.keys(values||{});
      const where=filters.map(f=>compileFilter(f.column,f.operator||'eq',f.value));
      const sql='UPDATE '+quoteIdent(name)+' SET '+columns.map(c=>quoteIdent(c)+'=?').join(',')+' WHERE '+where.map(w=>w.sql).join(' AND ');
      const params=[...columns.map(c=>toSqlValue(values[c])),...where.flatMap(w=>w.params)];
      return {data:{count:await runLocal(sql,params)},error:null};
    }
    if(op==='delete'){
      if(!filters.length)throw new Error('filters are required');
      const where=filters.map(f=>compileFilter(f.column,f.operator||'eq',f.value));
      const sql='DELETE FROM '+quoteIdent(name)+' WHERE '+where.map(w=>w.sql).join(' AND ');
      return {data:{count:await runLocal(sql,where.flatMap(w=>w.params))},error:null};
    }
    throw new Error('unsupported operation');
  }catch(error){return {data:null,error:{message:String(error?.message||error)}};}
}
// Local equivalent of silver.read_scope_statistics: same output shape
// ({day,kind,category,item_count} rows) computed over local_galaxy instead
// of the dynamic cross-table Postgres aggregation.
async function readScopeStatisticsLocal({p_start,p_end,p_include_undated}){
  const where=[],params=[];
  if(p_start){where.push("date(createtime, '+8 hours')>=?");params.push(p_start);}
  if(p_end){where.push("date(createtime, '+8 hours')<=?");params.push(p_end);}
  if(!p_include_undated)where.push('createtime IS NOT NULL');
  const articleWhere=['statistics_able=1',...where].join(' AND ');
  const mediaWhere=where.length?' WHERE '+where.join(' AND '):'';
  const [text,media]=await Promise.all([
    selectLocal(`SELECT date(createtime, '+8 hours') AS day,
      'source' AS kind, coalesce(source_name,'') AS category, count(*) AS item_count
      FROM local_galaxy WHERE ${articleWhere} GROUP BY day,category ORDER BY day`,params),
    selectLocal(`SELECT date(createtime, '+8 hours') AS day,
      'media' AS kind, coalesce(media_type,'') AS category, count(*) AS item_count
      FROM local_galaxy_media${mediaWhere} GROUP BY day,category ORDER BY day`,params)
  ]);
  const rows=[...text,...media].map(row=>({
    day:row.day||'',kind:row.kind,category:row.category||'',item_count:Number(row.item_count)||0
  }));
  const daily=new Map();
  for(const row of rows){
    const key=row.day+'|'+(row.kind==='media'?'多媒體':'文字作品');
    daily.set(key,(daily.get(key)||0)+row.item_count);
  }
  for(const [key,count] of daily){
    const mark=key.indexOf('|');
    rows.push({day:key.slice(0,mark),kind:'total',category:key.slice(mark+1),item_count:count});
  }
  return {data:rows,error:null};
}
async function readScopeEarliestLocal(){
  const rows=await selectLocal("SELECT min(date(createtime, '+8 hours')) AS earliest FROM local_galaxy WHERE createtime IS NOT NULL");
  return {data:rows[0]?.earliest||null,error:null};
}
async function readScopeOverviewLocal({p_start,p_end}){
  const [stats,earliest,settings]=await Promise.all([
    readScopeStatisticsLocal({p_start,p_end,p_include_undated:false}),
    readScopeEarliestLocal(),
    selectLocal("SELECT txt_class FROM local WHERE id='local' LIMIT 1")
  ]);
  let values=[];
  try{values=JSON.parse(settings[0]?.txt_class||'[]');}catch{/* Default to an empty list. */}
  const taxonomy=sourceTaxonomyFromArrays(values);
  return {data:{earliest:earliest.data,rows:stats.data,
    categories:taxonomy.categories,aliases:taxonomy.aliases},error:null};
}

// Local equivalent of api.read_keyword_class: no scope_id, no share-permission
// gate (there is only one local reader), just the class's rows in order.
async function readKeywordItemCatalogLocal(){
  const cfg=await selectLocal("SELECT current_keyword_class_uid FROM local WHERE id='local'");
  const uid=String(cfg[0]?.current_keyword_class_uid||'');
  if(!uid)return {data:[],error:null};
  const rows=await selectLocal(
    'SELECT keyword_id,class_group,item_name,order_no,class_enable FROM local_keywords WHERE class_uid=? ORDER BY order_no,keyword_id',[uid]
  );
  return {data:rows.map(decodeRow),error:null};
}

async function readKeywordClassLocal({p_class_uid}={}){
  const uid=String(p_class_uid||'');
  if(!/^[0-9A-Za-z]{4}$/.test(uid))return {data:null,error:null};
  const rows=await selectLocal('SELECT keyword_id,class_uid,group_name,item_name,principle,keywords,order_no,class_name,class_group,class_enable FROM local_keywords WHERE class_uid=? ORDER BY order_no,keyword_id',[uid]);
  return {data:rows.map(decodeRow),error:null};
}
// On-device equivalent of silver.read_keyword_uidlist_summary.
// The device owns its entire SQLite dataset, so no external DB is needed.
async function readKeywordUidlistSummaryLocal({p_start=null,p_end=null,p_source=null}={}){
  const config=await selectLocal("SELECT current_keyword_class_uid FROM local WHERE id='local'");
  const uid=String(config[0]?.current_keyword_class_uid||'');
  if(!uid)return {data:[],error:null};
  const catalog=await selectLocal('SELECT keyword_id,class_group,order_no,class_enable FROM local_keywords WHERE class_uid=? ORDER BY order_no,keyword_id',[uid]);
  const registry=await selectLocal('SELECT default_keyword_id FROM local_keyword_classes WHERE class_uid=?',[uid]);
  const defaultItem=catalog.find(row=>String(row.keyword_id)===String(registry[0]?.default_keyword_id||''));
  const groups=new Map();
  for(const row of catalog.filter(item=>Number(item.class_enable)!==0)){
    const name=String(row.class_group||'');
    if(!groups.has(name))groups.set(name,Number(row.order_no)||0);
    else groups.set(name,Math.min(groups.get(name),Number(row.order_no)||0));
  }
  const ordered=[...groups].sort(([a,ao],[b,bo])=>
    Number(a===defaultItem?.class_group)-Number(b===defaultItem?.class_group)||ao-bo||a.localeCompare(b));
  const numbers=new Map(ordered.map(([name],i)=>[name,i+1]));
  const raw=await selectLocal(`
    SELECT k.keyword_id,k.class_group,j.value AS hit,
      g.uid,date(g.createtime,'+8 hours') AS day
    FROM local_keywords k JOIN json_each(k.uidlist) j
    JOIN local_galaxy g ON g.uid=json_extract(j.value,'$.uid')
    WHERE k.class_uid=? AND k.class_enable=1
      AND g.searchable=1 AND g.statistics_able=1
      AND (? IS NULL OR date(g.createtime,'+8 hours')>=?)
      AND (? IS NULL OR date(g.createtime,'+8 hours')<=?)
      AND (? IS NULL OR g.source_name=?)
  `,[uid,p_start,p_start,p_end,p_end,p_source,p_source]);
  const byItem=new Map(),byItemDay=new Map(),byGroupDay=new Map(),
    byAllDay=new Map(),byGroupItemDay=new Map(),seenArticles=new Set(),
    articleGroupStrength=new Map();
  const add=(map,key,uid,amount)=>{
    const entry=map.get(key)||{hit_count:0,uids:new Set()};
    entry.hit_count+=amount;entry.uids.add(uid);map.set(key,entry);
  };
  for(const row of raw){
    const hit=JSON.parse(row.hit||'{}'),times=Number(hit.times)||0;
    if(times<0)continue;
    const day=String(row.day||''),article=String(row.uid||'');
    const item=String(row.keyword_id),group=String(row.class_group||'');
    seenArticles.add(article);
    const key=article+'\\0'+day;
    if(!articleGroupStrength.has(key))articleGroupStrength.set(key,new Map());
    const strengths=articleGroupStrength.get(key);
    strengths.set(group,(strengths.get(group)||0)+times);
    if(times>0){
      add(byItem,item,article,times);
      add(byItemDay,item+'\\0'+day,article,times);
      add(byAllDay,day,article,1);
      add(byGroupItemDay,group+'\\0'+day,article,1);
    }
  }
  // A document contributes to exactly one classification Group per day.
  // Tied Groups use the configured fallback; otherwise the configured order.
  for(const [key,strengths] of articleGroupStrength){
    const [article,day]=key.split('\\0');
    const sorted=[...strengths].sort(([a,av],[b,bv])=>
      bv-av||Number(b===defaultItem?.class_group)-Number(a===defaultItem?.class_group)
        ||(numbers.get(a)||999999)-(numbers.get(b)||999999));
    if(sorted.length)add(byGroupDay,sorted[0][0]+'\\0'+day,article,1);
  }
  const out=[{kind:'eligible',item_key:null,class_id:null,day:'',
    hit_count:seenArticles.size,document_count:seenArticles.size}];
  for(const [item,v] of byItem)out.push({kind:'item',item_key:item,class_id:null,day:'',
    hit_count:v.hit_count,document_count:v.uids.size});
  for(const [key,v] of byItemDay){
    const [item,day]=key.split('\\0');
    out.push({kind:'item_day',item_key:item,class_id:null,day,
      hit_count:v.hit_count,document_count:v.uids.size});
  }
  for(const [key,v] of byGroupDay){
    const [group,day]=key.split('\\0');
    out.push({kind:'class_day',item_key:null,class_id:numbers.get(group)||null,day,
      hit_count:v.uids.size,document_count:v.uids.size});
  }
  for(const [day,v] of byAllDay)out.push({kind:'keyword_all_day',item_key:null,class_id:null,day,
    hit_count:v.uids.size,document_count:v.uids.size});
  for(const [key,v] of byGroupItemDay){
    const [group,day]=key.split('\\0');
    out.push({kind:'group_items_day',item_key:group,class_id:null,day,
      hit_count:v.uids.size,document_count:v.uids.size});
  }
  return {data:out,error:null};
}

// One-time (or on-demand "restore to default") copy: seeds/overwrites
// local_keywords from a default keyword-library row set the caller supplies
// (e.g. fetched once from the cloud lo3rwang_keywords reference library).
// The source itself is never written back to -- only read -- so it always
// stays a clean reference the device copy can be reset against later.
export async function restoreKeywordLibraryFromDefault(defaultRows=[]){
  const classes=new Map();
  for(const row of defaultRows){
    const uid=String(row.class_uid||'');
    if(!/^[A-Za-z0-9]{4}$/.test(uid))throw new Error('Default Keywords need Class UID');
    if(!classes.has(uid))classes.set(uid,[]);
    classes.get(uid).push(row);
  }
  const statements=[
    {sql:'DELETE FROM local_keywords',values:[]},
    {sql:'DELETE FROM local_keyword_classes',values:[]}
  ];
  for(const [uid,items] of classes){
    const defaultRow=items.find(row=>String(row.keyword_id)===String(row.default_keyword_id||''))||null;
    statements.push({sql:'INSERT INTO local_keyword_classes(class_uid,scope_id,default_keyword_id) VALUES(?,?,?)',
      values:[uid,'local',defaultRow?.keyword_id||null]});
    for(const row of items)statements.push({
      sql:'INSERT INTO local_keywords(keyword_id,group_name,item_name,principle,keywords,order_no,class_name,class_group,class_enable,class_uid,uidlist) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      values:[row.keyword_id??null,row.group_name||row.class_name,row.item_name,row.principle||'',
        JSON.stringify(row.keywords||[]),row.order_no||0,row.class_name,row.class_group,
        row.class_enable!==false?1:0,uid,'[]']
    });
  }
  const first=[...classes.keys()][0]||null;
  statements.push({sql:"UPDATE local SET current_keyword_class_uid=?,keyword_meta='{}',staticstime=NULL WHERE id='local'",values:[first]});
  return runBatchLocal(statements);
}

async function saveArchiveMediaExifLocal({p_scope_id,p_rows}={}){
  try{
    if(p_scope_id!=='local')throw new Error('Invalid local EXIF scope');
    if(!Array.isArray(p_rows)||p_rows.length>200)throw new Error('EXIF batch exceeds 200 entries');
    const statements=[];
    for(const item of p_rows){
      const id=String(item?.media_uid||''),archive=String(item?.archive_id||'');
      const path=String(item?.entry_path||'');
      const lat=item.latitude??null,lng=item.longitude??null;
      const valid=(lat===null&&lng===null)||
        (Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180);
      if((id&&!/^[A-Z0-9]{8}$/.test(id))||!archive||!path||archive.length>400||
          path.length>2048||!valid)throw new Error('Invalid local archive EXIF metadata');
      if(lat===null&&!item.camera_local_time)continue;
      if(id){
        const exists=await selectLocal('SELECT uid FROM local_galaxy_media WHERE uid=? LIMIT 1',[id]);
        if(!exists.length)throw new Error('EXIF media is not registered');
      }
      statements.push({sql:`INSERT INTO local_archive_media_exif
        (archive_id,entry_path,media_id,platform,latitude,longitude,camera_local_time,imported_at)
        VALUES(?,?,?,?,?,?,?,?)
        ON CONFLICT(archive_id,entry_path) DO UPDATE SET
          media_id=excluded.media_id,platform=coalesce(excluded.platform,platform),
          latitude=coalesce(excluded.latitude,latitude),
          longitude=coalesce(excluded.longitude,longitude),
          camera_local_time=coalesce(excluded.camera_local_time,camera_local_time),
          imported_at=excluded.imported_at`,
        values:[archive,path,id||null,item.platform||null,lat,lng,item.camera_local_time||null,new Date().toISOString()]});
    }
    const count=statements.length?await runBatchLocal(statements):0;
    return {data:count,error:null};
  }catch(error){return {data:null,error:{message:String(error?.message||error)}};}
}

export async function rpcLocal(name,args={}){
  switch(name){
    case 'management_write':return managementWriteLocal(args);
    case 'save_archive_media_exif':return saveArchiveMediaExifLocal(args);
    case 'read_scope_statistics':return readScopeStatisticsLocal(args);
    case 'read_scope_overview':return readScopeOverviewLocal(args);
    case 'read_scope_earliest':return readScopeEarliestLocal(args);
    case 'read_keyword_class_by_uid':return readKeywordClassLocal(args);
    case 'read_keyword_item_catalog':return readKeywordItemCatalogLocal(args);
    case 'read_keyword_uidlist_summary':return readKeywordUidlistSummaryLocal(args);
    case 'read_rune66_summary':{
      const result=await readKeywordUidlistSummaryLocal(args);
      return {...result,data:(result.data||[]).filter(row=>!['item_day','group_items_day','keyword_all_day'].includes(row.kind))};
    }
    // Nothing reads these yet anywhere in the app (verified: no consumer of
    // silver.loc_search_keywords exists); kept as a safe no-op so Search.jsx's
    // fire-and-forget call never throws.
    case 'log_search_keyword':return {data:null,error:null};
    default:return {data:null,error:{message:'RPC not implemented for local scope: '+name}};
  }
}

function schemaClient(){
  return {
    from(table){return queryBuilder(table);},
    rpc(name,args={}){return rpcLocal(name,args);}
  };
}

// auth stub: a local device has exactly one always-signed-in "account"; no
// OAuth round trip is possible or necessary against a SQLite file.
const LOCAL_SESSION={user:{id:'local-device',email:null},access_token:'local'};
const localAuth={
  async getSession(){return {data:{session:LOCAL_SESSION},error:null};},
  async signInWithOAuth(){return {data:{session:LOCAL_SESSION},error:null};},
  async signOut(){return {error:null};}
};

export function createLocalSqliteAdapter(){
  const client={schema:()=>schemaClient()};
  return {publicClient:client,authClient:client,auth:localAuth};
}
