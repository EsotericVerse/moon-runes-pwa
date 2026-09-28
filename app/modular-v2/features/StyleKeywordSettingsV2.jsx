'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {neonAuthClient,neonPublicClient} from '../../loc/neon-client';
import {useNeonAccount} from '../../loc/use-neon-account';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';

const STYLE_COUNT=8;
const KEYWORD_GROUPS=Object.freeze([
  ['macro','大風格關鍵詞'],
  ['style','風格關鍵詞']
]);

function relation(client){
  return client.schema('silver').from('lo3rwang_style');
}
function splitKeywords(value=''){
  return [...new Set(String(value||'').split(/[、,，\n\r]+/).map(item=>item.trim()).filter(Boolean))];
}
function joinKeywords(rows,group){
  return rows
    .filter(row=>row.node_type==='keyword'&&row.keyword_group===group)
    .sort((a,b)=>Number(a.order_no||0)-Number(b.order_no||0))
    .map(row=>row.keyword)
    .filter(Boolean)
    .join('、');
}
async function loadRows(){
  const {data,error}=await relation(neonPublicClient)
    .select('style_no,node_type,representative_name,parent_group_name,basic_principle,keyword_group,keyword,order_no')
    .order('style_no',{ascending:true})
    .order('order_no',{ascending:true});
  if(error)throw new Error(error.message||'Style 設定讀取失敗');
  return data||[];
}

