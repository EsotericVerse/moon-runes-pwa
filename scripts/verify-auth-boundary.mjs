import fs from 'node:fs';

const data=fs.readFileSync('app/loc/rune-repository.js','utf8');
const client=fs.readFileSync('app/loc/neon-client.js','utf8');
const account=fs.readFileSync('app/loc/use-neon-account.js','utf8');
const authorization=fs.readFileSync('app/loc/scope-authorization.js','utf8');
const userStorage=fs.readFileSync('app/loc/neon-user-storage.js','utf8');
const scopeManagement=fs.readFileSync('app/modular-v2/ScopeManagementV2.jsx','utf8');
const scopeRepository=fs.readFileSync('app/loc/neon-scope-governance.js','utf8');
const searchView=fs.readFileSync('app/modular-v2/features/SearchV2.jsx','utf8');
const failures=[];

const requireMatch=(text,re,label)=>{if(!re.test(text))failures.push(label);};

requireMatch(data,/selectNeonCatalog/,'shared rune runtime must use the canonical Neon repository');
if(/memoryCache|DEFAULT_MEMORY_CACHE_ENTRIES/.test(data))failures.push('shared runtime data must not retain a process-memory data cache');

requireMatch(client,/allowAnonymous\s*:\s*true/,'public canonical reads must use Neon managed anonymous JWT transport');
requireMatch(client,/neonPublicClient=neonClient/,'public reads must share the managed anonymous Neon client');
requireMatch(client,/neonAuthClient=neonClient/,'management sign-in must upgrade the shared Neon client session');
requireMatch(client,/signInWithOAuth/,'Neon Google OAuth sign-in is required for management');
requireMatch(client,/getSession/,'Neon session lookup is required for management');

requireMatch(account,/selectNeonAllRows\('silver\.manage'/,'account authorization must resolve website permissions from silver.manage');
requireMatch(account,/columns:'id,email,role'/,'account permission lookup must use the Current manage contract');
requireMatch(account,/email:authorizer\.email/,'email must be the account identity key');
requireMatch(account,/role:authorizer\.role/,'resolved manage role must be exposed by the account state');
if(/OWNER_EMAIL|isOwner\(|user\?\.id|user\.id|canManagePage|user\?\.role|user\.role/.test(account)){
  failures.push('website authorization must not use owner-email special cases, user.id, Neon Auth user.role, or page-level permissions');
}

requireMatch(authorization,/z\.enum\(\['admin','scope'\]\)/,'authorization must accept only Current manage roles admin/scope');
requireMatch(authorization,/permissionRows/,'shared authorizer must consume silver.manage permission rows');
requireMatch(authorization,/scopes\.has\(normalizeScopeId\(scopeId\)\)/,'scope authorization must be derived from manage row ids');
if(/scope_manager|scope_owner|page_manager|privacy_dispute_handler|case_id|scope:<|normalizeAuthRole/.test(authorization)){
  failures.push('authorization module must remain strictly manage-table admin + scope');
}

requireMatch(userStorage,/api\.user_records/,'authenticated user records must use api.user_records');
requireMatch(userStorage,/api\.user_settings/,'authenticated user settings must use api.user_settings');
requireMatch(userStorage,/conflict:'owner_id,id'/,'user record upserts must be owner-scoped');
requireMatch(userStorage,/conflict:'owner_id,setting_key'/,'user setting upserts must be owner-scoped');
if(/localStorage|IndexedDB|readStore\(|writeStore\(/.test(userStorage))failures.push('authenticated durable user state must not use browser storage');

requireMatch(scopeManagement,/account\.canManageGlobal\(\)/,'Scope create, edit and delete must be admin-only');
requireMatch(scopeRepository,/MANAGE_TABLE='silver\.manage'/,'Scope graph structure may remain in silver.manage');
if(/record_type:'permission'|selectPermissions|upsertPermission|deletePermission/.test(scopeRepository+scopeManagement)){
  failures.push('website users/permissions must not be mirrored into silver.manage');
}
if(/function hasPrivilege|account\.privileges/.test(searchView)){
  failures.push('Search must use the shared Neon Auth authorizer instead of its own privilege logic');
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
console.log('[auth-boundary] Neon Auth + RLS user storage + admin/scope authorization verified');
