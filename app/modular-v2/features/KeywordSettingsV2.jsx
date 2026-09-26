'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {insertNeonRows,selectNeonRows} from '../../loc/neon-repository';
import {useNeonAccount} from '../../loc/use-neon-account';
import {selectRuneContextCatalog} from '../../loc/neon-context-client';
import {featureDataErrorMessage} from '../feature-data-state.v2';
import RuneContextV2 from './RuneContextV2';

function groupRecommendedKeywords(rows){
  const groups=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const styleTag=String(row.style_tag||'').trim();
    const keyword=String(row.keyword||'').trim();
    if(!styleTag||!keyword)continue;
    if(!groups.has(styleTag))groups.set(styleTag,[]);
    groups.get(styleTag).push(row);
  }
  return [...groups.entries()].map(([styleTag,keywords])=>({
    styleTag,
    keywords:keywords.sort((a,b)=>Number(a.order_no)-Number(b.order_no)||String(a.keyword).localeCompare(String(b.keyword)))
  }));
}

function parseKeywords(value){
  return [...new Set(String(value||'').split(/[、,，\n\r]+/).map(item=>item.trim()).filter(Boolean))];
}

function RecommendedStyleKeywordCatalog({scopeId,databaseScopeId}){
  const queryClient=useQueryClient();
  const account=useNeonAccount();
  const [canEdit,setCanEdit]=useState(false);
  const [styleTag,setStyleTag]=useState('');
  const [keywordsDraft,setKeywordsDraft]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const queryKey=['scope-recommended-style-keywords',databaseScopeId];
  const query=useQuery({
    queryKey,
    queryFn:async()=>{
      const {rows}=await selectNeonRows('silver.loc_style_tag_keywords',{
        columns:'scope_id,style_tag,keyword,order_no',
        filters:[{column:'scope_id',operator:'eq',value:databaseScopeId}],
        orders:[{column:'style_tag',ascending:true},{column:'order_no',ascending:true},{column:'keyword',ascending:true}],
        limit:5000
      });
      return rows;
    },
    staleTime:30_000
  });
  const groups=useMemo(()=>groupRecommendedKeywords(query.data||[]),[query.data]);

  useEffect(()=>{
    let active=true;
    setCanEdit(false);
    if(account.permissionLoading||!account.user||scopeId==='admin')return()=>{active=false};
    Promise.all([account.canManageGlobal(),account.canManageScope(databaseScopeId),account.canManagePage(databaseScopeId,'statics')])
      .then(values=>{if(active)setCanEdit(values.some(Boolean))})
      .catch(()=>{if(active)setCanEdit(false)});
    return()=>{active=false};
  },[account.email,account.permissionLoading,account.user,account.canManageGlobal,account.canManageScope,account.canManagePage,databaseScopeId,scopeId]);

  const addBatch=async event=>{
    event.preventDefault();
    if(!canEdit||busy)return;
    const tag=String(styleTag||'').trim();
    if(!tag){setMessage('請填寫風格關鍵詞群組名稱。');return;}
    const wanted=parseKeywords(keywordsDraft);
    if(!wanted.length){setMessage('請輸入要增加的關鍵詞。');return;}
    const current=query.data||[];
    const existing=new Set(current.filter(row=>String(row.style_tag||'').trim()===tag).map(row=>String(row.keyword||'').trim()));
    const additions=wanted.filter(keyword=>!existing.has(keyword));
    if(!additions.length){setMessage('這批關鍵詞都已存在。');return;}
    const orderStart=current.filter(row=>String(row.style_tag||'').trim()===tag).reduce((maximum,row)=>Math.max(maximum,Number(row.order_no)||0),0);
    setBusy(true);
    setMessage('');
    try{
      await insertNeonRows('silver.loc_style_tag_keywords',additions.map((keyword,index)=>({
        scope_id:databaseScopeId,style_tag:tag,keyword,order_no:orderStart+index+1
      })));
      await queryClient.invalidateQueries({queryKey});
      await queryClient.invalidateQueries({queryKey:['culture-edit-data',databaseScopeId]});
      setStyleTag('');
      setKeywordsDraft('');
      setMessage(`已將 ${additions.length} 個關鍵詞加入「${tag}」。`);
    }catch(error){setMessage(error?.message||'批量增加失敗。')}
    finally{setBusy(false)}
  };

  if(query.isPending)return <p className="scope-v2-status">讀取此 Scope 的推薦風格關鍵詞…</p>;
  if(query.error)return <p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>;

  return <div className="scope-v2-keyword-catalog">
    {groups.length?groups.map(group=><details className="scope-v2-inline-card" key={group.styleTag}>
      <summary>{group.styleTag}（{group.keywords.length} 個關鍵詞）</summary>
      <ul>{group.keywords.map((row,index)=><li key={group.styleTag+'|'+row.keyword+'|'+index}>{row.keyword}</li>)}</ul>
    </details>):<p className="scope-v2-status">此 Scope 尚未設定推薦風格關鍵詞。</p>}

    {canEdit?<details className="scope-v2-inline-card scope-v2-keyword-batch-editor">
      <summary>批量增加推薦風格關鍵詞</summary>
      <form onSubmit={addBatch}>
        <label>
          <span>風格關鍵詞群組</span>
          <input className="scope-v2-search-input" value={styleTag} onChange={event=>setStyleTag(event.target.value)} list={'recommended-style-tags-'+databaseScopeId} required/>
        </label>
        <datalist id={'recommended-style-tags-'+databaseScopeId}>{groups.map(group=><option key={group.styleTag} value={group.styleTag}/>)}</datalist>
        <label>
          <span>關鍵詞（以換行、頓號或逗號分隔）</span>
          <textarea className="scope-v2-search-input" rows="4" value={keywordsDraft} onChange={event=>setKeywordsDraft(event.target.value)} placeholder="每行一個關鍵詞" required/>
        </label>
        <button type="submit" disabled={busy}>{busy?'新增中…':'批量增加'}</button>
      </form>
      {message?<p className="scope-v2-status" role="status">{message}</p>:null}
    </details>:null}
  </div>;
}

export default function KeywordSettingsV2({scopeId='loc',databaseScopeId=scopeId}){
  const runeQuery=useQuery({
    queryKey:['rune-context-catalog'],
    queryFn:selectRuneContextCatalog,
    staleTime:5*60_000
  });

  return <div className="scope-v2-keyword-settings">
    <section className="scope-v2-inline-card">
      <h4>符文關鍵詞詞庫（3D）</h4>
      {runeQuery.isPending?<p className="scope-v2-status">載入符文關鍵詞…</p>:null}
      {runeQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error?<RuneContextV2 runes={runeQuery.data?.runes||[]} readOnly={scopeId!=='runes'}/>:null}
    </section>

    <section className="scope-v2-inline-card">
      <h4>{scopeId==='lo3rwang'?'我的風格關鍵詞｜所屬 Scope 的「推薦」詞庫':'所屬 Scope 的「推薦」風格關鍵詞詞庫'}</h4>
      <p className="scope-v2-culture-period-description">只列出目前 Scope 已納入推薦詞庫的風格關鍵詞群組；選擇群組可查看完整詞表。</p>
      <RecommendedStyleKeywordCatalog scopeId={scopeId} databaseScopeId={databaseScopeId}/>
    </section>
  </div>;
}
