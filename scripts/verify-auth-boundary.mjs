import fs from 'node:fs';

const failures=[];
const read=path=>fs.readFileSync(path,'utf8');
const files={
  client:'app/loc/db-client.mjs',
  account:'app/loc/use-account.js',
  userStorage:'app/loc/user-storage.js',
  scopeManagement:'app/loc/GovernanceManagement.jsx',
  adminManagement:'app/loc/views/AdminHomeView.jsx',
  scopeSettings:'app/loc/ScopeSettingsPanel.jsx',
  publisher:'app/loc/ManagementArticlePublisher.jsx',
  search:'app/modular/features/Search.jsx',
  culture:'app/modular/features/Culture.jsx'
};
for(const path of Object.values(files))if(!fs.existsSync(path))failures.push('missing Current auth/data contract file: '+path);
if(!failures.length){
  const client=read('app/loc/db-contract.mjs');
  for(const token of ['createDatabaseClient','signInWithOAuth','getSession'])if(!client.includes(token))failures.push('DB/auth boundary missing '+token);
  const adapter=read('app/loc/providers/supabase.mjs');
  for(const token of ['createClient','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','persistSession:true'])if(!adapter.includes(token))failures.push('Supabase adapter missing '+token);
  const edge=read('supabase/functions/loc-kysely/index.ts');
  for(const token of ['auth.getUser(token)','set local role authenticated','set local role anonymous','selectTargetAtomically'])
    if(!edge.includes(token))failures.push('Trusted auth boundary missing '+token);
  if(!read('app/loc/providers/configured.mjs').includes("primarySourceLabel:'Admin-selected'"))failures.push('LOC data must follow the Admin-selected database target');
  const account=read(files.account);
  for(const token of ["dbAuthRelation('silver.manage')","select('id,email,role,galaxy,time,birthday')",'scopeDataFromManageRows','defaultScopeData','email:authorizer.email','role:authorizer.role'])if(!account.includes(token))failures.push('account authorization missing '+token);
  for(const token of ["z.enum(['admin','scope'])",'permissionRows','scopes.has(normalizeScopeId(scopeId))','canManageGlobalSync()?defaultScopeData'])if(!account.includes(token))failures.push('account authorization missing '+token);
  const storage=read(files.userStorage);
  for(const token of ["apiRelation('user_records')","apiRelation('user_settings')","onConflict:'owner_id,id'","onConflict:'owner_id,setting_key'"])if(!storage.includes(token))failures.push('user storage missing '+token);
  // Governance retains a permission-filtered management selector; Settings
  // and each editing panel enforce their own Scope gate. Do not require the
  // retired redirect implementation, which is not an authorization boundary.
  const governance=read(files.scopeManagement);
  const settings=read('app/loc/GlobalSettings.jsx');
  const importer=read('app/loc/ManagementImportPanel.jsx');
  for(const token of ["account.canManageGlobalSync()",
    "account.canManageScopeSync('lrunes')",
    "account.canManageScopeSync('loc')",
    'account.canManageScopeSync(row.scope_id)',
    'if(!account.user)',
    '<ManagementArticlePublisher'])
    if(!governance.includes(token))failures.push('Governance authorization missing '+token);
  for(const token of ['account.canManageScopeSync(item.id)',
    '<ScopeSettingsPanel','<ManagementArticlePublisher',
    '<ManagementImportPanel'])
    if(!settings.includes(token))failures.push('Settings management gate missing '+token);
  if(!importer.includes('account.canManageScopeSync(scopeId)'))
    failures.push('Import panel missing Scope authorization');
  if(!read(files.adminManagement).includes('account.canManageGlobalSync()'))failures.push('Admin management role gate missing');
  const scopeSettings=read(files.scopeSettings);
  for(const token of ['account.canManageScopeSync(scopeId)','display_name','search_intro','search_aliases','updateRows'])if(!scopeSettings.includes(token))failures.push('Scope settings authorization missing '+token);
  const publisher=read(files.publisher);
  for(const token of ['account.canManageScopeSync(scopeId)','insertRows','source_name','searchable'])if(!publisher.includes(token))failures.push('Publisher authorization missing '+token);
  for(const path of [files.search,files.culture])if(!read(path).includes('UpdateTime:new Date().toISOString()'))failures.push(path+' must refresh Galaxy UpdateTime');
}
if(failures.length){
  console.error('[auth-boundary] failures:\n'+failures.map(item=>'- '+item).join('\n'));
  process.exit(1);
}
console.log('[auth-boundary] Current DB public/authenticated boundary and management authorization verified');
