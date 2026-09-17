export function normalizeSearchParams(input = {}) {
  const value = input instanceof URLSearchParams ? Object.fromEntries(input.entries()) : input;
  return {
    q: String(value.q ?? '').trim(),
    page: Math.max(1, Number.parseInt(value.page ?? '1', 10) || 1),
    limit: Math.min(100, Math.max(1, Number.parseInt(value.limit ?? '20', 10) || 20)),
    scope: String(value.scope ?? '').trim(),
    period: String(value.period ?? '').trim(),
    group: String(value.group ?? '').trim(),
  };
}

export function paginate(items = [], page = 1, limit = 20) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(totalPages, Math.max(1, Number(page) || 1));
  const start = (safePage - 1) * safeLimit;
  return {
    items: items.slice(start, start + safeLimit),
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export function mergeSearchParams(current, patch = {}) {
  const params = new URLSearchParams(current instanceof URLSearchParams ? current : current ?? '');
  for (const [key, raw] of Object.entries(patch)) {
    if (raw === undefined || raw === null || raw === '') params.delete(key);
    else params.set(key, String(raw));
  }
  return params;
}
