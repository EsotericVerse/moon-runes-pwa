'use client';

import {useMemo,useState} from 'react';
import Select from 'react-select';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {dbAuthRelation} from '../../loc/db-client.mjs';
import {selectRows} from '../../loc/db-query.mjs';
import {useAccount} from '../../loc/use-account';
import ArticleBodyEditor from '../../loc/ArticleBodyEditor';
import BlockNoteEditor from '../../loc/BlockNoteEditor';
import {navigationHref} from '../../modular/nav-destinations.mjs';
import useNativeNavigation from '../../modular/use-native-navigation';
import {useScopeRuntime} from '../../modular/use-scope-runtime';

const TABLE='silver.runes_faq';
const COLUMNS='faq_id,source_parent_id,category,intent,question,answer,aliases,keywords,related_ids,source_refs,search_text,canon_version,status,sort_order';
const isHtml=value=>/<\/?[a-z][^>]*>/i.test(String(value||''));
const splitLines=value=>String(value||'').split(/[\n,]+/).map(part=>part.trim()).filter(Boolean);
const displayAnswer=value=>isHtml(value)
  ?<BlockNoteEditor editable={false} initialContent={{html:value}}/>
  :<p className="runes-faq-answer-text">{value}</p>;

async function readFaq(canManage){
  const {rows}=await selectRows(TABLE,{
    columns:COLUMNS,
    orders:[{column:'sort_order',ascending:true},{column:'faq_id',ascending:true}],
    authenticated:canManage,
    limit:200,maxLimit:200
  });
  return rows;
}

function editableDraft(row){
  return {...row,aliasesText:(row.aliases||[]).join('\n'),keywordsText:(row.keywords||[]).join('\n')};
}

