'use client';

import {useEffect,useState} from 'react';
import {DEFAULT_LOCALE,LANGUAGE_DEFAULT_KEY,SUPPORTED_LOCALES,normalizeLocale} from '../../language-registry';

export default function LanguageSettingsManager(){
  const [defaultLocale,setDefaultLocale]=useState(DEFAULT_LOCALE);

  useEffect(()=>{
    setDefaultLocale(normalizeLocale(localStorage.getItem(LANGUAGE_DEFAULT_KEY)||DEFAULT_LOCALE));
  },[]);

  function save(value){
    const next=normalizeLocale(value);
    setDefaultLocale(next);
    localStorage.setItem(LANGUAGE_DEFAULT_KEY,next);
    window.dispatchEvent(new Event('loc-language-default-change'));
  }

  return <div className="loc-view">
    <section className="loc-card">
      <h2>預設語系</h2>
      <p className="loc-subtitle">目前支援繁體中文與 English。網站預設只影響尚未自行選擇語系的使用者。</p>
      <label>網站預設語系
        <select value={defaultLocale} onChange={e=>save(e.target.value)}>
          {SUPPORTED_LOCALES.filter(item=>item.enabled).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
    </section>
    <section className="loc-card">
      <h2>中英夾雜治理</h2>
      <p>不做全域自動替換。產品名、專有名詞、技術術語，以及說明文字中的必要英文對照可以保留；一般按鈕、欄位、NAV 與介面標籤則應優先使用目前語系。</p>
      <p className="loc-subtitle">正文與內容翻譯暫不調整，等內容文字微調完成後再處理。</p>
    </section>
  </div>;
}
