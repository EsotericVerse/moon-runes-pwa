import fs from 'node:fs';

const data=fs.readFileSync('app/loc/data.js','utf8');
const client=fs.readFileSync('app/loc/neon-client.js','utf8');
const userStorage=fs.readFileSync('app/loc/neon-user-storage.js','utf8');
const migration=fs.readFileSync('app/loc/neon-legacy-migration.js','utf8');
const failures=[];

const requireMatch=(text,re,label)=>{if(!re.test(text))failures.push(label);};

requireMatch(data,/runtime_json_documents/,'shared runtime data must use Neon Current projection');
requireMatch(client,/@neondatabase\/neon-js/,'Neon JS client dependency is required');
requireMatch(client,/signIn\.social/,'Neon Google OAuth sign-in is required');
requireMatch(client,/getSession/,'Neon session lookup is required');
requireMatch(userStorage,/user_records/,'Neon user record persistence is required');
requireMatch(userStorage,/user_settings/,'Neon user settings persistence is required');
requireMatch(migration,/loc-local-records/,'legacy IndexedDB migration must remain until browser migration is complete');

for(const retired of [
  'app/loc/auth-client.js',
  'app/loc/local-db.js',
  'app/loc/google-drive.js',
  'app/loc/storage.js',
  'services/cloudflare/auth-worker.js',
  'services/cloudflare/wrangler.auth.jsonc',
  'services/cloudflare/loc-state-worker.js',
  'wrangler.toml'
]){
  if(fs.existsSync(retired))failures.push(`retired persistence/auth path must remain removed: ${retired}`);
}

if(failures.length){
  console.error('[auth-boundary] violations:\n'+failures.join('\n'));
  process.exit(1);
}
console.log('[auth-boundary] Neon Auth + Data API + RLS application boundary verified');
