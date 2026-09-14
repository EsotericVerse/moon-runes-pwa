import { betterAuth } from 'better-auth';

const SESSION_TTL_SECONDS = 60 * 60 * 2;
const AUTH_PATH = '/api/auth';
const MANAGEMENT_STATE_PATH = '/management/state';
const BUILD = '2026-09-14-better-auth-google-v3';

function splitList(value = '') {
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function adminEmailSet(env) {
  return new Set(splitList(env.LOC_ADMIN_EMAILS).map(email => email.toLowerCase()));
}

function requiredEnv(env) {
  return ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'LOC_ADMIN_EMAILS']
    .filter(key => !String(env[key] || '').trim());
}

function trustedOrigins(env) {
  const origins = splitList(env.PUBLIC_ORIGINS || env.PUBLIC_ORIGIN || 'https://loc.lo3rwang.cc');
  try {
    origins.push(new URL(env.BETTER_AUTH_URL).origin);
  } catch {}
  return [...new Set(origins)];
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = trustedOrigins(env);
  const selected = allowed.includes(origin) ? origin : allowed[0] || 'https://loc.lo3rwang.cc';
  return {
    'access-control-allow-origin': selected,
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-allow-credentials': 'true',
    'vary': 'Origin'
  };
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {})
    }
  });
}

function createAuth(env) {
  const admins = adminEmailSet(env);
  const cookieDomain = String(env.AUTH_COOKIE_DOMAIN || '').trim();

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_PATH,
    trustedOrigins: trustedOrigins(env),
    telemetry: { enabled: false },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        requireEmailVerification: true
      }
    },
    user: {
      validateUserInfo: ({ user, source }) => {
        if (source.oauth?.providerId !== 'google') {
          return {
            error: 'provider_not_allowed',
            errorDescription: 'Google OAuth is required for LOC management.'
          };
        }
        const email = String(user?.email || '').trim().toLowerCase();
        if (!email || !admins.has(email)) {
          return {
            error: 'management_access_denied',
            errorDescription: 'This Google account is not authorized for LOC management.'
          };
        }
      }
    },
    session: {
      expiresIn: SESSION_TTL_SECONDS,
      disableSessionRefresh: true,
      cookieCache: {
        enabled: true,
        maxAge: SESSION_TTL_SECONDS,
        strategy: 'jwe',
        refreshCache: false
      }
    },
    account: {
      storeStateStrategy: 'cookie',
      storeAccountCookie: true
    },
    advanced: {
      useSecureCookies: true,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      },
      ...(cookieDomain ? {
        crossSubDomainCookies: {
          enabled: true,
          domain: cookieDomain
        }
      } : {})
    }
  });
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) headers.set(key, value);
  headers.set('cache-control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function getManagementSession(request, env) {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });
  const email = String(session?.user?.email || '').trim().toLowerCase();
  const authorized = Boolean(email && adminEmailSet(env).has(email));
  return { session, authorized };
}

function stateProxyConfig(env) {
  return {
    baseURL: String(env.LOC_STATE_URL || '').trim().replace(/\/+$/, ''),
    writeToken: String(env.LOC_WRITE_TOKEN || '').trim()
  };
}

async function proxyManagedState(request, env, url) {
  const { session, authorized } = await getManagementSession(request, env);
  if (!session || !authorized) {
    return json({ ok: false, error: 'management_access_denied', build: BUILD }, { status: 401, headers: corsHeaders(request, env) });
  }

  const { baseURL, writeToken } = stateProxyConfig(env);
  if (!baseURL || !writeToken) {
    return json({ ok: false, error: 'state_proxy_not_configured', build: BUILD }, { status: 503, headers: corsHeaders(request, env) });
  }

  const suffix = url.pathname.slice(MANAGEMENT_STATE_PATH.length) || '/';
  if (!['/eras', '/daily-runes', '/context'].some(path => suffix === path || suffix.startsWith(`${path}?`))) {
    return json({ ok: false, error: 'state_path_not_allowed', build: BUILD }, { status: 404, headers: corsHeaders(request, env) });
  }

  if (!['POST', 'PUT', 'DELETE'].includes(request.method)) {
    return json({ ok: false, error: 'method_not_allowed', build: BUILD }, { status: 405, headers: corsHeaders(request, env) });
  }

  const target = new URL(`${baseURL}${suffix}`);
  target.search = url.search;
  const headers = new Headers();
  headers.set('authorization', `Bearer ${writeToken}`);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'DELETE' ? request.body : request.body,
    redirect: 'manual'
  });
  return withCors(response, request, env);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const missing = requiredEnv(env);
    if (missing.length) {
      return json({ ok: false, error: 'auth_not_configured', missing, build: BUILD }, { status: 503, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      const stateProxy = stateProxyConfig(env);
      return json({
        ok: true,
        service: 'loc-auth',
        provider: 'google',
        session_ttl_seconds: SESSION_TTL_SECONDS,
        management_state_proxy: Boolean(stateProxy.baseURL && stateProxy.writeToken),
        build: BUILD
      }, { headers: cors });
    }

    if (url.pathname === '/management/session') {
      const { session, authorized } = await getManagementSession(request, env);
      return json({
        ok: authorized,
        authenticated: Boolean(session),
        authorized,
        user: authorized ? { name: session.user.name || '', email: session.user.email || '' } : null,
        session_expires_at: authorized ? session.session?.expiresAt || null : null,
        build: BUILD
      }, { status: authorized ? 200 : 401, headers: cors });
    }

    if (url.pathname === MANAGEMENT_STATE_PATH || url.pathname.startsWith(`${MANAGEMENT_STATE_PATH}/`)) {
      return proxyManagedState(request, env, url);
    }

    if (url.pathname === AUTH_PATH || url.pathname.startsWith(`${AUTH_PATH}/`)) {
      const auth = createAuth(env);
      return withCors(await auth.handler(request), request, env);
    }

    return json({ ok: false, error: 'not_found', build: BUILD }, { status: 404, headers: cors });
  }
};
