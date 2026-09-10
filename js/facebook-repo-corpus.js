(() => {
  const BASE='data/json/sources/facebook/';
  const DEFAULT_TOP_K=50;
  const MAX_TOP_K=100;
  const SHARD_CONCURRENCY=2;
  let manifestCache=null;
  let manifestLoading=null;

  function norm(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim()}

  async function loadManifest(){
    if(manifestCache)return manifestCache;
    if(manifestLoading)return manifestLoading;
    manifestLoading=fetch(BASE+'manifest.json',{cache:'force-cache'}).then(r=>{
      if(!r.ok)throw new Error('Facebook corpus manifest unavailable');
      return r.json();
    }).then(manifest=>{
      manifestCache=manifest;
      return manifest;
    });
    try{return await manifestLoading}finally{manifestLoading=null}
  }

  async function loadShard(name){
    const response=await fetch(BASE+name,{cache:'force-cache'});
    if(!response.ok)throw new Error('Facebook corpus shard unavailable: '+name);
    return response.json();
  }

  // Compatibility helper: callers that explicitly need the whole corpus can still
  // request it, but normal PWA search never uses this path.
  async function load(){
    const manifest=await loadManifest();
    const posts=[];
    for(const name of manifest.shards||[]){
      const rows=await loadShard(name);
      if(Array.isArray(rows))posts.push(...rows);
    }
    return {manifest,posts};
  }

  function scoreRow(row,query){
    const q=norm(query); if(!q)return 0;
    const terms=q.split(/[\s、，,；;：:／/｜|]+/).filter(Boolean);
    const text=norm(row.text), retrieval=norm(row.retrieval_text);
    let score=0,hits=0;
    if(text.includes(q))score+=1;
    else if(retrieval.includes(q))score+=0.72;
    for(const term of terms){
      if(text.includes(term)){score+=0.22;hits++}
      else if(retrieval.includes(term)){score+=0.12;hits++}
    }
    const concepts=(row.concepts||[]).map(norm),keys=(row.semantic_keywords||[]).map(norm);
    for(const term of terms){
      if(concepts.some(x=>x.includes(term)||term.includes(x)))score+=0.12;
      if(keys.some(x=>x.includes(term)||term.includes(x)))score+=0.08;
    }
    if(terms.length>1&&hits===terms.length)score+=0.18;
    return score;
  }

  function keepBest(scored,entry,limit){
    scored.push(entry);
    if(scored.length<=limit*2)return;
    scored.sort((a,b)=>b.score-a.score||String(b.row.date||'').localeCompare(String(a.row.date||'')));
    scored.length=limit;
  }

  async function search(query,{year=null,start_date='',end_date='',top_k=DEFAULT_TOP_K}={}){
    const manifest=await loadManifest();
    const limit=Math.max(1,Math.min(Number(top_k)||DEFAULT_TOP_K,MAX_TOP_K));
    const scored=[];
    const shards=[...(manifest.shards||[])];
    let cursor=0;

    async function worker(){
      while(cursor<shards.length){
        const name=shards[cursor++];
        let rows;
        try{
          rows=await loadShard(name);
        }catch(error){
          console.warn(error);
          continue;
        }
        for(const row of Array.isArray(rows)?rows:[]){
          if(row.searchable===false||(row.classification||[]).includes('爭議文章'))continue;
          const date=String(row.date||'').slice(0,10);
          if(year&&Number(row.year)!==Number(year))continue;
          if(start_date&&date&&date<start_date)continue;
          if(end_date&&date&&date>end_date)continue;
          const score=scoreRow(row,query);
          if(score>0)keepBest(scored,{score,row},limit);
        }
        // Yield between shards so long searches do not monopolize the mobile UI thread.
        await new Promise(resolve=>setTimeout(resolve,0));
      }
    }

    await Promise.all(Array.from({length:Math.min(SHARD_CONCURRENCY,Math.max(1,shards.length))},worker));
    scored.sort((a,b)=>b.score-a.score||String(b.row.date||'').localeCompare(String(a.row.date||'')));

    return scored.slice(0,limit).map(({score,row})=>({
      result_id:row.record_id||row.id,
      system_id:'lo3rwang',
      primary_loc:'LOC4',
      related_locs:['LOC7','LOC8'],
      content_type:'text_record',
      group:'text',
      title:`Facebook｜${String(row.date||'').slice(0,10)||'undated'}`,
      summary:row.text||'',
      score:Math.min(1,score/1.8),
      source_refs:[{source_type:'facebook',source_id:row.record_id||row.id,note:'repo corpus'}],
      payload:{...row,source_platform:'facebook'}
    }));
  }

  async function info(){
    const manifest=await loadManifest();
    return {count:Number(manifest.records||0),manifest};
  }

  window.LOCFacebookCorpus={load,search,info};
})();
