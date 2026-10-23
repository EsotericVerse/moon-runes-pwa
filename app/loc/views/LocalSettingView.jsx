'use client';

import GlobalSettings from '../GlobalSettings';

// Preserve the old /local/setting bookmark as an alias. The canonical
// Settings route and file-import behavior live at /local/settings/.
export default function LocalSettingView(){
  return <GlobalSettings initialSection="files" localScopeOnly/>;
}
