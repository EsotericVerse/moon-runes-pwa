import {analyzeRiverDensity} from './river-density-analysis.mjs';

self.onmessage=event=>{
  const {rows=[],anchorDates=[]}=event.data||{};
  try{
    self.postMessage({result:analyzeRiverDensity(rows,anchorDates)});
  }catch(error){
    self.postMessage({error:String(error?.message||error)});
  }
};
