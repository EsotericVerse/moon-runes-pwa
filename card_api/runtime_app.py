from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from starlette.middleware.gzip import GZipMiddleware

import main as core


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
    minimum_size=max(512, int(os.environ.get("LOC_GZIP_MIN_SIZE", "1024"))),
    compresslevel=max(1, min(9, int(os.environ.get("LOC_GZIP_LEVEL", "5")))),
)


@app.middleware("http")
async def performance_cache_headers(request, call_next):
    response = await call_next(request)
    if request.method != "GET" or response.status_code != 200:
        return response

    path = request.url.path
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
