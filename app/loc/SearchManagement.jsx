'use client';

import {useEffect} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
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
const ManagementMediaWorkspace=dynamic(()=>import('./ManagementMediaWorkspace'),{loading:()=>null});
const ManagementContentTarget=dynamic(()=>import('./ManagementContentTarget'),{loading:()=>null});

const SECTIONS=Object.freeze([
  {value:'search',label:'文章管理搜尋',shortLabel:'搜尋'},
  {value:'publish',label:'發表文章',shortLabel:'文章'},
  {value:'media',label:'發表多媒體',shortLabel:'媒體'},
  {value:'suggestions',label:'編輯建議搜尋',shortLabel:'建議'},
  {value:'trace',label:'治理原則',shortLabel:'治理原則'}
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
  const options=isLocAdmin?SECTIONS.filter(item=>['search','media','trace'].includes(item.value)):SECTIONS;
  const [activeSection,setSection]=useManagementSection(options,'search');
  const editRequested=searchParams?.get('edit')==='1';
  const currentSection=options.find(option=>option.value===activeSection)||options[0];
  useEffect(()=>{
    if(!permitted||(!editRequested&&!['suggestions','publish','media','trace'].includes(activeSection)))return;
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
          if(editDock?.active)editDock.switchSection(next,setSection);
          else setSection(next);
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
    {activeSection==='trace'?<ScopeEditableBlocks key={scopeId+'-trace'}
      scopeId={scopeId} page="trace"
      className={'loc-grid two trace-grid'+(scopeId==='loc'?' trace-grid-loc':'')}
      headingLevel={2} allowDelete
      authorizedByParent startInEditMode explicitEditButton
      onEditorExit={()=>setSection('search')}/>:null}
    {activeSection==='publish'?<ManagementArticlePublisher scopeId={scopeId}/>:null}
    {activeSection==='media'?(isLocAdmin?<ManagementContentTarget scopeId={scopeId} mode="media" globalAdmin/>:<ManagementMediaWorkspace scopeId={scopeId}/>):null}
      </div>
    </div>
  </FeaturePage>;
}
