'use client';

import {useAccount} from './use-account';
import {useEditDock} from '../modular/edit-dock';
import BottomNavIcon from '../modular/BottomNavIcon';

// Loaded only in LOC edit mode. Group managers must never see the system entry.
export default function AdminEditSystemButton({href}){
  const account=useAccount();
  const dock=useEditDock();
  if(!account.user||account.loading||account.permissionLoading||
     !account.canManageGlobalSync())return null;
  return <button type="button" className="scope-edit-system-button"
    disabled={dock?.busy} onClick={()=>dock?.switchTo(href)}
    aria-label="系統管理"><BottomNavIcon name="settings"/><span>系統管理</span></button>;
}
