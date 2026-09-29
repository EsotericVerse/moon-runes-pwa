'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {neonAuthClient} from '../../loc/neon-client';
import {selectNeonRows} from '../../loc/neon-query';
import {useNeonAccount} from '../../loc/use-neon-account';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';

const STYLE_COUNT=8;
const STYLE_COLUMNS='style_no,node_type,representative_name,parent_group_name,basic_principle,order_no';

function relation(client){
  return client.schema('silver').from('lo3rwang_style');
}
async function loadRows(){
  const {rows}=await selectNeonRows('silver.lo3rwang_style',{
    columns:STYLE_COLUMNS,
    filters:[{column:'node_type',operator:'eq',value:'style'}],
    orders:[{column:'style_no',ascending:true}],
    limit:STYLE_COUNT,
    offset:0
  });
  return rows;
}

export default function StyleKeywordSettingsV2(){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const query=useQuery({
    queryKey:['style-settings','lo3rwang'],
    queryFn:loadRows,
    staleTime:20_000
  });
  const [styleNo,setStyleNo]=useState(1);
  const [draft,setDraft]=useState({
    representative_name:'',
    parent_group_name:'',
    basic_principle:''
  });
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const rows=query.data||[];
  const styleRows=useMemo(()=>{
    const map=new Map(rows.map(row=>[Number(row.style_no),row]));
    return Array.from({length:STYLE_COUNT},(_,index)=>map.get(index+1)||{
      style_no:index+1,node_type:'style',order_no:index+1
    });
  },[rows]);
  const selected=styleRows.find(row=>Number(row.style_no)===Number(styleNo))||styleRows[0];

  useEffect(()=>{
    if(!selected)return;
    setDraft({
      representative_name:String(selected.representative_name||''),
      parent_group_name:String(selected.parent_group_name||''),
      basic_principle:String(selected.basic_principle||'')
    });
    setMessage('');
  },[selected?.style_no,selected?.representative_name,selected?.parent_group_name,selected?.basic_principle]);

  if(account.loading||account.permissionLoading)return <p className="scope-v2-status">正在確認管理權限…</p>;
  if(!account.canManageScopeSync('lo3rwang'))return null;

  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));

  async function save(event){
    event.preventDefault();
    setBusy(true);setMessage('');
    try{
      const values={
        representative_name:String(draft.representative_name||'').trim()||null,
        parent_group_name:String(draft.parent_group_name||'').trim()||null,
        basic_principle:String(draft.basic_principle||'').trim()||null,
        order_no:Number(styleNo)
      };
      const exists=rows.some(row=>Number(row.style_no)===Number(styleNo));
      const {error}=exists
        ?await relation(neonAuthClient)
          .update(values)
          .eq('style_no',Number(styleNo))
          .eq('node_type','style')
        :await relation(neonAuthClient).insert([{
          style_no:Number(styleNo),
          node_type:'style',
          ...values,
          keyword_group:null,
          keyword:null
        }]);
      if(error)throw new Error(error.message||'Style 儲存失敗');
      await queryClient.invalidateQueries({queryKey:['style-settings','lo3rwang']});
      setMessage('已儲存 Style metadata。關鍵詞分組尚未啟用。');
    }catch(error){
      setMessage(error?.message||'儲存失敗。');
    }finally{
      setBusy(false);
    }
  }

  return <section className="loc-card scope-v2-feature-card">
    <p className="loc-eyebrow">Style</p>
    <h2>風格設定</h2>
    <p>8 個 Style 槽位只管理已確定的 metadata；關鍵詞分組尚未定義，不由 JavaScript 建立或分類。</p>
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
        {message?<p className="scope-v2-status" role="status">{message}</p>:null}
        <div className="scope-v2-tabs"><button type="submit" disabled={busy}>{busy?'儲存中…':'儲存 Style 設定'}</button></div>
      </form>
    </>:null}
  </section>;
}
