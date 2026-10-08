'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {UI_COPY} from '../i18n/ui-copy';
import {useUiCopy} from '../i18n/ui-locale';
import {DEFAULT_LIST_BATCH_SIZE,LIST_LOAD_COOLDOWN_MS} from '../loc/list-loading-contract.mjs';
import {useScopeRuntime} from './use-scope-runtime';
import BlockNoteEditor from '../loc/BlockNoteEditor';
import {blocksToPlainText,plainTextToBlocks} from '../loc/blocknote-content.mjs';
import {selectScopeBlocks} from '../loc/scope-data';
import {FEATURE_HERO_PAGE,FEATURE_HERO_ORDER,sharedFeatureHeroFor,shouldUseSharedFeatureHero} from '../loc/feature-hero.mjs';
import ScopeEditableBlocks from '../loc/ScopeEditableBlocks';

// One visual header contract. On the LOC feature pages this same visible
// header is wrapped by the existing ScopeEditableBlocks editor; elsewhere it
// remains a read-only projection of exactly the same LOC records.
function FeatureHeroContent({title,subtitle='',description='',rich=false}){
  return <>
    <div className="home-title-row">
      <h1>{title}</h1>
      {subtitle?(rich
        ?<div className="loc-subtitle scope-subtitle scope-shared-hero-rich" dangerouslySetInnerHTML={{__html:subtitle}}/>
        :<p className="loc-subtitle scope-subtitle">{subtitle}</p>):null}
    </div>
    {description?(rich
      ?<div className="scope-hero-description scope-shared-hero-rich" dangerouslySetInnerHTML={{__html:description}}/>
      :<div className="scope-hero-description">{description}</div>):null}
  </>;
}

export function FeaturePage({featureId,children,subtitle=null,description=null}){
  const {scope,scopeId}=useScopeRuntime();
  const copy=useUiCopy();
  const profile=copy.features?.[featureId]||UI_COPY.features?.[featureId]||{title:featureId,subtitle:'',description:''};
  const scopeCopyKey=scope?.id==='lo3rwang'?'author':scope?.id;
  const localizedScope=copy.scope?.[scopeCopyKey]||null;
  const resolvedSubtitle=localizedScope?.[featureId]||scope?.featureSubtitles?.[featureId]||profile.subtitle||'';
  const resolvedDescription=description??profile.description;
  const finalSubtitle=subtitle||resolvedSubtitle;
  const sharedEnabled=shouldUseSharedFeatureHero(scopeId,featureId);
  const locEditableHero=sharedEnabled&&scopeId==='loc';
  const sharedQuery=useQuery({
    queryKey:['scope-blocks','loc',FEATURE_HERO_PAGE],
    queryFn:()=>selectScopeBlocks('loc',FEATURE_HERO_PAGE),
    staleTime:60_000,
    enabled:sharedEnabled&&!locEditableHero
  });
  const shared=sharedEnabled&&!locEditableHero?sharedFeatureHeroFor(sharedQuery.data,featureId):null;
  const fallbackCopy={
    title:profile.title,
    subtitle:finalSubtitle,
    description:resolvedDescription
  };

  return <main className="scope-main">
    <section className="scope-page">
      {locEditableHero?<ScopeEditableBlocks
        scopeId="loc"
        page={FEATURE_HERO_PAGE}
        orders={[FEATURE_HERO_ORDER[featureId]]}
        containerless
        slotTag="header"
        slotClassName="loc-card scope-hero scope-feature-hero"
        editSlotClassName="loc-card scope-hero scope-feature-hero"
        placeholderFirstOrder={FEATURE_HERO_ORDER[featureId]}
        allowEditing
        allowDelete={false}
        allowEntities={false}
        editEyebrow={false}
        renderDisplay={slot=><FeatureHeroContent
          title={slot.stored?slot.title||profile.title:fallbackCopy.title}
          subtitle={slot.stored?slot.subtitle:fallbackCopy.subtitle}
          description={slot.stored?slot.text:fallbackCopy.description}
          rich={slot.stored}
        />}
      />:<header className="loc-card scope-hero scope-feature-hero" data-feature-hero-source={shared?'loc':'default'}>
        <FeatureHeroContent
          title={shared?.title||fallbackCopy.title}
          subtitle={shared?shared.subtitle:fallbackCopy.subtitle}
          description={shared?shared.description:fallbackCopy.description}
          rich={Boolean(shared)}
        />
      </header>}
      <div className="scope-content">{children}</div>
    </section>
  </main>;
}

