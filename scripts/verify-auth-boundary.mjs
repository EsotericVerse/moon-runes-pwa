import fs from 'node:fs';

const auth=fs.readFileSync('services/cloudflare/auth-worker.js','utf8');
const state=fs.readFileSync('services/cloudflare/loc-state-worker.js','utf8');
const client=fs.readFileSync('app/loc/management-auth.js','utf8');
const failures=[];

const requireMatch=(text,re,label)=>{if(!re.test(text))failures.push(label);};

requireMatch(auth,/SESSION_TTL_SECONDS\s*=\s*60\s*\*\s*60\s*\*\s*2/,'auth worker: management session TTL must remain 2 hours');
requireMatch(auth,/disableSessionRefresh\s*:\s*true/,'auth worker: sliding session refresh must remain disabled');
requireMatch(auth,/socialProviders\s*:\s*\{[\s\S]*google\s*:/,'auth worker: Google OAuth provider is required');
requireMatch(auth,/requireEmailVerification\s*:\s*true/,'auth worker: Google email verification is required');
requireMatch(auth,/LOC_ADMIN_EMAILS/,'auth worker: Owner\/Admin allowlist must remain server-side');
requireMatch(auth,/auth\.api\.getSession\s*\(/,'auth worker: management session must be validated server-side');
requireMatch(auth,/authorized\s*:\s*allowed/,'auth worker: management session endpoint must return explicit authorization state');

for(const route of ['eras','daily-runes','context']){
  const block=new RegExp(`path === ['\"]\\/${route}['\"][\\s\\S]*?authorized\\(request, env\\)`,`m`);
  requireMatch(state,block,`state worker: \/${route} mutations must retain authorization guard`);
}
requireMatch(state,/LOC_WRITE_TOKEN/,'state worker: break-glass write credential support must remain server-side');

requireMatch(client,/credentials\s*:\s*['\"]include['\"]/,'browser auth client: management requests must include HttpOnly session credentials');
requireMatch(client,/management\/session/,'browser auth client: management session status endpoint required');

if(failures.length){
  console.error('[auth-boundary] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[auth-boundary] Google OAuth, fixed session, admin allowlist and write guards verified');
