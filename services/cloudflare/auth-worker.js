import { betterAuth } from 'better-auth';

const SESSION_TTL_SECONDS = 60 * 60 * 2;
const AUTH_PATH = '/api/auth';
const MANAGEMENT_STATE_PATH = '/management/state';
const MANAGEMENT_SEMANTIC_PATH = '/management/semantic/analyze';
const MANAGEMENT_NEON_STATUS_PATH = '/management/neon/status';
const BUILD = '2026-09-17-layered-management-v2';

const ADMIN_PERMISSIONS = Object.freeze([
  'platform:admin',
  'platform:routes:write',
  'platform:visibility:write',
  'platform:projection:rebuild',
  'platform:neon:read',
  'platform:semantic:run',
  'scope:period:write',
  'scope:lunarunes:write',
  'scope:context:write'
]);

const STATE_PATH_PERMISSION = Object.freeze({
  '/aliases': 'platform:routes:write',
  '/visibility': 'platform:visibility:write',
  '/projection-rebuild': 'platform:projection:rebuild',
  '/eras': 'scope:period:write',
  '/daily-runes': 'scope:lunarunes:write',
  '/context': 'scope:context:write'
});

// Frozen Rune Canon is immutable by governance. Admin is not a bypass.
const FROZEN_STATE_PATHS = new Set([
  '/runes',
  '/rune',
  '/canon',
  '/rune-canon',
  '/lunarunes-core',
  '/runes66',
  '/base66'
]);

function splitList(value = '') {
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function emailSet(value = '') {
  return new Set(splitList(value).map(email => email.toLowerCase()));
}

function adminEmailSet(env) {
  return emailSet(env.LOC_ADMIN_EMAILS);
}

function editorEmailSets(env) {
  return {
    period: emailSet(env.LOC_PERIOD_EDITOR_EMAILS),
    context: emailSet(env.LOC_CONTEXT_EDITOR_EMAILS),
    semantic: emailSet(env.LOC_SEMANTIC_EDITOR_EMAILS)
  };
}

function managementEmailSet(env) {
  const emails = new Set(adminEmailSet(env));
  const editors = editorEmailSets(env);
  for (const set of Object.values(editors)) for (const email of set) emails.add(email);
  return emails;
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
  const allowed = managementEmailSet(env);
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
        if (!email || !allowed.has(email)) {
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

function actorForEmail(email, env) {
  if (!email) return null;
  if (adminEmailSet(env).has(email)) {
    return { role: 'admin', permissions: [...ADMIN_PERMISSIONS] };
  }

  const editors = editorEmailSets(env);
  const permissions = [];
  if (editors.period.has(email)) permissions.push('scope:period:write');
  if (editors.context.has(email)) permissions.push('scope:context:write');
  if (editors.semantic.has(email)) permissions.push('platform:semantic:run');
  if (!permissions.length) return null;
  return { role: 'scope-editor', permissions };
}

async function getManagementSession(request, env) {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });
  const email = String(session?.user?.email || '').trim().toLowerCase();
  const actor = actorForEmail(email, env);
  return {
    session,
    authorized: Boolean(session && actor),
    actor
  };
}

function hasPermission(actor, permission) {
  return Boolean(actor?.permissions?.includes('platform:admin') || actor?.permissions?.includes(permission));
}

function stateProxyConfig(env) {
  return {
    baseURL: String(env.LOC_STATE_URL || '').trim().replace(/\/+$/, ''),
    writeToken: String(env.LOC_WRITE_TOKEN || '').trim()
  };
}

async function requireActor(request, env, permission) {
  const { session, authorized, actor } = await getManagementSession(request, env);
  if (!session || !authorized || !actor) return { error: 'management_access_denied', status: 401, actor: null };
  if (permission && !hasPermission(actor, permission)) {
    return { error: 'management_permission_denied', status: 403, required_permission: permission, actor };
  }
  return { session, actor };
}

async function proxyManagedState(request, env, url) {
  const suffix = url.pathname.slice(MANAGEMENT_STATE_PATH.length) || '/';
  if (FROZEN_STATE_PATHS.has(suffix)) {
    return json({
      ok: false,
      error: 'frozen_rune_canon_read_only',
      resource: suffix,
      build: BUILD
    }, { status: 403, headers: corsHeaders(request, env) });
  }

  const requiredPermission = STATE_PATH_PERMISSION[suffix];
  if (!requiredPermission) {
    return json({ ok: false, error: 'state_path_not_allowed', build: BUILD }, { status: 404, headers: corsHeaders(request, env) });
  }
  const gate = await requireActor(request, env, requiredPermission);
  if (gate.error) {
    return json({ ok: false, error: gate.error, required_permission: gate.required_permission || requiredPermission, build: BUILD }, { status: gate.status, headers: corsHeaders(request, env) });
  }

  const { baseURL, writeToken } = stateProxyConfig(env);
  if (!baseURL || !writeToken) {
    return json({ ok: false, error: 'state_proxy_not_configured', build: BUILD }, { status: 503, headers: corsHeaders(request, env) });
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) {
    return json({ ok: false, error: 'method_not_allowed', build: BUILD }, { status: 405, headers: corsHeaders(request, env) });
  }

  const target = new URL(`${baseURL}${suffix}`);
  target.search = url.search;
  const headers = new Headers();
  headers.set('authorization', `Bearer ${writeToken}`);
  headers.set('x-loc-management-role', gate.actor.role);
  headers.set('x-loc-management-permission', requiredPermission);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual'
  });
  return withCors(response, request, env);
}

