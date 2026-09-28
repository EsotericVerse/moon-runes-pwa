'use client';

import {neonPublicClient} from '../../loc/neon-client';
import {useOffsetPagination} from '../use-offset-pagination.v2';
import FeaturePageV2 from '../FeaturePageV2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';
import {getScopeV2,scopeHrefV2} from '../scope-registry.v2';
import {useNeonAccount} from '../../loc/use-neon-account';
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
      const {data,error}=await neonPublicClient.schema('silver').from('faq_entries')
        .select('faq_id,category,question,answer')
        .order('category',{ascending:true})
        .order('faq_id',{ascending:true})
        .range(offset,offset+limit-1);
      if(error)throw new Error(error.message||'FAQ 載入失敗');
      const rows=data||[];
      return {rows,hasMore:rows.length===limit};
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
  const account=useNeonAccount();
  const {View,subtitle}=governanceFor(scopeId);
  const adminHref=getScopeV2('admin').primary.href;
  const canEdit=account.canManageScopeSync(scopeId);
  return <FeaturePageV2 featureId="governance" subtitle={subtitle}>
    <View canEdit={canEdit}/>
    {scopeId==='loc'?<section className="loc-card">
      <p className="loc-eyebrow">Management</p>
      <h2>系統管理</h2>
      <p>Admin 是獨立管理站，不屬於 Scope。</p>
      <a className="loc-button primary" href={adminHref}>進入獨立管理站</a>
    </section>:<section className="loc-card">
      <p className="loc-eyebrow">Scope Management</p>
      <h2>{getScopeV2(scopeId).label}管理</h2>
      <p>時期、關鍵詞／風格分類與其他 Scope 設定集中在這裡；頁面文字仍在原頁直接編輯。</p>
      <a className="loc-button primary" href={scopeHrefV2(scopeId,'governance/manage')}>進入 Scope 管理</a>
    </section>}
  </FeaturePageV2>;
}

function GovernanceLaw(){
  const {scopeId}=useScopeRuntimeV2();
  const account=useNeonAccount();
  const canEdit=account.canManageScopeSync(scopeId);
  if(scopeId==='loc')return <FeaturePageV2 featureId="governance" subtitle="權利與授權"><LocGovernanceLaw canEdit={canEdit}/></FeaturePageV2>;
  const {View}=governanceFor(scopeId);
  return <FeaturePageV2 featureId="governance" subtitle="權利與授權"><View canEdit={canEdit}/></FeaturePageV2>;
}

export default function GovernanceV2({section=null}){
  if(section==='faq')return <FaqView/>;
  if(section==='law')return <GovernanceLaw/>;
  return <GovernanceHome/>;
}
