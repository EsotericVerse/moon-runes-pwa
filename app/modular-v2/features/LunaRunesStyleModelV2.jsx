'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {neonAuthClient,neonPublicClient} from '../../loc/neon-client';
import {classifyLunaRunesStyleText,compileLunaRunesStyleModel} from '../../loc/lrunes-style-model.mjs';

const SONG_BATCH=200;

async function loadModelRows(){
  const {data,error}=await neonAuthClient.schema('silver').from('lrunes_style')
    .select('model_name,style_no,node_type,representative_name,parent_group_name,basic_principle,keyword_group,keyword,order_no')
    .order('style_no',{ascending:true})
    .order('order_no',{ascending:true});
  if(error)throw new Error(error.message||'月之符文分類模型讀取失敗');
  return data||[];
}
function preview(value,limit=90){
  const text=String(value||'').replace(/\s+/g,' ').trim();
  return text.length>limit?text.slice(0,limit)+'…':text;
}
function groupEntryCount(group){
  return group.runes.reduce((sum,rune)=>sum+rune.keywords.length+rune.rules.length,0);
}
function modelStats(model){
  const counts=model.styles.map(rune=>({
    name:rune.rune_name,
    group:rune.group_name,
    count:rune.keywords.length+rune.rules.length
  }));
  const total=counts.reduce((sum,item)=>sum+item.count,0);
  const avg=counts.length?total/counts.length:0;
  const max=counts.reduce((best,item)=>!best||item.count>best.count?item:best,null);
  const min=counts.reduce((best,item)=>!best||item.count<best.count?item:best,null);
  return {total,avg,max,min};
}

