'use client';

import {useEffect,useRef,useState} from 'react';
import {selectNeonRows,updateNeonRows} from './neon-repository';
import {useNeonAccount} from './use-neon-account';

function dbTarget(scopeId){
  if(scopeId==='loc')return {record_type:'group',column:'group_id',id:'loc'};
  return {record_type:'scope',column:'scope_id',id:scopeId==='lunarunes'?'lrunes':scopeId};
}
function cleanHtml(html=''){
  const template=document.createElement('template');
  template.innerHTML=String(html);
  for(const node of template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,textarea,select')){
    node.remove();
  }
  for(const el of template.content.querySelectorAll('*')){
    for(const attr of [...el.attributes]){
      if(/^on/i.test(attr.name))el.removeAttribute(attr.name);
      if(['href','src'].includes(attr.name)&&/^javascript:/i.test(attr.value.trim()))el.removeAttribute(attr.name);
    }
  }
  return template.innerHTML;
}

export default function GovernanceInlineEditor({scopeId,children}){
  const account=useNeonAccount();
  const contentRef=useRef(null);
  const editorRef=useRef(null);
  const [recordId,setRecordId]=useState('');
  const [savedHtml,setSavedHtml]=useState('');
  const [editing,setEditing]=useState(false);
  const [status,setStatus]=useState('');
  const canManage=account.canManageScopeSync(scopeId);
  const target=dbTarget(scopeId);

  useEffect(()=>{
    let live=true;
    selectNeonRows('silver.manage',{
      columns:'record_id,governance_content',
      filters:[
        {column:'record_type',operator:'eq',value:target.record_type},
        {column:target.column,operator:'eq',value:target.id}
      ],
      limit:1
    }).then(({rows})=>{
      if(!live)return;
      setRecordId(rows[0]?.record_id||'');
      setSavedHtml(rows[0]?.governance_content||'');
    }).catch(()=>{});
    return()=>{live=false};
  },[scopeId]);

  function startEdit(){
    setStatus('');
    setEditing(true);
    requestAnimationFrame(()=>{
      if(editorRef.current){
        editorRef.current.innerHTML=savedHtml||contentRef.current?.innerHTML||'';
      }
    });
  }
  function command(name,value=null){
    editorRef.current?.focus();
    document.execCommand(name,false,value);
  }
  async function save(){
    if(!recordId||!editorRef.current)return;
    setStatus('儲存中…');
    try{
      const html=cleanHtml(editorRef.current.innerHTML);
      await updateNeonRows('silver.manage',{
        governance_content:html,
        updated_at:new Date().toISOString()
      },{
        filters:[{column:'record_id',operator:'eq',value:recordId}],
        returning:'record_id,governance_content,updated_at'
      });
      setSavedHtml(html);
      setEditing(false);
      setStatus('已更新');
    }catch(error){
      setStatus(error?.message||'更新失敗。');
    }
  }

  return <div className="scope-v2-governance-editable">
    {!editing?<div ref={contentRef}>
      {savedHtml?<div dangerouslySetInnerHTML={{__html:savedHtml}}/>:children}
    </div>:null}

    {canManage&&!editing?<div className="loc-actions">
      <button type="button" onClick={startEdit}>編輯</button>
    </div>:null}

    {canManage&&editing?<section className="scope-v2-inline-card">
      <div className="scope-v2-tabs" aria-label="治理文字編輯工具">
        <button type="button" onClick={()=>command('bold')}>粗體</button>
        <button type="button" onClick={()=>command('italic')}>斜體</button>
        <button type="button" onClick={()=>command('formatBlock','h2')}>標題</button>
        <button type="button" onClick={()=>command('formatBlock','p')}>段落</button>
        <button type="button" onClick={()=>command('insertUnorderedList')}>清單</button>
      </div>
      <div
        ref={editorRef}
        className="scope-v2-governance-wysiwyg"
        contentEditable
        suppressContentEditableWarning
        aria-label="治理內容所見即所得編輯器"
      />
      <div className="scope-v2-tabs">
        <button type="button" onClick={save}>完成</button>
        <button type="button" onClick={()=>{setEditing(false);setStatus('')}}>取消</button>
      </div>
    </section>:null}
    {status?<p className="scope-v2-status">{status}</p>:null}
  </div>;
}
