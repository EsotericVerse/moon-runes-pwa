import {loadLocClerk} from '../auth/clerk-browser.mjs';
// LOC Authority validates this signed Clerk session again on every request.
// Legacy SQL/email management access is not required for independent Scopes.
export async function mcpClerkSession({load=loadLocClerk}={}){
  const clerk=await load();
  const subject=clerk?.user?.id;
  const token=await clerk?.session?.getToken?.();
  if(!/^user_[A-Za-z0-9]+$/.test(String(subject||''))||
    typeof token!=='string'||!token)throw new Error('Clerk login required');
  return {token,subject};
}
