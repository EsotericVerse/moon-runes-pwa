'use client';

import dynamic from 'next/dynamic';
import LocManagementWorkspace from './LocManagementWorkspace';
import PanelLoading from './PanelLoading';

const WorkClassificationPage=dynamic(
  ()=>import('./WorkClassificationPage'),
  {loading:PanelLoading}
);
const SOURCE_ITEM=Object.freeze({
  value:'works',label:'作品群組分類',description:'管理 Admin 的全站作品群組分類'
});

export default function LocSourceManagement(){
  return <LocManagementWorkspace featureId="culture" navId="loc-source-sections" item={SOURCE_ITEM} standalone>
    <WorkClassificationPage/>
  </LocManagementWorkspace>;
}
