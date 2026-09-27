'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {
  deleteNeonRows,insertNeonRows,selectNeonAllRows,updateNeonRows
} from '../../loc/neon-repository';
import {selectRuneKeywordCatalog} from '../../loc/neon-context-client';
import {clearStyleCatalogCache} from '../../loc/style-classifier';
import {useNeonAccount} from '../../loc/use-neon-account';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';
import RuneContextV2 from './RuneContextV2';

function AuthorKeywordSettings(){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const [selectedStyle,setSelectedStyle]=useState('');
  const [newGroup,setNewGroup]=useState('style');
  const [newKeyword,setNewKeyword]=useState('');
  const [editing,setEditing]=useState(null);
  const [draft,setDraft]=useState({keyword_group:'style',keyword:''});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const query=useQuery({
    queryKey:['lo3rwang-style-keywords'],
    queryFn:async()=>{
      const {rows}=await selectNeonAllRows('silver.lo3rwang_style',{
        columns:'style_no,node_type,representative_name,parent_group_name,keyword_group,keyword,order_no',
        orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}]
      });
      return rows;
    },
    staleTime:15000
  });

  const styles=useMemo(()=>(query.data||[])
    .filter(row=>row.node_type==='style')
    .sort((a,b)=>Number(a.order_no||0)-Number(b.order_no||0)||Number(a.style_no)-Number(b.style_no)),[query.data]);
  const keywords=useMemo(()=>(query.data||[])
    .filter(row=>row.node_type==='keyword')
    .sort((a,b)=>Number(a.style_no)-Number(b.style_no)||String(a.keyword_group||'').localeCompare(String(b.keyword_group||''))||Number(a.order_no||0)-Number(b.order_no||0)),[query.data]);

  useEffect(()=>{
    if(!selectedStyle&&styles.length)setSelectedStyle(String(styles[0].style_no));
  },[selectedStyle,styles]);

  const selected=styles.find(row=>String(row.style_no)===String(selectedStyle))||null;
  const selectedKeywords=keywords.filter(row=>String(row.style_no)===String(selectedStyle));
  const canEdit=Boolean(account.user&&!account.permissionLoading&&(account.canManageGlobalSync()||account.canManageScopeSync('lo3rwang')));

  const refresh=async()=>{
    clearStyleCatalogCache();
    await queryClient.invalidateQueries({queryKey:['lo3rwang-style-keywords']});
    await queryClient.invalidateQueries({queryKey:['statistics-ranking']});
    await queryClient.invalidateQueries({queryKey:['statistics-ranking-all']});
    await queryClient.invalidateQueries({queryKey:['statistics-ranking-comparison']});
    await queryClient.invalidateQueries({queryKey:['culture-period-style-snapshot']});
  };

  async function run(action){
    setBusy(true);setMessage('');
    try{await action();await refresh();setMessage('作者關鍵詞設定已更新。');}
    catch(error){setMessage(error?.message||'作者關鍵詞更新失敗。');}
    finally{setBusy(false);}
  }

  function normalizeGroup(value){
    return value==='macro'?'macro':'style';
  }

  const add=()=>run(async()=>{
    if(!canEdit)throw new Error('沒有修改作者關鍵詞的權限。');
    const styleNo=Number(selectedStyle);
    const keyword=String(newKeyword||'').trim();
    if(!Number.isInteger(styleNo)||!selected)throw new Error('請先選擇風格。');
    if(!keyword)throw new Error('請輸入關鍵詞或 AND／NOR 規則。');
    const group=normalizeGroup(newGroup);
    const siblings=selectedKeywords.filter(row=>row.keyword_group===group);
    const orderNo=Math.max(0,...siblings.map(row=>Number(row.order_no)||0))+1;
    await insertNeonRows('silver.lo3rwang_style',[{
      style_no:styleNo,
      node_type:'keyword',
      representative_name:null,
      parent_group_name:null,
      basic_principle:null,
      keyword_group:group,
      keyword,
      order_no:orderNo
    }]);
    setNewKeyword('');
  });

  const save=row=>run(async()=>{
    if(!canEdit)throw new Error('沒有修改作者關鍵詞的權限。');
    const keyword=String(draft.keyword||'').trim();
    if(!keyword)throw new Error('關鍵詞不可為空。');
    const group=normalizeGroup(draft.keyword_group);
    await updateNeonRows('silver.lo3rwang_style',{
      keyword_group:group,
      keyword
    },{filters:[
      {column:'style_no',operator:'eq',value:Number(row.style_no)},
      {column:'node_type',operator:'eq',value:'keyword'},
      {column:'keyword_group',operator:'eq',value:String(row.keyword_group)},
      {column:'keyword',operator:'eq',value:String(row.keyword)}
    ]});
    setEditing(null);
  });

  const remove=row=>run(async()=>{
    if(!canEdit)throw new Error('沒有刪除作者關鍵詞的權限。');
    await deleteNeonRows('silver.lo3rwang_style',{filters:[
      {column:'style_no',operator:'eq',value:Number(row.style_no)},
      {column:'node_type',operator:'eq',value:'keyword'},
      {column:'keyword_group',operator:'eq',value:String(row.keyword_group)},
      {column:'keyword',operator:'eq',value:String(row.keyword)}
    ],returning:null});
    setEditing(null);
  });

  return <section className="scope-v2-inline-card">
    <h4>作者風格關鍵詞</h4>
    <p>直接使用 <code>silver.lo3rwang_style</code>。macro 是大風格層，style 是風格標籤層；關鍵詞欄也可直接填入 <strong>AND詞</strong> 或 <strong>NOR詞</strong> 作為機械規則。</p>
    {query.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    {styles.length?<div className="scope-v2-stat-controls">
      <label><span>風格</span><select className="scope-v2-select" value={selectedStyle} onChange={event=>{setSelectedStyle(event.target.value);setEditing(null);}}>
        {styles.map(row=><option key={row.style_no} value={row.style_no}>{row.representative_name||('風格 '+row.style_no)}{row.parent_group_name?'｜'+row.parent_group_name:''}</option>)}
      </select></label>
    </div>:null}

    {selected?<div className="scope-v2-list">
      {selectedKeywords.map(row=>{
        const key=[row.style_no,row.keyword_group,row.keyword].join('|');
        return <article className="scope-v2-inline-card" key={key}>
          {editing===key?<form onSubmit={event=>{event.preventDefault();save(row);}}>
            <div className="scope-v2-stat-controls">
              <label><span>層級</span><select className="scope-v2-select" value={draft.keyword_group} onChange={event=>setDraft(current=>({...current,keyword_group:event.target.value}))}>
                <option value="style">style</option><option value="macro">macro</option>
              </select></label>
              <label><span>關鍵詞／規則</span><input className="scope-v2-search-input" value={draft.keyword} onChange={event=>setDraft(current=>({...current,keyword:event.target.value}))}/></label>
            </div>
            <div className="scope-v2-tabs"><button type="submit" disabled={busy}>儲存</button><button type="button" onClick={()=>setEditing(null)}>取消</button></div>
          </form>:<>
            <strong>{row.keyword_group}｜{row.keyword}</strong>
            {canEdit?<span><button type="button" onClick={()=>{setEditing(key);setDraft({keyword_group:row.keyword_group||'style',keyword:row.keyword||''});}}>編輯</button> · <button type="button" disabled={busy} onClick={()=>remove(row)}>刪除</button></span>:null}
          </>}
        </article>;
      })}
      {!selectedKeywords.length?<p className="scope-v2-status">這個風格目前尚未設定關鍵詞；在設定前，系統不會自行猜測它的文字特徵。</p>:null}
    </div>:null}

    {canEdit&&selected?<form className="scope-v2-inline-card" onSubmit={event=>{event.preventDefault();add();}}>
      <h5>新增關鍵詞／規則</h5>
      <div className="scope-v2-stat-controls">
        <label><span>層級</span><select className="scope-v2-select" value={newGroup} onChange={event=>setNewGroup(event.target.value)}>
          <option value="style">style</option><option value="macro">macro</option>
        </select></label>
        <label><span>關鍵詞／規則</span><input className="scope-v2-search-input" value={newKeyword} onChange={event=>setNewKeyword(event.target.value)} placeholder="例如：微月光、AND文化、NOR日"/></label>
        <button type="submit" disabled={busy||!newKeyword.trim()}>新增</button>
      </div>
    </form>:null}
    {message?<p className="scope-v2-status" role="status">{message}</p>:null}
  </section>;
}

