import fs from 'node:fs';

const data=fs.readFileSync('app/loc/data.js','utf8');
const client=fs.readFileSync('app/loc/neon-client.js','utf8');
const account=fs.readFileSync('app/loc/use-neon-account.js','utf8');
const authorization=fs.readFileSync('app/loc/scope-authorization.js','utf8');
const userStorage=fs.readFileSync('app/loc/neon-user-storage.js','utf8');
const scopeManagement=fs.readFileSync('app/modular-v2/ScopeManagementV2.jsx','utf8');
const scopeRepository=fs.readFileSync('app/loc/neon-scope-governance.js','utf8');
const searchView=fs.readFileSync('app/modular-v2/features/SearchV2.jsx','utf8');
const server=fs.readFileSync('app/loc/neon-server.js','utf8');
const failures=[];

const requireMatch=(text,re,label)=>{if(!re.test(text))failures.push(label);};

requireMatch(data,/selectNeonRows/,'shared runtime data must use direct Neon table reads');
if(/memoryCache|DEFAULT_MEMORY_CACHE_ENTRIES/.test(data))failures.push('shared runtime data must not retain a process-memory data cache');

requireMatch(client,/@neondatabase\/neon-js/,'Neon Auth client dependency is required');
requireMatch(client,/signInWithOAuth/,'Neon Google OAuth sign-in is required');
requireMatch(client,/getSession/,'Neon session lookup is required');

requireMatch(account,/createScopeAuthorizer\(user\)/,'account authorization must come from the shared Neon Auth authorizer');
requireMatch(account,/email:authorizer\.email/,'email must be the account identity key');
requireMatch(account,/role:authorizer\.role/,'Neon Auth role must drive authorization');
if(/OWNER_EMAIL|isOwner\(|user\?\.id|user\.id|canManagePage/.test(account)){
  failures.push('account authorization must not use owner-email special cases, user.id identity, or page-level permissions');
}

requireMatch(authorization,/\^\(admin\|scope:/,'authorization must allow only admin or scope:<scope_id> roles');
requireMatch(authorization,/canRoleManageGlobal/,'shared admin authorization helper missing');
requireMatch(authorization,/canRoleManageScope/,'shared scope authorization helper missing');
if(/page_manager|scope_manager|scope_owner|privacy_dispute_handler|case_id/.test(authorization)){
  failures.push('authorization module must remain strictly two-level: admin + scope');
}

requireMatch(userStorage,/session\?\.user\?\.email/,'user-local storage identity must use Neon Auth email');
if(/user\?\.id|user\.id/.test(userStorage))failures.push('user-local storage must not use Neon Auth user.id as identity');

requireMatch(scopeManagement,/account\.canManageGlobal\(\)/,'Scope create, edit and delete must be admin-only');
requireMatch(scopeRepository,/MANAGE_TABLE='silver\.manage'/,'Scope graph structure may remain in silver.manage');
if(/record_type:'permission'|selectPermissions|upsertPermission|deletePermission/.test(scopeRepository+scopeManagement)){
  failures.push('website users/permissions must not be mirrored into silver.manage');
}
if(/function hasPrivilege|account\.privileges/.test(searchView)){
  failures.push('Search must use the shared Neon Auth authorizer instead of its own privilege logic');
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
console.log('[auth-boundary] Neon Auth email identity + admin/scope authorization verified');
