'use client';

import {dbAuthRelation} from './db-client.mjs';

// The owner's explicit action starts the only scan. Never run during render,
// ordinary Search, Culture navigation or the existing Keyword reanalysis.
const PAGE_SIZE=200;
const aborted=()=>Object.assign(new Error('已取消關鍵詞建議掃描'),{name:'AbortError'});

export async function suggestNewKeywords({galaxy,existingRows=[],onProgress=()=>{},signal}={}){
  if(!/^silver\.[a-z][a-z0-9_]*_galaxy$/.test(String(galaxy||'')))
    throw new Error('Galaxy Scope 資料表無效');
  if(signal?.aborted)throw aborted();
  const worker=new Worker(new URL('./keyword-discovery-worker.mjs',import.meta.url),{type:'module'});
  const send=data=>new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(aborted());return;}
    const onAbort=()=>reject(aborted());
    const cleanup=()=>{
      signal?.removeEventListener('abort',onAbort);
      worker.onmessage=null;
      worker.onerror=null;
    };
    worker.onmessage=event=>{
      cleanup();
      const message=event.data||{};
      if(message.type==='error')reject(new Error(message.error||'關鍵詞分析失敗'));
      else resolve(message);
    };
    worker.onerror=event=>{
      cleanup();
      reject(new Error(event?.message||'無法執行關鍵詞背景分析'));
    };
    signal?.addEventListener('abort',onAbort,{once:true});
    worker.postMessage(data);
  });
  try{
    await send({type:'start',existingRows:existingRows.map(row=>({
      type:row.type,name:row.name,lists:row.type==='item'?row.lists:[]
    }))});
    let countQuery=dbAuthRelation(galaxy).select('uid',{count:'exact',head:true});
    if(signal&&typeof countQuery.abortSignal==='function')countQuery=countQuery.abortSignal(signal);
    const {count,error:countError}=await countQuery;
    if(signal?.aborted)throw aborted();
    if(countError||count===null||count===undefined||!Number.isSafeInteger(Number(count)))
      throw new Error(countError?.message||'無法取得完整文章筆數');
    const total=Number(count);
    let completed=0;
    let serialized=Promise.resolve();
    const pushBatch=rows=>{
      // Three read lanes share one Worker aggregator without overwriting
      // its message handlers or duplicating whole-article buffers in memory.
      const next=serialized.then(()=>send({type:'batch',rows}));
      serialized=next.catch(()=>{});
      return next;
    };
    onProgress({completed:0,total,lanes:3});
    const limits=[0,Math.floor(total/3),Math.floor(total*2/3),total];
    await Promise.all([0,1,2].map(async lane=>{
      let offset=limits[lane];
      const end=limits[lane+1];
      while(offset<end){
        if(signal?.aborted)throw aborted();
        const length=Math.min(PAGE_SIZE,end-offset);
        // Time-ranked offsets partition the corpus into three disjoint,
        // bounded streams. A stable UID tie-break orders identical timestamps.
        let query=dbAuthRelation(galaxy)
          .select('uid,content,createtime')
          .order('createtime',{ascending:true,nullsFirst:false})
          .order('uid',{ascending:true})
          .range(offset,offset+length-1);
        if(signal&&typeof query.abortSignal==='function')query=query.abortSignal(signal);
        const {data,error}=await query;
        if(signal?.aborted)throw aborted();
        if(error)throw new Error(error.message||'無法讀取文章內文');
        const page=Array.isArray(data)?data:[];
        if(page.length!==length)throw new Error('文章分頁筆數不完整，未覆寫先前暫存');
        const reply=await pushBatch(page);
        if(reply.type!=='progress')throw new Error('關鍵詞背景分析回應異常');
        offset+=page.length;
        completed+=page.length;
        onProgress({completed,total,withContent:reply.withContent,lanes:3});
      }
    }));
    if(completed!==total)throw new Error('文章數量在掃描期間變動，未覆寫先前暫存');
    await serialized;
    const done=await send({type:'finish'});
    if(done.type!=='finished'||!done.result)throw new Error('新關鍵詞結果無效');
    return done.result;
  }finally{
    worker.terminate();
  }
}
