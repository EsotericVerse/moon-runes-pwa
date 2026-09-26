import {neon} from '@neondatabase/serverless';
import {z} from 'zod';
import {createScopeAuthorizer} from './scope-authorization';

const TokenSchema=z.string().regex(/^Bearer\s+[^\s]+$/i);

export function neonServerRequest(request){
  const databaseUrl=String(process.env.DATABASE_URL||'').trim();
  if(!databaseUrl)throw Object.assign(new Error('Neon server connection is not configured'),{code:'NEON_NOT_CONFIGURED'});
  const header=request.headers.get('authorization')||'';
  const token=TokenSchema.safeParse(header);
  const db=token.success?neon(databaseUrl,{authToken:header.replace(/^Bearer\s+/i,'')}):neon(databaseUrl);
  return {db,authenticated:token.success};
}

export async function readScopeAuthorizer(db,userId){
  if(!userId)return createScopeAuthorizer('',[]);
  const grants=await db`
    select scope_id,access_level,case_id
      from silver.loc_scope
     where record_type='access_grant' and user_id=${userId}
  `;
  return createScopeAuthorizer(userId,grants);
}

export async function readNeonUserId(db){
  const rows=await db`select auth.user_id() as user_id`;
  return rows[0]?.user_id?String(rows[0].user_id):'';
}

export async function withNeonTransaction(db,statements){
  if(!Array.isArray(statements)||!statements.length)throw new TypeError('Neon transaction requires statements');
  return db.transaction(statements);
}
