import {neon} from '@neondatabase/serverless';

export function neonServerRequest(){
  const databaseUrl=String(process.env.DATABASE_URL||'').trim();
  if(!databaseUrl)throw Object.assign(new Error('Neon server connection is not configured'),{code:'NEON_NOT_CONFIGURED'});
  const db=neon(databaseUrl);
  return {db};
}

export async function withNeonTransaction(db,statements){
  if(!Array.isArray(statements)||!statements.length)throw new TypeError('Neon transaction requires statements');
  return db.transaction(statements);
}
