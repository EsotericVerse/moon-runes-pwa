'use client';

import { useMemo, useState } from 'react';
import keywordRegistry from '../../data/json/registries/MUSIC_KEYWORD_REGISTRY.json';
import { compareKeywordScans, normalizeApiKeywordResult, scanGovernedKeywords } from './model/keyword-scan';
import { managementHasPermission, runSemanticObserver } from './auth-client';

export default function DualSemanticEnginePanel({session}){
  const [text,setText]=useState('');
  const [apiResult,setApiResult]=useState([]);
  const [status,setStatus]=useState({running:false,error:'',message:''});
  const registry=Array.isArray(keywordRegistry?.keywords)?keywordRegistry.keywords:[];
  const ruleResult=useMemo(()=>scanGovernedKeywords(text,registry),[text,registry]);
  const comparison=useMemo(()=>compareKeywordScans(ruleResult,apiResult),[ruleResult,apiResult]);
  const canRunApi=managementHasPermission(session,'platform:semantic:run');

  const runApi=async()=>{
    if(!text.trim()||!canRunApi)return;
    setStatus({running:true,error:'',message:''});
    try{
      const data=await runSemanticObserver({
        text,
        scope:'lo3rwang',
        task:'keyword_validation',
        governance:{
          direct_semantics_only:true,
          bounded_oscillation:true,
          author_classification_separate:true,
          canon_write:false
        }
      });
      const normalized=normalizeApiKeywordResult(data);
      setApiResult(normalized);
      setStatus({running:false,error:'',message:`API observer 回傳 ${normalized.length} 個候選；結果只用於交叉驗證，不會改 Canon。`});
    }catch(error){
      setApiResult([]);
      setStatus({running:false,error:String(error?.message||error),message:''});
    }
  };

  return <section className="loc-card" id="dual-semantic-engine">
    <p className="loc-eyebrow">Semantic Validation</p>
    <h3>雙語意引擎交叉驗證</h3>
    <p>基本引擎依治理過的關鍵詞、作者分類與直接語意證據運作；API 引擎是獨立 observer。API 無權修改 LunaRunes Canon，分歧只會標記為治理證據。</p>
    <p><label>測試文字<textarea rows="7" value={text} onChange={event=>{setText(event.target.value);setApiResult([]);}} placeholder="貼入歌詞、大綱句或符文文學片段"/></label></p>
    <button type="button" onClick={runApi} disabled={!canRunApi||!text.trim()||status.running}>{status.running?'API 分析中…':'執行 API 交叉驗證'}</button>
    {!canRunApi && <p>目前帳號沒有 <code>platform:semantic:run</code>；基本引擎仍可在瀏覽器內檢查。</p>}

    <h4>基本治理引擎</h4>
    {ruleResult.length?<ul>{ruleResult.map(row=><li key={row.term}>
      <strong>{row.term}</strong> × {row.count}
      {row.authorClassification && <>｜作者分類：{row.authorClassification}</>}
      {row.semanticIntent?.length>0 && <>｜語意意向：{row.semanticIntent.join('／')}</>}
    </li>)}</ul>:<p>尚未命中目前治理 registry；這本身可作為「可能漏掉常用字」的候選證據。</p>}

    {apiResult.length>0 && <><h4>API observer</h4><ul>{apiResult.map((row,index)=><li key={`${row.term}-${index}`}><strong>{row.term}</strong>{row.score!==undefined?`｜score ${row.score}`:''}</li>)}</ul></>}
    {comparison.length>0 && <><h4>交叉結果</h4><ul>{comparison.map(row=><li key={row.term}><strong>{row.term}</strong>｜{row.status}</li>)}</ul></>}
    {status.message && <p role="status">{status.message}</p>}
    {status.error && <p role="alert">API observer：{status.error}</p>}
  </section>;
}
