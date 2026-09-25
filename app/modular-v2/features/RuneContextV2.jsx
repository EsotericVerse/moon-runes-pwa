'use client';

import {useEffect,useMemo,useState} from 'react';
import {useMutation,useQueryClient} from '@tanstack/react-query';
import {GROUPS} from '../../runes/rune-directory.mjs';
import {updateRuneKeywords} from '../../loc/neon-context-client';
import {parseRuneKeywordRules,serializeRuneKeywordRules,splitRuneKeywordEntries} from '../../loc/model/rune-keyword-rules';
import KeywordGraph3DV2 from '../modules/keyword-graph/KeywordGraph3DV2';

function keywordList(value){
  return String(value||'').split(/[、,，\n\r]+/).map(item=>item.trim()).filter(Boolean);
}
function readRuneKeywordFields(rune){
  const positive=splitRuneKeywordEntries(rune?.positive_keywords);
  const negative=splitRuneKeywordEntries(rune?.negative_keywords);
  const rules=parseRuneKeywordRules([...positive.rules,...negative.rules].map(rule=>rule.token)).rules;
  return {
    positive:positive.keywords.join('、'),
    negative:negative.keywords.join('、'),
    rules:rules.map(rule=>rule.token).join('、')
  };
}
function runeGraphKeywords(rune){
  const positive=splitRuneKeywordEntries(rune?.positive_keywords);
  const negative=splitRuneKeywordEntries(rune?.negative_keywords);
  const rules=parseRuneKeywordRules([...positive.rules,...negative.rules].map(rule=>rule.token)).rules;
  return [
    ...positive.keywords.map(keyword=>({keyword_group:'positive',keyword})),
    ...negative.keywords.map(keyword=>({keyword_group:'negative',keyword})),
    ...rules.map(rule=>({keyword_group:'rules',keyword:rule.token}))
  ];
}
function keywordFieldWithRules(value,rules,operator){
  const keywords=keywordList(value);
  const ruleTokens=rules.filter(rule=>rule.operator===operator).map(rule=>rule.token);
  return [...new Set([...keywords,...ruleTokens])].join('、');
}
const RUNE_KEYWORD_GROUPS=Object.freeze([['positive','正向關鍵詞'],['negative','反向關鍵詞'],['rules','規則']]);

export default function RuneContextV2({runes=[],readOnly=false}){
  const [groupId,setGroupId]=useState(null);
  const [runeNumber,setRuneNumber]=useState(null);
  const [editing,setEditing]=useState(false);
  const [positive,setPositive]=useState('');
  const [negative,setNegative]=useState('');
  const [keywordRules,setKeywordRules]=useState('');
  const [ruleError,setRuleError]=useState('');
  const queryClient=useQueryClient();
  const selected=useMemo(()=>runeNumber===null?null:(runes.find(item=>Number(item.rune_number)===Number(runeNumber))||null),[runes,runeNumber]);
  const selectedKeywordFields=useMemo(()=>readRuneKeywordFields(selected),[selected?.positive_keywords,selected?.negative_keywords]);
  const activeGroup=GROUPS.find(group=>group.id===groupId)||null;
  const groupRunes=useMemo(()=>activeGroup?runes.filter(rune=>String(rune.group_name||'').trim()===activeGroup.name):[],[runes,activeGroup]);
  const graphGroups=useMemo(()=>runes.map(rune=>({
    style_no:Number(rune.rune_number),
    representative_name:rune.rune_name||('符文 '+rune.rune_number),
    basic_principle:rune.rune_description||'',
    keywords:runeGraphKeywords(rune)
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
    const fields=selectedKeywordFields;
    setPositive(fields.positive);
    setNegative(fields.negative);
    setKeywordRules(fields.rules);
    setRuleError('');
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
            {!editing&&!readOnly?<button type="button" className="loc-button" onClick={()=>{setPositive(selectedKeywordFields.positive);setNegative(selectedKeywordFields.negative);setKeywordRules(selectedKeywordFields.rules);setRuleError('');save.reset();setEditing(true);}}>編輯關鍵詞與規則</button>:null}
          </div>
          {editing?<div className="loc-rune-keyword-editor">
            <label>正向關鍵詞<textarea rows="3" value={positive} onChange={event=>setPositive(event.target.value)} placeholder="以頓號或換行分隔"/></label>
            <label>反向關鍵詞<textarea rows="3" value={negative} onChange={event=>setNegative(event.target.value)} placeholder="以頓號或換行分隔"/></label>
            <label>規則（每個符文的關鍵詞最底層）<textarea rows="3" value={keywordRules} onChange={event=>{setKeywordRules(event.target.value);setRuleError('');}} placeholder="AND日\nNOR月" aria-describedby="rune-keyword-rules-help"/></label>
            <p id="rune-keyword-rules-help" className="scope-v2-meta">只接受 AND關鍵詞、NOR關鍵詞；AND 項目都要命中，NOR 項目命中任一個就排除。</p>
            <div className="loc-rune-keyword-actions">
              <button type="button" className="loc-button" disabled={save.isPending} onClick={()=>{
                const parsed=parseRuneKeywordRules(keywordRules);
                if(parsed.invalid.length){setRuleError(`規則格式錯誤：${parsed.invalid.join('、')}。請使用 AND關鍵詞 或 NOR關鍵詞。`);return;}
                const rules=parsed.rules;
                save.mutate({
                  runeNumber:selected.rune_number,
                  positiveKeywords:keywordFieldWithRules(positive,rules,'AND'),
                  negativeKeywords:keywordFieldWithRules(negative,rules,'NOR')
                });
              }}>{save.isPending?'儲存中…':'儲存關鍵詞與規則'}</button>
              <button type="button" className="loc-button" disabled={save.isPending} onClick={()=>{setEditing(false);setPositive(selectedKeywordFields.positive);setNegative(selectedKeywordFields.negative);setKeywordRules(selectedKeywordFields.rules);setRuleError('');save.reset();}}>取消</button>
            </div>
            {ruleError?<p className="scope-v2-status scope-v2-error" role="alert">{ruleError}</p>:null}
            {save.isError?<p className="scope-v2-status scope-v2-error" role="alert">{save.error?.message||'關鍵詞儲存失敗'}</p>:null}
          </div>:<div className="loc-rune-keyword-groups">
            <div><strong>正向</strong><div className="scope-v2-chip-list">{keywordList(selectedKeywordFields.positive).map((word,index)=><span key={index}>{word}</span>)}</div></div>
            <div><strong>反向</strong><div className="scope-v2-chip-list">{keywordList(selectedKeywordFields.negative).map((word,index)=><span key={index}>{word}</span>)}</div></div>
            <div><strong>規則</strong><div className="scope-v2-chip-list">{parseRuneKeywordRules(selectedKeywordFields.rules).rules.map((rule,index)=><span key={rule.token+'|'+index}>{rule.token}</span>)}</div></div>
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
      <p className="scope-v2-culture-period-description">{activeGroup.description} 此群組用於關鍵詞分類判定；AND／NOR 規則設在個別符文的最底層關鍵詞。</p>
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
    <p className="scope-v2-culture-period-description">點入符文可查看關鍵詞、大原則，以及該符文最底層的 AND／NOR 關鍵詞規則。</p>
    <KeywordGraph3DV2
      groups={graphGroups}
      keywordGroups={RUNE_KEYWORD_GROUPS}
      entityLabel="符文"
      title="符文關鍵詞 3D 圖"
      description="橫軸是符文，縱軸分成符文、正向／反向關鍵詞與最底層規則；深度表示項目序位。拖曳旋轉，點選節點可開啟該符文。"
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
