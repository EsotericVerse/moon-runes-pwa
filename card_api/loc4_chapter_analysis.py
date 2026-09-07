from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

_CN = {"零": 0, "〇": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}

_CONCEPTS: list[tuple[str, list[str]]] = [
    ("命運", ["命運", "註定", "宿命"]),
    ("責任", ["責任", "承擔", "負責", "代價"]),
    ("選擇／方向", ["選擇", "決定", "抉擇", "方向"]),
    ("因果", ["因果", "報應", "償還"]),
    ("符文", ["符文", "月之符文", "織命"]),
    ("月／共振", ["月光", "月亮", "月之", "共鳴", "共振", "月語者"]),
    ("夢境／幻象", ["夢境", "夢中", "夢之", "夢花", "幻象", "幻境"]),
    ("靈魂", ["靈魂", "魂魄", "靈片", "靈之"]),
    ("記憶", ["記憶", "回憶", "往昔"]),
    ("彼岸／輪迴", ["彼岸", "輪迴", "轉生"]),
    ("神國", ["神國", "大祭司", "國王"]),
    ("意志", ["意志", "意念", "願望"]),
    ("虛／空洞", ["虛之", "虛無", "虛神", "空洞"]),
    ("生命／死亡", ["生命", "生機", "死亡", "死去", "重生"]),
    ("愛／關係", ["愛", "關係", "陪伴", "情感", "心意"]),
    ("誓言／連結", ["誓言", "承諾", "鍊", "連結", "羈絆"]),
    ("守護／邊界", ["守護", "保護", "結界", "邊界", "封印"]),
    ("真相／理解", ["真相", "理解", "揭露", "明白"]),
    ("時間", ["時間", "時光", "歲月", "未來", "過去"]),
    ("自然／生長", ["花", "樹", "種子", "草", "枝", "葉", "生長"]),
    ("火／衝突", ["火焰", "燃燒", "戰鬥", "攻擊", "審判"]),
    ("水／冰", ["水", "湖", "冰", "雪", "潮汐"]),
    ("光／暗", ["光", "黑暗", "暗影", "銀白", "星光"]),
    ("世界／宇宙", ["世界", "宇宙", "星球", "維度", "天體"]),
]

_ENTITIES = [
    "小月", "朔端", "望敦", "朔敦", "朔言之子", "望新之子", "月語者",
    "月之大祭司", "大祭司", "月之教主", "教主", "國王", "月神", "朔望",
    "福報之爐", "蘊生", "織命", "陽月", "蝕",
]

_PART_NAMES = {
    1: "現在．下弦之卷",
    2: "過去．新月之卷",
    3: "近未來．上弦之卷",
    4: "超古代．滿月之卷",
    5: "也許．幻蝕之卷",
    6: "註定．無日之卷",
    7: "無限．迴夢之卷",
}


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _cn_num(value: str) -> int | None:
    if value.isdigit():
        return int(value)
    if value == "十":
        return 10
    if "十" in value:
        left, right = value.split("十", 1)
        tens = _CN.get(left, 1) if left else 1
        ones = _CN.get(right, 0) if right else 0
        return tens * 10 + ones
    return _CN.get(value)


def _chapter_no(label: str) -> int | None:
    if label == "序章":
        return 0
    if label == "終章" or "（終章）" in label:
        return 25
    match = re.search(r"第([一二三四五六七八九十零〇0-9]+)章", label)
    return _cn_num(match.group(1)) if match else None


