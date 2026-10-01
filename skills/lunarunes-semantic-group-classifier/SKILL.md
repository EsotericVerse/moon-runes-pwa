# lunarunes-semantic-group-classifier

## Purpose

將輸入文字投影到 LunaRunes 九組分類，輸出一個 final group、九組 distribution 與 dispute metadata。

這是 **LunaRunes-only analysis skill**。它不會被提升成一般 LOC Search／Statistics／Culture 的預設分類器，也不能在一般 Scope 缺少 keyword 時作 fallback。

## Governance boundary

- LunaRunes Canon 只治理 LunaRunes projection。
- 不使用 LunaRunes 分類判斷其他文化、作者或 Scope 的正確性。
- 不因 Rune character 或 keyword 字面出現就直接判定。
- Current Rune meaning 優先於 skill heuristic。
- classifier output 不得反向改寫 silver.runes／Base66 Canon。

## Final groups

final group 必須是：

- 靈魂
- 連結
- 生命
- 自然
- 礦物
- 元素
- 秩序
- 無序
- 特殊

證據不足時使用 特殊，不強迫塞入八個一般群組。

## Current Rune boundaries

- 水 = Water，不等於 Flow。
- 流動主要屬氣。
- 氣 = Air。
- 暗 = Shadow。
- 空 = Space。
- 無 = Blank。
- 虛 = Void。
- 玄 = Chaos，不是 Mystery。
- 誤 = Error。
- 時、辰、緣維持不同責任。
- 一般 disorder 不自動等於玄。

## Method

對每個 semantic unit：

1. 讀完整語意，不只看單字。
2. 判斷主體與語意角色。
3. 對九組建立 relative distribution。
4. 選一個 final group。
5. 相近時標記 disputed 並保留 candidates。
6. 說明 winning group 與主要 exclusions。

Distribution 用於表達不確定性，不建立多重 final label，也不建立永久 Canon threshold。

## Output

Minimum shape：

~~~json
{
  "source_id": "optional",
  "text": "...",
  "group": "連結",
  "distribution": {
    "靈魂": 0.10,
    "連結": 0.41,
    "生命": 0.05,
    "自然": 0.02,
    "礦物": 0.02,
    "元素": 0.04,
    "秩序": 0.29,
    "無序": 0.03,
    "特殊": 0.04
  },
  "disputed": true,
  "candidates": [
    {"group": "連結", "score": 0.41},
    {"group": "秩序", "score": 0.29}
  ],
  "reason": "...",
  "evidence": [],
  "exclusions": [],
  "api_used": false
}
~~~

## Runtime relationship

本 Skill 的輸出只有在明確保存／採用時才成為 LunaRunes analysis data。它不會自動寫入 Galaxy、Style、Meta Tag、Search index、Statistics 或 Culture，也不會成為其他 Scope 的隱性語意層。
