'use client';
import UiText,{useUiText} from '../i18n/UiText';

import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {usePathname} from 'next/navigation';
import {useEditDock} from './edit-dock';
import {useAsyncResource} from '../loc/use-async-resource';
import {UI_COPY} from '../i18n/ui-copy';
import {useUiCopy} from '../i18n/ui-locale';
import {DEFAULT_LIST_BATCH_SIZE,LIST_LOAD_COOLDOWN_MS} from '../loc/db-contract.mjs';
import {useScopeRuntime} from './use-scope-runtime';
import {selectScopeBlocks,selectLiveScopeBlocks} from '../loc/scope-data';
import {heroImageUrl as heroImageUrlOf} from '../loc/hero-image.mjs';

import {HomeBlock} from '../loc/home-block-model';
import ScopeLink from './ScopeLink';
// Shared display stays light: mount the editor only on pages that need it.
const BlockNoteEditor=dynamic(()=>import('../loc/BlockNoteEditor'),{loading:()=>null});

function FeatureHeroContent({eyebrow='',title,subtitle='',description='',rich=false,scopeId=''}){
  const sign=HomeBlock.heroExtraFor(scopeId);
  return <>
    {eyebrow?<p className="loc-eyebrow">{eyebrow}</p>:null}
    <div className="home-title-row">
      <h1>{title}</h1>
      {subtitle?<p className="loc-subtitle scope-subtitle">{HomeBlock.plainBlockLine(subtitle)}</p>:null}
    </div>
    {description?(rich
      ?<div className="scope-hero-description scope-shared-hero-rich" dangerouslySetInnerHTML={{__html:description}}/>
      :<div className="scope-hero-description">{description}</div>):null}
    {sign?<span className={'home-hero-identity home-hero-identity--'+sign.key}
      role="img" aria-label={sign.label}>{sign.text}</span>:null}
  </>;
}

export function FeaturePage({featureId,children,titleOverride=null,subtitle=null,description=null}){
  const {scope,scopeId}=useScopeRuntime();
  const copy=useUiCopy();
  const profile=copy.features?.[featureId]||UI_COPY.features?.[featureId]||{title:featureId,subtitle:'',description:''};
  const scopeCopyKey=scope?.id==='lo3rwang'?'author':scope?.id;
  const localizedScope=copy.scope?.[scopeCopyKey]||null;
  const resolvedSubtitle=localizedScope?.[featureId]||scope?.featureSubtitles?.[featureId]||profile.subtitle||'';
  const resolvedDescription=description??profile.description;
  const finalSubtitle=subtitle||resolvedSubtitle;
  const pathname=usePathname();
  const editDock=useEditDock();
  const editing=Boolean(editDock?.active&&editDock.scopeId===scopeId);
  const managementSlot=HomeBlock.managementHeroSlot(pathname,scopeId,editing,featureId);
  const managementMode=Boolean(managementSlot);
  const sharedEnabled=HomeBlock.shouldUseSharedFeatureHero(scopeId,featureId);
  const artworkId=managementMode?'manage':featureId;
  const heroClassName='loc-card scope-hero scope-feature-hero'+(HomeBlock.FEATURE_HERO_ORDER[artworkId]?' scope-feature-hero--artwork scope-feature-hero--'+artworkId:'');
  const hasFeatureHero=Boolean(HomeBlock.FEATURE_HERO_ORDER[featureId]);
  // Management entries share a single editable image and independently saved
  // text. The Admin and Personal Settings landing Heroes stay separate.
  // Admin / Settings / protected management entry Heroes use live, persisted
  // records. The four public browsing Heroes keep their published JS snapshots
  // until the owner deliberately republishes; no ISR/deployment is triggered.
  const adminHero=featureId==='admin'||featureId==='setting';
  const groupHeroPage=HomeBlock.featureHeroPageFor(featureId);
  const groupHeroQuery=useAsyncResource([adminHero?'scope-blocks-live':'scope-blocks','loc',groupHeroPage],
    ()=>(adminHero?selectLiveScopeBlocks:selectScopeBlocks)('loc',groupHeroPage),
    {enabled:!managementMode&&(sharedEnabled||hasFeatureHero)});
  const scopeHeroPage='scope_'+featureId;
  const scopeHeroImageQuery=useAsyncResource([adminHero?'scope-blocks-live':'scope-blocks','loc',scopeHeroPage],
    ()=>(adminHero?selectLiveScopeBlocks:selectScopeBlocks)('loc',scopeHeroPage),
    {enabled:!managementMode&&hasFeatureHero&&(scopeId!=='loc'||HomeBlock.shouldUseSingleFeatureHeroImage(featureId))});
  const managementTextPage=managementSlot?.page||'';
  const managementImagePage=HomeBlock.managementHeroImagePage(managementSlot);
  const managementTextQuery=useAsyncResource(['scope-blocks-live','loc',managementTextPage],
    ()=>selectLiveScopeBlocks('loc',managementTextPage),{enabled:managementMode});
  const managementImageQuery=useAsyncResource(['scope-blocks-live','loc',managementImagePage],
    ()=>selectLiveScopeBlocks('loc',managementImagePage),{enabled:managementMode});
  const heroImageRow=managementMode
    ?managementImageQuery.data?.find(row=>Number(row.block_order)===1)
    :((scopeId==='loc'&&!HomeBlock.shouldUseSingleFeatureHeroImage(featureId))
      ?groupHeroQuery.data:scopeHeroImageQuery.data)?.find(row=>Number(row.block_order)===1);
  const heroImageOverride=heroImageUrlOf(heroImageRow)||(managementMode?HomeBlock.managementHeroDefaultImage(managementSlot):'');
  const heroStyle=heroImageOverride?{'--scope-feature-hero-image':`url("${heroImageOverride}")`}:undefined;
  const shared=managementMode?HomeBlock.managementHeroCopy(managementTextQuery.data,managementSlot)
    :sharedEnabled?HomeBlock.featureHeroFor(groupHeroQuery.data):null;
  const fallbackCopy={
    title:profile.title,
    subtitle:finalSubtitle,
    description:resolvedDescription
  };

  return <main className={'scope-main'+(managementMode?' scope-main--edit-workspace':'')}>
    <section className="scope-page">
      <header className={heroClassName} style={heroStyle} data-feature-hero-source={managementMode?managementTextPage:shared?'loc':'default'}>
        <FeatureHeroContent
          scopeId={scopeId}
          eyebrow={shared?.eyebrow||''}
          title={managementMode?shared?.title||managementSlot.label:titleOverride||shared?.title||fallbackCopy.title}
          subtitle={managementMode?shared?.subtitle||'':shared?shared.subtitle:fallbackCopy.subtitle}
          description={managementMode?shared?.description||'':shared?shared.description:fallbackCopy.description}
          rich={Boolean(shared)&&!managementMode}
        />
      </header>
      <div className="scope-content">{children}</div>
    </section>
  </main>;
}

