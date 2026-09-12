from __future__ import annotations

import os
import resource
import sqlite3
import sys
import time
from pathlib import Path


CARD_API = Path(__file__).resolve().parents[1]
if str(CARD_API) not in sys.path:
    sys.path.insert(0, str(CARD_API))

START = time.perf_counter()
import runtime_app  # noqa: E402


GENERATED = CARD_API / "generated"
MAX_STARTUP_SECONDS = float(os.environ.get("LOC_CI_MAX_STARTUP_SECONDS", "20"))
MAX_RSS_MB = float(os.environ.get("LOC_CI_MAX_RSS_MB", "480"))


def rss_mb() -> float:
    # Linux ru_maxrss is KiB; GitHub Actions and Render both run Linux.
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0


def sqlite_count(path: Path, table: str) -> int:
    if not path.exists():
        raise SystemExit(f"missing runtime index: {path}")
    uri = f"file:{path.as_posix()}?mode=ro&immutable=1"
    with sqlite3.connect(uri, uri=True) as connection:
        return int(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])


def main() -> None:
    searcher = runtime_app.core.get_unified_searcher()
    graph_first = searcher._canonical_graph()
    graph_second = searcher._canonical_graph()
    if graph_first is not graph_second:
        raise SystemExit("canonical graph cache is not active")

    elapsed = time.perf_counter() - START
    memory = rss_mb()

    threads_count = sqlite_count(GENERATED / "threads_search_index.sqlite3", "documents")
    authored_count = sqlite_count(GENERATED / "loc4_runtime_index.sqlite3", "authored_documents")
    history_count = sqlite_count(GENERATED / "loc4_runtime_index.sqlite3", "offline_documents")

    print(
        "runtime-budget "
        f"startup_seconds={elapsed:.3f} rss_mb={memory:.1f} "
        f"graph_nodes={graph_first.get('node_count', 0)} "
        f"graph_edges={graph_first.get('edge_count', 0)} "
        f"threads={threads_count} authored={authored_count} history={history_count}"
    )

    if threads_count != 4578:
        raise SystemExit(f"unexpected Threads index count: {threads_count}")
    if authored_count != 82:
        raise SystemExit(f"unexpected LOC4 authored index count: {authored_count}")
    if history_count != 999:
        raise SystemExit(f"unexpected LOC4 history index count: {history_count}")
    if elapsed > MAX_STARTUP_SECONDS:
        raise SystemExit(
            f"runtime startup budget exceeded: {elapsed:.3f}s > {MAX_STARTUP_SECONDS:.3f}s"
        )
    if memory > MAX_RSS_MB:
        raise SystemExit(f"runtime RSS budget exceeded: {memory:.1f} MB > {MAX_RSS_MB:.1f} MB")


if __name__ == "__main__":
    main()
