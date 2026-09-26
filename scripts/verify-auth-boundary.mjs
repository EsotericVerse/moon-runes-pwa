import fs from 'node:fs';

const data=fs.readFileSync('app/loc/data.js','utf8');
const client=fs.readFileSync('app/loc/neon-client.js','utf8');
const account=fs.readFileSync('app/loc/use-neon-account.js','utf8');
const userStorage=fs.readFileSync('app/loc/neon-user-storage.js','utf8');
const scopeManagement=fs.readFileSync('app/modular-v2/ScopeManagementV2.jsx','utf8');
const scopeRepository=fs.readFileSync('app/loc/neon-scope-governance.js','utf8');
const server=fs.readFileSync('app/loc/neon-server.js','utf8');
const failures=[];

const requireMatch=(text,re,label)=>{if(!re.test(text))failures.push(label);};

requireMatch(data,/selectNeonRows/,'shared runtime data must use direct Neon table reads');
if(/memoryCache|DEFAULT_MEMORY_CACHE_ENTRIES/.test(data))failures.push('shared runtime data must not retain a process-memory data cache');

requireMatch(client,/@neondatabase\/neon-js/,'Neon Auth client dependency is required');
requireMatch(client,/signInWithOAuth/,'Neon Google OAuth sign-in is required');
requireMatch(client,/getSession/,'Neon session lookup is required');
requireMatch(account,/OWNER_EMAIL/,'management must use the owner email gate');
requireMatch(account,/String\(user\?\.id\|\|''\)/,'management identity metadata must come from Neon Auth user.id');
requireMatch(account,/canManage=isOwner\(user\)/,'management access must follow the owner email gate');
if(/canManagePage/.test(account))failures.push('page-level management API must remain retired');
requireMatch(userStorage,/user_records/,'Neon user record persistence is required');
requireMatch(userStorage,/user_settings/,'Neon user settings persistence is required');

requireMatch(scopeManagement,/account\.canManageGlobal\(\)/,'Scope create, edit and delete must be gated by the management session');
requireMatch(scopeRepository,/MANAGE_TABLE='silver\.manage'/,'Scope structure may remain in silver.manage');
if(/record_type:'permission'|selectPermissions|upsertPermission|deletePermission/.test(scopeRepository+scopeManagement)){
  failures.push('website users/permissions must not be mirrored into silver.manage');
}
if(/silver\.manage[\s\S]{0,200}permission|record_type\s*=\s*['"]permission['"]/.test(server)){
  failures.push('server authorization must not read silver.manage permission rows');
}

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
  console.error('[auth-boundary] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[auth-boundary] Neon Auth identity + owner-only management gate verified');