export function WorkFullText({
  open=false,
  loading=false,
  error='',
  content='',
  onToggle,
  emptyText=null,
  showToggle=true
}){
  const copy=useUiCopy();
  return <div className="scope-work-fulltext">
    {showToggle?<button type="button" onClick={onToggle} disabled={loading}>
      {open?(loading?copy.work.loadingBody:copy.work.collapseBody):copy.work.viewBody}
    </button>:null}
    {open&&error?<p className="scope-status scope-error">{error}</p>:null}
    {open&&!loading&&!error?<div className="scope-inline-card scope-article-block-display">
      <BlockNoteEditor editable={false} initialContent={content||(emptyText??copy.work.noBody)}/>
    </div>:null}
  </div>;
}

function externalLink(link){
  const href=String(link?.href||'').trim();
  return /^https?:\/\//i.test(href)?href:'';
}
function safeExternalLinksOf(items=[],defaultLabel=''){
  return (Array.isArray(items)?items:[])
    .map((link,index)=>typeof link==='string'?{id:String(index),href:link,label:defaultLabel}:link)
    .filter(link=>externalLink(link));
}
function safeRelationLinksOf(items=[],defaultLabel=''){
  return (Array.isArray(items)?items:[])
    .map((link,index)=>typeof link==='string'?{id:String(index),href:link,label:defaultLabel}:link)
    .filter(link=>{
      const href=String(link?.href||'').trim();
      return Boolean(href)&&!/^javascript:/i.test(href);
    });
}

