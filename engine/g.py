import json
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[1]
CORE_DIR = ROOT / "data" / "json" / "core"
EXP_DIR = ROOT / "data" / "json" / "experimental" / "engine"
EXP_DIR.mkdir(parents=True, exist_ok=True)

RUNES66 = CORE_DIR / "runes.json"
RUNE_INTERPRETATIONS = CORE_DIR / "rune_interpretations.json"
EMBEDDINGS_PATH = ROOT / "engine" / "combined_embeddings.npy"
META_PATH = EXP_DIR / "combined_meta.json"
SENTENCES_PATH = EXP_DIR / "sentences.json"

sentences: list[str] = []
meta: list[dict] = []

# Canonical LunaRunes66 source only. Legacy experimental rune definitions must not feed semantics.
runes_payload = json.loads(RUNES66.read_text(encoding="utf-8"))
runes = runes_payload if isinstance(runes_payload, list) else runes_payload.get("runes", [])
for rune in runes:
    rune_name = rune.get("符文名稱") or rune.get("名稱") or rune.get("name")
    if not rune_name or rune_name == "德":
        continue
    for direction, field in [
        ("正位", "正向表示"),
        ("半正位", "半正向表示"),
        ("半逆位", "半逆向表示"),
        ("逆位", "逆向表示"),
    ]:
        value = str(rune.get(field) or "").strip()
        if not value:
            continue
        sentences.append(value)
        meta.append({
            "來源": "runes66",
            "符文名稱": rune_name,
            "方向": direction,
            "所屬分組": rune.get("所屬分組") or rune.get("group"),
            "月相": rune.get("月相") or rune.get("moon_phase"),
        })

# Canon-governed runtime projection. Do not duplicate it under engine/.
interpretations = json.loads(RUNE_INTERPRETATIONS.read_text(encoding="utf-8"))
for rune in interpretations:
    rune_name = rune.get("符文名稱")
    rune_moon = rune.get("符文月相")
    for direction in rune.get("卡牌方向", []):
        direction_name = direction.get("方向")
        for state in direction.get("現況", []):
            parts = [
                state.get("狀況形容"),
                state.get("狀況表達"),
                state.get("每日占卜提醒"),
                state.get("每日占卜引導"),
                state.get("每日占卜祝福"),
            ]
            value = " ".join(str(part).strip() for part in parts if str(part or "").strip())
            if not value:
                continue
            sentences.append(value)
            meta.append({
                "來源": "rune_interpretations",
                "符文名稱": rune_name,
                "符文月相": rune_moon,
                "方向": direction_name,
                "現在月相": state.get("現在月相"),
            })

model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
embeddings = model.encode(sentences, show_progress_bar=True)

np.save(EMBEDDINGS_PATH, embeddings)
META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
SENTENCES_PATH.write_text(json.dumps(sentences, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"generated {len(sentences)} experimental semantic records")