export function ContentEditor({
  draft,
  setDraft,
  onSave,
  onCancel=null,
  busy=false,
  error='',
  showTitle=true,
  showBody=true,
  bodyLabel=UI_COPY.common.body,
  extraFields=null,
  showVisibility=true
}){
  if(!draft)return null;
  const change=(key,value)=>setDraft(current=>({...current,[key]:value}));
  return <div className="scope-editor">
    {showTitle?<label>{UI_COPY.common.title}<input value={draft.title||''} onChange={event=>change('title',event.target.value)}/></label>:null}
    {showBody?<div className="scope-editor-blocknote">
      <span>{bodyLabel}</span>
      <BlockNoteEditor
        key={'content-editor:'+(draft.editorKey||'body')}
        initialContent={Array.isArray(draft.bodyBlocks)&&draft.bodyBlocks.length?draft.bodyBlocks:plainTextToBlocks(draft.body||'')}
        onChange={blocks=>setDraft(current=>({...current,bodyBlocks:blocks,body:blocksToPlainText(blocks)}))}
      />
    </div>:null}
    {extraFields}
    {showVisibility?<div className="scope-editor-options">
      <label><input type="checkbox" checked={draft.hidden===true} onChange={event=>change('hidden',event.target.checked)}/>{UI_COPY.common.hiddenFromSearch}</label>
    </div>:null}
    {error?<p role="alert" className="scope-error">{error}</p>:null}
    <div className="scope-tabs">
      <button type="button" disabled={busy} onClick={onSave}>{busy?UI_COPY.common.saving:UI_COPY.common.save}</button>
      {onCancel?<button type="button" disabled={busy} onClick={onCancel}>{UI_COPY.common.cancel}</button>:null}
    </div>
  </div>;
}

export function WorkFullText({
  open=false,
  loading=false,
  error='',
  content='',
  blocks=null,
  onToggle,
  emptyText=UI_COPY.work.noBody
}){
  return <div className="scope-work-fulltext">
    <button type="button" onClick={onToggle} disabled={loading}>
      {open?(loading?UI_COPY.work.loadingBody:UI_COPY.work.collapseBody):UI_COPY.work.viewBody}
    </button>
    {open&&error?<p className="scope-status scope-error">{error}</p>:null}
    {open&&!loading&&!error?<div className="scope-inline-card">
      {Array.isArray(blocks)&&blocks.length
        ?<BlockNoteEditor key={'full:'+JSON.stringify(blocks)} initialContent={blocks} editable={false}/>
        :<p className="scope-prewrap">{content||emptyText}</p>}
    </div>:null}
  </div>;
}

function externalLink(link){
  const href=String(link?.href||'').trim();
  return /^https?:\/\//i.test(href)?href:'';
}
function safeExternalLinksOf(items=[]){
  return (Array.isArray(items)?items:[])
    .map((link,index)=>typeof link==='string'?{id:String(index),href:link,label:UI_COPY.work.viewLinks}:link)
    .filter(link=>externalLink(link));
}
function safeRelationLinksOf(items=[]){
  return (Array.isArray(items)?items:[])
    .map((link,index)=>typeof link==='string'?{id:String(index),href:link,label:UI_COPY.work.relatedText}:link)
    .filter(link=>{
      const href=String(link?.href||'').trim();
      return Boolean(href)&&!/^javascript:/i.test(href);
    });
}

export function WorkSummaryCard({
  title=UI_COPY.work.untitled,
  source='',
  scopeId='',
  date='',
  body='',
  hidden=false,
  relationLinks=[],
  links=[],
  destinations=[],
  showSource=true,
  showLinks=true,
  children=null,
  className='',
  onClick=null
}){
  const safeRelations=safeRelationLinksOf(relationLinks);
  const safeLinks=safeExternalLinksOf(links);
  return <article className={'scope-inline-card scope-work-summary '+className} onClick={onClick||undefined}>
    <header className="scope-culture-work-heading">
      <div>
        {(scopeId||showSource&&source)?<p className="loc-eyebrow">{[scopeId,showSource?source:''].filter(Boolean).join(' · ')}</p>:null}
        <strong>{title}</strong>
      </div>
      {date?<time>{date}</time>:null}
    </header>
    {hidden?<p className="scope-status">{UI_COPY.work.hidden}</p>:null}
    {body?<p className="scope-culture-work-meta-description">{body}</p>:null}
    {safeRelations.length?<div className="scope-result-links scope-work-relations">
      {safeRelations.map((link,index)=><a key={link.id||link.href||index} href={String(link.href||'').trim()}>{link.label||UI_COPY.format.relatedText(index+1)}</a>)}
    </div>:null}
    {showLinks&&safeLinks.length?<div className="scope-result-links">
      {safeLinks.map((link,index)=><a key={link.id||link.href||index} href={externalLink(link)} target="_blank" rel="noreferrer">{link.label||UI_COPY.format.link(index+1)}</a>)}
    </div>:null}
    {destinations?.length?<div className="scope-result-links">
      {destinations.map(destination=><a key={destination.id||destination.href} href={destination.href}>{destination.label}</a>)}
    </div>:null}
    {children}
  </article>;
}

