import {z} from 'zod';

const EmailSchema=z.string().trim().toLowerCase().email();
const RoleSchema=z.string().trim().regex(/^(admin|scope:[A-Za-z][A-Za-z0-9_.-]{0,62})$/,'Invalid Neon Auth role');

export function normalizeScopeId(value){
  const id=String(value||'').trim();
  if(id==='lunarunes'||id==='runes')return 'lrunes';
  return id;
}

export function normalizeAuthEmail(value){
  const parsed=EmailSchema.safeParse(String(value||'').trim().toLowerCase());
  return parsed.success?parsed.data:'';
}

export function normalizeAuthRole(value){
  const raw=Array.isArray(value)?value:String(value||'').split(',');
  const roles=[...new Set(raw.map(item=>String(item||'').trim()).filter(Boolean))];
  if(roles.length!==1)return '';
  const parsed=RoleSchema.safeParse(roles[0]);
  return parsed.success?parsed.data:'';
}

export function canRoleManageGlobal(role){
  return normalizeAuthRole(role)==='admin';
}

export function canRoleManageScope(role,scopeId){
  const normalizedRole=normalizeAuthRole(role);
  const scope=normalizeScopeId(scopeId);
  return normalizedRole==='admin'||Boolean(scope&&normalizedRole===`scope:${scope}`);
}

export function createScopeAuthorizer(user){
  const email=normalizeAuthEmail(user?.email);
  const role=email?normalizeAuthRole(user?.role):'';
  return Object.freeze({
    email,
    role,
    canManageGlobal:async()=>canRoleManageGlobal(role),
    canManageScope:async scopeId=>canRoleManageScope(role,scopeId),
    canManageGlobalSync:()=>canRoleManageGlobal(role),
    canManageScopeSync:scopeId=>canRoleManageScope(role,scopeId)
  });
}
