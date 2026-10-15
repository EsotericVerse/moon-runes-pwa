'use client';

import {useEffect,useState} from 'react';
import {UI_LOCALE_OPTIONS} from '../i18n/ui-copy';
import {useUiLocale} from '../i18n/ui-locale';
import FieldText from '../i18n/FieldText';
import {mediaTagLanguageReferences} from './media-tag-language-reference.mjs';

// Reference-language display is local UI state only. No metadata or DB writes.
export default function MediaTagLanguageReference({metaTags=''}) {
  const {locale}=useUiLocale();
  const [referenceLocale,setReferenceLocale]=useState(locale);
  useEffect(()=>setReferenceLocale(locale),[locale]);
  const matches=mediaTagLanguageReferences(metaTags,referenceLocale);
  return <div className="scope-media-tag-reference">
    <div className="scope-stat-controls">
      <label>
        <span><FieldText text="參考語系"/></span>
        <select className="scope-select" value={referenceLocale} onChange={event=>setReferenceLocale(event.target.value)}>
          {UI_LOCALE_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </div>
    <p className="scope-status">
      <FieldText text="僅解釋目前 Meta Tags 中已存在的情緒標籤，不會翻譯、增加或改寫儲存值。"/>
    </p>
    {matches.length?<p className="scope-status">{matches.map(({tag,reference})=>tag+' → '+reference).join(' · ')}</p>
      :<p className="scope-status"><FieldText text="目前沒有可對照的情緒標籤，保留原始 Meta Tags。"/></p>}
  </div>;
}
