from __future__ import annotations

import os
import time
from functools import lru_cache
from typing import Any

from starlette.middleware.gzip import GZipMiddleware
from starlette.responses import JSONResponse

import main as core


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    try:
        return max(minimum, int(os.environ.get(name, str(default))))
    except (TypeError, ValueError):
        return default


def _install_unified_search_cache(searcher: Any) -> Any:
    """Cache immutable deployment-scoped structures without changing search semantics."""
    if searcher is None or getattr(searcher, "_runtime_performance_cache_installed", False):
        return searcher

    original_canonical_graph = getattr(searcher, "_canonical_graph", None)
    if callable(original_canonical_graph):
        cached_canonical_graph = lru_cache(maxsize=1)(original_canonical_graph)
        searcher._canonical_graph = cached_canonical_graph

    searcher._runtime_performance_cache_installed = True
    return searcher


# Patch the lazy accessor as well as the instance created during main import.
# This keeps fallback/recovery initialization on the same cached path.
_original_get_unified_searcher = core.get_unified_searcher


def _get_unified_searcher_cached():
    return _install_unified_search_cache(_original_get_unified_searcher())


core.get_unified_searcher = _get_unified_searcher_cached
_install_unified_search_cache(getattr(core, "UNIFIED_SEARCHER", None))

app = core.app

# Compress larger JSON responses. Search/Graph responses are text-heavy and
# compress efficiently, reducing bandwidth without changing response schemas.
app.add_middleware(
    GZipMiddleware,
    minimum_size=max(512, _env_int("LOC_GZIP_MIN_SIZE", 1024)),
    compresslevel=max(1, min(9, _env_int("LOC_GZIP_LEVEL", 5))),
)


# Per-client fixed-window limits protect the small Render instance from burst
# traffic. Values are intentionally generous and remain environment-tunable.
_RATE_POLICIES = {
    "/search": ("LOC_RATE_SEARCH_PER_MIN", 120),
    "/faq/search": ("LOC_RATE_FAQ_SEARCH_PER_MIN", 120),
    "/faq/ask": ("LOC_RATE_FAQ_ASK_PER_MIN", 60),
    "/loc3/search": ("LOC_RATE_LOC3_SEARCH_PER_MIN", 120),
    "/analysis/keywords": ("LOC_RATE_KEYWORDS_PER_MIN", 30),
    "/analyze/text": ("LOC_RATE_ANALYZE_TEXT_PER_MIN", 30),
    "/analyze/corpus": ("LOC_RATE_ANALYZE_CORPUS_PER_MIN", 6),
    "/km/import": ("LOC_RATE_KM_IMPORT_PER_MIN", 4),
}

# Body limits are transport guards, not semantic limits. They are set above the
# endpoint's normal payload envelope so valid requests keep their current API
# contract while oversized abuse is rejected before expensive JSON processing.
_BODY_LIMITS = {
    "/search": 512 * 1024,
    "/faq/search": 512 * 1024,
    "/faq/ask": 512 * 1024,
    "/loc3/search": 512 * 1024,
    "/analysis/keywords": 512 * 1024,
    "/analyze/text": 2 * 1024 * 1024,
    "/analyze/corpus": 32 * 1024 * 1024,
    "/km/import": 16 * 1024 * 1024,
}

_RATE_STATE: dict[tuple[str, str], tuple[int, int, float]] = {}
_RATE_WINDOW_SECONDS = 60
_RATE_STATE_MAX_KEYS = 4096


def _client_key(request) -> str:
    forwarded = str(request.headers.get("x-forwarded-for") or "").strip()
    if forwarded:
        return forwarded.split(",", 1)[0].strip()[:128]
    client = getattr(request, "client", None)
    return str(getattr(client, "host", "unknown"))[:128]


def _check_rate_limit(request) -> tuple[bool, int, int]:
    policy = _RATE_POLICIES.get(request.url.path)
    if not policy:
        return True, 0, 0

    env_name, default_limit = policy
    limit = _env_int(env_name, default_limit)
    now = time.monotonic()
    window = int(now // _RATE_WINDOW_SECONDS)
    key = (_client_key(request), request.url.path)
    state_window, count, _last_seen = _RATE_STATE.get(key, (window, 0, now))
    if state_window != window:
        count = 0
        state_window = window
    count += 1
    _RATE_STATE[key] = (state_window, count, now)

    if len(_RATE_STATE) > _RATE_STATE_MAX_KEYS:
        stale_before = now - (_RATE_WINDOW_SECONDS * 5)
        for stale_key, (_w, _c, last_seen) in list(_RATE_STATE.items()):
            if last_seen < stale_before:
                _RATE_STATE.pop(stale_key, None)

    return count <= limit, limit, max(0, limit - count)


@app.middleware("http")
async def performance_traffic_guard(request, call_next):
    path = request.url.path

    max_body = _BODY_LIMITS.get(path)
    if max_body is not None:
        raw_length = request.headers.get("content-length")
        if raw_length:
            try:
                if int(raw_length) > max_body:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "request body too large"},
                    )
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "invalid content-length"})

    allowed, rate_limit, remaining = _check_rate_limit(request)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={"detail": "too many requests"},
            headers={"Retry-After": "60"},
        )

    response = await call_next(request)

    if rate_limit:
        response.headers.setdefault("X-RateLimit-Limit", str(rate_limit))
        response.headers.setdefault("X-RateLimit-Remaining", str(remaining))

    if request.method == "GET" and response.status_code == 200:
        if path in {"/search/facets", "/loc3/facets"}:
            response.headers.setdefault(
                "Cache-Control",
                "public, max-age=300, stale-while-revalidate=600",
            )
        elif path == "/search/graph":
            response.headers.setdefault(
                "Cache-Control",
                "public, max-age=60, stale-while-revalidate=300",
            )
        elif path == "/health":
            response.headers.setdefault("Cache-Control", "public, max-age=15")

    return response
