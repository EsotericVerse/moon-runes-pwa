'use client';

import {UI_COPY} from '../../i18n/ui-copy';

import {neonPublicClient} from '../../loc/neon-client';
import {useOffsetPagination} from '../use-offset-pagination.v2';
import IncrementalLoadV2 from '../IncrementalLoadV2';
import {DEFAULT_LIST_BATCH_SIZE} from '../list-loading.v2';
import FeaturePageV2 from '../FeaturePageV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {getScopeV2,scopeHrefV2} from '../scope-registry.v2';
import {useNeonAccount} from '../../loc/use-neon-account';
import LocGovernance,{LocGovernanceLaw,LOC_GOVERNANCE_SUBTITLE} from '../governance/LocGovernance';
import LunaRunesGovernance,{LUNARUNES_GOVERNANCE_SUBTITLE} from '../governance/LunaRunesGovernance';
import PersonalGovernance,{PERSONAL_GOVERNANCE_SUBTITLE} from '../governance/PersonalGovernance';


function faqQuestion(row,index){
  return row?.question||row?.title||row?.prompt||row?.faq_question||`問題 ${index+1}`;
}
function faqAnswer(row){
  return row?.answer||row?.content||row?.body||row?.faq_answer||row?.description||'';
}
function faqCategory(row){
  return row?.category||row?.group_name||row?.section||row?.scope||UI_COPY.governance.faq;
}

function FaqView(){
  const page=useOffsetPagination({
    key:'governance-faq',
    pageSize:DEFAULT_LIST_BATCH_SIZE,
    loadPage:async(offset,limit)=>{
      const {data,error}=await neonPublicClient.schema('silver').from('faq_entries')
        .select('faq_id,category,question,answer')
        .order('category',{ascending:true})
        .order('faq_id',{ascending:true})
        .range(offset,offset+limit-1);
      if(error)throw new Error(error.message||UI_COPY.governance.faq+'載入失敗');
      const rows=data||[];
      return {rows,hasMore:rows.length===limit};
    }
  });
  const {rows,loading,error,hasMore,loadNext}=page;
  return <section className="loc-view">
    <header className="loc-hero">
      <h1>{UI_COPY.governance.faq}</h1>
      <p>{UI_COPY.governance.faqIntro}</p>
    </header>
    {loading&&!rows.length?<p className="scope-v2-status">{UI_COPY.governance.faqLoading}</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error.message}</p>:null}
    {!loading&&!error&&!rows.length?<p>{UI_COPY.governance.faqEmpty}</p>:null}
    <div className="loc-grid two">
      {rows.map((row,index)=><article className="loc-card" key={row?.faq_id||row?.id||row?.faq_key||index}>
        <p className="loc-eyebrow">{faqCategory(row)}</p>
        <h2>{faqQuestion(row,index)}</h2>
        <p>{faqAnswer(row)}</p>
      </article>)}
    </div>
    <IncrementalLoadV2 hasMore={hasMore} loading={loading} error={error} onLoadMore={loadNext} label={UI_COPY.governance.faqMore}/>
  </section>;
}

function governanceFor(scopeId){
  if(scopeId==='loc')return {View:LocGovernance,subtitle:LOC_GOVERNANCE_SUBTITLE};
  if(scopeId==='lunarunes')return {View:LunaRunesGovernance,subtitle:LUNARUNES_GOVERNANCE_SUBTITLE};
  return {View:PersonalGovernance,subtitle:PERSONAL_GOVERNANCE_SUBTITLE};
}

function GovernanceHome(){
  const {scopeId}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const {View,subtitle}=governanceFor(scopeId);
  const adminHref=getScopeV2('admin').primary.href;
  const canEdit=account.canManageScopeSync(scopeId);
  return <FeaturePageV2 featureId="governance" subtitle={subtitle}>
    <View canEdit={canEdit}/>
    {scopeId==='loc'?<section className="loc-card">
      <h2>{UI_COPY.governance.systemManagement}</h2>
      <p>月典的系統設定集中在獨立管理站，公開治理頁只保留原則與權利說明。</p>
      <a className="loc-button primary" href={adminHref}>{UI_COPY.governance.enterAdmin}</a>
    </section>:<section className="loc-card">
      <h2>{getScopeV2(scopeId).label}管理</h2>
      <p>時期、分類與其他可調整項目集中在管理頁，需要修改設定時可從這裡進入。</p>
      <a className="loc-button primary" href={scopeHrefV2(scopeId,'governance/manage')}>{UI_COPY.governance.enterManagement}</a>
    </section>}
  </FeaturePageV2>;
}

function GovernanceLaw(){
  const {scopeId}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const canEdit=account.canManageScopeSync(scopeId);
  if(scopeId==='loc')return <FeaturePageV2 featureId="governance" subtitle={UI_COPY.governance.rights}><LocGovernanceLaw canEdit={canEdit}/></FeaturePageV2>;
  const {View}=governanceFor(scopeId);
  return <FeaturePageV2 featureId="governance" subtitle="權利與授權"><View canEdit={canEdit}/></FeaturePageV2>;
}

export default function GovernanceV2({section=null}){
  if(section==='faq')return <FaqView/>;
  if(section==='law')return <GovernanceLaw/>;
  return <GovernanceHome/>;
}
