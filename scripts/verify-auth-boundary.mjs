import fs from 'node:fs';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const files={
  client:'app/loc/neon-client.js',
  account:'app/loc/use-neon-account.js',
  authorization:'app/loc/scope-authorization.js',
  userStorage:'app/loc/neon-user-storage.js',
  scopeManagement:'app/loc/GovernanceManagement.jsx',
  adminManagement:'app/loc/views/AdminHomeView.jsx',
  managementData:'app/loc/ManagementDataPanel.jsx',
  search:'app/modular-v2/features/SearchV2.jsx',
  culture:'app/modular-v2/features/CultureV2.jsx'
};
for(const path of Object.values(files))if(!fs.existsSync(path))failures.push('missing Current auth/data contract file: '+path);
if(!failures.length){
  const client=read(files.client);
  for(const token of ['getNeonPublicToken','SupabaseAuthAdapter','signInWithOAuth','getSession'])if(!client.includes(token))failures.push('Neon client missing '+token);
  const account=read(files.account);
  for(const token of ["neonAuthRelation('silver.manage')","select('id,email,role')",'email:authorizer.email','role:authorizer.role'])if(!account.includes(token))failures.push('account authorization missing '+token);
  const authorization=read(files.authorization);
  for(const token of ["z.enum(['admin','scope'])",'permissionRows','scopes.has(normalizeScopeId(scopeId))'])if(!authorization.includes(token))failures.push('scope authorization missing '+token);
  const storage=read(files.userStorage);
  for(const token of ["apiRelation('user_records')","apiRelation('user_settings')","onConflict:'owner_id,id'","onConflict:'owner_id,setting_key'"])if(!storage.includes(token))failures.push('user storage missing '+token);
  if(!read(files.scopeManagement).includes('account.canManageScopeSync(scopeId)'))failures.push('Scope management role gate missing');
  if(!read(files.adminManagement).includes('account.canManageGlobalSync()'))failures.push('Admin management role gate missing');
  const managementData=read(files.managementData);
  for(const token of ['resolveScopeTables(scopeId','uid,title,source_name,createtime,UpdateTime,searchable'])if(!managementData.includes(token))failures.push('Management data contract missing '+token);
  for(const path of [files.search,files.culture])if(!read(path).includes('UpdateTime:new Date().toISOString()'))failures.push(path+' must refresh Galaxy UpdateTime');
}
if(failures.length){
  console.error('[auth-boundary] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[auth-boundary] Current Neon public/authenticated boundary and management authorization verified');
