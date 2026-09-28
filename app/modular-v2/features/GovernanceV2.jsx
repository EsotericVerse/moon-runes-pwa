'use client';

import {selectNeonRows} from '../../loc/neon-repository';
import {useOffsetPagination} from '../use-offset-pagination.v2';
import FeaturePageV2 from '../FeaturePageV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {scopeHrefV2} from '../scope-registry.v2';
import GovernanceInlineEditor from '../../loc/GovernanceInlineEditor';
import LocGovernance,{LocGovernanceLaw,LOC_GOVERNANCE_SUBTITLE} from '../governance/LocGovernance';
import LunaRunesGovernance,{LUNARUNES_GOVERNANCE_SUBTITLE} from '../governance/LunaRunesGovernance';
import PersonalGovernance,{PERSONAL_GOVERNANCE_SUBTITLE} from '../governance/PersonalGovernance';

const FAQ_PAGE_SIZE=10;

function faqQuestion(row,index){
  return row?.question||row?.title||row?.prompt||row?.faq_question||`問題 ${index+1}`;
}
function faqAnswer(row){
  return row?.answer||row?.content||row?.body||row?.faq_answer||row?.description||'';
}
function faqCategory(row){
  return row?.category||row?.group_name||row?.section||row?.scope||'FAQ';
}

function FaqView(){
  const page=useOffsetPagination({
    key:'governance-faq',
    pageSize:FAQ_PAGE_SIZE,
    loadPage:async(offset,limit)=>{
      const result=await selectNeonRows('silver.faq_entries',{
        columns:'faq_id,category,question,answer',
        orders:[{column:'category',ascending:true},{column:'faq_id',ascending:true}],
        offset,
        limit
      });
      return {rows:result.rows,hasMore:result.rows.length===limit};
    }
  });
  const {rows,loading,error,hasMore}=page;
  return <section className="loc-view">
    <header className="loc-hero">
      <p className="loc-eyebrow">FAQ</p>
      <h1>常見問題</h1>
    </header>
    {loading&&!rows.length?<p className="scope-v2-status">載入 FAQ…</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error.message}</p>:null}
    {!loading&&!error&&!rows.length?<p>目前沒有 FAQ 資料。</p>:null}
    <div className="loc-grid two">
      {rows.map((row,index)=><article className="loc-card" key={row?.faq_id||row?.id||row?.faq_key||index}>
        <p className="loc-eyebrow">{faqCategory(row)}</p>
        <h2>{faqQuestion(row,index)}</h2>
        <p>{faqAnswer(row)}</p>
      </article>)}
    </div>
    {hasMore?<div className="scope-v2-load-sentinel" aria-live="polite">&lt; {loading?'載入中…':'…'} &gt;</div>:null}
  </section>;
}

function governanceFor(scopeId){
  if(scopeId==='loc')return {View:LocGovernance,subtitle:LOC_GOVERNANCE_SUBTITLE};
  if(scopeId==='lunarunes')return {View:LunaRunesGovernance,subtitle:LUNARUNES_GOVERNANCE_SUBTITLE};
  return {View:PersonalGovernance,subtitle:PERSONAL_GOVERNANCE_SUBTITLE};
}

function GovernanceHome(){
  const {scopeId}=useScopeRuntimeV2();
  const {View,subtitle}=governanceFor(scopeId);
  return <FeaturePageV2 featureId="governance" subtitle={subtitle}>
    <GovernanceInlineEditor scopeId={scopeId}><View/></GovernanceInlineEditor>
    <section className="loc-card"><p className="loc-eyebrow">Management</p><h2>管理</h2><a className="loc-button primary" href={scopeHrefV2(scopeId,'governance/manage')}>進入管理</a></section>
  </FeaturePageV2>;
}

function GovernanceLaw(){
  const {scopeId}=useScopeRuntimeV2();
  if(scopeId==='loc')return <FeaturePageV2 featureId="governance" subtitle="權利與授權"><LocGovernanceLaw/></FeaturePageV2>;
  const {View}=governanceFor(scopeId);
  return <FeaturePageV2 featureId="governance" subtitle="權利與授權"><View/></FeaturePageV2>;
}

export default function GovernanceV2({section=null}){
  if(section==='faq')return <FaqView/>;
  if(section==='law')return <GovernanceLaw/>;
  return <GovernanceHome/>;
}
