(() => {
  const DB_NAME='loc-facebook-corpus';
  const DB_VERSION=1;
  const STORE='posts';
  const META='meta';

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'});
        if(!db.objectStoreNames.contains(META)) db.createObjectStore(META,{keyPath:'key'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  function parseCSV(text){
    const out=[]; let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i],next=text[i+1];
      if(ch==='"'){
        if(quoted&&next==='"'){cell+='"';i++;} else quoted=!quoted;
      } else if(ch===','&&!quoted){row.push(cell);cell='';}
      else if((ch==='\n'||ch==='\r')&&!quoted){
        if(ch==='\r'&&next==='\n') i++;
        row.push(cell); if(row.some(x=>x!=='')) out.push(row); row=[]; cell='';
      } else cell+=ch;
    }
    row.push(cell); if(row.some(x=>x!=='')) out.push(row);
    const head=out.shift()||[];
    return out.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??''])));
  }

  function normalizeCSVRow(r,i){
    const text=String(r['原始文字']||'').trim();
    return {
      id:String(r['原始序號']||r['record_id']||('fb-local-'+i)),
      date:String(r['日期時間']||''),
      year:Number(r['年份']||0)||null,
      month:Number(r['月份']||0)||null,
      text,
      title:String(r['標題']||''),
      content_type:String(r['內容型態']||''),
      media_source:String(r['媒體來源']||''),
      place:String(r['地點']||''),
      concepts:[],
      semantic_keywords:[],
      retrieval_text:[text,r['標題'],r['媒體來源'],r['地點']].filter(Boolean).join(' '),
      source_format:'csv'
    };
  }

  function normalizeJSONRow(r,i){
    return {
      id:String(r.record_id||r.id||('fb-local-'+i)),
      date:String(r.date||r.datetime||''),
      year:Number(r.year||0)||null,
      month:Number(r.month||0)||null,
      text:String(r.text||''),
      title:String(r.title||''),
      content_type:String(r.content_type||''),
      media_source:String(r.media_source||''),
      place:String(r.place||''),
      concepts:Array.isArray(r.concepts)?r.concepts:[],
      semantic_keywords:Array.isArray(r.semantic_keywords)?r.semantic_keywords:[],
      retrieval_text:String(r.retrieval_text||[r.text,r.title,(r.concepts||[]).join(' '),(r.semantic_keywords||[]).join(' ')].filter(Boolean).join(' ')),
      source_format:'json'
    };
  }

  async function clear(){
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction([STORE,META],'readwrite');
      tx.objectStore(STORE).clear();
      tx.objectStore(META).clear();
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
    db.close();
  }

  async function importFile(file){
    const name=(file?.name||'').toLowerCase();
    const text=await file.text();
    let rows=[];
    if(name.endsWith('.json')){
      const payload=JSON.parse(text);
      const source=Array.isArray(payload)?payload:(payload.posts||payload.records||[]);
      rows=source.map(normalizeJSONRow).filter(r=>r.text.trim());
    }else{
      rows=parseCSV(text).map(normalizeCSVRow).filter(r=>r.text.trim() && !/^https?:\/\/\S+$/.test(r.text.trim()));
    }
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction([STORE,META],'readwrite');
      const store=tx.objectStore(STORE); store.clear();
      rows.forEach(r=>store.put(r));
      tx.objectStore(META).put({key:'info',count:rows.length,file_name:file.name,imported_at:new Date().toISOString(),source_format:name.endsWith('.json')?'json':'csv'});
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
    db.close();
    return {count:rows.length,file_name:file.name};
  }

  async function info(){
    const db=await openDB();
    const value=await new Promise((resolve,reject)=>{
      const req=db.transaction(META,'readonly').objectStore(META).get('info');
      req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>reject(req.error);
    });
    db.close(); return value;
  }

  function norm(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();}
  function scoreRow(row,query){
    const q=norm(query); if(!q) return 0;
    const terms=q.split(/[\s、，,；;：:／/｜|]+/).filter(Boolean);
    const text=norm(row.text), retrieval=norm(row.retrieval_text);
    let score=0;
    if(text.includes(q)) score+=1.0;
    else if(retrieval.includes(q)) score+=0.72;
    let hits=0;
    for(const term of terms){
      if(text.includes(term)){score+=0.22;hits++;}
      else if(retrieval.includes(term)){score+=0.12;hits++;}
    }
    const concepts=(row.concepts||[]).map(norm);
    const keywords=(row.semantic_keywords||[]).map(norm);
    for(const term of terms){
      if(concepts.some(x=>x.includes(term)||term.includes(x))) score+=0.12;
      if(keywords.some(x=>x.includes(term)||term.includes(x))) score+=0.08;
    }
    if(terms.length>1 && hits===terms.length) score+=0.18;
    return score;
  }

  async function search(query,{year=null,start_date='',end_date='',top_k=20}={}){
    const db=await openDB();
    const rows=await new Promise((resolve,reject)=>{
      const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
      req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error);
    });
    db.close();
    const scored=[];
    for(const row of rows){
      const date=String(row.date||'').slice(0,10);
      if(year && Number(row.year)!==Number(year)) continue;
      if(start_date&&date&&date<start_date) continue;
      if(end_date&&date&&date>end_date) continue;
      const score=scoreRow(row,query);
      if(score>0) scored.push({score,row});
    }
    scored.sort((a,b)=>b.score-a.score || String(b.row.date).localeCompare(String(a.row.date)));
    return scored.slice(0,Math.max(1,Math.min(Number(top_k)||20,100))).map(({score,row})=>({
      result_id:row.id,system_id:'lo3rwang',primary_loc:'LOC6',related_locs:['LOC7','LOC8'],
      content_type:'facebook_post',group:'social_archive',
      title:`Facebook｜${String(row.date||'').slice(0,10)||'undated'}`,
      summary:row.text,score:Math.min(1,score/1.8),
      source_refs:[{source_type:'facebook',source_id:row.id,note:'private browser IndexedDB'}],
      payload:row
    }));
  }

  window.LOCFacebookLocal={importFile,search,info,clear};
})();