def _parse_chapters(raw: str) -> list[dict[str, Any]]:
    lines = raw.replace("\r", "").splitlines()
    candidates: list[dict[str, Any]] = []
    pattern = re.compile(r"(序章|終章|第[一二三四五六七八九十零〇0-9]+章(?:（終章）)?)[：:]\s*(.+)$")

    for index, line in enumerate(lines):
        text = line.strip()
        if not text or len(text) > 160:
            continue
        text = re.sub(r"^[*#\s]+|[*#\s]+$", "", text)
        text = text.removeprefix("【").removesuffix("】").strip()
        match = pattern.search(text)
        if not match:
            continue
        no = _chapter_no(match.group(1))
        if no is None or not 0 <= no <= 25:
            continue
        title = re.sub(r"&#x20;?", "", match.group(2)).rstrip("】* ").strip()
        candidates.append({"line": index, "chapter": no, "title": title})

    first: dict[int, dict[str, Any]] = {}
    for item in candidates:
        first.setdefault(item["chapter"], item)

    ordered = sorted(first.values(), key=lambda row: row["line"])
    result: list[dict[str, Any]] = []
    for index, item in enumerate(ordered):
        next_line = ordered[index + 1]["line"] if index + 1 < len(ordered) else len(lines)
        body = "\n".join(lines[item["line"] + 1:next_line]).strip()
        body = re.sub(r"\n{3,}", "\n\n", body)
        result.append({**item, "body": body})
    return sorted(result, key=lambda row: row["chapter"])


def _count(text: str, term: str) -> int:
    return text.count(term)


def _themes(body: str, title: str) -> list[dict[str, Any]]:
    text = f"{title}\n{body}"
    rows = []
    for label, terms in _CONCEPTS:
        count = sum(_count(text, term) for term in terms)
        if count:
            rows.append({"label": label, "count": count})
    rows.sort(key=lambda row: (-row["count"], row["label"]))
    return rows[:6]


def _entities(body: str) -> list[dict[str, Any]]:
    rows = [{"name": name, "count": _count(body, name)} for name in _ENTITIES]
    rows = [row for row in rows if row["count"]]
    rows.sort(key=lambda row: (-row["count"], row["name"]))
    return rows[:6]


def _narrative_function(chapter: int) -> str:
    if chapter == 0:
        return "序章／世界狀態與核心問題設定"
    if chapter <= 5:
        return "前段／進入情境與角色定位"
    if chapter <= 10:
        return "展開／試煉與世界規則擴張"
    if chapter <= 15:
        return "中段／衝突、揭露與關係轉折"
    if chapter <= 20:
        return "後段／因果升高與核心問題收束"
    if chapter <= 24:
        return "終局／結果、轉場與下一層問題"
    return "終章／本篇收束與下一篇橋接"


def _title_signals(title: str) -> list[str]:
    return [x.strip() for x in re.split(r"[・、，,：:／/]", title) if x.strip()][:6]


def _metrics(body: str) -> dict[str, int]:
    return {
        "characters": len(re.sub(r"\s+", "", body)),
        "paragraphs": len([x for x in re.split(r"\n{2,}", body) if x.strip()]),
        "dialogue_marks": len(re.findall(r"[「」]", body)),
    }


def _load_work_texts(repo_root: Path) -> dict[str, str]:
    manifest_path = repo_root / "data/json/generated/loc4/corpus/LOC4_TEXT_CORPUS_MANIFEST.json"
    manifest = _load_json(manifest_path)
    rows: list[dict[str, Any]] = []
    for shard in manifest.get("shards", []):
        payload = _load_json(repo_root / str(shard.get("path") or ""))
        rows.extend(payload.get("documents", []))

    moon = [row for row in rows if row.get("work_id") == "LOC4-MOON-SPEAKER"]
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in moon:
        grouped.setdefault(str(row.get("source_file") or ""), []).append(row)

    result: dict[str, str] = {}
    for source_file, items in grouped.items():
        items.sort(key=lambda row: int(row.get("segment") or 0))
        result[source_file] = "\n\n".join(str(row.get("text") or "") for row in items)
    return result


def _load_rune_map(repo_root: Path) -> dict[tuple[int, int], dict[str, Any]]:
    registry = _load_json(repo_root / "data/json/registries/LOC4_MOON_SPEAKER_RUNE_RECOVERY.json")
    result = {}
    for row in registry.get("records", []):
        try:
            result[(int(row["part"]), int(row["chapter"]))] = row
        except Exception:
            continue
    return result