export default function LunaRunesStyleModelV2(){
  const query=useQuery({
    queryKey:['lrunes-style-model'],
    queryFn:loadModelRows,
    staleTime:30_000
  });
  const rows=query.data||[];
  const model=useMemo(()=>compileLunaRunesStyleModel(rows),[rows]);
  const stats=useMemo(()=>modelStats(model),[model]);
  const modelName=rows.find(row=>row.model_name)?.model_name||'月之符文';
  const [testText,setTestText]=useState('');
  const [testResult,setTestResult]=useState(null);
  const [scanning,setScanning]=useState(false);
  const [scanError,setScanError]=useState('');
  const [scanResult,setScanResult]=useState(null);

  async function scanSuno(){
    if(!model.styles.length)return;
    setScanning(true);setScanError('');setScanResult(null);
    try{
      let offset=0,scanned=0,classified=0;
      const runeCounts=new Map();
      const groupCounts=new Map();
      const unmatched=[];
      while(true){
        const {data,error}=await neonPublicClient.schema('silver').from('lo3rwang_galaxy')
          .select('uid,title,content')
          .eq('source_name','suno')
          .order('createtime',{ascending:true})
          .range(offset,offset+SONG_BATCH-1);
        if(error)throw new Error(error.message||'Suno 歌詞讀取失敗');
        const batch=data||[];
        if(!batch.length)break;
        for(const row of batch){
          const content=String(row.content||'').trim();
          if(!content)continue;
          scanned+=1;
          const result=classifyLunaRunesStyleText(content,model);
          if(result.unmatched){
            if(unmatched.length<60)unmatched.push({
              uid:row.uid,
              title:row.title||'未命名歌曲',
              preview:preview(content)
            });
            continue;
          }
          classified+=1;
          for(const hit of result.hits){
            runeCounts.set(hit.rune_name,(runeCounts.get(hit.rune_name)||0)+1);
          }
          for(const group of result.groups){
            groupCounts.set(group.group_name,(groupCounts.get(group.group_name)||0)+1);
          }
        }
        offset+=batch.length;
        if(batch.length<SONG_BATCH)break;
      }
      setScanResult({
        scanned,
        classified,
        unmatched,
        runeCounts:[...runeCounts.entries()].sort((a,b)=>b[1]-a[1]),
        groupCounts:[...groupCounts.entries()].sort((a,b)=>b[1]-a[1])
      });
    }catch(exception){
      setScanError(String(exception?.message||exception||'掃描失敗。'));
    }finally{
      setScanning(false);
    }
  }

  if(query.isPending)return <section className="loc-card"><p className="scope-v2-status">載入月之符文分類模型…</p></section>;
  if(query.error)return <section className="loc-card"><p className="scope-v2-status scope-v2-error">{query.error.message}</p></section>;

  return <section className="scope-v2-list">
    <section className="loc-card">
      <p className="loc-eyebrow">LunaRunes Style Model · RC8 Test</p>
      <h2>{modelName}</h2>
      <p>管理端分類模型；目前不接 Culture／Statistics，也不會寫入統計結果。</p>
      <p className="scope-v2-meta">
        <span>9 組</span>
        <span>67 枚符文</span>
        <span>{stats.total} 個關鍵詞／規則</span>
        <span>平均 {stats.avg.toFixed(1)}／符文</span>
        {stats.max?<span>最多：{stats.max.name} {stats.max.count}</span>:null}
        {stats.min?<span>最少：{stats.min.name} {stats.min.count}</span>:null}
      </p>
    </section>

    <section className="loc-grid two">
      {model.groups.map(group=><article className="loc-card" key={group.name}>
        <p className="loc-eyebrow">{group.name}</p>
        <h2>{group.runes.length} 枚符文 · {groupEntryCount(group)} 條</h2>
        <div className="lrunes-style-flat-list">
          {group.runes.map(rune=>{
            const count=rune.keywords.length+rune.rules.length;
            const rules=rune.rules.map(rule=>rule.token).join(' → ');
            return <div className="lrunes-style-flat-item" key={rune.style_no}>
              <strong>{rune.rune_name}</strong>
              <span>{count} 條</span>
              {rules?<small>{rules}</small>:null}
            </div>;
          })}
        </div>
      </article>)}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Single Text Test</p>
      <h2>單段文字測試</h2>
      <textarea
        className="lrunes-style-model-textarea"
        rows="8"
        value={testText}
        onChange={event=>setTestText(event.target.value)}
        placeholder="貼一段歌詞或文字，直接測試這套分類模型。"
      />
      <p><button type="button" onClick={()=>setTestResult(classifyLunaRunesStyleText(testText,model))}>執行分類</button></p>
      {testResult?<div className="scope-v2-list">
        <p><strong>符文：</strong>{testResult.hits.length?testResult.hits.map(hit=>hit.rune_name+'('+hit.hit_count+')').join('、'):'未命中'}</p>
        <p><strong>群組：</strong>{testResult.groups.length?testResult.groups.map(group=>group.group_name+'('+group.hit_count+')').join('、'):'未命中'}</p>
        {testResult.excluded_names.length?<p><strong>NAME 排除：</strong>{testResult.excluded_names.join('、')}</p>:null}
      </div>:null}
    </section>

    <section className="loc-card">
      <p className="loc-eyebrow">Corpus Test · Suno</p>
      <h2>歌詞整批掃描</h2>
      <p>只有按下按鈕才會掃描；結果只留在這個管理頁，不寫入 Statistics。</p>
      <p><button type="button" disabled={scanning} onClick={scanSuno}>{scanning?'掃描中…':'掃描 Suno 歌詞'}</button></p>
      {scanError?<p className="scope-v2-status scope-v2-error">{scanError}</p>:null}
      {scanResult?<div className="scope-v2-list">
        <p>掃描 {scanResult.scanned.toLocaleString()} 首；有分類 {scanResult.classified.toLocaleString()} 首；完全未命中 {scanResult.unmatched.length.toLocaleString()} 首（最多列 60 首）。</p>
        <div className="loc-grid two">
          <article className="scope-v2-inline-card">
            <strong>群組命中</strong>
            <p>{scanResult.groupCounts.map(([name,count])=>name+' '+count).join(' · ')||'無'}</p>
          </article>
          <article className="scope-v2-inline-card">
            <strong>符文命中前 20</strong>
            <p>{scanResult.runeCounts.slice(0,20).map(([name,count])=>name+' '+count).join(' · ')||'無'}</p>
          </article>
        </div>
        {scanResult.unmatched.length?<div>
          <h3>完全未命中的歌曲</h3>
          <div className="scope-v2-list">
            {scanResult.unmatched.map(row=><article className="scope-v2-inline-card" key={row.uid}>
              <strong>{row.title}</strong>
              <p>{row.preview}</p>
            </article>)}
          </div>
        </div>:null}
      </div>:null}
    </section>
  </section>;
}
