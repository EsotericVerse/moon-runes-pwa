import fs from 'node:fs';

const failures=[];
const files=[
  'app/loc/db-client.mjs',
  'app/loc/use-account.js',
  'app/loc/user-storage.js',
  'app/loc/GovernanceManagement.jsx',
  'app/loc/views/AdminHomeView.jsx',
  'app/loc/ScopeSettingsPanel.jsx',
  'app/loc/ManagementArticlePublisher.jsx',
  'app/modular/features/Search.jsx',
  'app/modular/features/Culture.jsx'
];
for(const path of files)if(!fs.existsSync(path))failures.push('missing Current auth/data contract file: '+path);

if(failures.length){
  console.error('[auth-boundary] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[auth-boundary] auth/data contract files present');
