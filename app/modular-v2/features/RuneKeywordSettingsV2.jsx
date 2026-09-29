'use client';

import {useEffect,useMemo,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {selectRuneKeywordGroup,updateRuneKeywords} from '../../loc/rune-repository';
import {parseRuneKeywordRules,splitRuneKeywordEntries} from '../../loc/model/rune-keyword-rules.mjs';
import {FEATURE_LOADING_MESSAGE,featureDataErrorMessage} from '../feature-data-state.v2';

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
function keywordFieldWithRules(value,rules,operator){
  const keywords=keywordList(value);
  const ruleTokens=rules.filter(rule=>rule.operator===operator).map(rule=>rule.token);
  return [...new Set([...keywords,...ruleTokens])].join('、');
}

export default function RuneKeywordSettingsV2({groups=[],readOnly=false}){
  const [groupId,setGroupId]=useState(null);
  const [runeNumber,setRuneNumber]=useState(null);
  const [editing,setEditing]=useState(false);
  const [positive,setPositive]=useState('');
  const [negative,setNegative]=useState('');
  const [keywordRules,setKeywordRules]=useState('');
  const [editorError,setEditorError]=useState('');
  const queryClient=useQueryClient();

  const activeGroup=groups.find(group=>String(group.id)===String(groupId))||null;
  const groupQuery=useQuery({
    queryKey:['rune-keyword-group',activeGroup?.name||''],
    queryFn:()=>selectRuneKeywordGroup(activeGroup?.name),
    enabled:Boolean(activeGroup?.name),
    staleTime:5*60_000
  });
  const groupRunes=groupQuery.data||[];
  const selected=useMemo(()=>runeNumber===null?null:(groupRunes.find(item=>Number(item.rune_number)===Number(runeNumber))||null),[groupRunes,runeNumber]);
  const selectedKeywordFields=useMemo(()=>readRuneKeywordFields(selected),[selected?.positive_keywords,selected?.negative_keywords]);

  const save=useMutation({
    mutationFn:updateRuneKeywords,
    onSuccess:async()=>{
      await queryClient.invalidateQueries({queryKey:['rune-keyword-group',activeGroup?.name||'']});
      setEditing(false);
    }
  });

  useEffect(()=>{
    const fields=selectedKeywordFields;
    setPositive(fields.positive);
    setNegative(fields.negative);
    setKeywordRules(fields.rules);
    setEditorError('');
    setEditing(false);
    save.reset();
  },[selected?.rune_number]);

  if(selected){
    return <div className="loc-rune-context">
      <nav className="loc-rune-context-crumbs" aria-label="符文位置">
        <button type="button" className="loc-button" onClick={()=>{setRuneNumber(null);setEditing(false);}}>← {activeGroup?.name||'群組'}</button>
        <span>{selected.group_name} · 符文 {selected.rune_number}</span>
      </nav>
      <article className="scope-v2-inline-card loc-rune-context-detail">
        <p className="loc-eyebrow">{selected.english_name||'LunaRune'} · {String(selected.rune_number).padStart(2,'0')}</p>
        <h3>{selected.rune_name||'符文 '+selected.rune_number}</h3>
        <section aria-labelledby="rune-keywords-title">
          <div className="loc-rune-context-section-heading">
            <h4 id="rune-keywords-title">Current 關鍵詞</h4>
            {!editing&&!readOnly?<button type="button" className="loc-button" onClick={()=>{setPositive(selectedKeywordFields.positive);setNegative(selectedKeywordFields.negative);setKeywordRules(selectedKeywordFields.rules);setEditorError('');save.reset();setEditing(true);}}>編輯關鍵詞與規則</button>:null}
          </div>
          {editing?<div className="loc-rune-keyword-editor">
            <label>正向關鍵詞<textarea rows="3" value={positive} onChange={event=>{setPositive(event.target.value);setEditorError('');}} placeholder="以頓號或換行分隔"/></label>
            <label>反向關鍵詞<textarea rows="3" value={negative} onChange={event=>{setNegative(event.target.value);setEditorError('');}} placeholder="以頓號或換行分隔"/></label>
            <label>規則<textarea rows="3" value={keywordRules} onChange={event=>{setKeywordRules(event.target.value);setEditorError('');}} placeholder="AND日\nNOR月" aria-describedby="rune-keyword-rules-help"/></label>
            <p id="rune-keyword-rules-help" className="scope-v2-meta">只接受 AND關鍵詞、NOR關鍵詞；AND 項目都要命中，NOR 項目命中任一個就排除。</p>
            <div className="loc-rune-keyword-actions">
              <button type="button" className="loc-button" disabled={save.isPending} onClick={()=>{
                const parsed=parseRuneKeywordRules(keywordRules);
                if(parsed.invalid.length){setEditorError(`規則格式錯誤：${parsed.invalid.join('、')}。請使用 AND關鍵詞 或 NOR關鍵詞。`);return;}
                const rules=parsed.rules;
                const positiveKeywords=keywordFieldWithRules(positive,rules,'AND');
                const negativeKeywords=keywordFieldWithRules(negative,rules,'NOR');
                if(positiveKeywords.length>3000||negativeKeywords.length>3000){setEditorError('單一欄位最多 3000 字，請減少關鍵詞或規則。');return;}
                save.mutate({runeNumber:selected.rune_number,positiveKeywords,negativeKeywords});
              }}>{save.isPending?'儲存中…':'儲存關鍵詞與規則'}</button>
              <button type="button" className="loc-button" disabled={save.isPending} onClick={()=>{setEditing(false);setPositive(selectedKeywordFields.positive);setNegative(selectedKeywordFields.negative);setKeywordRules(selectedKeywordFields.rules);setEditorError('');save.reset();}}>取消</button>
            </div>
            {editorError?<p className="scope-v2-status scope-v2-error" role="alert">{editorError}</p>:null}
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
        <button type="button" className="loc-button" onClick={()=>{setGroupId(null);setRuneNumber(null);}}>← 九大群組</button>
        <span>{activeGroup.name} · {activeGroup.english}</span>
      </nav>
      <p className="scope-v2-culture-period-description">{activeGroup.description}</p>
      {groupQuery.isPending?<p className="scope-v2-status">{FEATURE_LOADING_MESSAGE}</p>:null}
      {groupQuery.error?<p className="scope-v2-status scope-v2-error">{featureDataErrorMessage(groupQuery.error)}</p>:null}
      {!groupQuery.isPending&&!groupQuery.error?<div className="loc-rune-context-grid" aria-label={activeGroup.name+'群組符文'}>
        {groupRunes.map(rune=><button type="button" className="loc-rune-context-tile" key={rune.rune_number} onClick={()=>setRuneNumber(Number(rune.rune_number))}>
          <span>符文 {String(rune.rune_number).padStart(2,'0')}</span>
          <strong>{rune.rune_name}</strong>
          <small>{rune.english_name}</small>
        </button>)}
      </div>:null}
      {!groupQuery.isPending&&!groupQuery.error&&!groupRunes.length?<p className="scope-v2-status">此群組目前沒有符文資料。</p>:null}
    </div>;
  }

  return <div className="loc-rune-context">
    <p className="scope-v2-culture-period-description">先選群組，再查該群組符文；不預先載入全部符文做 JavaScript 分組。</p>
    <div className="loc-rune-context-grid loc-rune-context-groups">
      {groups.map(group=>{
        const count=Array.isArray(group.runeslist)?group.runeslist.length:0;
        return <button type="button" className="loc-rune-context-tile" key={group.id} onClick={()=>{setGroupId(group.id);setRuneNumber(null);}}>
          <span>GROUP {group.id}</span>
          <strong>{group.name}</strong>
          <small>{group.english}{count?' · '+count+' 枚符文':''}</small>
          <p>{group.description}</p>
        </button>;
      })}
    </div>
  </div>;
}
