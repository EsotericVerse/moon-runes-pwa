import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE_DIR = ROOT / "data" / "json" / "core"
EXP_DIR = ROOT / "data" / "json" / "experimental" / "engine"
EXP_DIR.mkdir(parents=True, exist_ok=True)

RUNES_EXTENDED = EXP_DIR / "runes_extended.json"
RUNE_INTERPRETATIONS = CORE_DIR / "rune_interpretations.json"
OUTPUT = EXP_DIR / "training_data.json"

train_data: list[dict[str, str]] = []

runes = json.loads(RUNES_EXTENDED.read_text(encoding="utf-8"))
for rune in runes:
    for direction, field in [
        ("正位", "正向表示"),
        ("半正位", "半正向表示"),
        ("半逆位", "半逆向表示"),
        ("逆位", "逆向表示"),
    ]:
        completion = str(rune.get(field) or "").strip()
        if completion:
            prompt = (
                f"符文名稱：{rune.get('名稱')}，英文名稱：{rune.get('英文')}，"
                f"所屬分組：{rune.get('所屬分組')}，符文月相：{rune.get('月相')}，"
                f"方向：{direction}。"
            )
            train_data.append({"prompt": prompt, "completion": completion})

interpretations = json.loads(RUNE_INTERPRETATIONS.read_text(encoding="utf-8"))
for rune in interpretations:
    rune_name = rune.get("符文名稱")
    rune_moon = rune.get("符文月相")
    for direction in rune.get("卡牌方向", []):
        direction_name = direction.get("方向")
        for state in direction.get("現況", []):
            completion = " ".join(
                str(state.get(field) or "").strip()
                for field in ["狀況形容", "狀況表達", "每日占卜提醒", "每日占卜祝福"]
                if str(state.get(field) or "").strip()
            )
            if completion:
                prompt = (
                    f"符文名稱：{rune_name}，符文月相：{rune_moon}，"
                    f"卡牌方向：{direction_name}，現在月相：{state.get('現在月相')}。"
                )
                train_data.append({"prompt": prompt, "completion": completion})

OUTPUT.write_text(json.dumps(train_data, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"generated {len(train_data)} experimental training records")
