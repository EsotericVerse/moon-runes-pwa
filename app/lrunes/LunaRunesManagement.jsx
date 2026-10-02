'use client';

import {useMemo} from 'react';
import GovernanceManagement from '../loc/GovernanceManagement';
import RuneManagementPanel from './RuneManagementPanel';

export default function LunaRunesManagement(){
  const extraSections=useMemo(()=>[
    {value:'daily',label:'每日符文管理',render:RuneManagementPanel}
  ],[]);
  return <GovernanceManagement extraSections={extraSections}/>;
}