export default function StyleKeywordSettingsV2(){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const query=useQuery({
    queryKey:['style-keyword-settings','lo3rwang'],
    queryFn:loadRows,
    staleTime:20_000
  });
  const [styleNo,setStyleNo]=useState(1);
  const [draft,setDraft]=useState({
    representative_name:'',
    parent_group_name:'',
    basic_principle:'',
    macro:'',
    style:''
  });
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const rows=query.data||[];
  const styleRows=useMemo(()=>{
    const map=new Map(rows.filter(row=>row.node_type==='style').map(row=>[Number(row.style_no),row]));
    return Array.from({length:STYLE_COUNT},(_,index)=>map.get(index+1)||{
      style_no:index+1,node_type:'style',order_no:index+1
    });
  },[rows]);
  const selected=styleRows.find(row=>Number(row.style_no)===Number(styleNo))||styleRows[0];

  useEffect(()=>{
    if(!selected)return;
    const styleRowsForNo=rows.filter(row=>Number(row.style_no)===Number(selected.style_no));
    setDraft({
      representative_name:String(selected.representative_name||''),
      parent_group_name:String(selected.parent_group_name||''),
      basic_principle:String(selected.basic_principle||''),
      macro:joinKeywords(styleRowsForNo,'macro'),
      style:joinKeywords(styleRowsForNo,'style')
    });
    setMessage('');
  },[selected?.style_no,rows]);

  if(account.loading||account.permissionLoading)return <p className="scope-v2-status">正在確認管理權限…</p>;
  if(!account.canManageScopeSync('lo3rwang'))return null;

  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  async function syncKeywords(group,value){
    const wanted=splitKeywords(value);
    const existing=rows.filter(row=>
      Number(row.style_no)===Number(styleNo)&&
      row.node_type==='keyword'&&
      row.keyword_group===group
    );
    const wantedMap=new Map(wanted.map((keyword,index)=>[keyword.toLocaleLowerCase('zh-Hant'),{keyword,index}]));
    const existingMap=new Map(existing.map(row=>[String(row.keyword||'').trim().toLocaleLowerCase('zh-Hant'),row]));

    for(const [key,row] of existingMap){
      if(wantedMap.has(key))continue;
      const {error}=await relation(neonAuthClient)
        .delete()
        .eq('style_no',styleNo)
        .eq('node_type','keyword')
        .eq('keyword_group',group)
        .eq('keyword',row.keyword);
      if(error)throw new Error(error.message||'關鍵詞刪除失敗');
    }

    const additions=[];
    for(const [key,item] of wantedMap){
      if(existingMap.has(key))continue;
      additions.push({
        style_no:Number(styleNo),
        node_type:'keyword',
        representative_name:null,
        parent_group_name:null,
        basic_principle:null,
        keyword_group:group,
        keyword:item.keyword,
        order_no:item.index+1
      });
    }
    if(additions.length){
      const {error}=await relation(neonAuthClient).insert(additions);
      if(error)throw new Error(error.message||'關鍵詞新增失敗');
    }

    for(const [key,item] of wantedMap){
      const existingRow=existingMap.get(key);
      if(!existingRow||Number(existingRow.order_no)===item.index+1)continue;
      const {error}=await relation(neonAuthClient)
        .update({order_no:item.index+1})
        .eq('style_no',styleNo)
        .eq('node_type','keyword')
        .eq('keyword_group',group)
        .eq('keyword',existingRow.keyword);
      if(error)throw new Error(error.message||'關鍵詞排序更新失敗');
    }
  }

  async function save(event){
    event.preventDefault();
    setBusy(true);setMessage('');
    try{
      const representativeName=String(draft.representative_name||'').trim()||null;
      const parentGroupName=String(draft.parent_group_name||'').trim()||null;
      const basicPrinciple=String(draft.basic_principle||'').trim()||null;

      const {data:updated,error:updateError}=await relation(neonAuthClient)
        .update({
          representative_name:representativeName,
          parent_group_name:parentGroupName,
          basic_principle:basicPrinciple,
          order_no:Number(styleNo)
        })
        .eq('style_no',Number(styleNo))
        .eq('node_type','style')
        .select('style_no');
      if(updateError)throw new Error(updateError.message||'Style 儲存失敗');
      if(!updated?.length){
        const {error:insertError}=await relation(neonAuthClient).insert([{
          style_no:Number(styleNo),
          node_type:'style',
          representative_name:representativeName,
          parent_group_name:parentGroupName,
          basic_principle:basicPrinciple,
          keyword_group:null,
          keyword:null,
          order_no:Number(styleNo)
        }]);
        if(insertError)throw new Error(insertError.message||'Style 新增失敗');
      }

      await syncKeywords('macro',draft.macro);
      await syncKeywords('style',draft.style);
      await queryClient.invalidateQueries({queryKey:['style-keyword-settings','lo3rwang']});
      setMessage('已儲存。Current Style 尚未自動啟用。');
    }catch(error){
      setMessage(error?.message||'儲存失敗。');
    }finally{
      setBusy(false);
    }
  }

  return <section className="loc-card scope-v2-feature-card">
    <p className="loc-eyebrow">Style · Keywords</p>
    <h2>關鍵詞／風格分類</h2>
    <p>8 個 Style 槽位先供設定；目前不會因編輯而自動開啟 Current Style 分類。</p>
    {query.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
    {query.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(query.error)}</p>:null}
    {!query.isPending&&!query.error?<>
      <div className="scope-v2-tabs" aria-label="Style 槽位">
        {styleRows.map(row=><button
          key={row.style_no}
          type="button"
          aria-pressed={Number(styleNo)===Number(row.style_no)}
          onClick={()=>setStyleNo(Number(row.style_no))}
        >{row.representative_name||('Style '+row.style_no)}</button>)}
      </div>
      <form className="scope-v2-editor" onSubmit={save}>
        <label>代表名稱<input value={draft.representative_name} onChange={event=>change('representative_name',event.target.value)} placeholder={'Style '+styleNo}/></label>
        <label>大風格群組<input value={draft.parent_group_name} onChange={event=>change('parent_group_name',event.target.value)} placeholder="所屬大風格"/></label>
        <label>基本原則<textarea rows={4} value={draft.basic_principle} onChange={event=>change('basic_principle',event.target.value)}/></label>
        {KEYWORD_GROUPS.map(([key,label])=><label key={key}>{label}<textarea rows={5} value={draft[key]} onChange={event=>change(key,event.target.value)} placeholder="可用頓號、逗號或換行分隔"/></label>)}
        {message?<p className="scope-v2-status" role="status">{message}</p>:null}
        <div className="scope-v2-tabs"><button type="submit" disabled={busy}>{busy?'儲存中…':'儲存 Style 設定'}</button></div>
      </form>
    </>:null}
  </section>;
}
