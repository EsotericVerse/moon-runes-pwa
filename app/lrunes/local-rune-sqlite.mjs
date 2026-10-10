// LunaRunes-only, device-local SQLite records. This is NOT the separate,
// general-purpose private Local File feature (MSN, raw document storage).
// The native backend uses Capacitor's actual iOS SQLite database file; web
// manager tests use a serialized SQLite database in origin-bound IndexedDB.
import {Capacitor} from '@capacitor/core';

export const RUNE_SQLITE_MAGIC='SQLite format 3\0';
export const RUNE_SQLITE_MARKER='loc.lrunes.settings.sqlite.v1';
export const RUNE_SQLITE_MAX_BYTES=24*1024*1024;
const DATABASE_NAME='lrunes_settings_local';
const MAX_IMPORT_ROWS=50000;
const DIRECTION_VALUES=new Set(['正位','半正位','半逆位','逆位']);
const DRAW_MODES=new Set(['single','daily','2card','3card','4card','5card','6card','7card','8card','9card','10card','ow3gs']);
const DRAWS=`CREATE TABLE IF NOT EXISTS rune_draw_history (
  draw_id TEXT PRIMARY KEY NOT NULL,
  draw_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  moon_phase TEXT NOT NULL,
  cards_json TEXT NOT NULL,
  reading TEXT NOT NULL
);`;
const DAILY=`CREATE TABLE IF NOT EXISTS lrunes_daily (
  record_date TEXT NOT NULL,
  draw_kind TEXT NOT NULL,
  rune_number INTEGER NOT NULL,
  direction TEXT NOT NULL,
  recorded_phase TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'local',
  PRIMARY KEY(record_date,draw_kind)
);`;
const META=`CREATE TABLE IF NOT EXISTS rune_file_meta (
  format TEXT PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL
);`;
const SCHEMA=DRAWS+DAILY+META;
const SCHEMA_MARKER_SQL='INSERT OR IGNORE INTO rune_file_meta(format,version) VALUES(?,1)';
const DAILY_COLUMNS='record_date,draw_kind,rune_number,direction,recorded_phase,source';
const DRAW_COLUMNS='draw_id,draw_key,created_at,moon_phase,cards_json,reading';

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

function validateDaily(row){
  const date=String(row?.record_date||'').slice(0,10);
  const kind=String(row?.draw_kind||'');
  const rune=Number(row?.rune_number);
  const direction=String(row?.direction||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['main','supplement','history_1','history_2'].includes(kind)||
    !Number.isInteger(rune)||rune<1||rune>66||!DIRECTION_VALUES.has(direction))throw new Error('SQLite 每日符文紀錄含無效日期、種類、符文或位向。');
  return [date,kind,rune,direction,String(row.recorded_phase||'').slice(0,50),String(row.source||'local').slice(0,24)];
}

function validateDraw(row){
  const id=String(row?.draw_id||'').trim();
  const key=String(row?.draw_key||'');
  const created=String(row?.created_at||'');
  const cardsRaw=String(row?.cards_json||'');
  const reading=String(row?.reading||'');
  if(!id||id.length>200||!DRAW_MODES.has(key)||!/^\d{4}-\d{2}-\d{2}T/.test(created)||cardsRaw.length>20000||reading.length>20000)
    throw new Error('SQLite 抽牌紀錄格式不符合 LunaRunes 規格。');
  let cards;
  try{cards=JSON.parse(cardsRaw);}catch{throw new Error('SQLite 抽牌卡牌資料損毀。');}
  if(!Array.isArray(cards)||!cards.length||cards.length>11||cards.some(card=>
    !Number.isInteger(Number(card.rune_number))||Number(card.rune_number)<1||Number(card.rune_number)>66||
    !DIRECTION_VALUES.has(card.direction)
  ))throw new Error('SQLite 抽牌卡數、編號或位向無效。');
  return [id,key,created,String(row.moon_phase||'').slice(0,50),JSON.stringify(cards),reading];
}

