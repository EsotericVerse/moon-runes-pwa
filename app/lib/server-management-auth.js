import { headers } from 'next/headers';

function authBaseUrl(){
  return String(process.env.NEXT_PUBLIC_LOC_AUTH_URL || '').trim().replace(/\/+$/,'');
}

export async function getServerManagementSession(){
  const baseURL = authBaseUrl();
  if(!baseURL) return null;

  const incoming = await headers();
  const cookie = incoming.get('cookie') || '';
  const response = await fetch(`${baseURL}/management/session`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...(cookie ? { cookie } : {})
    },
    cache: 'no-store'
  }).catch(()=>null);

  if(!response?.ok) return null;
  const data = await response.json().catch(()=>null);
  return data?.authorized && data?.role === 'admin' ? data : null;
}

export function hasServerManagementPermission(session, permission){
  if(!session?.authorized) return false;
  const permissions = Array.isArray(session.permissions) ? session.permissions : [];
  return permissions.includes('platform:admin') || permissions.includes(String(permission || ''));
}