export default function KeywordSettingsV2({scopeId='loc'}){
  const account=useNeonAccount();
  const [canEditRunes,setCanEditRunes]=useState(false);
  const runeQuery=useQuery({
    queryKey:['rune-keyword-catalog'],
    queryFn:selectRuneKeywordCatalog,
    enabled:scopeId==='lunarunes',
    staleTime:5*60_000
  });

  useEffect(()=>{
    let active=true;
    setCanEditRunes(false);
    if(scopeId!=='lunarunes'||account.permissionLoading||!account.user)return()=>{active=false};
    Promise.all([
      account.canManageGlobal(),
      account.canManageScope('lunarunes')
    ]).then(values=>{if(active)setCanEditRunes(values.some(Boolean))})
      .catch(()=>{if(active)setCanEditRunes(false)});
    return()=>{active=false};
  },[scopeId,account.user?.email,account.permissionLoading,account.canManageGlobal,account.canManageScope]);

  return <div className="scope-v2-keyword-settings">
    {scopeId==='lo3rwang'?<AuthorKeywordSettings/>:null}
    {scopeId==='lunarunes'?<section className="scope-v2-inline-card">
      <h4>符文關鍵詞詞庫（2D 圓形圖）</h4>
      {runeQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {runeQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(runeQuery.error)}</p>:null}
      {!runeQuery.isPending&&!runeQuery.error?<RuneContextV2 runes={runeQuery.data?.runes||[]} readOnly={scopeId!=='lunarunes'||!canEditRunes}/>:null}
    </section>:null}
  </div>;
}
