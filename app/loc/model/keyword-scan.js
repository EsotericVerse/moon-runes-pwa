function normalizeText(value) {
  return String(value ?? '').normalize('NFKC');
}

export function countOccurrences(text, term) {
  const source = normalizeText(text);
  const needle = normalizeText(term).trim();
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while ((index = source.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

export function scanGovernedKeywords(text, registry = []) {
  const source = normalizeText(text);
  return registry
    .map((entry) => {
      const term = String(entry.term ?? '').trim();
      const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
      const notAliases = new Set(Array.isArray(entry.not_aliases) ? entry.not_aliases : []);
      const candidates = [term, ...aliases].filter(Boolean).filter((candidate) => !notAliases.has(candidate));
      const hits = candidates
        .map((candidate) => ({ term: candidate, count: countOccurrences(source, candidate) }))
        .filter((hit) => hit.count > 0);
      const count = hits.reduce((sum, hit) => sum + hit.count, 0);
      return {
        term,
        keywordType: entry.keyword_type ?? 'semantic',
        status: entry.status ?? 'working',
        count,
        hits,
        authorClassification: entry.author_classification ?? null,
        authorCategory: entry.author_category ?? null,
        authorScopeOnly: Boolean(entry.author_scope_only),
        semanticIntent: Array.isArray(entry.semantic_intent) ? entry.semantic_intent : []
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'zh-Hant'));
}

export function normalizeApiKeywordResult(payload = {}) {
  const source = payload?.result ?? payload;
  const rows = Array.isArray(source?.keywords)
    ? source.keywords
    : Array.isArray(source?.candidates)
      ? source.candidates
      : Array.isArray(source?.terms)
        ? source.terms
        : [];
  return rows
    .map((row) => typeof row === 'string' ? { term: row } : row)
    .map((row) => ({
      ...row,
      term: String(row?.term ?? row?.keyword ?? row?.name ?? '').trim()
    }))
    .filter((row) => row.term);
}

export function compareKeywordScans(ruleResult = [], apiResult = []) {
  const ruleMap = new Map(ruleResult.map((item) => [item.term, item]));
  const apiMap = new Map(apiResult.map((item) => [item.term, item]));
  const terms = [...new Set([...ruleMap.keys(), ...apiMap.keys()])];
  return terms.map((term) => {
    const rule = ruleMap.get(term) ?? null;
    const api = apiMap.get(term) ?? null;
    return {
      term,
      rule,
      api,
      status: rule && api ? 'agreement' : rule || api ? 'disputed' : 'unresolved'
    };
  });
}
