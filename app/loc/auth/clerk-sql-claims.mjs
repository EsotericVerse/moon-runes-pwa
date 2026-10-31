// Only signed, verified Clerk identity claims may be promoted to SQL RLS.
// The JWT signature/expiry/issuer are checked by the trusted Edge runtime
// BEFORE this pure validator runs. Never trust a decoded, unsigned payload.
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function clerkSqlClaims(payload,{issuer,origin}={}){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||
    payload.iss!==issuer||payload.azp!==origin||
    !/^user_[A-Za-z0-9]+$/.test(String(payload.sub||''))||
    !/^sess_[A-Za-z0-9]+$/.test(String(payload.sid||'')))
    throw new Error('Clerk session identity invalid');
  const email=String(payload.email||'').trim().toLowerCase();
  if(payload.email_verified!==true||!EMAIL.test(email))
    throw new Error('Verified Clerk email claim is required for LOC editing');
  return Object.freeze({
    role:'authenticated',sub:payload.sub,email,
    iss:payload.iss,sid:payload.sid,provider:'clerk'
  });
}