function rowsOf(db,sql,params=[]){
  const stmt=db.prepare(sql,params);
  try{
    const result=[];
    while(stmt.step())result.push(stmt.getAsObject());
    return result;
  }finally{stmt.free();}
}
function runOf(db,sql,params=[]){db.run(sql,params);}
function createFreshSQL(SQL){
  const db=new SQL.Database();
  db.run(SCHEMA);
  runOf(db,SCHEMA_MARKER_SQL,[RUNE_SQLITE_MARKER]);
  return db;
}
function headerIsSQLite(bytes){
  if(bytes.length<100)return false;
  return Array.from(new TextEncoder().encode(RUNE_SQLITE_MAGIC))
    .every((item,index)=>bytes[index]===item);
}
function validateSQLiteBytes(bytes){
  if(!(bytes instanceof Uint8Array)||!headerIsSQLite(bytes)||bytes.length>RUNE_SQLITE_MAX_BYTES)
    throw new Error('只能匯入有效、大小不超過 24 MB 的 SQLite 資料庫檔案。');
}
async function parseBackup(bytes){
  validateSQLiteBytes(bytes);
  const SQL=await sqliteJS();
  let db;
  try{
    db=new SQL.Database(bytes);
    const ok=rowsOf(db,'PRAGMA quick_check');
    if(ok?.[0]?.quick_check!=='ok')throw new Error('SQLite 完整性檢查失敗。');
    const tables=rowsOf(db,"SELECT name FROM sqlite_master WHERE type='table'").map(row=>row.name);
    for(const table of ['rune_draw_history','lrunes_daily','rune_file_meta']){
      if(!tables.includes(table))throw new Error('SQLite 缺少必要資料表：'+table);
    }
    const marker=rowsOf(db,'SELECT format,version FROM rune_file_meta');
    if(marker.length!==1||marker[0].format!==RUNE_SQLITE_MARKER||Number(marker[0].version)!==1)
      throw new Error('SQLite 格式不相容：此功能只接受 LunaRunes 每日符文 SQLite 備份。');
    const drawRows=rowsOf(db,'SELECT '+DRAW_COLUMNS+' FROM rune_draw_history');
    const dailyRows=rowsOf(db,'SELECT '+DAILY_COLUMNS+' FROM lrunes_daily');
    if(drawRows.length+dailyRows.length>MAX_IMPORT_ROWS)
      throw new Error('SQLite 匯入上限為 50,000 筆紀錄，請先拆分檔案。');
    return {
      draws:drawRows.map(validateDraw),
      daily:dailyRows.map(validateDaily)
    };
  }catch(error){throw new Error('SQLite 匯入失敗：'+String(error?.message||error));}
  finally{db?.close();}
}