export default function RunesFaqClient(){
  const account=useAccount();
  const queryClient=useQueryClient();
  const native=useNativeNavigation();
  const runtime=useScopeRuntime();
  const canManage=account.canManageScopeSync('lrunes');
  const {data:rows=[],isPending,error}=useQuery({
    queryKey:['runes-faq','lrunes',canManage],
    queryFn:()=>readFaq(canManage),
    staleTime:30_000
  });
  const [category,setCategory]=useState('all');
  const [expanded,setExpanded]=useState('');
  const [draft,setDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [saveError,setSaveError]=useState('');
  const categories=useMemo(()=>[...new Set(rows.map(row=>row.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-Hant')),[rows]);
  const choices=useMemo(()=>[{value:'all',label:'全部分類'},...categories.map(value=>({value,label:value+'（'+rows.filter(row=>row.category===value).length+'）'}))],[categories,rows]);
  const visible=useMemo(()=>rows.filter(row=>(canManage||row.status==='published')&&(category==='all'||row.category===category)),[rows,canManage,category]);

  function begin(row){
    setDraft(editableDraft(row));
    setExpanded(row.faq_id);
    setSaveError('');
  }

  async function save(){
    if(!draft||busy)return;
    const question=String(draft.question||'').trim();
    const answer=String(draft.answer||'').trim();
    const categoryName=String(draft.category||'').trim();
    if(!question||!answer||!categoryName){setSaveError('分類、問題與答案不可空白。');return;}
    setBusy(true);setSaveError('');
    try{
      const values={
        question,answer,category:categoryName,
        intent:String(draft.intent||'').trim(),
        aliases:splitLines(draft.aliasesText),
        keywords:splitLines(draft.keywordsText),
        status:draft.status,
        search_text:[question,...splitLines(draft.aliasesText),...splitLines(draft.keywordsText),answer.replace(/<[^>]+>/g,' ')].join(' '),
        updated_at:new Date().toISOString()
      };
      const relation=dbAuthRelation(TABLE);
      const {data,error:writeError}=await relation.update(values).eq('faq_id',draft.faq_id).select('faq_id');
      if(writeError)throw writeError;
      if(!data?.length)throw new Error('沒有更新任何 FAQ，請檢查管理權限。');
      await queryClient.invalidateQueries({queryKey:['runes-faq','lrunes']});
      setDraft(null);
    }catch(failure){setSaveError(String(failure?.message||failure));}
    finally{setBusy(false);}
  }

  if(!runtime.host)return null;
  if(runtime.scopeId!=='lrunes')return <main className="loc-next-main"><section className="loc-view"><div className="loc-card"><h1>查無此頁面</h1></div></section></main>;

  return <main className="loc-next-main"><section className="loc-view runes-faq-view">
    <div className="loc-card">
      <a href={navigationHref('lrunes','',native)} className="loc-button">← 月之符文首頁</a>
      <h1>月之符文 · 常見問題</h1>
      <p>從分類選擇問題，點擊題目即可閱讀答案。</p>
      <div className="runes-faq-filter">
        <label htmlFor="runes-faq-category">問題分類</label>
        <Select
          inputId="runes-faq-category"
          instanceId="runes-faq-category"
          className="scope-workspace-select"
          classNamePrefix="scope-workspace-select"
          options={choices}
          value={choices.find(option=>option.value===category)||choices[0]}
          onChange={item=>{setCategory(item?.value||'all');setExpanded('');setDraft(null);}}
          isSearchable
          isClearable={false}
          noOptionsMessage={()=>'沒有相關分類'}
        />
      </div>
    </div>

    {isPending?<p className="scope-status">正在載入符文 FAQ…</p>:null}
    {error?<p className="scope-status scope-error" role="alert">無法讀取 FAQ：{String(error.message||error)}</p>:null}
    {!isPending&&!error&&!visible.length?<div className="loc-card"><p className="scope-status">這個分類目前沒有公開問題。</p></div>:null}
    <div className="runes-faq-list">
      {visible.map(row=><article className="loc-card runes-faq-item" key={row.faq_id}>
        <div className="runes-faq-question-row">
          <button type="button" className="runes-faq-question" aria-expanded={expanded===row.faq_id}
            onClick={()=>setExpanded(current=>current===row.faq_id?'':row.faq_id)}>
            <span>{row.question}</span><span aria-hidden="true">{expanded===row.faq_id?'−':'+'}</span>
          </button>
          {canManage?<button className="loc-button" type="button" disabled={busy} onClick={()=>begin(row)}>編輯</button>:null}
        </div>
        {canManage&&row.status!=='published'?<small className="scope-status">草稿 · 尚未公開</small>:null}
        {expanded===row.faq_id?<div className="runes-faq-answer">
          {draft?.faq_id===row.faq_id?<div className="scope-editor">
            <div className="scope-management-wide-field">
              <label htmlFor={'faq-category-'+row.faq_id}>分類</label>
              <input id={'faq-category-'+row.faq_id} className="scope-search-input"
                value={draft.category} onChange={event=>setDraft(current=>({...current,category:event.target.value}))}/>
            </div>
            <div className="scope-management-wide-field">
              <label htmlFor={'faq-question-'+row.faq_id}>問題</label>
              <input id={'faq-question-'+row.faq_id} className="scope-search-input"
                value={draft.question} onChange={event=>setDraft(current=>({...current,question:event.target.value}))}/>
            </div>
            <div className="scope-management-wide-field"><strong>答案（BlockNote）</strong></div>
            <ArticleBodyEditor editorKey={'runes-faq:'+draft.faq_id}
              content={isHtml(row.answer)?{html:row.answer}:row.answer}
              onHtmlChange={html=>setDraft(current=>({...current,answer:html}))}
              canInsertImage={false}
            />
            <div className="scope-management-wide-field">
              <label htmlFor={'faq-aliases-'+row.faq_id}>同義問題（每行一項）</label>
              <textarea id={'faq-aliases-'+row.faq_id} rows={3} className="scope-search-input"
                value={draft.aliasesText} onChange={event=>setDraft(current=>({...current,aliasesText:event.target.value}))}/>
            </div>
            <div className="scope-management-wide-field">
              <label htmlFor={'faq-keywords-'+row.faq_id}>關鍵字（每行一項）</label>
              <textarea id={'faq-keywords-'+row.faq_id} rows={2} className="scope-search-input"
                value={draft.keywordsText} onChange={event=>setDraft(current=>({...current,keywordsText:event.target.value}))}/>
            </div>
            <label className="scope-management-wide-field">發佈狀態
              <select className="scope-search-input" value={draft.status}
                onChange={event=>setDraft(current=>({...current,status:event.target.value}))}>
                <option value="published">公開</option>
                <option value="review">待校正</option>
                <option value="archived">封存</option>
              </select>
            </label>
            <div className="scope-article-editor-actions">
              <button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?'儲存中…':'儲存'}</button>
              <button type="button" className="loc-button" disabled={busy} onClick={()=>{setDraft(null);setSaveError('');}}>取消</button>
            </div>
            {saveError?<p className="scope-error" role="alert">{saveError}</p>:null}
          </div>:displayAnswer(row.answer)}
        </div>:null}
      </article>)}
    </div>
  </section></main>;
}
