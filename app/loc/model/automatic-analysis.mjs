function finiteNumber(value){
  const n=Number(value);
  return Number.isFinite(n)?n:0;
}

function dateKey(row){
  return String(row?.week_start||row?.start_date||row?.date||row?.record_date||'').slice(0,10);
}

function median(values=[]){
  const nums=values.map(finiteNumber).filter(value=>Number.isFinite(value)).sort((a,b)=>a-b);
  if(!nums.length)return 0;
  const mid=Math.floor(nums.length/2);
  return nums.length%2?nums[mid]:(nums[mid-1]+nums[mid])/2;
}

export function analyzeTemporalDensity(rows=[],{
  valueField='work_count',
  label='作品',
  minimumCount=3,
  highRatio=1.75,
  maxSuggestions=6
}={}){
  const byDate=new Map();
  for(const row of rows||[]){
    const date=dateKey(row);
    if(!date)continue;
    byDate.set(date,(byDate.get(date)||0)+finiteNumber(row?.[valueField]??row?.item_count??row?.value));
  }
  const points=[...byDate.entries()].map(([date,count])=>({date,count})).sort((a,b)=>a.date.localeCompare(b.date));
  if(points.length<2)return {points,suggestions:[],baseline:points[0]?.count||0};

  const baseline=median(points.map(point=>point.count));
  const suggestions=[];
  for(let index=0;index<points.length;index++){
    const point=points[index];
    const neighbors=points.slice(Math.max(0,index-2),index).concat(points.slice(index+1,index+3));
    const localBaseline=median(neighbors.map(item=>item.count))||baseline;
    const ratio=localBaseline>0?point.count/localBaseline:(point.count>0?Infinity:1);
    const previous=points[index-1]||null;
    const previousRatio=previous?.count>0?point.count/previous.count:null;

    if(point.count>=minimumCount&&ratio>=highRatio){
      suggestions.push({
        type:'density_high',
        date:point.date,
        count:point.count,
        baseline:localBaseline,
        ratio:Number.isFinite(ratio)?ratio:null,
        text:`${point.date} 附近的${label}數量明顯高於前後區間（${point.count} 項；鄰近基準約 ${Math.round(localBaseline)} 項），可能值得回看是否有想標記的事情。`
      });
      continue;
    }

    if(previous&&previous.count>=minimumCount&&point.count<=Math.max(1,previous.count*.45)){
      suggestions.push({
        type:'density_drop',
        date:point.date,
        count:point.count,
        previous_count:previous.count,
        ratio:previousRatio,
        text:`${point.date} 附近的${label}數量比前一區間明顯下降（${previous.count} → ${point.count}），可回看前後是否有值得標記的變化。`
      });
    }
  }

  suggestions.sort((a,b)=>{
    const ar=a.type==='density_high'?(a.ratio??99):(a.previous_count?1-a.count/a.previous_count:0);
    const br=b.type==='density_high'?(b.ratio??99):(b.previous_count?1-b.count/b.previous_count:0);
    return br-ar||a.date.localeCompare(b.date);
  });

  return {points,suggestions:suggestions.slice(0,maxSuggestions),baseline};
}

export function analyzeDistribution(rows=[],{
  label='項目',
  maxSuggestions=4
}={}){
  const data=(rows||[])
    .map(row=>({
      term:String(row?.term||row?.display_label||row?.style_name||row?.keyword||'').trim(),
      count:finiteNumber(row?.item_count??row?.rank_value??row?.value)
    }))
    .filter(row=>row.term&&row.count>0)
    .sort((a,b)=>b.count-a.count||a.term.localeCompare(b.term,'zh-Hant'));

  const total=data.reduce((sum,row)=>sum+row.count,0);
  if(!total)return {total:0,rows:data,suggestions:[]};

  const suggestions=[];
  const top=data[0];
  const topShare=top.count/total;
  if(topShare>=0.35){
    suggestions.push({
      type:'concentration',
      term:top.term,
      share:topShare,
      text:`目前${label}分布較集中在「${top.term}」，約占 ${(topShare*100).toFixed(1)}%。這是分布現象，不代表好壞，可搭配時間區間觀察是否持續。`
    });
  }

  const repeated=data.filter(row=>row.count>=2);
  const singletons=data.filter(row=>row.count===1);
  if(data.length>=5&&singletons.length/data.length>=0.5){
    suggestions.push({
      type:'long_tail',
      share:singletons.length/data.length,
      text:`目前${label}有較長的低頻尾端：${singletons.length} 個項目只出現 1 次。可保留觀察，避免僅憑單次出現就提高權重。`
    });
  }

  if(repeated.length>=3){
    suggestions.push({
      type:'stable_candidates',
      terms:repeated.slice(0,5).map(row=>row.term),
      text:`目前有 ${repeated.length} 個${label}重複出現；可優先把高頻項目作為後續時間比較候選，而不是直接改寫分類。`
    });
  }

  return {total,rows:data,suggestions:suggestions.slice(0,maxSuggestions)};
}


function distributionMap(rows=[]){
  const map=new Map();
  for(const row of rows||[]){
    const term=String(row?.term||row?.display_label||row?.style_name||row?.keyword||'').trim();
    if(!term)continue;
    const count=finiteNumber(row?.item_count??row?.rank_value??row?.value);
    map.set(term,(map.get(term)||0)+count);
  }
  return map;
}

