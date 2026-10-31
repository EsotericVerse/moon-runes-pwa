import {detectChangepoints,PoissonCost} from 'karaul';
import {createNewKeywordDiscovery} from './keyword-discovery.mjs';

let discovery=null;
function annotateTrend(result){
  for(const item of result.candidates){
    const rows=item.months;
    if(rows.length<4){item.trendChanges=0;delete item.months;continue;}
    const first=rows[0][0],last=rows.at(-1)[0];
    const monthValue=s=>Number(s.slice(0,4))*12+Number(s.slice(5,7));
    const counts=new Map(rows),start=monthValue(first),end=monthValue(last);
    // PELT is a secondary signal, not a prerequisite for a new keyword.
    if(end-start>360){item.trendChanges=0;delete item.months;continue;}
    const series=[];
    for(let i=start;i<=end;i++){
      const y=Math.floor((i-1)/12),m=(i-1)%12+1;
      series.push(counts.get(String(y)+'-'+String(m).padStart(2,'0'))||0);
    }
    try{
      item.trendChanges=detectChangepoints(series,new PoissonCost())
        .filter(i=>Number.isInteger(i)&&i>0&&i<series.length).length;
    }catch{item.trendChanges=0;}
    delete item.months;
  }
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
