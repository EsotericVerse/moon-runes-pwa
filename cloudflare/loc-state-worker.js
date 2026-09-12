const ERA_KEY = 'loc:era:registry';
const DAILY_PREFIX = 'loc:daily-rune:';
const DAILY_INDEX_KEY = 'loc:daily-rune:index';
const ADMIN_COOKIE = 'loc_admin';
const ADMIN_TTL = 60 * 60 * 8;

const json = (data, init = {}) => new Response(JSON.stringify(data), {
  ...init,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(init.headers || {})
  }
});

const normalizeEra = row => ({
  ...row,
  era_id: String(row?.era_id || (row?.period ? `ERA-${row.period}` : '')),
  period: String(row?.period || ''),
  name: String(row?.name || ''),
  display_label: String(row?.display_label || ''),
  start_date: String(row?.start_date || ''),
  end_date: row?.end_date ? String(row.end_date) : null,
  status: String(row?.status || 'released'),
  updated_at: new Date().toISOString()
});

const normalizeDaily = row => ({
  ...row,
  id: String(row?.id || crypto.randomUUID()),
  date: String(row?.date || ''),
  draw_kind: String(row?.draw_kind || 'daily_draw'),
  rune_id: String(row?.rune_id || ''),
  rune: String(row?.rune || ''),
  direction: String(row?.direction || ''),
  note: String(row?.note || ''),
  source: String(row?.source || 'kv'),
  confidence: String(row?.confidence || 'recorded'),
  updated_at: new Date().toISOString()
});

function dailyIdentity(row = {}) {
  return [
    String(row.date || ''),
    String(row.draw_kind || 'daily_draw'),
    String(row.rune || ''),
    String(row.direction || '')
  ].join('|');
}

function sortDaily(rows) {
  return rows.sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')) ||
    String(b.updated_at || '').localeCompare(String(a.updated_at || '')) ||
    String(b.id || '').localeCompare(String(a.id || ''))
  );
}

function mergeDaily(...groups) {
  const map = new Map();
  for (const group of groups) {
    for (const raw of Array.isArray(group) ? group : []) {
      const row = normalizeDaily(raw);
      if (!row.date || !row.rune) continue;
      const key = dailyIdentity(row);
      map.set(key, { ...(map.get(key) || {}), ...row });
    }
  }
  return sortDaily([...map.values()]);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.PUBLIC_ORIGIN || 'https://loc.lo3rwang.cc');
  return {
    'access-control-allow-origin': origin === allowed ? origin : allowed,
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-allow-credentials': 'true',
    'vary': 'Origin'
  };
}

