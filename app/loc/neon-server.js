import {neon} from '@neondatabase/serverless';
import {createScopeAuthorizer} from './scope-authorization';

export function neonServerRequest(){
  const databaseUrl=String(process.env.DATABASE_URL||'').trim();
  if(!databaseUrl)throw Object.assign(new Error('Neon server connection is not configured'),{code:'NEON_NOT_CONFIGURED'});
  const db=neon(databaseUrl);
  return {db};
}

export async function readScopeAuthorizer(db,email){
  const verifiedEmail=String(email||'').trim();
  if(!verifiedEmail)return createScopeAuthorizer([]);
  const rows=await db`
    select user_id,email,privileges
      from silver.manage
     where record_type='permission' and email=${verifiedEmail}
     limit 1
  `;
  return createScopeAuthorizer(rows);
}

export async function withNeonTransaction(db,statements){
  if(!Array.isArray(statements)||!statements.length)throw new TypeError('Neon transaction requires statements');
  return db.transaction(statements);
}
