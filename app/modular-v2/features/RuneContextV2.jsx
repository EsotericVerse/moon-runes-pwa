'use client';

import {useEffect,useMemo,useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {GROUPS} from '../../runes/rune-directory.mjs';
import {updateRuneKeywords} from '../../loc/neon-context-client';
import KeywordGraph3DV2 from '../modules/keyword-graph/KeywordGraph3DV2';

function keywordList(value){
  return String(value||'').split(/[、,，\n\r]+/).map(item=>item.trim()).filter(Boolean);
}
function keywordText(value){
  return keywordList(value).join('、');
}
const RUNE_KEYWORD_GROUPS=Object.freeze([['positive','正向關鍵詞'],['negative','反向關鍵詞']]);

export default function RuneContextV2({runes=[],readOnly=false}){
  const [groupId,setGroupId]=useState(null);
  const [runeNumber,setRuneNumber]=useState(null);
  const [editing,setEditing]=useState(false);
  const [positive,setPositive]=useState('');
  const [negative,setNegative]=useState('');
  const queryClient=useQueryClient();
  const selected=useMemo(()=>runeNumber===null?null:(runes.find(item=>Number(item.rune_number)===Number(runeNumber))||null),[runes,runeNumber]);
  const activeGroup=GROUPS.find(group=>group.id===groupId)||null;
  const groupRunes=useMemo(()=>activeGroup?runes.filter(rune=>String(rune.group_name||'').trim()===activeGroup.name):[],[runes,activeGroup]);
  const graphGroups=useMemo(()=>runes.map(rune=>({
    style_no:Number(rune.rune_number),
    representative_name:rune.rune_name||('符文 '+rune.rune_number),
    basic_principle:rune.rune_description||'',
    keywords:[
      ...keywordList(rune.positive_keywords).map(keyword=>({keyword_group:'positive',keyword})),
      ...keywordList(rune.negative_keywords).map(keyword=>({keyword_group:'negative',keyword}))
    ]
  })),[runes]);
  const selectGraphItem=item=>{
    const rune=runes.find(row=>Number(row.rune_number)===Number(item?.styleNo));
    const group=GROUPS.find(row=>row.name===String(rune?.group_name||'').trim());
    if(!rune||!group)return;
    setGroupId(group.id);
    setRuneNumber(Number(rune.rune_number));
  };
  const save=useMutation({
    mutationFn:updateRuneKeywords,
    onSuccess:async()=>{await queryClient.invalidateQueries({queryKey:['rune-context-catalog']});setEditing(false);}
  });

  useEffect(()=>{
    setPositive(selected?.positive_keywords||'');
    setNegative(selected?.negative_keywords||'');
    setEditing(false);
    save.reset();
  },[selected?.rune_number]);

  if(selected){
    return <div className="loc-rune-context">
      <nav className="loc-rune-context-crumbs" aria-label="符文位置">
        <button type="button" className="loc-button" onClick={()=>{setRuneNumber(null);setGroupId(readOnly?null:groupId);setEditing(false);}}>← {readOnly?'關鍵詞 3D 圖':activeGroup?.name||'群組'}</button>
        <span>{selected.group_name} · 符文 {selected.rune_number}</span>
      </nav>
      <article className="scope-v2-inline-card loc-rune-context-detail">
        <p className="loc-eyebrow">{selected.english_name||'LunaRune'} · {String(selected.rune_number).padStart(2,'0')}</p>
        <h3>{selected.rune_name||'符文 '+selected.rune_number}</h3>
        <section aria-labelledby="rune-keywords-title">
          <div className="loc-rune-context-section-heading">
            <h4 id="rune-keywords-title">Current 關鍵詞</h4>
            {!editing&&!readOnly?<button type="button" className="loc-button" onClick={()=>{setPositive(selected.positive_keywords||'');setNegative(selected.negative_keywords||'');save.reset();setEditing(true);}}>編輯關鍵詞</button>:null}
          </div>
          {editing?<div className="loc-rune-keyword-editor">
            <label>正向關鍵詞<textarea rows="3" value={positive} onChange={event=>setPositive(event.target.value)} placeholder="以頓號或換行分隔"/></label>
            <label>反向關鍵詞<textarea rows="3" value={negative} onChange={event=>setNegative(event.target.value)} placeholder="以頓號或換行分隔"/></label>
            <div className="loc-rune-keyword-actions">
              <button type="button" className="loc-button" disabled={save.isPending} onClick={()=>save.mutate({runeNumber:selected.rune_number,positiveKeywords:keywordText(positive),negativeKeywords:keywordText(negative)})}>{save.isPending?'儲存中…':'儲存關鍵詞'}</button>
              <button type="button" className="loc-button" disabled={save.isPending} onClick={()=>{setEditing(false);setPositive(selected.positive_keywords||'');setNegative(selected.negative_keywords||'');save.reset();}}>取消</button>
            </div>
            {save.isError?<p className="scope-v2-status scope-v2-error" role="alert">{save.error?.message||'關鍵詞儲存失敗'}</p>:null}
          </div>:<div className="loc-rune-keyword-groups">
            <div><strong>正向</strong><div className="scope-v2-chip-list">{keywordList(selected.positive_keywords).map((word,index)=><span key={index}>{word}</span>)}</div></div>
            <div><strong>反向</strong><div className="scope-v2-chip-list">{keywordList(selected.negative_keywords).map((word,index)=><span key={index}>{word}</span>)}</div></div>
          </div>}
        </section>
        <section className="loc-rune-principle" aria-labelledby="rune-principle-title">
          <p className="loc-eyebrow">Guiding Principle</p>
          <h4 id="rune-principle-title">大原則</h4>
          <p>{selected.rune_description||'目前尚無大原則資料。'}</p>
        </section>
      </article>
    </div>;
  }

  if(activeGroup){
    return <div className="loc-rune-context">
      <nav className="loc-rune-context-crumbs" aria-label="符文位置">
        <button type="button" className="loc-button" onClick={()=>setGroupId(null)}>← 九大群組</button>
        <span>{activeGroup.name} · {activeGroup.english}</span>
      </nav>
      <p className="scope-v2-culture-period-description">{activeGroup.description} 此群組用於關鍵詞分類判定，群組內符文的現有關鍵詞提供分類依據。</p>
      <div className="loc-rune-context-grid" aria-label={activeGroup.name+'群組符文'}>
        {groupRunes.map(rune=><button type="button" className="loc-rune-context-tile" key={rune.rune_number} onClick={()=>setRuneNumber(Number(rune.rune_number))}>
          <span>符文 {String(rune.rune_number).padStart(2,'0')}</span>
          <strong>{rune.rune_name}</strong>
          <small>{rune.english_name}</small>
        </button>)}
      </div>
      {!groupRunes.length?<p className="scope-v2-status">此群組目前沒有符文資料。</p>:null}
    </div>;
  }

  return <div className="loc-rune-context">
    <p className="scope-v2-culture-period-description">以現有符文關鍵詞與所屬群組進行簡單分類判定，作為語意引擎的基礎。點入符文可查看其關鍵詞與大原則。</p>
    <KeywordGraph3DV2
      groups={graphGroups}
      keywordGroups={RUNE_KEYWORD_GROUPS}
      entityLabel="符文"
      title="符文關鍵詞 3D 圖"
      description="橫軸是符文，縱軸分成符文與正向、反向關鍵詞；深度表示關鍵詞序位。拖曳旋轉，點選節點可開啟該符文。"
      onSelect={selectGraphItem}
    />
    <div className="loc-rune-context-grid loc-rune-context-groups">
      {GROUPS.map(group=>{
        const count=runes.filter(rune=>String(rune.group_name||'').trim()===group.name).length;
        return <button type="button" className="loc-rune-context-tile" key={group.id} onClick={()=>setGroupId(group.id)}>
          <span>GROUP {group.id}</span>
          <strong>{group.name}</strong>
          <small>{group.english} · {count} 枚符文</small>
          <p>{group.description}</p>
        </button>;
      })}
    </div>
  </div>;
}
