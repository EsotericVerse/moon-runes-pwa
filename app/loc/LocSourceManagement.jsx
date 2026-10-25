'use client';

import dynamic from 'next/dynamic';
import LocManagementWorkspace from './LocManagementWorkspace';
import ManagementSectionNav,{useManagementSection} from '../modular/ManagementSectionNav';
import {useEditDock} from '../modular/edit-dock';
import PanelLoading from './PanelLoading';

// All three capabilities remain independent: work classifications are stored
// in silver.loc.txt_class; member management and reserved-name notes retain
// their existing global Admin authorization and write paths.
const WorkClassificationPage=dynamic(()=>import('./WorkClassificationPage'),{loading:PanelLoading});
const AdminRegistryPanel=dynamic(()=>import('./views/admin-panels/AdminRegistry'),{loading:PanelLoading});
const AdminReservedScopeIds=dynamic(()=>import('./views/admin-panels/AdminReservedScopeIds'),{loading:PanelLoading});

const OPTIONS=Object.freeze([
  {value:'works',label:'作品群組分類',shortLabel:'作品群組分類',description:'管理全站的作品群組分類名稱。'},
  {value:'registry',label:'人員',shortLabel:'人員',description:'管理人員、群組及所屬關係。'},
  {value:'reserved',label:'保留名稱',shortLabel:'保留名稱',description:'查看系統保留名稱並修改備註。'}
]);
const ITEM=Object.freeze({value:'works',label:'人員作品管理'});

export default function LocSourceManagement(){
  const [section,setSection]=useManagementSection(OPTIONS,'works');
  const editDock=useEditDock();
  const selected=OPTIONS.find(option=>option.value===section)||OPTIONS[0];
  return <LocManagementWorkspace featureId="culture" navId="loc-source-sections" item={ITEM} standalone>
    <div className="management-workspace">
      <ManagementSectionNav id="loc-source-sections" title="人員作品管理" panelId="loc-source-panel"
        items={OPTIONS} value={section} onChange={next=>{
          if(next===section)return;
          if(editDock?.active)editDock.switchSection(next,setSection);
          else setSection(next);
        }}/>
      <div id="loc-source-panel" className="management-workspace-panel" role="region"
        aria-labelledby={'loc-source-sections-option-'+selected.value}>
        {section==='works'?<WorkClassificationPage/>:null}
        {section==='registry'?<AdminRegistryPanel/>:null}
        {section==='reserved'?<AdminReservedScopeIds/>:null}
      </div>
    </div>
  </LocManagementWorkspace>;
}
