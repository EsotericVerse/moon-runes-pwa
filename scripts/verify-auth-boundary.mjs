import fs from 'node:fs';

const data=fs.readFileSync('app/loc/data.js','utf8');
const client=fs.readFileSync('app/loc/neon-client.js','utf8');
const userStorage=fs.readFileSync('app/loc/neon-user-storage.js','utf8');
const migration=fs.readFileSync('app/loc/neon-legacy-migration.js','utf8');
const failures=[];

const requireMatch=(text,re,label)=>{if(!re.test(text))failures.push(label);};

requireMatch(data,/api\/loc\/data/,'shared runtime data must use the Neon canonical route');
requireMatch(data,/cache:'no-store'/,'shared runtime requests must not use browser response cache');
requireMatch(client,/@neondatabase\/neon-js/,'Neon Managed Auth client dependency is required');
requireMatch(client,/signIn\.social/,'Neon Google OAuth sign-in is required');
requireMatch(client,/getSession/,'Neon session lookup is required');
requireMatch(userStorage,/user_records/,'Neon user record persistence is required');
requireMatch(userStorage,/user_settings/,'Neon user settings persistence is required');
requireMatch(migration,/loc-local-records/,'legacy browser migration must remain explicit until migration is complete');

for(const retired of [
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
console.log('[auth-boundary] Neon Auth + canonical route + user storage boundary verified');
