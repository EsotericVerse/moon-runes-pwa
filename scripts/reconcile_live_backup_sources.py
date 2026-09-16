#!/usr/bin/env python3
"""Reconcile live/public source snapshots with historical backup exports.

Platform-agnostic evidence tool for Suno, Instagram, Threads, Facebook,
YouTube, X, and future adapters. It never mutates LOC canonical registries.

Matching priority:
1. platform + stable external id
2. exact canonical/public URL
3. exact UTC date + normalized text hash
4. exact UTC date + normalized text

Ambiguous matches remain unresolved; candidate URLs are never invented.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlsplit, urlunsplit

ITEM_KEYS = ("items", "songs", "posts", "records", "media")
ID_KEYS = (
    "external_id",
    "source_id",
    "song_id",
    "media_id",
    "post_id",
    "id",
    "fbid",
)
URL_KEYS = ("canonical_url", "public_url", "permalink", "suno_url", "url")
DATE_KEYS = (
    "created_at",
    "published_at",
    "date_utc",
    "creation_timestamp",
    "published_date",
    "date",
)
TEXT_KEYS = (
    "text",
    "caption",
    "title",
    "export_title",
    "visible_text",
    "searchable_text",
)
VISIBILITY_KEYS = ("visibility", "privacy", "public_status", "status")
VERIFICATION_KEYS = ("url_status", "verification_status", "verification")
NONPUBLIC_VALUES = {"private", "unlisted", "draft", "hidden", "deleted", "archived"}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as fh:
        return json.load(fh)


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    with temp.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    temp.replace(path)


def iter_records(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ITEM_KEYS:
        value = payload.get(key)
        if isinstance(value, list):
            return [row for row in value if isinstance(row, dict)]
    if any(key in payload for key in ID_KEYS + URL_KEYS + TEXT_KEYS):
        return [payload]
    return []


def first_value(row: dict[str, Any], keys: Iterable[str]) -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def normalize_platform(value: Any, fallback: str | None) -> str | None:
    raw = value if value not in (None, "") else fallback
    if raw in (None, ""):
        return None
    return str(raw).strip().lower().replace("twitter", "x")


def normalize_url(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    raw = value.strip()
    try:
        parts = urlsplit(raw)
    except ValueError:
        return raw
    if not parts.scheme or not parts.netloc:
        return raw
    host = parts.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    path = re.sub(r"/{2,}", "/", parts.path)
    if path != "/":
        path = path.rstrip("/")
    return urlunsplit((parts.scheme.lower(), host, path, parts.query, ""))


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)
    text = " ".join(value.replace("\u3000", " ").split()).strip().casefold()
    return text or None


def text_hash(text: str | None) -> str | None:
    if not text:
        return None
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def normalize_datetime(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()
        except (OverflowError, OSError, ValueError):
            return str(value)
    raw = str(value).strip()
    if raw.isdigit() and len(raw) >= 9:
        try:
            return datetime.fromtimestamp(int(raw), tz=timezone.utc).isoformat()
        except (OverflowError, OSError, ValueError):
            return raw
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        return raw
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat()
    except ValueError:
        return raw


def date_bucket(value: str | None) -> str | None:
    if not value:
        return None
    match = re.match(r"^(\d{4}-\d{2}-\d{2})", value)
    return match.group(1) if match else None


def scalar_verification(value: Any) -> str | None:
    if isinstance(value, str):
        return value.strip().lower() or None
    if isinstance(value, dict):
        candidate = value.get("status") or value.get("url_status")
        if isinstance(candidate, str):
            return candidate.strip().lower() or None
    return None


def visibility_state(row: dict[str, Any]) -> str | None:
    value = first_value(row, VISIBILITY_KEYS)
    if isinstance(value, bool):
        return "public" if value else "private"
    if value is None:
        is_public = row.get("is_public")
        if isinstance(is_public, bool):
            return "public" if is_public else "private"
        return None
    return str(value).strip().lower()


def infer_url_evidence(row: dict[str, Any], source_mode: str) -> str:
    explicit = scalar_verification(first_value(row, VERIFICATION_KEYS))
    if explicit:
        if explicit in {"verified", "verified_valid", "confirmed", "已確認"}:
            return "verified"
        if explicit in {"candidate", "generated", "unverified"}:
            return "candidate"
        return explicit
    return "observed_live" if source_mode == "live" else "backup_only"


@dataclass(frozen=True)
class NormalizedRecord:
    index: int
    platform: str | None
    external_id: str | None
    url: str | None
    created_at: str | None
    date: str | None
    text: str | None
    text_hash: str | None
    visibility: str | None
    url_evidence: str
    source_mode: str


def normalize_record(
    row: dict[str, Any],
    index: int,
    platform: str | None,
    source_mode: str,
) -> NormalizedRecord:
    external = first_value(row, ID_KEYS)
    external_id = str(external).strip() if external not in (None, "") else None
    url = normalize_url(first_value(row, URL_KEYS))
    created = normalize_datetime(first_value(row, DATE_KEYS))
    text = normalize_text(first_value(row, TEXT_KEYS))
    return NormalizedRecord(
        index=index,
        platform=normalize_platform(row.get("platform"), platform),
        external_id=external_id,
        url=url,
        created_at=created,
        date=date_bucket(created),
        text=text,
        text_hash=text_hash(text),
        visibility=visibility_state(row),
        url_evidence=infer_url_evidence(row, source_mode),
        source_mode=source_mode,
    )


def keep_live_record(record: NormalizedRecord, public_only: bool) -> bool:
    if not public_only:
        return True
    return record.visibility not in NONPUBLIC_VALUES


def build_index(records: list[NormalizedRecord], attr: str) -> dict[Any, list[int]]:
    index: dict[Any, list[int]] = {}
    for pos, record in enumerate(records):
        value = getattr(record, attr)
        if value in (None, ""):
            continue
        index.setdefault(value, []).append(pos)
    return index


def unique_match(candidates: list[int]) -> int | None:
    return candidates[0] if len(candidates) == 1 else None


def match_backup_to_live(
    backup: NormalizedRecord,
    indexes: dict[str, dict[Any, list[int]]],
) -> tuple[str, list[int]]:
    if backup.external_id:
        candidates = indexes["platform_id"].get(
            (backup.platform, backup.external_id), []
        )
        if candidates:
            return "platform_external_id", candidates
    if backup.url:
        candidates = indexes["url"].get(backup.url, [])
        if candidates:
            return "canonical_url", candidates
    if backup.date and backup.text_hash:
        candidates = indexes["date_text_hash"].get(
            (backup.date, backup.text_hash), []
        )
        if candidates:
            return "date_text_hash", candidates
    if backup.date and backup.text:
        candidates = indexes["date_text"].get((backup.date, backup.text), [])
        if candidates:
            return "date_text", candidates
    return "unmatched", []


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Reconcile live/public source snapshots with backup exports "
            "without mutating LOC canonical registries."
        )
    )
    parser.add_argument("--backup", required=True, type=Path)
    parser.add_argument("--live", required=True, type=Path)
    parser.add_argument(
        "--platform",
        default=None,
        help="Fallback platform: suno, instagram, threads, facebook, youtube, x",
    )
    parser.add_argument(
        "--out", type=Path, default=Path("loc_source_reconciliation.json")
    )
    parser.add_argument(
        "--include-nonpublic",
        action="store_true",
        help="Keep explicitly private/unlisted live rows as reconciliation evidence",
    )
    args = parser.parse_args()

    backup_raw = iter_records(load_json(args.backup))
    live_raw = iter_records(load_json(args.live))

    backup = [
        normalize_record(row, i, args.platform, "backup")
        for i, row in enumerate(backup_raw)
    ]
    live_all = [
        normalize_record(row, i, args.platform, "live")
        for i, row in enumerate(live_raw)
    ]
    public_only = not args.include_nonpublic
    live = [row for row in live_all if keep_live_record(row, public_only)]

    indexes: dict[str, dict[Any, list[int]]] = {
        "platform_id": {},
        "url": build_index(live, "url"),
        "date_text_hash": {},
        "date_text": {},
    }
    for pos, row in enumerate(live):
        if row.external_id:
            indexes["platform_id"].setdefault(
                (row.platform, row.external_id), []
            ).append(pos)
        if row.date and row.text_hash:
            indexes["date_text_hash"].setdefault(
                (row.date, row.text_hash), []
            ).append(pos)
        if row.date and row.text:
            indexes["date_text"].setdefault((row.date, row.text), []).append(pos)

    matched: list[dict[str, Any]] = []
    ambiguous: list[dict[str, Any]] = []
    unmatched_backup: list[dict[str, Any]] = []
    used_live: set[int] = set()

    for backup_row in backup:
        method, candidates = match_backup_to_live(backup_row, indexes)
        if not candidates:
            unmatched_backup.append(
                {"backup": asdict(backup_row), "status": "unmatched"}
            )
            continue
        pos = unique_match(candidates)
        if pos is None:
            ambiguous.append(
                {
                    "backup": asdict(backup_row),
                    "status": "ambiguous",
                    "match_method": method,
                    "live_candidates": [asdict(live[i]) for i in candidates],
                }
            )
            continue
        used_live.add(pos)
        live_row = live[pos]
        matched.append(
            {
                "backup": asdict(backup_row),
                "live": asdict(live_row),
                "status": "matched",
                "match_method": method,
                "public_url": live_row.url,
                "url_evidence": live_row.url_evidence,
                "promotion_allowed": bool(
                    live_row.url
                    and live_row.url_evidence in {"verified", "observed_live"}
                ),
            }
        )

    unmatched_live = [
        asdict(row) for pos, row in enumerate(live) if pos not in used_live
    ]
    excluded_nonpublic = [asdict(row) for row in live_all if row not in live]

    payload = {
        "schema_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "platform": normalize_platform(args.platform, None),
        "policy": {
            "canonical_mutation": false if False else False,
            "live_role": "freshness + public presentation URL evidence",
            "backup_role": "historical completeness + recovery evidence",
            "match_priority": [
                "platform_external_id",
                "canonical_url",
                "date_text_hash",
                "date_text",
            ],
            "ambiguous_matches": "retain unresolved; never invent URL",
            "public_only_default": public_only,
        },
        "counts": {
            "backup_records": len(backup),
            "live_records_input": len(live_all),
            "live_records_considered": len(live),
            "excluded_nonpublic": len(excluded_nonpublic),
            "matched": len(matched),
            "ambiguous": len(ambiguous),
            "unmatched_backup": len(unmatched_backup),
            "unmatched_live": len(unmatched_live),
        },
        "matched": matched,
        "ambiguous": ambiguous,
        "unmatched_backup": unmatched_backup,
        "unmatched_live": unmatched_live,
        "excluded_nonpublic": excluded_nonpublic,
    }
    save_json(args.out, payload)
    print(json.dumps(payload["counts"], ensure_ascii=False, indent=2))
    print(f"saved: {args.out}")


if __name__ == "__main__":
    main()
