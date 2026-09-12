const ERA_KEY = 'loc:era:registry';
const DAILY_PREFIX = 'loc:daily-rune:';

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

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.PUBLIC_ORIGIN || 'https://loc.lo3rwang.cc');
  return {
    'access-control-allow-origin': origin === allowed ? origin : allowed,
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'vary': 'Origin'
  };
}

function authorized(request, env) {
  if (!env.LOC_WRITE_TOKEN) return false;
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${env.LOC_WRITE_TOKEN}`;
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

async function listDaily(env, limit = 400) {
  const rows = [];
  let cursor;
  do {
    const listed = await env.LOC_KV.list({ prefix: DAILY_PREFIX, limit: Math.min(1000, limit), cursor });
    for (const key of listed.keys) {
      const value = await env.LOC_KV.get(key.name, 'json');
      if (value) rows.push(value);
      if (rows.length >= limit) break;
    }
    cursor = listed.list_complete ? undefined : listed.cursor;
  } while (cursor && rows.length < limit);
  rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  return rows;
}

async function saveDaily(env, raw) {
  const row = normalizeDaily(raw);
  if (!row.date || !row.rune) throw new Error('date and rune are required');
  const safeId = row.id.replace(/[^A-Za-z0-9._-]/g, '-');
  const key = `${DAILY_PREFIX}${row.date}:${row.draw_kind}:${safeId}`;
  await env.LOC_KV.put(key, JSON.stringify(row));
  return row;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!env.LOC_KV) return json({ ok: false, error: 'LOC_KV binding missing' }, { status: 503, headers: cors });

    try {
      if (url.pathname === '/api/loc-state/health') {
        return json({ ok: true, service: 'loc-state', kv: true }, { headers: cors });
      }

      if (url.pathname === '/api/loc-state/eras') {
        if (request.method === 'GET') {
          const data = await readEras(env);
          return json({ ok: true, ...data }, { headers: cors });
        }
        if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, { status: 401, headers: cors });
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
        if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, { status: 401, headers: cors });
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
