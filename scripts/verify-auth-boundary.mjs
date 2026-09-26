import fs from 'node:fs';

const data=fs.readFileSync('app/loc/data.js','utf8');
const client=fs.readFileSync('app/loc/neon-client.js','utf8');
const userStorage=fs.readFileSync('app/loc/neon-user-storage.js','utf8');
const scopeManagement=fs.readFileSync('app/modular-v2/ScopeManagementV2.jsx','utf8');
const scopeRepository=fs.readFileSync('app/loc/neon-scope-governance.js','utf8');
const failures=[];

const requireMatch=(text,re,label)=>{if(!re.test(text))failures.push(label);};

requireMatch(data,/selectNeonRows/,'shared runtime data must use direct Neon table reads');
if(/memoryCache|DEFAULT_MEMORY_CACHE_ENTRIES/.test(data))failures.push('shared runtime data must not retain a process-memory data cache');
requireMatch(client,/@neondatabase\/neon-js/,'Neon Managed Auth client dependency is required');
requireMatch(client,/signInWithOAuth/,'Neon Google OAuth sign-in is required');
requireMatch(client,/getSession/,'Neon session lookup is required');
requireMatch(userStorage,/user_records/,'Neon user record persistence is required');
requireMatch(userStorage,/user_settings/,'Neon user settings persistence is required');
requireMatch(scopeManagement,/account\.canManageGlobal\(\)/,'Scope create, edit and delete must be gated by admin');
requireMatch(scopeRepository,/SCOPE_GOVERNANCE_TABLE='silver\.loc_scope'/,'Scope governance must use the consolidated table');
requireMatch(scopeRepository,/callNeonRpc\('grant_scope_access'/,'page grants must go through the authorized RPC');

for(const retired of [
  'app/loc/neon-legacy-migration.js',
  'app/loc/auth-client.js',
  'app/loc/local-db.js',
  'app/loc/google-drive.js',
  'app/loc/storage.js',
  'services/cloudflare/auth-worker.js',
  'services/cloudflare/wrangler.auth.jsonc',
  'services/cloudflare/loc-state-worker.js'
]){
  if(fs.existsSync(retired))failures.push(`retired persistence/auth path must remain removed: ${retired}`);
}

if(failures.length){
  console.error('[auth-boundary] violations:\\n'+failures.join('\\n'));
  process.exit(1);
}
console.log('[auth-boundary] Neon Auth + direct table reads + user storage boundary verified');
