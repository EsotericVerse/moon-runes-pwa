import { betterAuth } from 'better-auth';

const SESSION_TTL_SECONDS = 60 * 60 * 2;
const AUTH_PATH = '/api/auth';
const BUILD = '2026-09-14-better-auth-google-v2';

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
    'access-control-allow-methods': 'GET,POST,OPTIONS',
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
      return json({ ok: true, service: 'loc-auth', provider: 'google', session_ttl_seconds: SESSION_TTL_SECONDS, build: BUILD }, { headers: cors });
    }

    if (url.pathname === '/management/session') {
      const auth = createAuth(env);
      const session = await auth.api.getSession({ headers: request.headers });
      const email = String(session?.user?.email || '').trim().toLowerCase();
      const allowed = Boolean(email && adminEmailSet(env).has(email));
      return json({
        ok: allowed,
        authenticated: Boolean(session),
        authorized: allowed,
        user: allowed ? { name: session.user.name || '', email: session.user.email || '' } : null,
        session_expires_at: allowed ? session.session?.expiresAt || null : null,
        build: BUILD
      }, { status: allowed ? 200 : 401, headers: cors });
    }

    if (url.pathname === AUTH_PATH || url.pathname.startsWith(`${AUTH_PATH}/`)) {
      const auth = createAuth(env);
      return withCors(await auth.handler(request), request, env);
    }

    return json({ ok: false, error: 'not_found', build: BUILD }, { status: 404, headers: cors });
  }
};
