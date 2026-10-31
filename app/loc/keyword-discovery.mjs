// On-demand, read-only discovery of new literal Keywords from Galaxy content.
// Existing Keywords are used ONLY as an exclusion set; no classifications are changed.
const IGNORE_ZH=new Set('我們 你們 他們 這個 那個 這些 那些 自己 可以 可能 沒有 不是 什麼 怎麼 為什麼 因為 所以 如果 然後 但是 不過 已經 還是 真的 覺得 知道 一個 一些 一種 一樣 這樣 那樣 現在 今天 昨天 明天 時候 事情 問題 東西 地方 目前 之後 之前 以及 其中 其他 以上 以下 只是 就是 還有 而且 需要 進行 使用 發現 看到 發生 成為 只有 不能 不會 也許 其實 開始 結果 最後 大家 例如 例如說 文章 內容 發表 動態 分享 連結 標題 時間 日期 發文 網站 網頁 作者 資料 資訊 文字 檢查 進去 出來 回來 什麼樣 都是 也是 這是 那是 這裡 那裡 但是 因此 方法 方式 主要 相關 包含 包括 應該 這麼 那麼 或者 以及 之間 時間點 今天晚上 現在目前'.split(/\s+/u));
const IGNORE_EN=new Set('the and for that this with from have has had are was were you your they them their our his her what why how when where which just also can could would should not all one two into about there here then than more less some any out use used using via http https www com org net facebook threads instagram posted share post photo photos image images video media title text content article link links'.split(/\s+/u));
const HAN=/^\p{Script=Han}+$/u;
const LATIN=/^[\p{Script=Latin}][\p{Script=Latin}\d+#-]*$/u;
const MAX_TERMS=85000;
const normalize=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase();
function admissible(token){
  const value=normalize(token);
  if(HAN.test(value))return [...value].length>=2&&[...value].length<=8&&!IGNORE_ZH.has(value)&&!/(.)\1{2,}/u.test(value);
  if(LATIN.test(value))return value.length>=3&&value.length<=30&&!IGNORE_EN.has(value);
  return false;
}
export function existingKeywordSet(rows=[]){
  const found=new Set();
  for(const row of rows){
    // Include Item names too; a term already named as an Item isn't "new".
    if(row?.type!=='item')continue;
    const name=normalize(row.name);
    if(name)found.add(name);
    for(const term of Array.isArray(row.lists)?row.lists:[]){
      const key=normalize(term);
      if(key)found.add(key);
    }
  }
  return found;
}
export function createNewKeywordDiscovery(rows=[]){
  const existing=existingKeywordSet(rows);
  const segmenter=new Intl.Segmenter('zh',{granularity:'word'});
  const totals=new Map();
  let read=0,withContent=0,limited=false;
  function add(term,seen,month,excerpt){
    const key=normalize(term);
    if(!admissible(key)||existing.has(key))return;
    let record=totals.get(key);
    if(!record){
      if(totals.size>=MAX_TERMS){limited=true;return;}
      record={word:key,documents:0,occurrences:0,months:new Map(),sample:excerpt};
      totals.set(key,record);
    }
    record.occurrences++;
    if(seen.has(key))return;
    seen.add(key);
    record.documents++;
    if(month)record.months.set(month,(record.months.get(month)||0)+1);
  }
  function consume(batch=[]){
    for(const row of batch){
      read++;
      const body=String(row?.content||'');
      if(!body.trim())continue;
      withContent++;
      const seen=new Set();
      const month=String(row?.createtime||'').slice(0,7);
      let prev=null;
      for(const piece of segmenter.segment(body)){
        const token=String(piece.segment||'').trim();
        const isHan=HAN.test(token);
        if(piece.isWordLike){
          const sample=body.slice(Math.max(0,piece.index-28),Math.min(body.length,piece.index+token.length+32)).replace(/\s+/gu,' ').trim();
          add(token,seen,month,sample);
          if(prev&&prev.end===piece.index&&prev.han&&isHan){
            const combined=prev.token+token;
            if([...combined].length>=3&&[...combined].length<=8)add(combined,seen,month,sample);
          }
        }
        prev=piece.isWordLike?{token,end:piece.index+piece.segment.length,han:isHan}:null;
      }
    }
    return {read,withContent,limited};
  }
  function finish({limit=60,minDocuments=3}={}){
    const minimum=withContent<100?2:minDocuments;
    const result=[...totals.values()]
      .filter(term=>term.documents>=minimum)
      .sort((a,b)=>b.documents-a.documents||b.occurrences-a.occurrences||a.word.localeCompare(b.word))
      .slice(0,Math.max(1,Math.min(100,limit)))
      .map(term=>({...term,months:[...term.months.entries()].sort(([a],[b])=>a.localeCompare(b))}));
    return {read,withContent,limited,existingCount:existing.size,candidates:result};
  }
  return {consume,finish};
}
