'use client';

import {useEffect} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
import ScopeLink from '../modular/ScopeLink';
import {FeaturePage} from '../modular/ui';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {useAccount} from './use-account';
import {useEditDock} from '../modular/edit-dock';
import ManagementSectionNav,{useManagementSection} from '../modular/ManagementSectionNav';

const ManagementSearchWorkspace=dynamic(
  ()=>import('../modular/features/Search'),
  {loading:()=> <p className="scope-status" role="status">載入管理搜尋…</p>}
);
const ScopeEditableBlocks=dynamic(()=>import('./ScopeEditableBlocks'),{loading:()=>null});
const ManagementArticlePublisher=dynamic(()=>import('./ManagementArticlePublisher'),{loading:()=>null});
const ManagementMediaPublisher=dynamic(()=>import('./ManagementMediaPublisher'),{loading:()=>null});
const SunoImportPanel=dynamic(()=>import('./SunoImportPanel'),{loading:()=>null});

const SECTIONS=Object.freeze([
  {value:'search',label:'管理搜尋'},
  {value:'suggestions',label:'建議搜尋的編輯'},
  {value:'publish',label:'文章發表'},
  {value:'media',label:'多媒體發表'},
  {value:'suno',label:'Suno 寫入'}
]);

export default function SearchManagement(){
  const {scopeId,scope}=useScopeRuntime();
  const account=useAccount();
  const editDock=useEditDock();
  const searchParams=useSearchParams();
  const ready=!account.loading&&!account.permissionLoading;
  const isLocAdmin=scopeId==='loc';
  const isContentScope=Boolean(scopeId&&scopeId!=='loc'&&scopeId!=='admin'&&!scope?.aggregateChildren);
  const permitted=ready&&Boolean(account.user)&&
    (isLocAdmin?account.canManageGlobalSync():isContentScope&&account.canManageScopeSync(scopeId));
  const options=isLocAdmin?SECTIONS.filter(item=>item.value==='search'):SECTIONS;
  const [activeSection,setSection]=useManagementSection(options,'search');
  const editRequested=searchParams?.get('edit')==='1';
  const currentSection=options.find(option=>option.value===activeSection)||options[0];
  useEffect(()=>{
    if(!permitted||(!editRequested&&!['suggestions','publish','media','suno'].includes(activeSection)))return;
    editDock?.begin(scopeId);
  },[permitted,editRequested,activeSection,scopeId,editDock?.begin]);

  // featureId="search" shares the Scope's existing, database-backed Search Hero.
  // Neither its image nor any of its text is replicated or overridden here.
  if(!ready)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card">
      <p>請先登入，才能使用管理搜尋。</p>
      <ScopeLink className="loc-button primary" href="/local/settings/?section=account">前往登入</ScopeLink>
    </section>
  </FeaturePage>;
  if(!permitted)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card" role="alert">沒有此 Scope 的管理權限。</section>
  </FeaturePage>;

  return <FeaturePage featureId="search">
    <p className="scope-status">{isLocAdmin?'跨 Scope 文章管理（包含未開放搜尋的文章）':'進階文章管理'}</p>
    <div className="management-workspace">
      <ManagementSectionNav id="management-search-sections" title="文章管理"
        panelId="management-search-panel" items={options}
        value={activeSection} onChange={next=>{
          if(next===activeSection)return;
          if(!editDock?.active){setSection(next);return;}
          const url=new URL(window.location.href);
          url.searchParams.set('section',next);
          editDock.switchTo(url.pathname+url.search+url.hash);
        }}/>
      <div id="management-search-panel" className="management-workspace-panel" role="region"
        aria-labelledby={'management-search-sections-option-'+currentSection.value}>
    {activeSection==='search'?<ManagementSearchWorkspace managementMode/>:null}
    {activeSection==='suggestions'?<section className="loc-card">
      <ScopeEditableBlocks scopeId={scopeId} page="search" orders={[1]}
        className="scope-search-reference-grid"
        slotClassName="scope-search-reference-block"
        editSlotClassName="scope-search-reference-block"
        headingLevel={2} allowEditing allowDelete={false}
        allowInlineChildAdd explicitEditButton
        authorizedByParent startInEditMode onEditorExit={()=>setSection('search')}/>
    </section>:null}
    {activeSection==='publish'?<ManagementArticlePublisher scopeId={scopeId}/>:null}
    {activeSection==='media'?<ManagementMediaPublisher scopeId={scopeId}/>:null}
    {activeSection==='suno'?<SunoImportPanel scopeId={scopeId}/>:null}
      </div>
    </div>
  </FeaturePage>;
}
