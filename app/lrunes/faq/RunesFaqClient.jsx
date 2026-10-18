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
const CATEGORIES='silver.runes_faq_categories';
const PAGE_SIZE=10;
const COLUMNS='faq_id,source_parent_id,category,intent,question,answer,aliases,keywords,related_ids,source_refs,search_text,canon_version,status,sort_order';
const isHtml=value=>/<\/?[a-z][^>]*>/i.test(String(value||''));
const splitLines=value=>String(value||'').split(/[\n,]+/).map(part=>part.trim()).filter(Boolean);
const displayAnswer=value=>isHtml(value)
  ?<BlockNoteEditor editable={false} initialContent={{html:value}}/>
  :<p className="runes-faq-answer-text">{value}</p>;

async function readCategories(canManage){
  const {rows}=await selectRows(CATEGORIES,{
    columns:'category,question_count',
    orders:[{column:'category',ascending:true}],
    authenticated:canManage,
    limit:100,maxLimit:100
  });
  return rows;
}

async function readFaqPage(category,page,canManage){
  const {rows,count}=await selectRows(TABLE,{
    columns:COLUMNS,
    filters:[{column:'category',operator:'eq',value:category}],
    orders:[{column:'sort_order',ascending:true},{column:'faq_id',ascending:true}],
    authenticated:canManage,
    limit:PAGE_SIZE,maxLimit:PAGE_SIZE,
    offset:page*PAGE_SIZE,
    count:'exact'
  });
  return {rows,total:Number(count)||0};
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
  const [category,setCategory]=useState('');
  const [page,setPage]=useState(0);
  const {data:categoryRows=[],isPending:categoriesPending,error:categoriesError}=useQuery({
    queryKey:['runes-faq-categories','lrunes',canManage],
    queryFn:()=>readCategories(canManage),
    staleTime:30_000,
    enabled:!account.permissionLoading&&runtime.scopeId==='lrunes'
  });
  const {data:faqPage,isPending,error}=useQuery({
    queryKey:['runes-faq-page','lrunes',canManage,category,page],
    queryFn:()=>readFaqPage(category,page,canManage),
    staleTime:30_000,
    enabled:Boolean(category)&&!account.permissionLoading&&runtime.scopeId==='lrunes'
  });
  const [expanded,setExpanded]=useState('');
  const [draft,setDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [saveError,setSaveError]=useState('');
  const choices=useMemo(()=>categoryRows.map(row=>({
    value:row.category,
    label:row.category+'（'+row.question_count+'）'
  })),[categoryRows]);
  const visible=faqPage?.rows||[];
  const questionChoices=visible.map(row=>({value:row.faq_id,label:row.question}));
  const total=faqPage?.total||0;
  const pageCount=Math.max(1,Math.ceil(total/PAGE_SIZE));

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
      await Promise.all([
        queryClient.invalidateQueries({queryKey:['runes-faq-page','lrunes']}),
        queryClient.invalidateQueries({queryKey:['runes-faq-categories','lrunes']})
      ]);
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
      <p>先選分類，再選問題；只顯示選取問題的答案。</p>
      <div className="runes-faq-filter">
        <label htmlFor="runes-faq-category">問題分類</label>
        <Select
          inputId="runes-faq-category"
          instanceId="runes-faq-category"
          className="scope-workspace-select"
          classNamePrefix="scope-workspace-select"
          options={choices}
          value={choices.find(option=>option.value===category)||null}
          placeholder={categoriesPending?'載入分類中…':'請選擇分類'}
          onChange={item=>{setCategory(item?.value||'');setPage(0);setExpanded('');setDraft(null);}}
          isSearchable
          isClearable
          isLoading={categoriesPending}
          noOptionsMessage={()=>'沒有相關分類'}
        />
      </div>
      {category&&!isPending&&!error&&visible.length?<div className="runes-faq-filter">
        <label htmlFor="runes-faq-question">選擇問題</label>
        <Select
          inputId="runes-faq-question"
          instanceId="runes-faq-question"
          className="scope-workspace-select"
          classNamePrefix="scope-workspace-select"
          options={questionChoices}
          value={questionChoices.find(option=>option.value===expanded)||null}
          placeholder="請選擇問題"
          onChange={item=>{setExpanded(item?.value||'');setDraft(null);}}
          isSearchable
          isClearable
          noOptionsMessage={()=>'本頁沒有相關問題'}
        />
      </div>:null}
    </div>

    {categoriesError?<p className="scope-status scope-error" role="alert">無法讀取分類：{String(categoriesError.message||categoriesError)}</p>:null}
    {category&&isPending?<p className="scope-status">正在載入符文 FAQ…</p>:null}
    {category&&error?<p className="scope-status scope-error" role="alert">無法讀取 FAQ：{String(error.message||error)}</p>:null}
    {category&&!isPending&&!error&&!visible.length?<div className="loc-card"><p className="scope-status">這個分類目前沒有問題。</p></div>:null}
    {category&&!isPending&&!error&&total>0?<p className="scope-status">本分類共 {total} 題 · 第 {page+1} / {pageCount} 頁</p>:null}
    <div className="runes-faq-list">
      {visible.filter(row=>row.faq_id===expanded).map(row=><article className="loc-card runes-faq-item" key={row.faq_id}>
        <div className="runes-faq-question-row">
          <h2 className="runes-faq-question">{row.question}</h2>
          {canManage?<button className="loc-button" type="button" disabled={busy} onClick={()=>begin(row)}>編輯</button>:null}
        </div>
        {canManage&&row.status!=='published'?<small className="scope-status">{row.status==='review'?'待校正':'封存'} · 尚未公開</small>:null}
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
    {category&&!isPending&&!error&&pageCount>1?<nav className="runes-faq-pages" aria-label="FAQ 分頁">
      <button type="button" className="loc-button" disabled={page===0||busy}
        onClick={()=>{setPage(current=>Math.max(0,current-1));setExpanded('');setDraft(null);}}>上一頁</button>
      <span aria-live="polite">第 {page+1} / {pageCount} 頁</span>
      <button type="button" className="loc-button" disabled={page+1>=pageCount||busy}
        onClick={()=>{setPage(current=>Math.min(pageCount-1,current+1));setExpanded('');setDraft(null);}}>下一頁</button>
    </nav>:null}
  </section></main>;
}
