import {detectChangepoints,PoissonCost} from 'karaul';
import {createNewKeywordDiscovery} from './keyword-discovery.mjs';

let discovery=null;
function changePoints(values){
  if(values.length<4)return [];
  try{return detectChangepoints(values,new PoissonCost())
    .filter(index=>Number.isInteger(index)&&index>0&&index<values.length);}
  catch{return [];}
}
function denseAndSparse(result){
  const months=result.monthCoverage||[];
  if(!months.length)return {...result,dense:null,sparse:null};
  const novelByMonth=new Map();
  for(const item of result.candidates){
    for(const [month,count] of item.months||[])
      novelByMonth.set(month,(novelByMonth.get(month)||0)+count);
  }
  // Analyze density *per article*, not raw writing volume. A busy month
  // should not count as a new-term burst solely because it has more posts.
  const series=months.map(row=>
    Math.round((novelByMonth.get(row.month)||0)/Math.max(1,row.documents)*10));
  const changes=changePoints(series);
  const boundaries=[0,...changes,months.length];
  const segments=[];
  for(let i=0;i<boundaries.length-1;i++){
    const from=boundaries[i],to=boundaries[i+1];
    const source=months.slice(from,to);
    const documents=source.reduce((sum,x)=>sum+x.documents,0);
    const existingCovered=source.reduce((sum,x)=>sum+x.existingCovered,0);
    const novelHits=series.slice(from,to).reduce((sum,x)=>sum+x,0);
    if(documents<=0)continue;
    segments.push({
      start:source[0].month,end:source.at(-1).month,
      documents,novelHits,existingCovered,
      novelPerArticle:novelHits/documents,
      existingRatio:existingCovered/documents,
      detectedByPelt:changes.length>0
    });
  }
  const byDense=[...segments].sort((a,b)=>b.novelPerArticle-a.novelPerArticle||b.documents-a.documents);
  const bySparse=[...segments].sort((a,b)=>a.novelPerArticle-b.novelPerArticle||b.documents-a.documents);
  const dense=byDense[0]||null;
  // Without a statistically detected boundary there are not two opposing
  // periods. Do not invent an "empty" side from the same segment.
  const sparse=segments.length>1?bySparse[0]:null;
  const overallExistingRatio=months.reduce((s,row)=>s+row.existingCovered,0)/
    Math.max(1,months.reduce((s,row)=>s+row.documents,0));
  if(dense){
    for(const item of result.candidates){
      item.denseDocuments=(item.months||[]).reduce((sum,[month,count])=>
        sum+(month>=dense.start&&month<=dense.end?count:0),0);
    }
    // New terms from the PELT-dense side rank first, but a constant,
    // long-running new word must never be excluded solely for no changepoint.
    result.candidates.sort((a,b)=>
      b.denseDocuments-a.denseDocuments||b.documents-a.documents
      ||b.occurrences-a.occurrences||a.word.localeCompare(b.word));
  }
  return {...result,dense,sparse,overallExistingRatio};
}
function annotateTrend(result){
  result=denseAndSparse(result);
  for(const item of result.candidates){
    const rows=item.months;
    if(rows.length<4){item.trendChanges=0;delete item.months;continue;}
    const first=rows[0][0],last=rows.at(-1)[0];
    const monthValue=s=>Number(s.slice(0,4))*12+Number(s.slice(5,7));
    const counts=new Map(rows),start=monthValue(first),end=monthValue(last);
    if(end-start>360){item.trendChanges=0;delete item.months;continue;}
    const series=[];
    for(let i=start;i<=end;i++){
      const y=Math.floor((i-1)/12),m=(i-1)%12+1;
      series.push(counts.get(String(y)+'-'+String(m).padStart(2,'0'))||0);
    }
    item.trendChanges=changePoints(series).length;
    delete item.months;
  }
  delete result.monthCoverage;
  result.candidates=result.candidates.slice(0,120);
  return result;
}
self.onmessage=event=>{
  const {type,rows,existingRows}=event.data||{};
  try{
    if(type==='start'){
      discovery=createNewKeywordDiscovery(existingRows);
      self.postMessage({type:'ready'});
    }else if(type==='batch'){
      if(!discovery)throw new Error('新關鍵詞掃描尚未初始化');
      self.postMessage({type:'progress',...discovery.consume(rows)});
    }else if(type==='finish'){
      if(!discovery)throw new Error('新關鍵詞掃描尚未初始化');
      const result=annotateTrend(discovery.finish());
      self.postMessage({type:'finished',result});
      discovery=null;
    }
  }catch(error){
    discovery=null;
    self.postMessage({type:'error',error:String(error?.message||error)});
  }
};