export function analyzeDistributionChange(currentRows=[],previousRows=[],{
  label='項目',
  minimumCount=2,
  riseRatio=1.6,
  fallRatio=0.6,
  maxSuggestions=8
}={}){
  const current=distributionMap(currentRows);
  const previous=distributionMap(previousRows);
  const terms=[...new Set([...current.keys(),...previous.keys()])];
  const changes=[];
  const suggestions=[];

  for(const term of terms){
    const now=finiteNumber(current.get(term));
    const before=finiteNumber(previous.get(term));
    const delta=now-before;
    const ratio=before>0?now/before:(now>0?Infinity:1);
    const row={term,current:now,previous:before,delta,ratio:Number.isFinite(ratio)?ratio:null};
    changes.push(row);

    if(before===0&&now>=minimumCount){
      suggestions.push({
        type:'emerging',
        term,current:now,previous:0,score:now,
        governance:'raise_candidate',
        text:`「${term}」在目前區間出現 ${now} 次，前一等長區間沒有出現；這是新出現的${label}訊號，可回看相關內容確認是否值得持續追蹤。`
      });
      continue;
    }
    if(now===0&&before>=minimumCount){
      suggestions.push({
        type:'disappeared',
        term,current:0,previous:before,score:before,
        governance:'reduce_candidate',
        text:`「${term}」前一區間出現 ${before} 次，目前區間沒有出現；可回看是否只是暫時沉寂，或分類權重需要降低。`
      });
      continue;
    }
    if(now>=minimumCount&&before>=minimumCount&&ratio>=riseRatio){
      suggestions.push({
        type:'rising',
        term,current:now,previous:before,score:ratio,
        governance:'raise_candidate',
        text:`「${term}」由 ${before} 次增加到 ${now} 次，出現頻率明顯提高；先視為分布變化，建議回看前後內容確認脈絡。`
      });
      continue;
    }
    if(before>=minimumCount&&now>=0&&ratio<=fallRatio){
      suggestions.push({
        type:'falling',
        term,current:now,previous:before,score:before/(now||0.5),
        governance:'reduce_candidate',
        text:`「${term}」由 ${before} 次下降到 ${now} 次，出現頻率明顯降低；可保留觀察，不直接判定其意義。`
      });
      continue;
    }
    if(now>=minimumCount&&before>=minimumCount){
      suggestions.push({
        type:'persistent',
        term,current:now,previous:before,score:Math.min(now,before),
        governance:'keep_candidate',
        text:`「${term}」在前後兩個區間都持續出現（${before} → ${now}），可視為目前較穩定的${label}候選。`
      });
    }
  }

  const priority={emerging:5,rising:4,disappeared:3,falling:2,persistent:1};
  suggestions.sort((a,b)=>(priority[b.type]||0)-(priority[a.type]||0)||Number(b.score||0)-Number(a.score||0)||a.term.localeCompare(b.term,'zh-Hant'));
  changes.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.term.localeCompare(b.term,'zh-Hant'));

  return {changes,suggestions:suggestions.slice(0,maxSuggestions)};
}

export function analyzeKeywordGovernance(currentRows=[],previousRows=[],{
  candidateRows=[],
  catalogRows=[],
  minimumCount=2,
  maxSuggestions=10
}={}){
  const change=analyzeDistributionChange(currentRows,previousRows,{
    label:'關鍵詞',
    minimumCount,
    maxSuggestions:Math.max(maxSuggestions,20)
  });
  const catalog=new Set([
    ...(catalogRows||[]).map(row=>String(row?.term||row?.keyword||'').trim()),
    ...(currentRows||[]).map(row=>String(row?.term||'').trim()),
    ...(previousRows||[]).map(row=>String(row?.term||'').trim())
  ].filter(Boolean));
  const currentMap=distributionMap(currentRows);
  const previousMap=distributionMap(previousRows);
  const suggestions=change.suggestions.map(item=>({
    ...item,
    action:item.governance==='raise_candidate'?'提高觀察權重':
      item.governance==='reduce_candidate'?'降低／淘汰候選':'保留觀察'
  }));

  for(const term of catalog){
    const now=finiteNumber(currentMap.get(term));
    const before=finiteNumber(previousMap.get(term));
    if(now===0&&before===0){
      suggestions.push({
        type:'inactive_catalog',
        term,current:0,previous:0,score:1,
        governance:'reduce_candidate',
        action:'降低／淘汰候選',
        text:`「${term}」已在詞庫，但前後兩個比較區間都沒有命中；可保留一段觀察期，再決定是否降低權重或淘汰。`
      });
    }
  }

  for(const row of candidateRows||[]){
    const term=String(row?.term||'').trim();
    const count=finiteNumber(row?.item_count??row?.rank_value??row?.value);
    if(!term||catalog.has(term)||count<minimumCount)continue;
    suggestions.push({
      type:'new_candidate',
      term,current:count,previous:0,score:count,
      governance:'add_candidate',
      action:'新增候選',
      text:`「${term}」尚未在目前關鍵詞統計中，但在 metadata 候選來源重複出現 ${count} 次；可人工確認是否值得加入詞庫。`
    });
  }

  const priority={new_candidate:7,emerging:6,rising:5,disappeared:4,falling:3,inactive_catalog:2,persistent:1};
  suggestions.sort((a,b)=>(priority[b.type]||0)-(priority[a.type]||0)||Number(b.score||0)-Number(a.score||0)||a.term.localeCompare(b.term,'zh-Hant'));
  return {changes:change.changes,suggestions:suggestions.slice(0,maxSuggestions)};
}