def build_moon_speaker_chapter_analysis(repo_root: Path) -> dict[str, Any]:
    texts = _load_work_texts(repo_root)
    rune_map = _load_rune_map(repo_root)
    chapters: list[dict[str, Any]] = []
    part_stats = []

    source_names = {
        1: "allCh1.txt", 2: "allCh2.txt", 3: "allCh3.txt", 4: "allCh4.txt",
        5: "allCh5.txt", 6: "allCh6.txt", 7: "allCh7.txt",
    }

    for part in range(1, 8):
        source_file = source_names[part]
        raw = texts.get(source_file, "")
        parsed = _parse_chapters(raw)
        present = {row["chapter"] for row in parsed}
        missing = [chapter for chapter in range(26) if chapter not in present]
        part_stats.append({
            "part": part,
            "part_name": _PART_NAMES[part],
            "chapter_count": len(parsed),
            "missing": missing,
        })

        for row in parsed:
            chapter = int(row["chapter"])
            themes = _themes(row["body"], row["title"])
            entities = _entities(row["body"])
            rune = rune_map.get((part, chapter))
            chapters.append({
                "chapter_id": f"LOC4-MOON-SPEAKER-P{part}-C{chapter:02d}",
                "work_id": "LOC4-MOON-SPEAKER",
                "part": part,
                "part_name": _PART_NAMES[part],
                "chapter": chapter,
                "chapter_label": "序章" if chapter == 0 else ("終章" if chapter == 25 else f"第{chapter}章"),
                "title": row["title"],
                "narrative_function": _narrative_function(chapter),
                "title_signals": _title_signals(row["title"]),
                "themes": themes,
                "key_entities": entities,
                "semantic_summary": (
                    f"{row['title']}：本章的主要文字證據集中於"
                    f"{'、'.join(x['label'] for x in themes[:3]) or '敘事推進'}；"
                    f"結構位置為「{_narrative_function(chapter)}」。"
                ),
                "metrics": _metrics(row["body"]),
                "rune_configuration": {
                    "status": "restored_from_outline",
                    "runes": rune.get("runes", []),
                    "moon_phase": rune.get("moon_phase"),
                    "source_outline": rune.get("source_outline"),
                    "source_line": rune.get("source_line"),
                } if rune else {
                    "status": "not_recovered",
                    "runes": [],
                    "moon_phase": None,
                    "note": "恢復資料未包含此章三符文／月相；不由正文或章名推測補值。",
                },
                "source": {
                    "source_type": "author_plain_text",
                    "source_file": source_file,
                    "evidence_scope": "full_chapter",
                },
                "confidence": {
                    "chapter_boundary": "high",
                    "themes": "deterministic_text_evidence",
                    "entities": "deterministic_text_evidence",
                    "rune_configuration": "restored_source" if rune else "unavailable",
                },
            })

    chapters.sort(key=lambda row: (row["part"], row["chapter"]))
    restored = sum(1 for row in chapters if row["rune_configuration"]["status"] == "restored_from_outline")

    return {
        "schema_version": "1.0",
        "dataset": "LOC4 MoonSpeaker chapter-level semantic analysis",
        "authority": "LOC4",
        "status": "complete_baseline_182_chapters" if len(chapters) == 182 else "incomplete",
        "generated_from": "LOC4 document-level full-text corpus + recovered chapter rune registry",
        "work_id": "LOC4-MOON-SPEAKER",
        "title": "月語者",
        "chapter_count": len(chapters),
        "part_count": 7,
        "parts": part_stats,
        "rune_recovery": {
            "restored_chapters": restored,
            "not_recovered": len(chapters) - restored,
            "rule": "缺少的章節三符文／月相不從正文或章名推測。",
        },
        "analysis_dimensions": [
            "chapter_boundary", "title_signals", "narrative_function", "themes",
            "key_entities", "semantic_summary", "text_metrics",
            "rune_configuration", "source_provenance",
        ],
        "chapters": chapters,
    }


def get_moon_speaker_chapter_analysis(
    repo_root: Path,
    *,
    part: int | None = None,
    chapter: int | None = None,
) -> dict[str, Any]:
    payload = build_moon_speaker_chapter_analysis(repo_root)
    rows = payload["chapters"]
    if part is not None:
        rows = [row for row in rows if row["part"] == part]
    if chapter is not None:
        rows = [row for row in rows if row["chapter"] == chapter]
    return {**payload, "chapters": rows, "filtered_count": len(rows)}
