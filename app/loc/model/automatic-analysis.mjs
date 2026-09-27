function finiteNumber(value){
  const n=Number(value);
  return Number.isFinite(n)?n:0;
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
  minimumShare=0.02,
  minimumShareDelta=0.02,
  riseRatio=1.6,
  fallRatio=0.6,
  maxSuggestions=8
}={}){
  const current=distributionMap(currentRows);
  const previous=distributionMap(previousRows);
  const currentTotal=[...current.values()].reduce((sum,value)=>sum+finiteNumber(value),0);
  const previousTotal=[...previous.values()].reduce((sum,value)=>sum+finiteNumber(value),0);
  const terms=[...new Set([...current.keys(),...previous.keys()])];
  const changes=[];
  const suggestions=[];

  for(const term of terms){
    const now=finiteNumber(current.get(term));
    const before=finiteNumber(previous.get(term));
    const currentShare=currentTotal>0?now/currentTotal:0;
    const previousShare=previousTotal>0?before/previousTotal:0;
    const shareDelta=currentShare-previousShare;
    const shareRatio=previousShare>0?currentShare/previousShare:(currentShare>0?Infinity:1);
    const row={
      term,current:now,previous:before,delta:now-before,
      current_share:currentShare,previous_share:previousShare,share_delta:shareDelta,
      ratio:Number.isFinite(shareRatio)?shareRatio:null
    };
    changes.push(row);

    if(before===0&&now>=minimumCount&&currentShare>=minimumShare){
      suggestions.push({
        type:'emerging',term,current:now,previous:0,score:currentShare,
        current_share:currentShare,previous_share:0,governance:'raise_candidate',
        text:`「${term}」在目前時期占 ${(currentShare*100).toFixed(1)}%，前一時期沒有出現；這是時期分布的新訊號，可回看相關內容確認是否值得持續追蹤。`
      });
      continue;
    }
    if(now===0&&before>=minimumCount&&previousShare>=minimumShare){
      suggestions.push({
        type:'disappeared',term,current:0,previous:before,score:previousShare,
        current_share:0,previous_share:previousShare,governance:'reduce_candidate',
        text:`「${term}」前一時期占 ${(previousShare*100).toFixed(1)}%，目前時期沒有出現；可保留觀察，不直接判定其意義。`
      });
      continue;
    }
    if(now>=minimumCount&&before>=minimumCount&&shareRatio>=riseRatio&&shareDelta>=minimumShareDelta){
      suggestions.push({
        type:'rising',term,current:now,previous:before,score:shareDelta,
        current_share:currentShare,previous_share:previousShare,governance:'raise_candidate',
        text:`「${term}」占比由 ${(previousShare*100).toFixed(1)}% 增至 ${(currentShare*100).toFixed(1)}%；這是時期分布增加，不以單筆或單一日期判定。`
      });
      continue;
    }
    if(before>=minimumCount&&previousShare>=minimumShare&&shareRatio<=fallRatio&&-shareDelta>=minimumShareDelta){
      suggestions.push({
        type:'falling',term,current:now,previous:before,score:-shareDelta,
        current_share:currentShare,previous_share:previousShare,governance:'reduce_candidate',
        text:`「${term}」占比由 ${(previousShare*100).toFixed(1)}% 降至 ${(currentShare*100).toFixed(1)}%；這是時期分布下降，可繼續觀察。`
      });
      continue;
    }
    if(now>=minimumCount&&before>=minimumCount&&Math.abs(shareDelta)<minimumShareDelta){
      suggestions.push({
        type:'persistent',term,current:now,previous:before,score:Math.min(currentShare,previousShare),
        current_share:currentShare,previous_share:previousShare,governance:'keep_candidate',
        text:`「${term}」在前後時期占比接近（${(previousShare*100).toFixed(1)}% → ${(currentShare*100).toFixed(1)}%），可視為目前較穩定的${label}候選。`
      });
    }
  }

  const priority={emerging:5,rising:4,disappeared:3,falling:2,persistent:1};
  suggestions.sort((a,b)=>(priority[b.type]||0)-(priority[a.type]||0)||Number(b.score||0)-Number(a.score||0)||a.term.localeCompare(b.term,'zh-Hant'));
  changes.sort((a,b)=>Math.abs(b.share_delta)-Math.abs(a.share_delta)||a.term.localeCompare(b.term,'zh-Hant'));

  return {currentTotal,previousTotal,changes,suggestions:suggestions.slice(0,maxSuggestions)};
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


export function analyzeKeywordDiagnostics(data={},{
  changeSuggestions=[],
  minimumCount=3,
  lowDiscriminationCoverage=0.55,
  highSourceShare=0.75,
  maxSuggestions=10
}={}){
  const totalRecords=finiteNumber(data?.totalRecords);
  const risingTerms=new Set((changeSuggestions||[])
    .filter(item=>item?.type==='emerging'||item?.type==='rising')
    .map(item=>String(item?.term||'').trim())
    .filter(Boolean));
  const suggestions=[];

  for(const row of data?.keywords||[]){
    const term=String(row?.term||'').trim();
    const count=finiteNumber(row?.item_count);
    const coverage=finiteNumber(row?.coverage);
    const topSource=String(row?.top_source||'').trim();
    const topSourceShare=finiteNumber(row?.top_source_share);
    if(!term||count<minimumCount)continue;

    if(coverage>=lowDiscriminationCoverage){
      suggestions.push({
        type:'low_discrimination',
        term,
        score:coverage,
        text:'「'+term+'」命中 '+count+' 筆，約覆蓋此區間 '+(coverage*100).toFixed(1)+'% 的紀錄；分布過廣時辨識力可能較低，可考慮降低分類權重。'
      });
      continue;
    }

    if(topSource&&topSourceShare>=highSourceShare){
      const emerging=risingTerms.has(term);
      suggestions.push({
        type:emerging?'emerging_high_discrimination':'source_concentration',
        term,
        source:topSource,
        score:topSourceShare,
        text:'「'+term+'」有 '+(topSourceShare*100).toFixed(1)+'% 的命中集中在「'+topSource+'」'+(emerging?'，且目前區間正在增加；可列為新興高辨識候選。':'；這是來源集中現象，可作為辨識度觀察依據。')
      });
    }
  }

  for(const pair of data?.pairs||[]){
    const count=finiteNumber(pair?.item_count);
    const share=finiteNumber(pair?.share);
    if(count<minimumCount||share<0.6)continue;
    const a=String(pair?.term_a||'').trim();
    const b=String(pair?.term_b||'').trim();
    if(!a||!b)continue;
    suggestions.push({
      type:'cooccurrence',
      term:a+' × '+b,
      score:count*share,
      text:'「'+a+'」與「'+b+'」在此區間共同出現 '+count+' 次；相對於較少出現的一方，共現比例約 '+(share*100).toFixed(1)+'%，可留意兩者是否形成穩定脈絡。'
    });
  }

  const priority={emerging_high_discrimination:5,low_discrimination:4,source_concentration:3,cooccurrence:2};
  suggestions.sort((a,b)=>(priority[b.type]||0)-(priority[a.type]||0)||Number(b.score||0)-Number(a.score||0)||String(a.term).localeCompare(String(b.term),'zh-Hant'));
  return {totalRecords,suggestions:suggestions.slice(0,maxSuggestions)};
}
