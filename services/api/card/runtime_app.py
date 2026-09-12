from __future__ import annotations

import json
import os
import sqlite3
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

from starlette.middleware.gzip import GZipMiddleware
from starlette.responses import JSONResponse

import main as core


GENERATED_DIR = Path(__file__).resolve().parent / "generated"
THREADS_INDEX_PATH = GENERATED_DIR / "threads_search_index.sqlite3"
LOC4_INDEX_PATH = GENERATED_DIR / "loc4_runtime_index.sqlite3"


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    try:
        return max(minimum, int(os.environ.get(name, str(default))))
    except (TypeError, ValueError):
        return default


def _json_list(value: Any) -> list[Any]:
    try:
        parsed = json.loads(str(value or "[]"))
        return parsed if isinstance(parsed, list) else []
    except (TypeError, ValueError, json.JSONDecodeError):
        return []


def _readonly_sqlite_uri(path: Path) -> str:
    return f"file:{path.as_posix()}?mode=ro&immutable=1"


def _install_unified_search_cache(searcher: Any) -> Any:
    """Install deployment-scoped performance caches without changing search semantics."""
    if searcher is None or getattr(searcher, "_runtime_performance_cache_installed", False):
        return searcher

    original_canonical_graph = getattr(searcher, "_canonical_graph", None)
    if callable(original_canonical_graph):
        cached_canonical_graph = lru_cache(maxsize=1)(original_canonical_graph)
        searcher._canonical_graph = cached_canonical_graph

    # Threads browser shards are build-time indexed on Render. Read compact
    # SQLite rows at request time and keep the existing JSON-shard iterator as
    # a compatibility fallback for local/older deployments.
    original_threads_iterator = getattr(searcher, "_iter_loc4_article_documents", None)
    if callable(original_threads_iterator):
        def indexed_threads_iterator():
            if not THREADS_INDEX_PATH.exists():
                yield from original_threads_iterator()
                return
            try:
                with sqlite3.connect(_readonly_sqlite_uri(THREADS_INDEX_PATH), uri=True) as connection:
                    rows = connection.execute(
                        """
                        SELECT id, source_id, date, era, source_role, text,
                               char_count, matched_terms_json
                        FROM documents
                        ORDER BY ordinal
                        """
                    )
                    for row in rows:
                        yield {
                            "id": row[0],
                            "source_id": row[1],
                            "date": row[2],
                            "era": row[3],
                            "source_role": row[4],
                            "text": row[5],
                            "char_count": row[6],
                            "matched_terms": _json_list(row[7]),
                        }
                return
            except sqlite3.Error:
                yield from original_threads_iterator()

        searcher._iter_loc4_article_documents = indexed_threads_iterator

    # LOC4 authored corpus and closed-platform history are also deployment-static.
    # Build-time SQLite removes repeated JSON parsing/opening of 16 source shards.
    original_corpus_iterator = getattr(searcher, "_iter_loc4_corpus_documents", None)
    if callable(original_corpus_iterator):
        def indexed_corpus_iterator():
            if not LOC4_INDEX_PATH.exists():
                yield from original_corpus_iterator()
                return
            try:
                with sqlite3.connect(_readonly_sqlite_uri(LOC4_INDEX_PATH), uri=True) as connection:
                    rows = connection.execute(
                        """
                        SELECT id, work_id, title, section, segment, date,
                               source_file, source_type, content_type, primary_loc,
                               related_locs_json, display_policy, text, retrieval_text
                        FROM authored_documents
                        ORDER BY ordinal
                        """
                    )
                    for row in rows:
                        yield {
                            "id": row[0],
                            "work_id": row[1],
                            "title": row[2],
                            "section": row[3],
                            "segment": row[4],
                            "date": row[5],
                            "source_file": row[6],
                            "source_type": row[7],
                            "content_type": row[8],
                            "primary_loc": row[9],
                            "related_locs": _json_list(row[10]),
                            "display_policy": row[11],
                            "text": row[12],
                            "retrieval_text": row[13],
                        }
                return
            except sqlite3.Error:
                yield from original_corpus_iterator()

        searcher._iter_loc4_corpus_documents = indexed_corpus_iterator

    original_history_iterator = getattr(searcher, "_iter_loc4_offline_history_documents", None)
    if callable(original_history_iterator):
        def indexed_history_iterator():
            if not LOC4_INDEX_PATH.exists():
                yield from original_history_iterator()
                return
            try:
                with sqlite3.connect(_readonly_sqlite_uri(LOC4_INDEX_PATH), uri=True) as connection:
                    rows = connection.execute(
                        """
                        SELECT id, title, date, author_id, platform, source_type,
                               source_role, content_type, primary_loc,
                               related_locs_json, display_policy, searchable,
                               classification_json, text, char_count
                        FROM offline_documents
                        ORDER BY ordinal
                        """
                    )
                    for row in rows:
                        classification = _json_list(row[12])
                        if not row[11] or "爭議文章" in set(classification):
                            continue
                        yield {
                            "id": row[0],
                            "title": row[1],
                            "date": row[2],
                            "author_id": row[3],
                            "platform": row[4],
                            "source_type": row[5],
                            "source_role": row[6],
                            "content_type": row[7],
                            "primary_loc": row[8],
                            "related_locs": _json_list(row[9]),
                            "display_policy": row[10],
                            "searchable": bool(row[11]),
                            "classification": classification,
                            "text": row[13],
                            "char_count": row[14],
                        }
                return
            except sqlite3.Error:
                yield from original_history_iterator()

        searcher._iter_loc4_offline_history_documents = indexed_history_iterator

    # text_record and governance_article currently share the same LOC4 article
    # retrieval implementation. Cache that immutable ranking result once per
    # query/filter tuple so a text bundle does not rescan the Threads corpus.
    original_article_results = getattr(searcher, "_loc4_article_results", None)
    if callable(original_article_results):
        cache_size = _env_int("LOC_THREADS_RESULT_CACHE_SIZE", 128)

        @lru_cache(maxsize=cache_size)
        def cached_article_results(query: str, top_k: int, filter_items: tuple[tuple[str, str], ...]):
            filters = dict(filter_items)
            return original_article_results(query, top_k, "text_record", filters)

        def article_results(query: str, top_k: int, wanted: str, filters=None):
            if wanted not in {"", "all", "governance_article", "text_record"}:
                return original_article_results(query, top_k, wanted, filters)
            if wanted in {"", "all"}:
                return original_article_results(query, top_k, wanted, filters)
            filter_items = tuple(sorted(
                (str(key), str(value or ""))
                for key, value in (filters or {}).items()
                if value
            ))
            return cached_article_results(str(query), int(top_k), filter_items)

        searcher._loc4_article_results = article_results

    # Knowledge assets are deployment-static. Repeated questions should not
    # reopen the same registered files on every request.
    original_knowledge_results = getattr(searcher, "_knowledge_asset_results", None)
    if callable(original_knowledge_results):
        cache_size = _env_int("LOC_KNOWLEDGE_RESULT_CACHE_SIZE", 128)
        searcher._knowledge_asset_results = lru_cache(maxsize=cache_size)(original_knowledge_results)

    searcher._runtime_performance_cache_installed = True
    return searcher


_original_get_unified_searcher = core.get_unified_searcher


def _get_unified_searcher_cached():
    return _install_unified_search_cache(_original_get_unified_searcher())


core.get_unified_searcher = _get_unified_searcher_cached
_install_unified_search_cache(getattr(core, "UNIFIED_SEARCHER", None))

app = core.app

app.add_middleware(
    GZipMiddleware,
    minimum_size=max(512, _env_int("LOC_GZIP_MIN_SIZE", 1024)),
    compresslevel=max(1, min(9, _env_int("LOC_GZIP_LEVEL", 5))),
)


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
                    return JSONResponse(status_code=413, content={"detail": "request body too large"})
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
