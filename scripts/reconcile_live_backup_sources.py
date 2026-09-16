#!/usr/bin/env python3
"""Reconcile live/public snapshots with backup exports without mutating LOC canon."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

COLLECTION_KEYS = ("items", "songs", "posts", "records", "media")
ID_KEYS = ("external_id", "source_id", "song_id", "media_id", "post_id", "id", "fbid")
URL_KEYS = ("canonical_url", "public_url", "permalink", "suno_url", "url")
DATE_KEYS = ("created_at", "published_at", "date_utc", "creation_timestamp", "published_date", "date")
TEXT_KEYS = ("text", "caption", "title", "export_title", "visible_text", "searchable_text")
VISIBILITY_KEYS = ("visibility", "privacy", "public_status", "status")
NONPUBLIC = {"private", "unlisted", "draft", "hidden", "deleted", "archived"}
VERIFIED = {"verified", "verified_valid", "confirmed", "已確認"}
CANDIDATE = {"candidate", "generated", "unverified"}


def load(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as fh:
        return json.load(fh)


def save(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def rows(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    if not isinstance(payload, dict):
        return []
    for key in COLLECTION_KEYS:
        if isinstance(payload.get(key), list):
            return [x for x in payload[key] if isinstance(x, dict)]
    return [payload] if any(k in payload for k in ID_KEYS + URL_KEYS + TEXT_KEYS) else []


def first(row: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def platform(value: Any, fallback: str | None) -> str | None:
    raw = value if value not in (None, "") else fallback
    return None if raw in (None, "") else str(raw).strip().lower().replace("twitter", "x")


def url(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    raw = value.strip()
    try:
        p = urlsplit(raw)
    except ValueError:
        return raw
    if not p.scheme or not p.netloc:
        return raw
    host = p.netloc.lower().removeprefix("www.")
    path = re.sub(r"/{2,}", "/", p.path)
    if path != "/":
        path = path.rstrip("/")
    return urlunsplit((p.scheme.lower(), host, path, p.query, ""))


def text(value: Any) -> str | None:
    if value is None:
        return None
    out = " ".join(str(value).replace("\u3000", " ").split()).strip().casefold()
    return out or None


def iso_time(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)) or (isinstance(value, str) and value.isdigit() and len(value) >= 9):
        try:
            return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat()
        except (OverflowError, OSError, ValueError):
            return str(value)
    raw = str(value).strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat()
    except ValueError:
        return raw


def date_of(value: str | None) -> str | None:
    m = re.match(r"^(\d{4}-\d{2}-\d{2})", value or "")
    return m.group(1) if m else None


def visibility(row: dict[str, Any]) -> str | None:
    value = first(row, VISIBILITY_KEYS)
    if isinstance(value, bool):
        return "public" if value else "private"
    if value is None and isinstance(row.get("is_public"), bool):
        return "public" if row["is_public"] else "private"
    return None if value is None else str(value).strip().lower()


def evidence(row: dict[str, Any], mode: str) -> str:
    raw = row.get("url_status") or row.get("verification_status") or row.get("verification")
    if isinstance(raw, dict):
        raw = raw.get("status") or raw.get("url_status")
    state = str(raw).strip().lower() if isinstance(raw, str) else None
    if state in VERIFIED:
        return "verified"
    if state in CANDIDATE:
        return "candidate"
    if state:
        return state
    return "observed_live" if mode == "live" else "backup_only"


def normalize(row: dict[str, Any], index: int, fallback_platform: str | None, mode: str) -> dict[str, Any]:
    body = text(first(row, TEXT_KEYS))
    created = iso_time(first(row, DATE_KEYS))
    ext = first(row, ID_KEYS)
    return {
        "index": index,
        "platform": platform(row.get("platform"), fallback_platform),
        "external_id": None if ext in (None, "") else str(ext).strip(),
        "url": url(first(row, URL_KEYS)),
        "created_at": created,
        "date": date_of(created),
        "text": body,
        "text_hash": hashlib.sha256(body.encode("utf-8")).hexdigest() if body else None,
        "visibility": visibility(row),
        "url_evidence": evidence(row, mode),
        "source_mode": mode,
    }


def add(index: dict[Any, list[int]], key: Any, pos: int) -> None:
    if key not in (None, "", (None, None)):
        index.setdefault(key, []).append(pos)


def main() -> None:
    ap = argparse.ArgumentParser(description="Reconcile live/public snapshots with backup exports; emit evidence only.")
    ap.add_argument("--backup", required=True, type=Path)
    ap.add_argument("--live", required=True, type=Path)
    ap.add_argument("--platform", default=None, help="suno, instagram, threads, facebook, youtube, x")
    ap.add_argument("--out", type=Path, default=Path("loc_source_reconciliation.json"))
    ap.add_argument("--include-nonpublic", action="store_true")
    args = ap.parse_args()

    backup = [normalize(r, i, args.platform, "backup") for i, r in enumerate(rows(load(args.backup)))]
    live_all = [normalize(r, i, args.platform, "live") for i, r in enumerate(rows(load(args.live)))]
    live = live_all if args.include_nonpublic else [r for r in live_all if r["visibility"] not in NONPUBLIC]

    idx: dict[str, dict[Any, list[int]]] = {"id": {}, "url": {}, "date_hash": {}, "date_text": {}}
    for pos, r in enumerate(live):
        add(idx["id"], (r["platform"], r["external_id"]), pos)
        add(idx["url"], r["url"], pos)
        add(idx["date_hash"], (r["date"], r["text_hash"]), pos)
        add(idx["date_text"], (r["date"], r["text"]), pos)

    matched, ambiguous, missing, used = [], [], [], set()
    for b in backup:
        checks = [
            ("platform_external_id", idx["id"].get((b["platform"], b["external_id"]), [])) if b["external_id"] else ("platform_external_id", []),
            ("canonical_url", idx["url"].get(b["url"], [])) if b["url"] else ("canonical_url", []),
            ("date_text_hash", idx["date_hash"].get((b["date"], b["text_hash"]), [])) if b["date"] and b["text_hash"] else ("date_text_hash", []),
            ("date_text", idx["date_text"].get((b["date"], b["text"]), [])) if b["date"] and b["text"] else ("date_text", []),
        ]
        method, candidates = next(((m, c) for m, c in checks if c), ("unmatched", []))
        if not candidates:
            missing.append({"backup": b, "status": "unmatched"})
        elif len(candidates) > 1:
            ambiguous.append({"backup": b, "status": "ambiguous", "match_method": method, "live_candidates": [live[i] for i in candidates]})
        else:
            pos = candidates[0]
            used.add(pos)
            live_row = live[pos]
            matched.append({
                "backup": b,
                "live": live_row,
                "status": "matched",
                "match_method": method,
                "public_url": live_row["url"],
                "url_evidence": live_row["url_evidence"],
                "promotion_allowed": bool(live_row["url"] and live_row["url_evidence"] in {"verified", "observed_live"}),
            })

    excluded = [r for r in live_all if r not in live]
    unmatched_live = [r for pos, r in enumerate(live) if pos not in used]
    payload = {
        "schema_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "platform": platform(args.platform, None),
        "policy": {
            "canonical_mutation": False,
            "live_role": "freshness + public presentation URL evidence",
            "backup_role": "historical completeness + recovery evidence",
            "match_priority": ["platform_external_id", "canonical_url", "date_text_hash", "date_text"],
            "ambiguous_matches": "retain unresolved; never invent URL",
            "public_only_default": not args.include_nonpublic,
        },
        "counts": {
            "backup_records": len(backup),
            "live_records_input": len(live_all),
            "live_records_considered": len(live),
            "excluded_nonpublic": len(excluded),
            "matched": len(matched),
            "ambiguous": len(ambiguous),
            "unmatched_backup": len(missing),
            "unmatched_live": len(unmatched_live),
        },
        "matched": matched,
        "ambiguous": ambiguous,
        "unmatched_backup": missing,
        "unmatched_live": unmatched_live,
        "excluded_nonpublic": excluded,
    }
    save(args.out, payload)
    print(json.dumps(payload["counts"], ensure_ascii=False, indent=2))
    print(f"saved: {args.out}")


if __name__ == "__main__":
    main()
