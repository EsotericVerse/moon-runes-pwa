// Privacy boundary: pure offline X/Twitter archive adapter. No fetch, API, Supabase or logging.
// Mature parsers: fflate (streaming ZIP) + @streamparser/json (streaming JSON array).
import {Unzip,UnzipInflate} from 'fflate';
import {JSONParser} from '@streamparser/json';

export const X_ARCHIVE_CHUNK=128*1024;
export const X_ARCHIVE_MAX_BYTES=2*1024*1024*1024;
export const X_ARCHIVE_MAX_EXTRACTED_BYTES=3*1024*1024*1024;
const X_DATA_FILE=/(?:^|\/)(?:tweets?|note[-_]?tweets?)(?:[-_.]part\d+)?\.(?:js|json)$/i;
const INVALID_CHAR=/\uFFFD/;
const MOJIBAKE=/(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|ä¸|å¤|æ\u0096)/;
const requireNotAborted=signal=>{if(signal?.aborted)throw new Error('已取消解析；本機暫存紀錄將清除。');};
const withoutBOM=s=>s.replace(/^\uFEFF/,'');
function safeDate(value){
  if(!value)return null;
  const t=Date.parse(String(value));return Number.isFinite(t)?new Date(t).toISOString():null;
}
function normalizeTweet(item,path){
  const note=item?.noteTweet;
  const tweet=item?.tweet||item;
  const id=note?.noteTweetId||tweet?.id_str||tweet?.id;
  const rawText=note?.core?.text??tweet?.full_text??tweet?.text;
  if(!id||typeof rawText!=='string')return {error:'缺少推文 ID 或正文'};
  const text=rawText; // No cleanup, transcoding, HTML decoding or mojibake repair.
  return {
    key:'x:post:'+String(id),
    kind:'post',nativeId:String(id),text,
    createdAt:safeDate(note?.core?.createdAt||tweet?.created_at),
    originalTimestamp:String(note?.core?.createdAt||tweet?.created_at||''),
    sourcePath:path,
    replyTo:tweet?.in_reply_to_status_id_str||tweet?.in_reply_to_status_id||null,
    lang:tweet?.lang||null,
    suspectedMojibake:INVALID_CHAR.test(text)||MOJIBAKE.test(text),
    raw:item
  };
}
function normalizeXRow(row,path){return normalizeTweet(row,path);}
function isTweetFile(name){return X_DATA_FILE.test(String(name||'').replace(/\\/g,'/'));}
function makeSummary(){
  return {matchedFiles:0,otherFiles:0,totalRows:0,acceptedRows:0,rejectedRows:0,
    suspiciousRows:0,duplicateRows:0,bytesRead:0,sourceFiles:[],sample:[],problems:[]};
}
function issue(summary,message){
  if(summary.problems.length<20)summary.problems.push(message);
}
function createJsonSink(path,summary,onRecord,signal){
  const parser=new JSONParser({paths:['$.*'],keepStack:false,stringBufferSize:64*1024});
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let prelude='',started=false,finished=false,tail='';
  parser.onValue=({value})=>{
    requireNotAborted(signal);
    summary.totalRows++;
    const record=normalizeXRow(value,path);
    if(record.error){
      summary.rejectedRows++;
      issue(summary,path+'：第 '+summary.totalRows+' 筆 '+record.error);
      return;
    }
    summary.acceptedRows++;
    if(record.suspectedMojibake)summary.suspiciousRows++;
    if(summary.sample.length<5)summary.sample.push({
      text:record.text.slice(0,260),createdAt:record.createdAt,nativeId:record.nativeId
    });
    onRecord(record);
  };
  function appendText(text){
    if(!started){
      prelude+=text;
      const trimmed=withoutBOM(prelude).trimStart();
      if(trimmed.startsWith('[')){
        started=true;parser.write(trimmed);prelude='';return;
      }
      const match=prelude.match(/^\s*(?:\/\*[\s\S]*?\*\/\s*)?window\.YTD\.[\w-]+\.part\d+\s*=\s*/);
      if(match){
        const rest=prelude.slice(match[0].length);
        if(rest.trimStart().startsWith('[')){
          started=true;parser.write(rest);prelude='';return;
        }
      }
      if(prelude.length>4096)throw new Error('X 資料開頭不是可辨識的 JSON/YTD 格式：'+path);
      return;
    }
    parser.write(text);
  }
  return {
    push(chunk,final=false){
      requireNotAborted(signal);
      if(finished)throw new Error('解析已關閉：'+path);
      const text=decoder.decode(chunk,{stream:!final});
      tail+=text;
      // Hold a small trailing window: X's YTD JavaScript assignment ends in
      // a semicolon, whereas streaming JSON parsers correctly reject it.
      if(!final&&tail.length>4096){
        appendText(tail.slice(0,-4096));
        tail=tail.slice(-4096);
      }
      if(final){
        const finalText=tail.replace(/;\s*$/,'');
        tail='';
        if(finalText)appendText(finalText);
        if(!started)throw new Error('找不到 X 備份的 JSON 陣列：'+path);
        if(!parser.isEnded)parser.end();
        finished=true;
      }
    },
    get finished(){return finished;}
  };
}

