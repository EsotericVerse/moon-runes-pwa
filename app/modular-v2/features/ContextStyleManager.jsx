'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useNeonAccount} from '../../loc/use-neon-account';
import {deleteNeonRows,insertNeonRows,selectNeonRows,updateNeonRows} from '../../loc/neon-repository';

const KEYWORD_GROUPS=Object.freeze([['macro','大風格關鍵詞'],['style','風格關鍵詞']]);

function groupRows(rows){
  const all=Array.isArray(rows)?rows:[];
  return all.filter(row=>row.node_type==='style').sort((a,b)=>Number(a.style_no)-Number(b.style_no))
    .map(parent=>({...parent,keywords:all.filter(row=>row.node_type==='keyword'&&Number(row.style_no)===Number(parent.style_no))
      .sort((a,b)=>Number(a.order_no)-Number(b.order_no)||String(a.keyword).localeCompare(String(b.keyword)))}));
}

export default function ContextStyleManager({scopeId='lo3rwang'}){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const [canEdit,setCanEdit]=useState(false);
  const [editing,setEditing]=useState(false);
  const [editingStyle,setEditingStyle]=useState(null);
  const [styleDraft,setStyleDraft]=useState({representative_name:'',basic_principle:''});
  const [newStyle,setNewStyle]=useState({representative_name:'',basic_principle:''});
  const [wordDrafts,setWordDrafts]=useState({});
  const [editingWord,setEditingWord]=useState(null);
  const [newWords,setNewWords]=useState({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let active=true;setCanEdit(false);
    if(account.permissionLoading||!account.user||scopeId!=='lo3rwang')return()=>{active=false};
    Promise.all([account.canManageGlobal(),account.canManageScope(scopeId),account.canManagePage(scopeId,'culture')])
      .then(values=>{if(active)setCanEdit(values.some(Boolean))})
      .catch(()=>{if(active)setCanEdit(false)});
    return()=>{active=false};
  },[account.user?.id,account.permissionLoading,account.canManageGlobal,account.canManageScope,account.canManagePage,scopeId]);

  const stylesQuery=useQuery({
    queryKey:['lo3rwang-custom-runes',scopeId],
    enabled:scopeId==='lo3rwang',
    queryFn:async()=>{
      const {rows}=await selectNeonRows('silver.lo3rwang_style',{
        columns:'style_no,node_type,representative_name,basic_principle,keyword_group,keyword,order_no',
        orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}],limit:5000
      });
      return rows;
    },
    staleTime:30_000
  });
  const rankingQuery=useQuery({
    queryKey:['lo3rwang-custom-rune-rankings'],
    enabled:scopeId==='lo3rwang',
    queryFn:async()=>{
      const {rows}=await selectNeonRows('api.lo3rwang_style_rankings',{
        columns:'style_no,style_tag,keyword,keyword_group,item_count,rank_value,order_no',
        orders:[{column:'style_no',ascending:true},{column:'keyword_group',ascending:true},{column:'rank_value',ascending:true}],
        limit:5000
      });
      return rows;
    },
    staleTime:60_000
  });
  const rows=stylesQuery.data||[];
  const groups=useMemo(()=>groupRows(rows),[rows]);
  const rankings=rankingQuery.data||[];
  const rankingsByGroup=useMemo(()=>{
    const map=new Map();
    for(const row of rankings){
      const key=String(row.style_no)+'|'+String(row.keyword_group||'');
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(row);
    }
    return map;
  },[rankings]);

  const refresh=async()=>{
    await queryClient.invalidateQueries({queryKey:['lo3rwang-custom-runes']});
    await queryClient.invalidateQueries({queryKey:['lo3rwang-custom-rune-rankings']});
    await queryClient.invalidateQueries({queryKey:['context-graph','lo3rwang']});
    await queryClient.invalidateQueries({queryKey:['culture-edit-data']});
    await queryClient.invalidateQueries({queryKey:['culture-timeline']});
  };
  const run=async action=>{
    setBusy(true);setMessage('');
    try{await action();await refresh();setMessage('已儲存。')}
    catch(error){setMessage(error?.message||'儲存失敗。')}
    finally{setBusy(false)}
  };

  const saveStyle=style=>run(async()=>{
    const styleNo=Number(style.style_no);
    const oldName=String(style.representative_name||'').trim();
    const name=String(styleDraft.representative_name||'').trim();
    if(!name)throw new Error('請填寫代表名稱；它會作為時間長河的風格標籤。');
    await updateNeonRows('silver.lo3rwang_style',{representative_name:name},{
      filters:[{column:'style_no',operator:'eq',value:styleNo}]
    });
    await updateNeonRows('silver.lo3rwang_style',{basic_principle:String(styleDraft.basic_principle||'').trim()||null},{
      filters:[{column:'style_no',operator:'eq',value:styleNo},{column:'node_type',operator:'eq',value:'style'}]
    });
    if(oldName&&oldName!==name)await updateNeonRows('silver.loc_timeline_entries',{entry_name:name},{filters:[
      {column:'scope_id',operator:'eq',value:'lo3rwang'},
      {column:'entry_type',operator:'eq',value:'style'},
      {column:'entry_name',operator:'eq',value:oldName}
    ]});
    setEditingStyle(null);
  });
  const addStyle=()=>run(async()=>{
    const name=String(newStyle.representative_name||'').trim();
    if(!name)throw new Error('請填寫代表名稱。');
    const styleNo=Math.max(0,...groups.map(row=>Number(row.style_no)))+1;
    await insertNeonRows('silver.lo3rwang_style',[{
      style_no:styleNo,node_type:'style',representative_name:name,basic_principle:String(newStyle.basic_principle||'').trim()||null,
      keyword_group:null,keyword:null,order_no:styleNo
    }]);
    setNewStyle({representative_name:'',basic_principle:''});
  });
  const removeStyle=styleNo=>run(async()=>{
    await deleteNeonRows('silver.lo3rwang_style',{filters:[{column:'style_no',operator:'eq',value:Number(styleNo)}]});
    setEditingStyle(null);
  });
  const addKeyword=(style,keywordGroup)=>run(async()=>{
    const key=Number(style.style_no)+'|'+keywordGroup;
    const keyword=String(newWords[key]||'').trim();
    if(!keyword)throw new Error('請填寫關鍵詞。');
    const siblings=style.keywords.filter(row=>row.keyword_group===keywordGroup);
    await insertNeonRows('silver.lo3rwang_style',[{
      style_no:Number(style.style_no),node_type:'keyword',representative_name:style.representative_name||null,basic_principle:null,
      keyword_group:keywordGroup,keyword,order_no:siblings.length+1
    }]);
    setNewWords(current=>({...current,[key]:''}));
  });
  const saveKeyword=(row,oldKeyword,editKey)=>run(async()=>{
    const keyword=String(wordDrafts[editKey]||'').trim();
    if(!keyword)throw new Error('請填寫關鍵詞。');
    await updateNeonRows('silver.lo3rwang_style',{keyword,representative_name:row.representative_name||null},{
      filters:[
        {column:'style_no',operator:'eq',value:Number(row.style_no)},
        {column:'node_type',operator:'eq',value:'keyword'},
        {column:'keyword_group',operator:'eq',value:row.keyword_group},
        {column:'keyword',operator:'eq',value:oldKeyword}
      ]
    });
    setEditingWord(null);
  });
  const removeKeyword=row=>run(async()=>{
    await deleteNeonRows('silver.lo3rwang_style',{filters:[
      {column:'style_no',operator:'eq',value:Number(row.style_no)},
      {column:'node_type',operator:'eq',value:'keyword'},
      {column:'keyword_group',operator:'eq',value:row.keyword_group},
      {column:'keyword',operator:'eq',value:row.keyword}
    ]});
  });

  if(scopeId!=='lo3rwang')return null;
  return <section className="loc-card scope-v2-feature-card">
    <p className="loc-eyebrow">個人自訂符文</p>
    <h2>八種代表風格與關鍵詞排行建議</h2>
    <p>每個代表名稱是一個個人風格節點，包含基本原則、大風格關鍵詞與風格關鍵詞。排行依作者自己的作品與 meta tag 即時計算，只提供參考，不會自動新增或修改詞庫。</p>
    {stylesQuery.isPending?<p className="scope-v2-status">讀取個人風格…</p>:null}
    {stylesQuery.error?<p className="scope-v2-status scope-v2-error">{stylesQuery.error.message}</p>:null}
    {rankingQuery.error?<p className="scope-v2-status scope-v2-error">關鍵詞排行讀取失敗：{rankingQuery.error.message}</p>:null}
    {!stylesQuery.isPending&&!stylesQuery.error&&!groups.length?<p className="scope-v2-status">目前沒有個人風格分類。</p>:null}
    {groups.map(group=><article className="scope-v2-inline-card" key={group.style_no}>
      <p className="loc-eyebrow">風格編號 {group.style_no}</p>
      <h3>{group.representative_name||('自訂符文 '+group.style_no)}</h3>
      {group.basic_principle?<p>{group.basic_principle}</p>:null}
      {KEYWORD_GROUPS.map(([kind,label])=>{
        const words=group.keywords.filter(row=>row.keyword_group===kind);
        const ranked=rankingsByGroup.get(String(group.style_no)+'|'+kind)||[];
        return <div key={kind}>
          <h4>{label}</h4>
          {!words.length?<p className="scope-v2-status">尚未設定。</p>:<ul>{words.map(row=>{
            const match=ranked.find(item=>item.keyword===row.keyword);
            return <li key={row.keyword}>{row.keyword}{match?<small> · 命中 {match.item_count} 筆</small>:null}</li>;
          })}</ul>}
          {ranked.length?<details><summary>排行建議</summary><ol>{ranked.map(item=><li key={item.keyword}>{item.keyword}｜命中 {item.item_count} 筆</li>)}</ol></details>:null}
        </div>;
      })}
    </article>)}

    {canEdit?<div className="scope-v2-tabs"><button type="button" onClick={()=>setEditing(value=>!value)}>{editing?'完成編輯':'編輯個人關鍵詞'}</button></div>:null}
    {editing&&canEdit?<article className="scope-v2-inline-card">
      <h3>新增代表風格</h3>
      <form onSubmit={event=>{event.preventDefault();addStyle()}}>
        <label><span>代表名稱／時間長河風格標籤</span><input className="scope-v2-search-input" value={newStyle.representative_name} onChange={event=>setNewStyle(current=>({...current,representative_name:event.target.value}))} required/></label>
        <label><span>基本原則</span><textarea className="scope-v2-search-input" value={newStyle.basic_principle} onChange={event=>setNewStyle(current=>({...current,basic_principle:event.target.value}))}/></label>
        <button type="submit" disabled={busy}>新增節點</button>
      </form>
    </article>:null}

    {editing&&canEdit?groups.map(group=><article className="scope-v2-inline-card" key={'edit-'+group.style_no}>
      {editingStyle===Number(group.style_no)?<form onSubmit={event=>{event.preventDefault();saveStyle(group)}}>
        <h3>編輯風格編號 {group.style_no}</h3>
        <label><span>代表名稱／時間長河風格標籤</span><input className="scope-v2-search-input" value={styleDraft.representative_name} onChange={event=>setStyleDraft(current=>({...current,representative_name:event.target.value}))} required/></label>
        <label><span>基本原則</span><textarea className="scope-v2-search-input" value={styleDraft.basic_principle} onChange={event=>setStyleDraft(current=>({...current,basic_principle:event.target.value}))}/></label>
        <div className="scope-v2-tabs"><button type="submit" disabled={busy}>儲存代表風格</button><button type="button" onClick={()=>setEditingStyle(null)}>取消</button></div>
      </form>:<div className="scope-v2-tabs">
        <strong>風格編號 {group.style_no}｜{group.representative_name||'尚未命名'}</strong>
        <button type="button" onClick={()=>{setEditingStyle(Number(group.style_no));setStyleDraft({representative_name:group.representative_name||'',basic_principle:group.basic_principle||''})}}>編輯節點</button>
        <button type="button" disabled={busy} onClick={()=>removeStyle(group.style_no)}>刪除節點</button>
      </div>}
      {KEYWORD_GROUPS.map(([kind,label])=><div key={kind}>
        <h4>{label}</h4>
        {group.keywords.filter(row=>row.keyword_group===kind).map(row=>{
          const id=String(group.style_no)+'|'+kind+'|'+row.keyword;
          return <div className="scope-v2-tabs" key={id}>
            {editingWord===id
              ?<><input className="scope-v2-search-input" value={wordDrafts[id]??row.keyword} onChange={event=>setWordDrafts(current=>({...current,[id]:event.target.value}))}/><button type="button" disabled={busy} onClick={()=>saveKeyword({...row,style_no:group.style_no,representative_name:group.representative_name},row.keyword,id)}>儲存</button><button type="button" onClick={()=>setEditingWord(null)}>取消</button></>
              :<><span>{row.keyword}</span><button type="button" onClick={()=>{setEditingWord(id);setWordDrafts(current=>({...current,[id]:row.keyword}))}}>編輯關鍵詞</button><button type="button" disabled={busy} onClick={()=>removeKeyword({...row,style_no:group.style_no})}>刪除關鍵詞</button></>}
          </div>;
        })}
        <form className="scope-v2-tabs" onSubmit={event=>{event.preventDefault();addKeyword(group,kind)}}>
          <input className="scope-v2-search-input" value={newWords[String(group.style_no)+'|'+kind]||''} onChange={event=>setNewWords(current=>({...current,[String(group.style_no)+'|'+kind]:event.target.value}))} placeholder={'新增'+label}/>
          <button type="submit" disabled={busy}>新增關鍵詞</button>
        </form>
      </div>)}
    </article>):null}
    {message?<p className="scope-v2-status" role="status">{message}</p>:null}
  </section>;
}