function IncrementalLoad({
  hasMore=false,
  loading=false,
  error=null,
  onLoadMore,
  cooldownMs=LIST_LOAD_COOLDOWN_MS,
  label='…',
  scrollRootRef=null
}){
  const sentinelRef=useRef(null);
  const loadingRef=useRef(Boolean(loading));
  const readyAtRef=useRef(0);

  useEffect(()=>{loadingRef.current=Boolean(loading);},[loading]);
  useEffect(()=>{
    const sentinel=sentinelRef.current;
    if(!hasMore||!sentinel||typeof onLoadMore!=='function')return undefined;
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(entry=>entry.isIntersecting))return;
      const now=Date.now();
      if(loadingRef.current||error||now<readyAtRef.current)return;
      readyAtRef.current=now+Math.max(0,Number(cooldownMs)||0);
      onLoadMore();
    },{root:scrollRootRef?.current||null,threshold:1});
    observer.observe(sentinel);
    return()=>observer.disconnect();
  },[hasMore,error,onLoadMore,cooldownMs,scrollRootRef]);

  if(!hasMore)return null;
  return <div ref={sentinelRef} className={'scope-load-sentinel'+(loading?' is-loading':'')} aria-live="polite">
    <span>{loading?'…':label}</span>
  </div>;
}

export function IncrementalList({
  items=[],
  renderItem,
  batchSize=DEFAULT_LIST_BATCH_SIZE,
  resetKey='',
  className='scope-list',
  empty=null,
  externalHasMore=false,
  loading=false,
  error=null,
  onLoadMore=null,
  scrollRootRef=null,
  onVisibleItemsChange=null
}){
  const size=Math.max(1,Math.floor(Number(batchSize)||DEFAULT_LIST_BATCH_SIZE));
  const source=Array.isArray(items)?items:[];
  const [visibleCount,setVisibleCount]=useState(()=>Math.min(size,source.length));
  const pendingExternalRef=useRef(false);

  useEffect(()=>{
    pendingExternalRef.current=false;
    setVisibleCount(Math.min(size,source.length));
  },[resetKey,size]);

  useEffect(()=>{
    if(source.length>0&&visibleCount===0&&!pendingExternalRef.current){
      setVisibleCount(Math.min(size,source.length));
      return;
    }
    if(visibleCount>source.length){
      setVisibleCount(Math.min(size,source.length));
      pendingExternalRef.current=false;
      return;
    }
    if(pendingExternalRef.current&&source.length>visibleCount){
      setVisibleCount(count=>Math.min(source.length,count+size));
      pendingExternalRef.current=false;
    }
  },[source.length,size,visibleCount]);

  const hasBuffered=visibleCount<source.length;
  const hasMore=hasBuffered||Boolean(externalHasMore);
  const visible=useMemo(()=>source.slice(0,visibleCount),[source,visibleCount]);

  useEffect(()=>{
    if(typeof onVisibleItemsChange==='function')onVisibleItemsChange(visible);
  },[visible,onVisibleItemsChange]);

  const loadMore=()=>{
    if(loading)return;
    if(hasBuffered){
      setVisibleCount(count=>Math.min(source.length,count+size));
      return;
    }
    if(externalHasMore&&typeof onLoadMore==='function'){
      pendingExternalRef.current=true;
      onLoadMore();
    }
  };

  if(!source.length&&!loading&&!externalHasMore)return empty;
  const loader=<IncrementalLoad
    hasMore={hasMore}
    loading={loading}
    error={error}
    onLoadMore={loadMore}
    label="…"
    scrollRootRef={scrollRootRef}
  />;
  return <>
    <div ref={scrollRootRef||undefined} className={className}>
      {visible.map((item,index)=>renderItem(item,index))}
      {scrollRootRef?loader:null}
    </div>
    {!scrollRootRef?loader:null}
  </>;
}
