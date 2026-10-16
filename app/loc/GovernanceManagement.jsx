'use client';

import GlobalSettings from './GlobalSettings';

// Keep the cross-Scope management controls on the governance management route.
export default function GovernanceManagement(){
  return <GlobalSettings initialSection="manage"/>;
}
