// DB location is resolved once from repo config, never by a database RPC.
// Preserve the async entry point used by the read and write transports.
import {resolveDatabaseRouting} from './routing-config.mjs';
const route=resolveDatabaseRouting();
export async function selectedDatabaseRouting(){
  return route;
}
