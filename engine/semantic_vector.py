"""LOC LunaRunes governed semantic-vector core.

This module converts canonical rune metadata into deterministic semantic vectors.
It intentionally keeps position weights separate from semantic weights:
- polarity defines the base tendency,
- direction defines manifestation strength/direction,
- canonical positive/negative keywords define the active semantic pole,
- unknown runes keep valence undefined,
- OW3gs layer precedence is structural, not a hidden numeric position weight.
"""

from __future__ import annotations

from collections import Counter
from typing import Any, Iterable

DIRECTION_LABELS = {1: "正位", 2: "半正位", 3: "半逆位", 4: "逆位"}
DIRECTION_COEFFICIENTS = {1: 1.0, 2: 0.5, 3: -0.5, 4: -1.0}
POLARITY_PRIOR = {"正面": 1.0, "負面": -1.0, "中平": 0.0, "未知": None}

# Terms already explicitly rejected by current Canon governance.
# This is a guardrail, not a replacement for the mother-data workbook.
CANON_REJECTED_TERMS = {
    "星": {"導航", "遠方"},
    "明": {"交替"},
    "空": {"配置"},
    "因": {"理由"},
    "時": {"時機"},
    "幻": {"虛實"},
    "虛": {"未實化"},
    "辰": {"兩小時", "時辰"},
}


def split_terms(value: Any) -> list[str]:
    return [item.strip() for item in str(value or "").split("・") if item.strip()]


def direction_score(polarity: str, direction: int) -> float | None:
    coefficient = DIRECTION_COEFFICIENTS[direction]
    if polarity == "未知":
        return None
    if polarity == "負面":
        return -coefficient
    # 正面與中平都由方向決定當次顯化方向；
    # 差別在 base_prior 是否自帶正向傾向。
    return coefficient


def active_pole(polarity: str, direction: int) -> str:
    coefficient = DIRECTION_COEFFICIENTS[direction]
    if polarity == "未知":
        return "未知"
    if polarity == "負面":
        return "負面" if coefficient >= 0 else "正面"
    return "正面" if coefficient >= 0 else "負面"


def canonical_text(rune: dict[str, Any]) -> str:
    fields = (
        "名稱", "英文", "顯化形式", "關鍵詞", "特別說明",
        "正面關鍵詞", "負面關鍵詞",
    )
    return " ".join(str(rune.get(field) or "") for field in fields)


def contamination_hits(rune: dict[str, Any]) -> list[str]:
    rejected = CANON_REJECTED_TERMS.get(str(rune.get("名稱") or ""), set())
    text = canonical_text(rune)
    return sorted(term for term in rejected if term in text)


def build_semantic_vocabulary(runes: Iterable[dict[str, Any]]) -> list[str]:
    terms: set[str] = set()
    for rune in runes:
        terms.update(split_terms(rune.get("正面關鍵詞")))
        terms.update(split_terms(rune.get("負面關鍵詞")))
    return sorted(terms)