function ArticleLazyMediaLinks({ids=[],table='',authenticated=false}){
  const [opened,setOpened]=useState(false);
  const mediaIds=[...new Set((Array.isArray(ids)?ids:[]).map(id=>String(id||'').trim()).filter(Boolean))];
  const mediaQuery=useAsyncResource({
    queryKey:['article-media-urls',table,authenticated,mediaIds.join('|')],
    enabled:opened&&Boolean(table)&&mediaIds.length>0,
    queryFn:async()=>{
      const {selectRows}=await import('../loc/db-query.mjs');
      const rows=[];
      // Query only this article's media UIDs, not the media catalog.
      // Media titles, meta_tags, type and content are never read.
      for(let index=0;index<mediaIds.length;index+=40){
        const batch=mediaIds.slice(index,index+40);
        const page=await selectRows(table,{
          columns:'uid,url',
          filters:[{column:'uid',operator:'in',value:batch}],
          limit:batch.length,maxLimit:batch.length,authenticated
        });
        rows.push(...(page.rows||[]));
      }
      const byId=new Map(rows.map(row=>[String(row.uid),row]));
      return mediaIds.map(id=>byId.get(id)).filter(Boolean);
    },
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  if(!mediaIds.length)return null;
  return <section className="scope-article-relation-group" aria-label="多媒體">
    <h3>多媒體 <span>{mediaIds.length} 筆</span></h3>
    <button type="button" className="scope-article-media-toggle" aria-expanded={opened}
      onClick={()=>setOpened(value=>!value)}>
      {opened?'收合多媒體連結':'顯示多媒體連結'}
    </button>
    {opened&&mediaQuery.isPending?<p role="status">讀取多媒體網址中…</p>:null}
    {opened&&mediaQuery.error?<p role="alert" className="scope-error">{String(mediaQuery.error.message||mediaQuery.error)}</p>:null}
    {opened&&!mediaQuery.isPending&&!mediaQuery.error?<>
      <div className="scope-article-relation-grid">
        {(mediaQuery.data||[]).map((item,index)=>{
          const href=externalLink({href:item.url});
          return href?<a key={item.uid} href={href} target="_blank" rel="noopener noreferrer" className="scope-article-relation-card">
            <span className="scope-article-relation-kind">多媒體 {index+1}</span>
            <strong className="scope-article-relation-url">{href}</strong>
            <span className="scope-article-relation-open">開啟媒體 <span aria-hidden="true">↗</span></span>
          </a>:<div key={item.uid} className="scope-article-relation-card">
            <span className="scope-article-relation-kind">多媒體 {index+1}</span>
            <strong>未提供有效網址</strong>
          </div>;
        })}
      </div>
      {!mediaQuery.data?.length?<p>沒有可顯示的媒體網址。</p>:null}
    </>:null}
  </section>;
}

function ArticleRelationNavigation({links=[],externalLinks=[],mediaIds=[],mediaTable='',mediaAuthenticated=false}){
  const articleGroups=[
    {id:'source',heading:'上筆',items:links.filter(link=>String(link.id||'').startsWith('source:'))},
    {id:'target',heading:'下筆',items:links.filter(link=>String(link.id||'').startsWith('target:'))},
    {id:'reference',heading:'Ref · 原始大綱／參考資料',items:links.filter(link=>String(link.id||'').startsWith('reference:'))}
  ];
  const otherArticles=links.filter(link=>!['source:','target:','reference:'].some(prefix=>String(link.id||'').startsWith(prefix)));
  if(otherArticles.length)articleGroups.push({id:'other',heading:'其他文章關聯',items:otherArticles});
  const sources=externalLinks.filter(link=>!String(link.id||'').startsWith('media:'));
  const groups=[
    ...articleGroups.map(group=>({...group,external:false})),
    {id:'external',heading:'原始來源網址',items:sources,external:true}
  ].filter(group=>group.items.length);
  if(!groups.length&&!mediaIds.length)return null;
  const relationCard=(link,index,kind,external)=>{
    const title=String(link.title||'').trim();
    const label=external
      ?(kind==='media'?String(link.mediaType||'媒體').trim():'外部來源')
      :kind==='target'?'下筆 '+(index+1):String(link.label||'相關文章');
    const headline=external?String(link.label||'').trim()||'開啟連結':title||'查看相關文章';
    return <a key={link.id||link.href||index} href={link.href}
      {...(external?{target:'_blank',rel:'noopener noreferrer'}:{})}
      className="scope-article-relation-card">
      <span className="scope-article-relation-kind">{label}</span>
      <strong>{headline}</strong>
      <span className="scope-article-relation-open">{external?'開啟連結':'閱讀文章'} <span aria-hidden="true">↗</span></span>
    </a>;
  };
  return <nav className="scope-article-reading-relations" aria-label="文章關聯與連結">
    <h2>文章關聯與連結</h2>
    {groups.map(group=><section className="scope-article-relation-group" key={group.id} aria-label={group.heading}>
      <h3>{group.heading} <span>{group.items.length} 筆</span></h3>
      <div className="scope-article-relation-grid">
        {group.items.slice(0,4).map((link,index)=>relationCard(link,index,group.id,group.external))}
      </div>
      {group.items.length>4?<details className="scope-article-relation-more">
        <summary>展開另外 {group.items.length-4} 筆{group.heading}</summary>
        <div className="scope-article-relation-grid">
          {group.items.slice(4).map((link,index)=>relationCard(link,index+4,group.id,group.external))}
        </div>
      </details>:null}
    </section>)}
    <ArticleLazyMediaLinks ids={mediaIds} table={mediaTable} authenticated={mediaAuthenticated}/>
  </nav>;
}

export function WorkSummaryCard({
  title=null,
  titleEditor=null,
  titleHref='',
  kicker=null,
  source='',
  scopeId='',
  date='',
  checkIn='',
  body='',
  hidden=false,
  relationLinks=[],
  detailReading=false,
  mediaIds=[],
  mediaTable='',
  mediaAuthenticated=false,
  links=[],
  destinations=[],
  showSource=true,
  showLinks=true,
  children=null,
  className='',
  actions=null,
  onClick=null,
  onClickCapture=null
}){
  const copy=useUiCopy();
  const safeRelations=safeRelationLinksOf(relationLinks,copy.work.relatedText);
  const safeLinks=safeExternalLinksOf(links,copy.work.viewLinks);
  return <article className={'scope-inline-card scope-work-summary '+className+(onClickCapture?' is-inline-editable':'')} onClick={onClick||undefined} onClickCapture={onClickCapture}>
    <header className="scope-culture-work-heading">
      <div>
        {kicker?<p className="loc-eyebrow scope-card-kicker">{kicker}</p>:null}
        {(scopeId||showSource&&source)?<p className="loc-eyebrow">{[scopeId,showSource?source:''].filter(Boolean).join(' · ')}</p>:null}
        {titleEditor||(titleHref
          ?<a href={titleHref} className="scope-article-title-link"><strong>{title??copy.work.untitled}</strong></a>
          :<strong>{title??copy.work.untitled}</strong>)}
        {checkIn?<p className="scope-work-checkin">{checkIn}</p>:null}
      </div>
      {date||actions?<div className="scope-work-summary-actions">{date?<time>{date}</time>:null}{actions}</div>:null}
    </header>
    {hidden?<p className="scope-status">{copy.work.hidden}</p>:null}
    {body?<p className="scope-culture-work-meta-description">{body}</p>:null}
    {!detailReading&&safeRelations.length?<div className="scope-result-links scope-work-relations">
      {safeRelations.map((link,index)=><ScopeLink key={link.id||link.href||index} href={String(link.href||'').trim()}>{link.label||copy.format.relatedText(index+1)}</ScopeLink>)}
    </div>:null}
    {!detailReading&&showLinks&&safeLinks.length?<div className="scope-result-links">
      {safeLinks.map((link,index)=><a key={link.id||link.href||index} href={externalLink(link)} target="_blank" rel="noreferrer">{link.label||copy.format.link(index+1)}</a>)}
    </div>:null}
    {destinations?.length?<div className="scope-result-links">
      {destinations.map(destination=><ScopeLink key={destination.id||destination.href} href={destination.href}>{destination.label}</ScopeLink>)}
    </div>:null}
    {children}
    {detailReading?<ArticleRelationNavigation links={safeRelations} externalLinks={showLinks?safeLinks:[]} mediaIds={mediaIds} mediaTable={mediaTable} mediaAuthenticated={mediaAuthenticated}/>:null}
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
  const t=useUiText();
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
    },{root:scrollRootRef?.current||null,threshold:0.1,rootMargin:'80px 0px'});
    observer.observe(sentinel);
    return()=>observer.disconnect();
  },[hasMore,error,onLoadMore,cooldownMs,scrollRootRef]);

  if(!hasMore)return null;
  return <div ref={sentinelRef} className={'scope-load-sentinel'+(loading?' is-loading':'')} aria-live="polite">
    <button type="button" className="loc-button" disabled={loading} onClick={()=>onLoadMore?.()} aria-label={t('uiExtra.pagination.loadMoreAria')}><UiText id={loading?'uiExtra.pagination.loading':'uiExtra.pagination.loadMore'}/></button>
  </div>;
}

export function ArticleSortSelect({value='desc',onChange,disabled=false}){
  return <label style={{display:'inline-flex',alignItems:'center',gap:'.4rem',fontSize:'.875rem'}}>
    排序
    <select aria-label="文章列表排序" value={value} disabled={disabled}
      onChange={event=>onChange(event.target.value)}
      style={{maxWidth:'100%',padding:'.25rem .45rem',fontSize:'inherit',borderRadius:'.4rem'}}>
      <option value="desc">最新優先</option>
      <option value="asc">最舊優先</option>
    </select>
  </label>;
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

/** One feature-availability control shared by Scope settings and Admin drafts. */
export function ScopeFeatureToggles({value={},onChange,className='scope-editor-options'}){
  return <div className={className}>
    {[
      ['search_able','features.search.title'],
      ['statistics_able','features.statics.title'],
      ['culture_able','features.culture.title']
    ].map(([key,label])=><label key={key}>
      <input type="checkbox" checked={value[key]!==false}
        onChange={event=>onChange?.(key,event.target.checked)}/><UiText id={label}/>
    </label>)}
  </div>;
}
