const base = process.env.LOC_STATE_API || 'https://api.lo3rwang.cc';

const checks = [
  ['health', '/health'],
  ['shared', '/evolution/shared'],
  ['runes', '/evolution/runes'],
  ['language', '/evolution/language']
];

function summarize(name, payload) {
  if (name === 'health') {
    return {
      ok: payload?.ok === true,
      build: payload?.build || '',
      kv: payload?.kv === true
    };
  }
  const data = payload?.data;
  const populated = !!data && typeof data === 'object' && Object.keys(data).length > 0;
  let detail = {};
  if (name === 'runes') {
    detail = {
      system_stages: Array.isArray(data?.system_stages) ? data.system_stages.length : 0,
      governance_evolution: Array.isArray(data?.governance_evolution) ? data.governance_evolution.length : 0,
      semantic_history_cases: Array.isArray(data?.semantic_history_cases) ? data.semantic_history_cases.length : 0
    };
  } else if (name === 'language') {
    detail = {
      status: data?.status || '',
      source_count: Array.isArray(data?.sources) ? data.sources.length : 0,
      track_count: Array.isArray(data?.tracks) ? data.tracks.length : 0
    };
  } else if (name === 'shared') {
    detail = {
      authority_count: data?.authorities && typeof data.authorities === 'object' ? Object.keys(data.authorities).length : 0,
      track_count: data?.tracks && typeof data.tracks === 'object' ? Object.keys(data.tracks).length : 0
    };
  }
  return {
    ok: payload?.ok === true,
    populated,
    key: payload?.key || '',
    source_registry: payload?.source_registry || '',
    updated_at: payload?.updated_at || '',
    ...detail
  };
}

let failed = false;
for (const [name, path] of checks) {
  try {
    const response = await fetch(base + path, { headers: { accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    const summary = summarize(name, payload);
    const pass = response.ok && summary.ok && (name === 'health' || summary.populated);
    if (!pass) failed = true;
    console.log(JSON.stringify({ name, path, http: response.status, pass, ...summary }, null, 2));
  } catch (error) {
    failed = true;
    console.error(JSON.stringify({ name, path, pass: false, error: String(error?.message || error) }, null, 2));
  }
}

if (failed) process.exitCode = 1;