function idbStore(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('loc-lrunes-settings-sqlite-v1',1);
    req.onupgradeneeded=()=>{req.result.createObjectStore('databases');};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('本機 SQLite 儲存無法開啟。'));
  });
}
async function readWebBytes(){
  const store=await idbStore();
  try{return await new Promise((resolve,reject)=>{
    const tx=store.transaction('databases','readonly');
    const req=tx.objectStore('databases').get('lrunes');
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });}finally{store.close();}
}
async function writeWebBytes(bytes){
  const store=await idbStore();
  try{await new Promise((resolve,reject)=>{
    const tx=store.transaction('databases','readwrite');
    tx.objectStore('databases').put(bytes,'lrunes');
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
    runOf(db,SCHEMA_MARKER_SQL,[RUNE_SQLITE_MARKER]);
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
    await conn.execute(SCHEMA);
    await conn.run(SCHEMA_MARKER_SQL,[RUNE_SQLITE_MARKER],false);
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
async function insertLocal(sql,values=[]){
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

export async function listLocalRuneDraws(){
  const rows=await selectLocal('SELECT '+DRAW_COLUMNS+' FROM rune_draw_history ORDER BY created_at DESC LIMIT 100');
  return rows.map(row=>({...row,cards:JSON.parse(row.cards_json)}));
}
export async function listLocalDailyRunes(){
  const rows=await selectLocal('SELECT '+DAILY_COLUMNS+' FROM lrunes_daily ORDER BY record_date,draw_kind');
  return rows.map(row=>({...row,rune_number:Number(row.rune_number)}));
}
export async function saveLocalRuneDraw(draw,mode,moonPhase){
  const cards=(draw?.cards||[]).map((card,index)=>({
    rune_number:Number(card.rune_id),rune_name:String(card.rune_name||''),
    direction:String(draw.directions?.[index]||'')
  }));
  const row={
    draw_id:String(draw?.id||''),
    draw_key:mode,
    created_at:String(draw?.createdAt||''),
    moon_phase:String(moonPhase||''),
    cards_json:JSON.stringify(cards),
    reading:String(draw?.reading?.sentence||'')
  };
  const values=validateDraw(row);
  const saved=await insertLocal('INSERT OR IGNORE INTO rune_draw_history('+DRAW_COLUMNS+') VALUES(?,?,?,?,?,?)',values);
  if(!saved)throw new Error('這次抽牌已經儲存，不會重複新增。');
  if(mode==='daily'){
    const date=new Date(draw.createdAt).toLocaleDateString('sv-SE',{timeZone:'Asia/Taipei'});
    const existing=await selectLocal('SELECT draw_kind FROM lrunes_daily WHERE record_date=?',[date]);
    const kind=existing.some(row=>row.draw_kind==='main')?'supplement':'main';
    if(!existing.some(row=>row.draw_kind===kind)){
      const daily=validateDaily({
        record_date:date,draw_kind:kind,rune_number:cards[0].rune_number,
        direction:cards[0].direction,recorded_phase:moonPhase,source:'local'
      });
      await insertLocal('INSERT OR IGNORE INTO lrunes_daily('+DAILY_COLUMNS+') VALUES(?,?,?,?,?,?)',daily);
    }
  }
  return saved;
}
export async function exportRuneSQLite(allDailyRows=[]){
  const SQL=await sqliteJS();
  const db=createFreshSQL(SQL);
  try{
    for(const row of await selectLocal('SELECT '+DRAW_COLUMNS+' FROM rune_draw_history'))
      runOf(db,'INSERT INTO rune_draw_history('+DRAW_COLUMNS+') VALUES(?,?,?,?,?,?)',validateDraw(row));
    for(const row of await listLocalDailyRunes())
      runOf(db,'INSERT OR IGNORE INTO lrunes_daily('+DAILY_COLUMNS+') VALUES(?,?,?,?,?,?)',validateDaily(row));
    for(const row of allDailyRows){
      const values=validateDaily({...row,source:'server_backup'});
      runOf(db,'INSERT OR IGNORE INTO lrunes_daily('+DAILY_COLUMNS+') VALUES(?,?,?,?,?,?)',values);
    }
    const bytes=db.export();
    validateSQLiteBytes(bytes);
    return bytes;
  }finally{db.close();}
}
export async function importRuneSQLite(bytes){
  const parsed=await parseBackup(bytes);
  // Validate ALL records before any mutations; import is an atomic local
  // transaction, never a write to the canonical daily Supabase table.
  const drawSQL='INSERT OR IGNORE INTO rune_draw_history('+DRAW_COLUMNS+') VALUES(?,?,?,?,?,?)';
  const dailySQL='INSERT OR IGNORE INTO lrunes_daily('+DAILY_COLUMNS+') VALUES(?,?,?,?,?,?)';
  let addedDraws=0,addedDaily=0;
  if(Capacitor.isNativePlatform()){
    const conn=await nativeDatabase();
    await conn.beginTransaction();
    try{
      for(let index=0;index<parsed.draws.length;index+=200){
        const batch=parsed.draws.slice(index,index+200).map(values=>({statement:drawSQL,values}));
        const changed=await conn.executeSet(batch,false);
        addedDraws+=Number(changed?.changes?.changes||0);
      }
      for(let index=0;index<parsed.daily.length;index+=200){
        const batch=parsed.daily.slice(index,index+200).map(values=>({
          statement:dailySQL,values:[...values.slice(0,5),'imported']
        }));
        const changed=await conn.executeSet(batch,false);
        addedDaily+=Number(changed?.changes?.changes||0);
      }
      await conn.commitTransaction();
    }catch(error){
      await conn.rollbackTransaction();
      throw error;
    }
  }else{
    const db=await webDatabase();
    db.run('BEGIN');
    try{
      for(const values of parsed.draws){
        db.run(drawSQL,values);
        addedDraws+=db.getRowsModified();
      }
      for(const values of parsed.daily){
        db.run(dailySQL,[...values.slice(0,5),'imported']);
        addedDaily+=db.getRowsModified();
      }
      db.run('COMMIT');
      await writeWebBytes(db.export());
    }catch(error){db.run('ROLLBACK');throw error;}
  }
  return {addedDraws,addedDaily,foundDraws:parsed.draws.length,foundDaily:parsed.daily.length};
}
export async function inspectRuneSQLite(bytes){return parseBackup(bytes);}
