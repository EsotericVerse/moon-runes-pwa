import fs from 'node:fs';

const data=fs.readFileSync('app/loc/data.js','utf8');
const client=fs.readFileSync('app/loc/neon-client.js','utf8');
const userStorage=fs.readFileSync('app/loc/neon-user-storage.js','utf8');
const scopeManagement=fs.readFileSync('app/modular-v2/ScopeManagementV2.jsx','utf8');
const scopeRepository=fs.readFileSync('app/loc/neon-scope-governance.js','utf8');
const scopeAuthorization=fs.readFileSync('app/loc/scope-authorization.js','utf8');
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
requireMatch(scopeRepository,/MANAGE_TABLE='silver\.manage'/,'Scope governance must use silver.manage');
requireMatch(scopeRepository,/record_type:'permission'/,'website permissions must be stored in silver.manage permission rows');
requireMatch(scopeAuthorization,/privileges\.includes\('admin'\)/,'admin must grant the top management level');
requireMatch(scopeAuthorization,/privileges\.includes\(scope\)/,'Scope privilege must grant the whole Scope');
requireMatch(scopeAuthorization,/\`\$\{scope\}_\$\{page\}\`/,'page privilege must use scope_page naming');
if(/['"`]scope:|['"`]page:/.test(scopeAuthorization+scopeRepository+scopeManagement)){
  failures.push('retired scope:/page: privilege syntax must remain removed');
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
console.log('[auth-boundary] Neon Auth + silver.manage downward-compatible privilege model verified');