def rune_vector(
    rune: dict[str, Any],
    direction: int,
    *,
    vocabulary: list[str] | None = None,
    strict_canon: bool = True,
) -> dict[str, Any]:
    if direction not in DIRECTION_COEFFICIENTS:
        raise ValueError(f"無效方向: {direction}")

    polarity = str(rune.get("解牌基本極性") or "中平").strip()
    if polarity not in POLARITY_PRIOR:
        raise ValueError(f"無效解牌基本極性: {polarity}")

    hits = contamination_hits(rune)
    if strict_canon and hits:
        raise ValueError(
            f"{rune.get('名稱', '未知')}含舊 Canon 污染詞: {', '.join(hits)}"
        )

    positive = split_terms(rune.get("正面關鍵詞"))
    negative = split_terms(rune.get("負面關鍵詞"))
    if not positive or not negative:
        raise ValueError(f"{rune.get('名稱', '未知')}缺少正面或負面關鍵詞")

    pole = active_pole(polarity, direction)
    coefficient = DIRECTION_COEFFICIENTS[direction]
    valence = direction_score(polarity, direction)
    active_terms = positive if (pole == "正面" or (pole == "未知" and coefficient >= 0)) else negative

    # Numeric vector dimensions:
    # [valence, manifestation, base_prior, direction, certainty]
    numeric = [
        0.0 if valence is None else float(valence),
        abs(float(coefficient)),
        0.0 if POLARITY_PRIOR[polarity] is None else float(POLARITY_PRIOR[polarity]),
        float(coefficient),
        0.0 if polarity == "未知" else 1.0,
    ]

    # Canon keyword vector is sparse and symbolic: one dimension per governed term.
    # This avoids inventing semantic similarity outside mother-data vocabulary.
    sparse = {term: abs(float(coefficient)) for term in active_terms}
    dense_sparse = None
    if vocabulary is not None:
        dense_sparse = [sparse.get(term, 0.0) for term in vocabulary]

    return {
        "符文": rune.get("名稱", "未知"),
        "基本極性": polarity,
        "方向": DIRECTION_LABELS[direction],
        "顯化極": pole,
        "正面關鍵詞": positive,
        "負面關鍵詞": negative,
        "作用關鍵詞": active_terms,
        "vector_dimensions": {
            "valence": numeric[0],
            "manifestation": numeric[1],
            "base_prior": numeric[2],
            "direction": numeric[3],
            "certainty": numeric[4],
        },
        "numeric_vector": numeric,
        "semantic_sparse_vector": sparse,
        "semantic_dense_vector": dense_sparse,
        "unknown": polarity == "未知",
        "canon_contamination": hits,
    }


def aggregate_vectors(vectors: Iterable[dict[str, Any]]) -> dict[str, Any]:
    vectors = list(vectors)
    known = [v for v in vectors if not v["unknown"]]
    unknown = [v["符文"] for v in vectors if v["unknown"]]

    if known:
        valence = sum(v["vector_dimensions"]["valence"] for v in known) / len(known)
        manifestation = sum(v["vector_dimensions"]["manifestation"] for v in known) / len(known)
        certainty = sum(v["vector_dimensions"]["certainty"] for v in known) / len(known)
    else:
        valence = None
        manifestation = None
        certainty = 0.0

    semantic = Counter()
    for vector in vectors:
        semantic.update(vector["semantic_sparse_vector"])

    return {
        "valence": None if valence is None else round(valence, 4),
        "manifestation": None if manifestation is None else round(manifestation, 4),
        "certainty": round(certainty, 4),
        "unknown_runes": unknown,
        "top_semantic_dimensions": semantic.most_common(12),
    }


def validate_mother_projection(runes: Iterable[dict[str, Any]]) -> dict[str, Any]:
    runes = list(runes)
    errors: list[dict[str, Any]] = []
    contamination: list[dict[str, Any]] = []

    expected = {
        "正面": [1.0, 0.5, -0.5, -1.0],
        "負面": [-1.0, -0.5, 0.5, 1.0],
        "中平": [1.0, 0.5, -0.5, -1.0],
        "未知": [None, None, None, None],
    }

    for rune in runes:
        name = rune.get("名稱", "未知")
        polarity = str(rune.get("解牌基本極性") or "").strip()
        if polarity not in expected:
            errors.append({"符文": name, "錯誤": f"無效極性 {polarity}"})
            continue

        if not split_terms(rune.get("正面關鍵詞")) or not split_terms(rune.get("負面關鍵詞")):
            errors.append({"符文": name, "錯誤": "正負關鍵詞不完整"})

        got = [direction_score(polarity, direction) for direction in (1, 2, 3, 4)]
        if got != expected[polarity]:
            errors.append({"符文": name, "錯誤": "方向權重不符", "got": got, "expected": expected[polarity]})

        hits = contamination_hits(rune)
        if hits:
            contamination.append({"符文": name, "污染詞": hits})

    polarity_counts = Counter(str(r.get("解牌基本極性") or "") for r in runes)
    return {
        "rune_count": len(runes),
        "state_count": len(runes) * 4,
        "polarity_counts": dict(polarity_counts),
        "weight_validation_passed": not errors,
        "errors": errors,
        "canon_gate_passed": not contamination,
        "canon_contamination": contamination,
        "semantic_vocabulary_size": len(build_semantic_vocabulary(runes)),
    }