function parseCookies(request) {
  const raw = request.headers.get('Cookie') || '';
  const out = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

async function adminSessionValue(env) {
  if (!env.LOC_WRITE_TOKEN) return '';
  const bytes = new TextEncoder().encode(`loc-state-admin:${env.LOC_WRITE_TOKEN}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function authorized(request, env) {
  if (!env.LOC_WRITE_TOKEN) return false;
  const auth = request.headers.get('Authorization') || '';
  if (auth === `Bearer ${env.LOC_WRITE_TOKEN}`) return true;
  const cookies = parseCookies(request);
  const expected = await adminSessionValue(env);
  return !!expected && cookies[ADMIN_COOKIE] === expected;
}

function adminHtml(loggedIn, message = '') {
  const note = message ? `<p>${message}</p>` : '';
  const body = loggedIn
    ? `<p>LOC KV 管理登入有效。</p><form method="post"><input type="hidden" name="action" value="logout"><button type="submit">登出</button></form>`
    : `<form method="post"><label>LOC_WRITE_TOKEN <input name="token" type="password" autocomplete="current-password" required></label><button type="submit">登入</button></form>`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOC KV Admin</title><main style="max-width:520px;margin:48px auto;font:16px/1.6 system-ui;padding:0 20px"><h1>LOC KV Admin</h1>${note}${body}</main>`;
}

async function handleAdmin(request, env) {
  const loggedIn = await authorized(request, env);
  if (request.method === 'GET') {
    return new Response(adminHtml(loggedIn), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const form = await request.formData();
  const action = String(form.get('action') || 'login');
  if (action === 'logout') {
    return new Response(adminHtml(false, '已登出。'), {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'set-cookie': `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/api/loc-state; Max-Age=0`
      }
    });
  }

  const token = String(form.get('token') || '');
  if (!env.LOC_WRITE_TOKEN || token !== env.LOC_WRITE_TOKEN) {
    return new Response(adminHtml(false, '登入失敗。'), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
  }

  const session = await adminSessionValue(env);
  return new Response(adminHtml(true, '登入成功。'), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'set-cookie': `${ADMIN_COOKIE}=${session}; HttpOnly; Secure; SameSite=Strict; Path=/api/loc-state; Max-Age=${ADMIN_TTL}`
    }
  });
}

async function readEras(env) {
  const data = await env.LOC_KV.get(ERA_KEY, 'json');
  return Array.isArray(data?.eras) ? data : { eras: [] };
}

async function writeEras(env, payload) {
  const eras = (payload?.eras || []).map(normalizeEra).filter(x => x.period);
  const body = {
    schema_version: 'kv-1',
    updated_at: new Date().toISOString(),
    eras
  };
  await env.LOC_KV.put(ERA_KEY, JSON.stringify(body));
  return body;
}

async function readDailyIndex(env) {
  const data = await env.LOC_KV.get(DAILY_INDEX_KEY, 'json');
  return Array.isArray(data?.daily_draws) ? data.daily_draws : [];
}

async function writeDailyIndex(env, rows) {
  const body = {
    schema_version: 'kv-1',
    updated_at: new Date().toISOString(),
    daily_draws: sortDaily(rows)
  };
  await env.LOC_KV.put(DAILY_INDEX_KEY, JSON.stringify(body));
  return body.daily_draws;
}

async function listDailyLegacy(env, limit = 400) {
  const rows = [];
  let cursor;
  do {
    const listed = await env.LOC_KV.list({ prefix: DAILY_PREFIX, limit: Math.min(1000, limit), cursor });
    for (const key of listed.keys) {
      if (key.name === DAILY_INDEX_KEY) continue;
      const value = await env.LOC_KV.get(key.name, 'json');
      if (value) rows.push(value);
      if (rows.length >= limit) break;
    }
    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor && rows.length < limit);
  return sortDaily(rows);
}

async function listDaily(env, limit = 400) {
  const indexed = await readDailyIndex(env);
  if (indexed.length) return sortDaily(indexed).slice(0, limit);
  return (await listDailyLegacy(env, limit)).slice(0, limit);
}

async function saveDaily(env, raw) {
  const row = normalizeDaily(raw);
  if (!row.date || !row.rune) throw new Error('date and rune are required');

  const current = await readDailyIndex(env);
  const merged = mergeDaily(current, [row]);
  await writeDailyIndex(env, merged);

  return merged.find(item => dailyIdentity(item) === dailyIdentity(row)) || row;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!env.LOC_KV) return json({ ok: false, error: 'LOC_KV binding missing' }, { status: 503, headers: cors });

    try {
      if (url.pathname === '/api/loc-state/admin') return handleAdmin(request, env);

      if (url.pathname === '/api/loc-state/health') {
        return json({ ok: true, service: 'loc-state', kv: true }, { headers: cors });
      }

      if (url.pathname === '/api/loc-state/eras') {
        if (request.method === 'GET') {
          const data = await readEras(env);
          return json({ ok: true, ...data }, { headers: cors });
        }
        if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, { status: 401, headers: cors });
        if (request.method === 'PUT') {
          const body = await request.json();
          const data = await writeEras(env, body);
          return json({ ok: true, ...data }, { headers: cors });
        }
        if (request.method === 'POST') {
          const body = await request.json();
          const existing = await readEras(env);
          const eras = [...existing.eras];
          if (body.action === 'delete') {
            const period = String(body.period || body.era?.period || '');
            return json({ ok: true, ...(await writeEras(env, { eras: eras.filter(x => String(x.period) !== period) })) }, { headers: cors });
          }
          const era = normalizeEra(body.era || body);
          const i = eras.findIndex(x => String(x.period) === era.period);
          if (i >= 0) eras[i] = { ...eras[i], ...era }; else eras.push(era);
          return json({ ok: true, ...(await writeEras(env, { eras })) }, { headers: cors });
        }
      }

      if (url.pathname === '/api/loc-state/daily-runes') {
        if (request.method === 'GET') {
          const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get('limit') || 400)));
          return json({ ok: true, daily_draws: await listDaily(env, limit) }, { headers: cors });
        }
        if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, { status: 401, headers: cors });
        if (request.method === 'POST') {
          const body = await request.json();
          const row = await saveDaily(env, body.daily_draw || body);
          return json({ ok: true, daily_draw: row }, { headers: cors });
        }
      }

      return json({ ok: false, error: 'not found' }, { status: 404, headers: cors });
    } catch (error) {
      return json({ ok: false, error: String(error?.message || error) }, { status: 500, headers: cors });
    }
  }
};
