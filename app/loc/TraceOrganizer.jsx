'use client';

import {useMemo,useState} from 'react';
import {dbAuthClient} from './db-client.mjs';
import {anchorAddress,countyOfAnchor,groupAnchorsByCounty,organizeAnchorCandidates} from '../modular/features/trace/trace-organizer.mjs';

const STATUS={
  'same-address':'地址相同：可以確認合併',
  'near-unverified':'座標接近、地址未齊：請先核對是否同址',
  'near-different-address':'座標接近，但記錄地址不同：不合併',
  'address-coordinate-conflict':'地址相同，但座標相距過遠：先核對座標',
  'same-name-different-location':'名稱相同、位置不同：保留獨立'
};
function Detail({anchor}){
  return <div><strong>{anchor.title}</strong> <small>（{anchor.uid}）</small>
    <p className="scope-status">{anchorAddress(anchor)||'尚無已核對地址'} · {anchor.latitude}, {anchor.longitude}</p>
  </div>;
}
export default function TraceOrganizer({scopeId,spatial,reload}){
  const ownAnchors=useMemo(()=>(spatial.anchors||[]).filter(a=>a.source_scope===scopeId),[spatial.anchors,scopeId]);
  const groups=useMemo(()=>groupAnchorsByCounty(ownAnchors),[ownAnchors]);
  const suggestions=useMemo(()=>organizeAnchorCandidates(ownAnchors),[ownAnchors]);
  const [selectedUid,setSelectedUid]=useState('');
  const [selectedCounty,setSelectedCounty]=useState('');
  const [keeps,setKeeps]=useState({});
  const [verified,setVerified]=useState({});
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');
  const source=ownAnchors.find(a=>a.uid===selectedUid);
  const selectable=groups.filter(g=>!selectedCounty||g.county===selectedCounty);
  const merge=async proposal=>{
    if(busy||scopeId==='loc'||!proposal.canMerge)return;
    const keep=keeps[proposal.key]||proposal.a.uid;
    const remove=keep===proposal.a.uid?proposal.b.uid:proposal.a.uid;
    const keepRow=keep===proposal.a.uid?proposal.a:proposal.b;
    const removeRow=remove===proposal.a.uid?proposal.a:proposal.b;
    const address=proposal.type==='same-address'?proposal.address:(verified[proposal.key]||'').trim();
    if(!address||address.length<6){setNotice('請先核對並輸入完整共同地址。');return;}
    if(!window.confirm('確定兩筆是同一地址、同一實體地點？\n保留：'+keepRow.title+'（'+keep+'）\n合併：'+removeRow.title+'（'+remove+'）\n地址：'+address+'\n將保留舊名稱及原有痕跡圖關聯。'))return;
    setBusy(proposal.key);setNotice('');
    try{
      const {data,error}=await dbAuthClient.schema('silver').rpc('merge_scoped_trace_anchors',{
        p_scope_id:scopeId,p_keep_uid:keep,p_remove_uid:remove,p_verified_address:address
      });
      if(error)throw new Error(error.message||'合併失敗');
      await reload();
      setNotice('已合併「'+(data?.historical_title||removeRow.title)+'」至「'+(data?.canonical_title||keepRow.title)+'」，並保留歷史名稱。');
    }catch(error){setNotice('合併未完成：'+String(error?.message||error));}
    finally{setBusy('');}
  };
  return <section className="loc-card scope-feature-card">
    <h3>整理空間定錨點</h3>
    <p className="scope-status">自動按縣市整理，主動發現同址異名及可疑重複。相同地址才提出合併；座標接近只供人工核對。任何合併都必須由你確認，且不修改 Galaxy 的文章或原始打卡。</p>
    <div className="scope-stat-controls" role="group" aria-label="整理摘要">
      <span className="scope-status">定錨點：{ownAnchors.length}</span>
      <span className="scope-status">待檢查：{suggestions.length} 組</span>
      <span className="scope-status">相同地址：{suggestions.filter(item=>item.type==='same-address').length} 組</span>
    </div>
    <div className="scope-management-fields">
      <label>縣市
        <select className="scope-select" value={selectedCounty} onChange={event=>{setSelectedCounty(event.target.value);setSelectedUid('');}}>
          <option value="">全部縣市</option>
          {groups.map(g=><option key={g.county} value={g.county}>{g.county}（{g.items.length}）</option>)}
        </select>
      </label>
      <label>定錨點
        <select className="scope-select" value={selectedUid} onChange={event=>setSelectedUid(event.target.value)}>
          <option value="">請選擇定錨點</option>
          {selectable.map(g=><optgroup key={g.county} label={g.county}>
            {g.items.map(a=><option key={a.uid} value={a.uid}>{a.title}</option>)}
          </optgroup>)}
        </select>
      </label>
    </div>
    {source?<div className="scope-card">
      <Detail anchor={source}/>
      <p className="scope-status">縣市：{countyOfAnchor(source)} · 半徑：{source.radius_m||500} 公尺</p>
    </div>:null}
    <h4>需要檢查的地點</h4>
    {!suggestions.length?<p className="scope-status">目前沒有查到可疑重複。沒有完整地址的地標仍可能需要補充地址才能進行同址判定。</p>:null}
    {suggestions.slice(0,80).map(proposal=>{
      const keep=keeps[proposal.key]||proposal.a.uid;
      const address=proposal.type==='same-address'?proposal.address:(verified[proposal.key]||'');
      const available=proposal.canMerge&&(proposal.type==='same-address'||address.trim().length>=6);
      return <div className="scope-card" key={proposal.key}>
        <h4>{STATUS[proposal.type]}</h4>
        <Detail anchor={proposal.a}/>
        <Detail anchor={proposal.b}/>
        <p className="scope-status">座標距離：{proposal.meters===null?'無座標':proposal.meters+' 公尺'}</p>
        {proposal.canMerge&&scopeId!=='loc'?<>
          <label>保留的主要定錨點
            <select className="scope-select" disabled={Boolean(busy)} value={keep}
              onChange={event=>setKeeps(current=>({...current,[proposal.key]:event.target.value}))}>
              <option value={proposal.a.uid}>{proposal.a.title}</option>
              <option value={proposal.b.uid}>{proposal.b.title}</option>
            </select>
          </label>
          {proposal.type==='near-unverified'?<label>人工核對的共同地址
            <input type="text" maxLength={160} value={address} placeholder="確認同一實體地址後，輸入完整門牌"
              disabled={Boolean(busy)} onChange={event=>setVerified(current=>({...current,[proposal.key]:event.target.value}))}/>
          </label>:<p className="scope-status">共同地址：{address}</p>}
          <button className="loc-button" type="button" disabled={Boolean(busy)||!available}
            onClick={()=>merge(proposal)}>{busy===proposal.key?'合併中…':'確認同址並合併'}</button>
        </>:<p className="scope-status">此組不能直接合併；請先修正地址或座標，避免把相鄰的不同地點合在一起。</p>}
      </div>;
    })}
    {suggestions.length>80?<p className="scope-status">僅顯示前 80 組建議，請先處理或核對，再重新檢查。</p>:null}
    {scopeId==='loc'?<p className="scope-status">LOC 群組只彙整各 Scope 的地點；合併請前往原作品 Scope。</p>:null}
    {notice?<p role="status" className="scope-status" aria-live="polite">{notice}</p>:null}
  </section>;
}
