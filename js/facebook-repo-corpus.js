(() => {
  const BASE='data/json/facebook/';
  let cache=null;
  let loading=null;

  function norm(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim()}

  async function load(){
    if(cache)return cache;
    if(loading)return loading;
    loading=(async()=>{
      const manifest=await fetch(BASE+'manifest.json',{cache:'force-cache'}).then(r=>{
        if(!r.ok)throw new Error('Facebook corpus manifest unavailable');
        return r.json();
      });
      const parts=await Promise.all((manifest.shards||[]).map(name=>
        fetch(BASE+name,{cache:'force-cache'}).then(r=>{
          if(!r.ok)throw new Error('Facebook corpus shard unavailable: '+name);
          return r.json();
        })
      ));
      cache={manifest,posts:parts.flat()};
      return cache;
    })();
    try{return await loading}finally{loading=null}
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

  async function search(query,{year=null,start_date='',end_date='',top_k=50}={}){
    const {posts}=await load();
    const scored=[];
    for(const row of posts){
      const date=String(row.date||'').slice(0,10);
      if(year&&Number(row.year)!==Number(year))continue;
      if(start_date&&date&&date<start_date)continue;
      if(end_date&&date&&date>end_date)continue;
      const score=scoreRow(row,query);
      if(score>0)scored.push({score,row});
    }
    scored.sort((a,b)=>b.score-a.score||String(b.row.date||'').localeCompare(String(a.row.date||'')));
    return scored.slice(0,Math.max(1,Math.min(Number(top_k)||50,100))).map(({score,row})=>({
      result_id:row.record_id||row.id,
      system_id:'lo3rwang',
      primary_loc:'LOC6',
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
    const d=await load();
    return {count:d.posts.length,manifest:d.manifest};
  }

  window.LOCFacebookCorpus={load,search,info};
})();