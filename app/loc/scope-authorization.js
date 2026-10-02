import {z} from 'zod';

const EmailSchema=z.string().trim().toLowerCase().email();
const ManageRoleSchema=z.enum(['admin','scope']);

function normalizeScopeId(value){
  return String(value||'').trim();
}

export function normalizeAuthEmail(value){
  const parsed=EmailSchema.safeParse(String(value||'').trim().toLowerCase());
  return parsed.success?parsed.data:'';
}

function normalizeManageRole(value){
  const parsed=ManageRoleSchema.safeParse(String(value||'').trim());
  return parsed.success?parsed.data:'';
}

function normalizePermissionRows(email,rows=[]){
  return (Array.isArray(rows)?rows:[]).flatMap(row=>{
    const rowEmail=normalizeAuthEmail(row?.email);
    const role=normalizeManageRole(row?.role);
    const id=normalizeScopeId(row?.id);
    if(!email||rowEmail!==email||!role||!id)return [];
    return [{id,email:rowEmail,role}];
  });
}

export function createScopeAuthorizer(user,permissionRows=[]){
  const email=normalizeAuthEmail(user?.email);
  const permissions=normalizePermissionRows(email,permissionRows);
  const admin=permissions.some(row=>row.role==='admin');
  const scopes=new Set(permissions.filter(row=>row.role==='scope').map(row=>row.id));
  return Object.freeze({
    email,
    role:admin?'admin':(scopes.size?'scope':''),
    scopeIds:Object.freeze([...scopes].sort()),
    canManageGlobalSync:()=>admin,
    canManageScopeSync:scopeId=>admin||scopes.has(normalizeScopeId(scopeId))
  });
}
