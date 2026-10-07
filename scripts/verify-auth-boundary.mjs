import fs from 'node:fs';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const files={
  client:'app/loc/db-client.mjs',
  account:'app/loc/use-account.js',
  userStorage:'app/loc/user-storage.js',
  scopeManagement:'app/loc/GovernanceManagement.jsx',
  adminManagement:'app/loc/views/AdminHomeView.jsx',
  managementData:'app/loc/ManagementDataPanel.jsx',
  search:'app/modular/features/Search.jsx',
  culture:'app/modular/features/Culture.jsx'
};
for(const path of Object.values(files))if(!fs.existsSync(path))failures.push('missing Current auth/data contract file: '+path);
if(!failures.length){
  const client=read('app/loc/db-contract.mjs');
  for(const token of ['createDatabaseClient','signInWithOtp','getSession'])if(!client.includes(token))failures.push('DB/auth boundary missing '+token);
  const adapter=read('app/loc/providers/supabase.mjs');
  for(const token of ['createClient','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','persistSession:true'])if(!adapter.includes(token))failures.push('Supabase adapter missing '+token);
  if(!read('app/loc/providers/configured.mjs').includes("||'supabase'"))failures.push('Supabase must be the default database provider');
  const account=read(files.account);
  for(const token of ["dbAuthRelation('silver.manage')","select('id,email,role,galaxy,time,birthday')",'scopeDataFromManageRows','defaultScopeData','email:authorizer.email','role:authorizer.role'])if(!account.includes(token))failures.push('account authorization missing '+token);
  for(const token of ["z.enum(['admin','scope'])",'permissionRows','scopes.has(normalizeScopeId(scopeId))','canManageGlobalSync()?defaultScopeData'])if(!account.includes(token))failures.push('account authorization missing '+token);
  const storage=read(files.userStorage);
  for(const token of ["apiRelation('user_records')","apiRelation('user_settings')","onConflict:'owner_id,id'","onConflict:'owner_id,setting_key'"])if(!storage.includes(token))failures.push('user storage missing '+token);
  if(!read(files.scopeManagement).includes('account.canManageScopeSync(scopeId)'))failures.push('Scope management role gate missing');
  if(!read(files.adminManagement).includes('account.canManageGlobalSync()'))failures.push('Admin management role gate missing');
  const managementData=read(files.managementData);
  for(const token of ['account.scopeDataFor(scopeId)','uid,title,source_name,createtime,UpdateTime,searchable'])if(!managementData.includes(token))failures.push('Management data contract missing '+token);
  for(const path of [files.search,files.culture])if(!read(path).includes('UpdateTime:new Date().toISOString()'))failures.push(path+' must refresh Galaxy UpdateTime');
}
if(failures.length){
  console.error('[auth-boundary] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[auth-boundary] Current DB public/authenticated boundary and management authorization verified');
