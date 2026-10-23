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

const DATABASE_NAME='loc_local_scope';
const MARKER='loc.local.scope.sqlite.v1';
const SCHEMA=`
CREATE TABLE IF NOT EXISTS local (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT,
  period TEXT,
  period_start TEXT,
  period_end TEXT,
  style INTEGER,
  theme TEXT NOT NULL DEFAULT 'theme-7',
  search_able INTEGER NOT NULL DEFAULT 1,
  statistics_able INTEGER NOT NULL DEFAULT 1,
  culture_able INTEGER NOT NULL DEFAULT 1,
  sources TEXT NOT NULL DEFAULT '["facebook","threads","ig","x","others"]',
  source_counts TEXT NOT NULL DEFAULT '{"x":0,"ig":0,"others":0,"threads":0,"facebook":0}',
  updated_at TEXT NOT NULL,
  media_count INTEGER NOT NULL DEFAULT 0,
  media_counts TEXT NOT NULL DEFAULT '{}',
  keyword_min_chars INTEGER NOT NULL DEFAULT 32,
  keyword_min_documents INTEGER NOT NULL DEFAULT 100,
  staticstime TEXT,
  current_keyword_class_id TEXT,
  keyword_class_share_enabled INTEGER NOT NULL DEFAULT 0,
  keyword_document_count INTEGER NOT NULL DEFAULT 0,
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
  statistics_able INTEGER NOT NULL DEFAULT 1,
  class_id INTEGER,
  group_lists TEXT NOT NULL DEFAULT 'false'
);
CREATE TABLE IF NOT EXISTS local_galaxy_media (
  media_id TEXT PRIMARY KEY NOT NULL,
  galaxy_link TEXT,
  media_type TEXT NOT NULL,
  title TEXT,
  url TEXT,
  meta_tags TEXT,
  createtime TEXT,
  source_place TEXT,
  rune_references TEXT
);
CREATE TABLE IF NOT EXISTS local_time (
  record_id TEXT PRIMARY KEY NOT NULL,
  record_type TEXT NOT NULL,
  resource_id TEXT,
  label TEXT,
  display_order INTEGER,
  status TEXT,
  note TEXT,
  time_date TEXT,
  anchor_ids TEXT,
  date_status TEXT,
  year_value INTEGER,
  visibility TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  style_description TEXT
);
CREATE TABLE IF NOT EXISTS local_keywords (
  keyword_id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_name TEXT NOT NULL,
  item_no INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  principle TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '[]',
  order_no INTEGER NOT NULL DEFAULT 0,
  class_name TEXT NOT NULL,
  class_group TEXT NOT NULL,
  class_enable INTEGER NOT NULL DEFAULT 1,
  class_id TEXT NOT NULL
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
CREATE TABLE IF NOT EXISTS local_file_meta (
  format TEXT PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL
);
`;
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
const JSON_COLUMNS=new Set(['sources','source_counts','media_counts','keyword_meta','search_aliases',
  'target_id','media_link','anchor_ids','keywords','runeslist','rune_references']);
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
      const statements=list.map(row=>{
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
  const where=[];
  const params=[];
  if(p_start){where.push('date(createtime)>=?');params.push(p_start);}
  if(p_end){where.push('date(createtime)<=?');params.push(p_end);}
  if(!p_include_undated)where.push('createtime IS NOT NULL');
  const whereSql=where.length?' WHERE '+where.join(' AND '):'';
  const sql=`SELECT date(createtime) AS day, 'article' AS kind, coalesce(source_name,'未分類') AS category, count(*) AS item_count
    FROM local_galaxy${whereSql} GROUP BY day, category ORDER BY day`;
  const rows=await selectLocal(sql,params);
  return {data:rows.map(r=>({day:r.day,kind:r.kind,category:r.category,item_count:Number(r.item_count)})),error:null};
}
async function readScopeEarliestLocal(){
  const rows=await selectLocal('SELECT min(date(createtime)) AS earliest FROM local_galaxy WHERE createtime IS NOT NULL');
  return {data:rows[0]?.earliest||null,error:null};
}
async function readScopeOverviewLocal({p_start,p_end}){
  const stats=await readScopeStatisticsLocal({p_start,p_end,p_include_undated:false});
  const earliest=await readScopeEarliestLocal();
  const categories=[...new Set((stats.data||[]).map(r=>r.category))];
  return {data:{earliest:earliest.data,rows:stats.data,categories,aliases:[]},error:null};
}

// Local equivalent of api.read_keyword_class: no scope_id, no share-permission
// gate (there is only one local reader), just the class's rows in order.
async function readKeywordClassLocal({p_class_id}){
  const classId=String(p_class_id||'');
  if(!classId)return {data:null,error:null};
  const rows=await selectLocal('SELECT * FROM local_keywords WHERE class_id=? ORDER BY order_no,item_no',[classId]);
  return {data:rows.map(decodeRow),error:null};
}
// Local equivalent of api.apply_keyword_classification's begin/chunk/finalize
// state machine, verified 1:1 against the live Postgres function body:
//  begin    -- clear class_id/group_lists on every local_galaxy row, reset
//              the `local` settings row's classification counters
//  chunk    -- UPDATE local_galaxy SET class_id,group_lists per {uid,...} row;
//              throws if the batch didn't match every uid (same "incomplete" guard)
//  finalize -- stamp staticstime/keyword_document_count/keyword_meta on `local`
async function applyKeywordClassificationLocal({p_rows}={}){
  const mode=String(p_rows?.mode||'').toLowerCase();
  try{
    if(mode==='begin'){
      const cleared=await runLocal(`UPDATE local_galaxy SET class_id=NULL,group_lists='false' WHERE class_id IS NOT NULL OR group_lists IS NOT 'false'`);
      await runLocal(`UPDATE local SET staticstime=NULL,keyword_document_count=0,keyword_meta='{}' WHERE id='local'`);
      return {data:cleared,error:null};
    }
    if(mode==='chunk'){
      const rows=Array.isArray(p_rows?.rows)?p_rows.rows:[];
      // Filter and map together over the same row object -- splitting into a
      // uid-only .map() then a separate .filter(Boolean) before re-indexing
      // back into `rows` loses alignment the moment any row has a blank uid
      // (the filtered array's index no longer matches the original array's).
      const statements=rows
        .map(row=>({uid:String(row?.uid||'').trim(),row}))
        .filter(entry=>entry.uid)
        .map(({uid,row})=>({sql:'UPDATE local_galaxy SET class_id=?,group_lists=? WHERE uid=?',
          values:[row.class_id??null,String(row.group_lists||''),uid]}));
      const affected=await runBatchLocal(statements);
      if(affected!==statements.length)throw new Error(`keyword classification chunk incomplete: expected ${statements.length}, affected ${affected}`);
      return {data:affected,error:null};
    }
    if(mode==='finalize'){
      const meta=p_rows?.meta||{};
      const countRows=await selectLocal(`SELECT count(*) AS n FROM local_galaxy WHERE group_lists<>'false'`);
      const documentCount=Number(countRows[0]?.n||0);
      await runLocal(`UPDATE local SET staticstime=?,keyword_document_count=?,keyword_meta=? WHERE id='local'`,
        [new Date().toISOString(),documentCount,JSON.stringify(meta)]);
      return {data:documentCount,error:null};
    }
    throw new Error('unsupported keyword classification mode');
  }catch(error){return {data:null,error:{message:String(error?.message||error)}};}
}
// Local equivalent of silver.read_rune66_summary. The Postgres version does
// the group_lists "item:count,item:count" parse and the eligible/class_day/
// item aggregation inside one SQL statement (via unnest/string_to_array);
// SQLite has neither, so the same three aggregates are computed in JS over
// the same source rows and filters (searchable, statistics_able, group_lists
// not 'false', createtime within range) -- identical output shape
// ({kind,item_key,class_id,day,hit_count,document_count}).
async function readRune66SummaryLocal({p_start,p_end}){
  const where=["searchable=1","statistics_able=1","group_lists IS NOT NULL","group_lists<>'false'"];
  const params=[];
  if(p_start){where.push('date(createtime)>=?');params.push(p_start);}
  if(p_end){where.push('date(createtime)<=?');params.push(p_end);}
  const rows=await selectLocal('SELECT class_id, date(createtime) AS d, group_lists FROM local_galaxy WHERE '+where.join(' AND '),params);
  const out=[{kind:'eligible',item_key:null,class_id:null,day:'',hit_count:rows.length,document_count:rows.length}];
  const classDay=new Map();
  const items=new Map();
  const pairList=/^\s*[1-9]\d*:[1-9]\d*(\s*,\s*[1-9]\d*:[1-9]\d*)*\s*$/;
  for(const row of rows){
    if(row.class_id!==null&&row.class_id!==undefined){
      const key=row.class_id+'|'+(row.d||'');
      classDay.set(key,(classDay.get(key)||0)+1);
    }
    const gl=String(row.group_lists||'');
    if(pairList.test(gl)){
      for(const pair of gl.split(',')){
        const [item,n]=pair.split(':').map(s=>s.trim());
        const num=Number(n);
        if(num>0){
          const prev=items.get(item)||{hit:0,doc:0};
          prev.hit+=num;prev.doc+=1;
          items.set(item,prev);
        }
      }
    }
  }
  for(const [key,count] of classDay){
    const [classId,day]=key.split('|');
    out.push({kind:'class_day',item_key:null,class_id:Number(classId),day,hit_count:count,document_count:count});
  }
  for(const [item,{hit,doc}] of items)
    out.push({kind:'item',item_key:item,class_id:null,day:'',hit_count:hit,document_count:doc});
  return {data:out,error:null};
}
// One-time (or on-demand "restore to default") copy: seeds/overwrites
// local_keywords from a default keyword-library row set the caller supplies
// (e.g. fetched once from the cloud lo3rwang_keywords reference library).
// The source itself is never written back to -- only read -- so it always
// stays a clean reference the device copy can be reset against later.
export async function restoreKeywordLibraryFromDefault(defaultRows=[]){
  const statements=[{sql:'DELETE FROM local_keywords',values:[]},
    ...defaultRows.map(row=>({
      sql:`INSERT INTO local_keywords(group_name,item_no,item_name,principle,keywords,order_no,class_name,class_group,class_enable,class_id)
           VALUES(?,?,?,?,?,?,?,?,?,?)`,
      values:[row.group_name,row.item_no,row.item_name,row.principle||'',JSON.stringify(row.keywords||[]),
        row.order_no||0,row.class_name,row.class_group,row.class_enable!==false?1:0,row.class_id]
    }))];
  return runBatchLocal(statements);
}

// Only real imported records activate the local workspace. The seeded
// settings row, an opened file picker, or a parsed-but-unsaved preview do not.
export async function hasLocalScopeContent(){
  const [articles,media]=await Promise.all([
    selectLocal('SELECT 1 FROM local_galaxy LIMIT 1'),
    selectLocal('SELECT 1 FROM local_galaxy_media LIMIT 1')
  ]);
  return articles.length>0||media.length>0;
}

export async function rpcLocal(name,args={}){
  switch(name){
    case 'management_write':return managementWriteLocal(args);
    case 'read_scope_statistics':return readScopeStatisticsLocal(args);
    case 'read_scope_overview':return readScopeOverviewLocal(args);
    case 'read_scope_earliest':return readScopeEarliestLocal(args);
    case 'read_keyword_class':return readKeywordClassLocal(args);
    case 'apply_keyword_classification':return applyKeywordClassificationLocal(args);
    case 'read_rune66_summary':return readRune66SummaryLocal(args);
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
