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
        text:\`${point.date} 附近的${label}數量明顯高於前後區間（${point.count} 項；鄰近基準約 ${Math.round(localBaseline)} 項），可能值得回看是否有想標記的事情。\`
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
        text:\`${point.date} 附近的${label}數量比前一區間明顯下降（${previous.count} → ${point.count}），可回看前後是否有值得標記的變化。\`
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
      text:\`目前${label}分布較集中在「${top.term}」，約占 ${(topShare*100).toFixed(1)}%。這是分布現象，不代表好壞，可搭配時間區間觀察是否持續。\`
    });
  }

  const repeated=data.filter(row=>row.count>=2);
  const singletons=data.filter(row=>row.count===1);
  if(data.length>=5&&singletons.length/data.length>=0.5){
    suggestions.push({
      type:'long_tail',
      share:singletons.length/data.length,
      text:\`目前${label}有較長的低頻尾端：${singletons.length} 個項目只出現 1 次。可保留觀察，避免僅憑單次出現就提高權重。\`
    });
  }

  if(repeated.length>=3){
    suggestions.push({
      type:'stable_candidates',
      terms:repeated.slice(0,5).map(row=>row.term),
      text:\`目前有 ${repeated.length} 個${label}重複出現；可優先把高頻項目作為後續時間比較候選，而不是直接改寫分類。\`
    });
  }

  return {total,rows:data,suggestions:suggestions.slice(0,maxSuggestions)};
}
