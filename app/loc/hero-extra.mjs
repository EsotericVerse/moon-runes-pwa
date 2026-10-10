// Scope Hero Extra is an opt-in exception, not a generic Scope capability.
// LOC marks its canonical Group identity. Author/LunaRunes owner marks require
// an authenticated email matched to a scope-role row in silver.manage.
// This controls visual presentation only; it never grants a database permission.
const OWNER_EXTRA_SCOPES=new Set(['lo3rwang','lrunes']);
const normalizedEmail=value=>String(value||'').trim().toLowerCase();

export function mayRenderHeroExtra({scopeId='',scopeKind='',account=null}={}){
  const id=String(scopeId||'').trim().toLowerCase();
  if(id==='loc')return scopeKind==='group';
  if(!OWNER_EXTRA_SCOPES.has(id))return false;
  const sessionEmail=normalizedEmail(account?.user?.email);
  const manageEmail=normalizedEmail(account?.email);
  return Boolean(sessionEmail&&sessionEmail===manageEmail
    &&account?.authorizer?.scopeIds?.includes(id));
}
