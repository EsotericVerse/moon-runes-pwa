import fs from 'node:fs';

const auth=fs.readFileSync('services/cloudflare/auth-worker.js','utf8');
const state=fs.readFileSync('services/cloudflare/loc-state-worker.js','utf8');
const client=fs.readFileSync('app/loc/auth-client.js','utf8');
const admin=fs.readFileSync('app/admin/page.jsx','utf8');
const routeAdmin=fs.readFileSync('app/admin/RouteRegistryManager.jsx','utf8');
const scopePeriod=fs.readFileSync('app/loc/ScopePeriodEditor.jsx','utf8');
const failures=[];

const requireMatch=(text,re,label)=>{if(!re.test(text))failures.push(label);};
const forbidMatch=(text,re,label)=>{if(re.test(text))failures.push(label);};

requireMatch(auth,/SESSION_TTL_SECONDS\s*=\s*60\s*\*\s*60\s*\*\s*2/,'auth worker: management session TTL must remain 2 hours');
requireMatch(auth,/disableSessionRefresh\s*:\s*true/,'auth worker: sliding session refresh must remain disabled');
requireMatch(auth,/socialProviders\s*:\s*\{[\s\S]*google\s*:/,'auth worker: Google OAuth provider is required');
requireMatch(auth,/requireEmailVerification\s*:\s*true/,'auth worker: Google email verification is required');
requireMatch(auth,/LOC_ADMIN_EMAILS/,'auth worker: Owner\/Admin allowlist must remain server-side');
requireMatch(auth,/LOC_PERIOD_EDITOR_EMAILS/,'auth worker: Period editor allowlist must remain server-side');
requireMatch(auth,/LOC_CONTEXT_EDITOR_EMAILS/,'auth worker: Context editor allowlist must remain server-side');
requireMatch(auth,/LOC_SEMANTIC_EDITOR_EMAILS/,'auth worker: Semantic editor allowlist must remain server-side');
requireMatch(auth,/auth\.api\.getSession\s*\(/,'auth worker: management session must be validated server-side');
requireMatch(auth,/['\"]\/routes['\"]\s*:\s*['\"]platform:routes:write['\"]/,'auth worker: hierarchical Route Registry must require platform:routes:write');
requireMatch(auth,/platform:visibility:write/,'auth worker: visibility permission required');
requireMatch(auth,/platform:projection:rebuild/,'auth worker: projection rebuild permission required');
requireMatch(auth,/scope:period:write/,'auth worker: scoped Period permission required');
requireMatch(auth,/frozen_rune_canon_read_only/,'auth worker: Frozen Rune Canon must remain non-writable');
requireMatch(auth,/MANAGEMENT_SEMANTIC_PATH/,'auth worker: semantic observer proxy required');
requireMatch(auth,/canon_write\s*:\s*false/,'auth worker: semantic API must never receive Canon write authority');
requireMatch(auth,/MANAGEMENT_NEON_STATUS_PATH/,'auth worker: Neon governance adapter status required');

for(const route of ['aliases','routes','visibility','projection-rebuild','eras','daily-runes','context']){
  const block=new RegExp(`path === ['\"]\\/${route}['\"][\\s\\S]*?authorized\\(request, env\\)`,`m`);
  requireMatch(state,block,`state worker: \/${route} mutations must retain authorization guard`);
}
requireMatch(state,/visibility\s*===\s*['\"]public['\"]/,'state worker: public projection must filter private\/internal resources');
requireMatch(state,/adminFrozen\s*\?\s*false\s*:\s*Boolean\(row\?\.statistics_included\)/,'state worker: Admin freeze must override statistics inclusion');
requireMatch(state,/manager_route_hash_forbidden/,'state worker: manager routes must reject hash routing');
requireMatch(state,/route_has_children/,'state worker: parent nodes must not be deleted while children remain');
requireMatch(state,/LOC_WRITE_TOKEN/,'state worker: break-glass write credential support must remain server-side');

requireMatch(client,/credentials\s*:\s*['\"]include['\"]/,'browser auth client: management requests must include HttpOnly session credentials');
requireMatch(client,/management\/session/,'browser auth client: management session status endpoint required');
requireMatch(client,/managementStateRequest/,'browser auth client: governed state request helper required');
requireMatch(routeAdmin,/platform:routes:write/,'route admin: Route Registry UI must require route-write permission');
requireMatch(routeAdmin,/insert_parent/,'route admin: inserting a parent node must be supported');
requireMatch(scopePeriod,/scope:period:write/,'scope governance: Period editor must require scoped write permission');
requireMatch(scopePeriod,/scope,period/,'scope governance: Period delete must preserve scope identity');

forbidMatch(admin,/next\/headers|force-dynamic|getServerManagementSession/,'static export: admin page must not depend on Next server session APIs');

if(failures.length){
  console.error('[auth-boundary] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[auth-boundary] layered RBAC, route tree, scoped governance, Frozen Canon and private projection boundaries verified');