async function proxySemanticAnalysis(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed', build: BUILD }, { status: 405, headers: corsHeaders(request, env) });
  const gate = await requireActor(request, env, 'platform:semantic:run');
  if (gate.error) return json({ ok: false, error: gate.error, required_permission: 'platform:semantic:run', build: BUILD }, { status: gate.status, headers: corsHeaders(request, env) });

  const endpoint = String(env.LOC_SEMANTIC_API_URL || '').trim();
  if (!endpoint) return json({ ok: false, error: 'semantic_api_not_configured', configured: false, build: BUILD }, { status: 503, headers: corsHeaders(request, env) });

  const input = await request.json().catch(() => ({}));
  const body = {
    ...input,
    task: input.task || 'keyword_validation',
    canon_write: false,
    governance_mode: 'observer_only'
  };
  const headers = new Headers({ accept: 'application/json', 'content-type': 'application/json' });
  const token = String(env.LOC_SEMANTIC_API_TOKEN || '').trim();
  if (token) headers.set('authorization', `Bearer ${token}`);

  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body), redirect: 'manual' });
  const data = await response.json().catch(() => ({}));
  return json({
    ok: response.ok && data?.ok !== false,
    configured: true,
    observer_only: true,
    result: data,
    build: BUILD
  }, { status: response.ok ? 200 : response.status, headers: corsHeaders(request, env) });
}

async function neonGovernanceStatus(request, env) {
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed', build: BUILD }, { status: 405, headers: corsHeaders(request, env) });
  const gate = await requireActor(request, env, 'platform:neon:read');
  if (gate.error) return json({ ok: false, error: gate.error, required_permission: 'platform:neon:read', build: BUILD }, { status: gate.status, headers: corsHeaders(request, env) });

  const baseURL = String(env.LOC_NEON_GOVERNANCE_URL || '').trim().replace(/\/+$/, '');
  const projectId = String(env.LOC_NEON_PROJECT_ID || '').trim();
  if (!baseURL) {
    return json({
      ok: true,
      configured: false,
      project_id: projectId || null,
      migration_state: 'not_started',
      note: 'Governance adapter is ready; data migration is intentionally deferred.',
      build: BUILD
    }, { headers: corsHeaders(request, env) });
  }

  const headers = new Headers({ accept: 'application/json' });
  const token = String(env.LOC_NEON_GOVERNANCE_TOKEN || '').trim();
  if (token) headers.set('authorization', `Bearer ${token}`);
  let health = null;
  let reachable = false;
  try {
    const response = await fetch(`${baseURL}/health`, { method: 'GET', headers, redirect: 'manual' });
    reachable = response.ok;
    health = await response.json().catch(() => ({ status: response.status }));
  } catch (error) {
    health = { error: String(error?.message || error) };
  }

  return json({
    ok: true,
    configured: true,
    reachable,
    project_id: projectId || null,
    migration_state: 'not_started',
    health,
    build: BUILD
  }, { headers: corsHeaders(request, env) });
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
        management_model: 'rbac+scope+data-state',
        frozen_rune_canon: true,
        semantic_api_configured: Boolean(String(env.LOC_SEMANTIC_API_URL || '').trim()),
        neon_governance_configured: Boolean(String(env.LOC_NEON_GOVERNANCE_URL || '').trim()),
        build: BUILD
      }, { headers: cors });
    }

    if (url.pathname === '/management/session') {
      const { session, authorized, actor } = await getManagementSession(request, env);
      const allowed = authorized;
      return json({
        ok: allowed,
        authenticated: Boolean(session),
        authorized: allowed,
        role: actor?.role || null,
        permissions: actor?.permissions || [],
        user: allowed ? { name: session.user.name || '', email: session.user.email || '' } : null,
        session_expires_at: allowed ? session.session?.expiresAt || null : null,
        build: BUILD
      }, { status: allowed ? 200 : 401, headers: cors });
    }

    if (url.pathname === MANAGEMENT_SEMANTIC_PATH) return proxySemanticAnalysis(request, env);
    if (url.pathname === MANAGEMENT_NEON_STATUS_PATH) return neonGovernanceStatus(request, env);

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
