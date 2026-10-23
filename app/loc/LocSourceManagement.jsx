'use client';

import dynamic from 'next/dynamic';
import LocManagementWorkspace from './LocManagementWorkspace';
import PanelLoading from './PanelLoading';

const AdminSourceCategories=dynamic(
  ()=>import('./SourceCategoryEditor').then(mod=>mod.AdminSourceCategories),
  {loading:PanelLoading}
);
const SOURCE_ITEM=Object.freeze({
  value:'sources',label:'來源管理',description:'跨 Scope 統計來源分類'
});

export default function LocSourceManagement(){
  return <LocManagementWorkspace featureId="culture" navId="loc-source-sections" item={SOURCE_ITEM}>
    <AdminSourceCategories/>
  </LocManagementWorkspace>;
}
