import fs from 'node:fs';

const auth=fs.readFileSync('services/cloudflare/auth-worker.js','utf8');
const client=fs.readFileSync('app/loc/auth-client.js','utf8');
const data=fs.readFileSync('app/loc/data.js','utf8');
const failures=[];

const requireMatch=(text,re,label)=>{if(!re.test(text))failures.push(label);};
const forbidMatch=(text,re,label)=>{if(re.test(text))failures.push(label);};

requireMatch(auth,/SESSION_TTL_SECONDS\s*=\s*60\s*\*\s*60\s*\*\s*2/,'auth worker: management session TTL must remain 2 hours');
requireMatch(auth,/disableSessionRefresh\s*:\s*true/,'auth worker: sliding session refresh must remain disabled');
requireMatch(auth,/socialProviders\s*:\s*\{[\s\S]*google\s*:/,'auth worker: Google OAuth provider is required');
requireMatch(auth,/requireEmailVerification\s*:\s*true/,'auth worker: Google email verification is required');
requireMatch(auth,/LOC_ADMIN_EMAILS/,'auth worker: Owner/Admin allowlist must remain server-side');
requireMatch(auth,/auth\.api\.getSession\s*\(/,'auth worker: management session must be validated server-side');
requireMatch(auth,/authorized\s*:\s*allowed/,'auth worker: management session endpoint must return explicit authorization state');

requireMatch(client,/credentials\s*:\s*['"]include['"]/,'browser auth client: management requests must include HttpOnly session credentials');
requireMatch(client,/management\/session/,'browser auth client: management session status endpoint required');

requireMatch(data,/runtime_json_documents/,'shared runtime data must use Neon Current projection');
forbidMatch(auth,/LOC_STATE_URL|LOC_WRITE_TOKEN|management\/state/,'auth worker: retired KV state proxy must not return');
forbidMatch(client,/managementStateWrite|management\/state/,'browser auth client: retired state writes must not return');
if(fs.existsSync('services/cloudflare/loc-state-worker.js'))failures.push('retired KV state worker must remain removed');
if(fs.existsSync('wrangler.toml'))failures.push('root KV Worker deployment config must remain removed');

if(failures.length){
  console.error('[auth-boundary] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[auth-boundary] management auth is isolated; shared data runtime is Neon-only');
