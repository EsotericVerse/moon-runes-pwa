// Clerk exclusively owns LOC interactive identity. Existing Supabase reads
// remain available; private edits use the Clerk-verified SQL RPC/RLS path.
// The device-only local SQLite scope is composed separately in db-client.mjs.
import {createClerkGatewayAdapter} from './clerk-gateway.mjs';

export function createConfiguredAdapter(){
  return createClerkGatewayAdapter();
}
