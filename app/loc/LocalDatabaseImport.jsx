'use client';

import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {Capacitor} from '@capacitor/core';
import PanelLoading from './PanelLoading';

// Reuse the existing format analysis and UID-deduplicated batch importer.
// Never use the cloud management path for the private 'local' Scope.
const ManagementImportPanel=dynamic(()=>import('./ManagementImportPanel'),{loading:PanelLoading});

export default function LocalDatabaseImport(){
  const [native,setNative]=useState(false);
  const [importChoice,setImportChoice]=useState('no');
  useEffect(()=>setNative(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='ios'),[]);
  if(!native)return null;
  return <section className="loc-card scope-feature-card">
    <h2>文件匯入</h2>
    <label>要將檔案內容匯入 SQLite 嗎？
      <select className="scope-select" value={importChoice} onChange={event=>setImportChoice(event.target.value)}>
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </select>
    </label>
    {importChoice==='yes'?<ManagementImportPanel scopeId="local"/>:
      <p className="scope-status">No：不寫入資料庫。原始檔案仍可在「我的手機」管理。</p>}
  </section>;
}