export async function inspectXArchive(file,{onRecord,onProgress,flush,signal}={}){
  if(!file||typeof file.slice!=='function'||!Number.isSafeInteger(file.size)||file.size<0)
    throw new Error('無法讀取選擇的檔案。');
  if(file.size>X_ARCHIVE_MAX_BYTES)throw new Error('ZIP 超過此版 2 GiB 上限；未更動原始檔。');
  if(typeof onRecord!=='function')throw new Error('缺少本機暫存寫入函式。');
  const summary=makeSummary();
  const header=new Uint8Array(await file.slice(0,4).arrayBuffer());
  const isZip=header[0]===80&&header[1]===75&&(header[2]===3||header[2]===5||header[2]===7);
  const readChunk=async (offset)=>{
    requireNotAborted(signal);
    return new Uint8Array(await file.slice(offset,Math.min(file.size,offset+X_ARCHIVE_CHUNK)).arrayBuffer());
  };
  if(isZip){
    let extracted=0,filesSeen=0;
    const sessions=[];
    const unzip=new Unzip(entry=>{
      requireNotAborted(signal);
      filesSeen++;
      if(filesSeen>50000)throw new Error('ZIP 檔案數量過多；停止處理避免壓縮炸彈。');
      if(!isTweetFile(entry.name)){summary.otherFiles++;return;}
      summary.matchedFiles++;
      summary.sourceFiles.push(entry.name);
      const sink=createJsonSink(entry.name,summary,onRecord,signal);
      const session={name:entry.name,sink,ended:false};
      sessions.push(session);
      entry.ondata=(error,data,final)=>{
        if(error)throw error;
        if(session.ended)throw new Error('ZIP 項目重複結束：'+entry.name);
        extracted+=data?.byteLength||0;
        if(extracted>X_ARCHIVE_MAX_EXTRACTED_BYTES)
          throw new Error('ZIP 展開量超過 3 GiB 安全上限。');
        sink.push(data||new Uint8Array(0),Boolean(final));
        if(final)session.ended=true;
      };
      entry.start();
    });
    unzip.register(UnzipInflate);
    for(let offset=0;offset<file.size;offset+=X_ARCHIVE_CHUNK){
      const chunk=await readChunk(offset);
      unzip.push(chunk,offset+chunk.length>=file.size);
      summary.bytesRead+=chunk.length;
      await flush?.();
      onProgress?.({...summary});
    }
    if(!file.size)throw new Error('空檔案不是有效 ZIP。');
    if(!sessions.length)throw new Error('ZIP 沒有辨識到 X 推文資料檔（data/tweets.js 等），未寫入正式資料。');
    if(sessions.some(s=>!s.ended))throw new Error('壓縮資料未完整結束；拒絕匯入。');
  }else{
    summary.matchedFiles=1;
    summary.sourceFiles=[file.name||'未命名檔案'];
    const sink=createJsonSink(file.name||'未命名檔案',summary,onRecord,signal);
    for(let offset=0;offset<file.size;offset+=X_ARCHIVE_CHUNK){
      const chunk=await readChunk(offset);
      sink.push(chunk,offset+chunk.length>=file.size);
      summary.bytesRead+=chunk.length;
      await flush?.();onProgress?.({...summary});
    }
    if(!file.size)throw new Error('空檔案無法解析。');
  }
  await flush?.(true);
  if(summary.acceptedRows===0)throw new Error('沒有可匯入的推文；拒絕建立空資料庫。');
  return summary;
}
