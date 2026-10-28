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
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:()=>null});
const ScopeOthersSources=dynamic(()=>import('./ScopeOthersSources'),{loading:()=>null});

// These five selections are in one Article Control workspace. Moving a panel
// never changes its Scope ownership, database tables or authorizer.
export const ARTICLE_CONTROL_SECTIONS=Object.freeze([
  {value:'search',label:'文章管理搜尋',shortLabel:'搜尋'},
  {value:'publish',label:'發表文章與多媒體',shortLabel:'發表'},
  {value:'blocks',label:'修改建議與治理原則',shortLabel:'區塊修改'},
  {value:'import',label:'匯入',shortLabel:'匯入'},
  {value:'others',label:'個人分類',shortLabel:'個人分類'}
]);

// LOC's global management has its own permissions and existing destinations.
// It must not gain an arbitrary Scope's article or classification editor.
const LOC_OPTIONS=Object.freeze([
  {value:'search',label:'文章管理搜尋',shortLabel:'搜尋'},
  {value:'media',label:'發表多媒體',shortLabel:'媒體'},
  {value:'trace',label:'治理原則',shortLabel:'治理原則'}
]);
const OLD_SCOPE_SECTION_ALIASES=Object.freeze({
  media:'publish',suggestions:'blocks',trace:'blocks'
});

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
  const options=isLocAdmin?LOC_OPTIONS:ARTICLE_CONTROL_SECTIONS;
  const [activeSection,setSection]=useManagementSection(options,'search',
    isLocAdmin?{}:OLD_SCOPE_SECTION_ALIASES);
  const editRequested=searchParams?.get('edit')==='1';
  const currentSection=options.find(option=>option.value===activeSection)||options[0];
  useEffect(()=>{
    if(!permitted||(!editRequested&&!['publish','blocks','import','others','media','trace'].includes(activeSection)))return;
    editDock?.begin(scopeId);
  },[permitted,editRequested,activeSection,scopeId,editDock?.begin]);

  if(!ready)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card" role="status">正在確認管理權限…</section>
  </FeaturePage>;
  if(!account.user)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card"><p>請先登入，才能使用文章控管。</p></section>
  </FeaturePage>;
  if(!permitted)return <FeaturePage featureId="search">
    <section className="loc-card scope-feature-card" role="alert">沒有此 Scope 的管理權限。</section>
  </FeaturePage>;

  return <FeaturePage featureId="search">
    <div className="management-workspace">
      <ManagementSectionNav id="management-search-sections" title={isLocAdmin?'文章管理':'文章控管'}
        panelId="management-search-panel" items={options}
        value={activeSection} onChange={next=>{
          if(next===activeSection)return;
          if(editDock?.active)editDock.switchSection(next,setSection);
          else setSection(next);
        }}/>
      <div id="management-search-panel" className="management-workspace-panel" role="region"
        aria-labelledby={'management-search-sections-option-'+currentSection.value}>
        {activeSection==='search'?<ManagementSearchWorkspace managementMode/>:null}

        {!isLocAdmin&&activeSection==='publish'?<div className="article-control-stacked">
          <section aria-labelledby="article-control-article-heading">
            <h3 id="article-control-article-heading">發表文章</h3>
            <ManagementArticlePublisher scopeId={scopeId}/>
          </section>
          <section aria-labelledby="article-control-media-heading">
            <h3 id="article-control-media-heading">發表多媒體</h3>
            <ManagementMediaWorkspace scopeId={scopeId}/>
          </section>
        </div>:null}

        {!isLocAdmin&&activeSection==='blocks'?<div className="article-control-stacked">
          <section aria-labelledby="article-control-suggestions-heading">
            <h3 id="article-control-suggestions-heading">建議搜尋</h3>
            <ScopeEditableBlocks key={scopeId+'-suggestions'} scopeId={scopeId} page="search" orders={[1]}
              className="scope-search-reference-grid"
              slotClassName="scope-search-reference-block"
              editSlotClassName="scope-search-reference-block"
              headingLevel={2} allowEditing allowDelete={false}
              allowInlineChildAdd explicitEditButton
              authorizedByParent startInEditMode/>
          </section>
          <section aria-labelledby="article-control-principles-heading">
            <h3 id="article-control-principles-heading">治理原則</h3>
            <ScopeEditableBlocks key={scopeId+'-principles'} scopeId={scopeId} page="trace"
              className="loc-grid two trace-grid" headingLevel={2} allowDelete
              authorizedByParent startInEditMode explicitEditButton/>
          </section>
        </div>:null}

        {!isLocAdmin&&activeSection==='import'
          ?<ManagementImportPanel key={scopeId+'-import'} scopeId={scopeId}/>:null}
        {!isLocAdmin&&activeSection==='others'
          ?<ScopeOthersSources key={scopeId+'-others'} scopeId={scopeId}/>:null}

        {isLocAdmin&&activeSection==='media'
          ?<ManagementContentTarget scopeId={scopeId} mode="media" globalAdmin/>:null}
        {isLocAdmin&&activeSection==='trace'?<ScopeEditableBlocks key={scopeId+'-trace'}
          scopeId={scopeId} page="trace"
          className="loc-grid two trace-grid trace-grid-loc"
          headingLevel={2} allowDelete authorizedByParent startInEditMode explicitEditButton/>:null}
      </div>
    </div>
  </FeaturePage>;
}
