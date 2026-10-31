// Only signed, verified Clerk identity claims may be promoted to SQL RLS.
// The JWT signature/expiry/issuer are checked by the trusted Edge runtime
// BEFORE this pure validator runs. Never trust a decoded, unsigned payload.
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function clerkSqlClaims(payload,{issuer,origin,trustedEmail=''}={}){
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||
    payload.iss!==issuer||
    (payload.azp!=null&&payload.azp!==''&&payload.azp!==origin)||
    !/^user_[A-Za-z0-9]+$/.test(String(payload.sub||''))||
    !/^sess_[A-Za-z0-9]+$/.test(String(payload.sid||'')))
    throw new Error('Clerk session identity invalid');
  // The fallback is supplied ONLY by the trusted server after it has called
  // LOC Authority and compared the verified Clerk sub/sid. Never read it from
  // request parameters, local storage or an unsigned JWT claim.
  const signedEmail=String(payload.email||'').trim().toLowerCase();
  const email=payload.email_verified===true&&EMAIL.test(signedEmail)
    ?signedEmail:String(trustedEmail||'').trim().toLowerCase();
  if(!EMAIL.test(email))
    throw new Error('Verified Clerk email claim or trusted root mapping is required for LOC editing');
  return Object.freeze({
    role:'authenticated',sub:payload.sub,email,
    iss:payload.iss,sid:payload.sid,provider:'clerk'
  });
}
