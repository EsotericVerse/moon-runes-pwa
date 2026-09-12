from __future__ import annotations

from typing import Any

import runtime_app


core = runtime_app.core
app = runtime_app.app


def _merge_items(bucket: list[dict[str, Any]], items: list[dict[str, Any]]) -> None:
    seen = {str(item.get("result_id") or "") for item in bucket}
    for item in items:
        rid = str(item.get("result_id") or "")
        if rid and rid in seen:
            continue
        bucket.append(item)
        if rid:
            seen.add(rid)


def _one_pass_text_groups(
    searcher: Any,
    query: str,
    top_k: int,
    filters: dict[str, str],
) -> dict[str, list[dict[str, Any]]]:
    """Build the text category without four full Search/Graph passes.

    The legacy endpoint called search() separately for text_record, text_work,
    governance_article and governance_fragment, then discarded every partial
    graph/synthesis/provenance envelope and kept only groups. This function
    invokes only the retrieval helpers that can contribute to those four
    content types, merges them once, then applies the same common filters and
    public-display boundary once.
    """
    groups: dict[str, list[dict[str, Any]]] = {}

    def add(group: str, items: list[dict[str, Any]]) -> None:
        if not items:
            return
        _merge_items(groups.setdefault(group, []), items)

    # text_record + text_work. Keep the per-mode top_k truncation before merge
    # so the result set remains compatible with the former four-search union.
    for wanted in ("text_record", "text_work"):
        textworks = [
            *searcher._loc4_results(query, top_k, wanted),
            *searcher._rune_literature_results(query, top_k, wanted),
        ][:top_k]
        add("textworks", textworks)

        # text_work may expose deterministic named entities and maintained
        # relationships; text_record does not.
        if wanted == "text_work":
            add("entities", searcher._entity_results(query, wanted))
            add("relationships", searcher._relationship_results(query, top_k, wanted))

    # LOC4 article retrieval owns Threads, offline history and maintained LOC6
    # governance articles. runtime_app already shares the expensive corpus scan
    # across text_record/governance_article; call both modes to preserve the
    # current result envelope while the second call is a cache hit.
    add("loc4_articles", searcher._loc4_article_results(query, top_k, "text_record", filters))
    add("loc4_articles", searcher._loc4_article_results(query, top_k, "governance_article", filters))

    add("governance", searcher._governance_results(query, top_k, "governance_fragment"))

    groups = searcher._apply_common_filters(groups, filters)
    groups = searcher._apply_public_display_policies(groups, query)
    return groups


def _find_search_endpoint():
    for route in app.routes:
        if getattr(route, "path", None) == "/search" and "POST" in (getattr(route, "methods", set()) or set()):
            return route
    return None


_search_route = _find_search_endpoint()
_original_search_endpoint = getattr(_search_route, "endpoint", None)


if _search_route is not None and _original_search_endpoint is not None:
    async def optimized_unified_search(input: core.UnifiedSearchInput):
        requested_type = input.content_type.strip().lower()
        requested_source = input.source.strip().lower()

        # Keep all non-text modes, Facebook-only routing and oracle parsing on
        # the canonical endpoint. The optimization is deliberately narrow.
        if requested_type != "text_record" or requested_source == "facebook":
            return await _original_search_endpoint(input)

        query = input.query.strip()
        if not query or len(query) > 500 or input.top_k < 1 or input.top_k > 10:
            return await _original_search_endpoint(input)

        searcher = core.get_unified_searcher()
        oracle, _terms = searcher._oracle_result(query)
        if oracle:
            return await _original_search_endpoint(input)

        filters = {
            "source": input.source,
            "start_date": input.start_date,
            "end_date": input.end_date,
            "period": input.period,
            "era": input.era,
            "playlist": input.playlist,
            "category": input.category,
            "style": input.style,
        }
        merged_groups = _one_pass_text_groups(searcher, query, input.top_k, filters)

        if not requested_source:
            fb_searcher = core.get_facebook_searcher(required=False)
            fb_items = fb_searcher.search(
                query,
                top_k=input.top_k,
                start_date=input.start_date.strip(),
                end_date=input.end_date.strip(),
            ) if fb_searcher is not None else []
            fb_items = [searcher._public_display_result(item, query) for item in fb_items]
            if fb_items:
                _merge_items(merged_groups.setdefault("text", []), fb_items)

        return {
            "success": True,
            "system_id": "lo3rwang",
            "query": query,
            "content_type": "text_record",
            "groups": merged_groups,
            "total_count": sum(len(items) for items in merged_groups.values()),
            "timestamp": core.datetime.now().isoformat(),
        }

    _search_route.endpoint = optimized_unified_search
    # FastAPI stores the callable in the dependency graph at registration time.
    # Update both references so the ASGI route actually invokes the wrapper.
    if getattr(_search_route, "dependant", None) is not None:
        _search_route.dependant.call = optimized_unified_search
