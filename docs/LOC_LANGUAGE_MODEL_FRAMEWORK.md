# LOC Language Model Framework

## 1. Positioning

LOC（Luna Codex／月典）正式定位為 **Language Model Framework／語言模型框架**。

LOC 本身不是一個固定語彙集合，也不是某一個特定符號模型。它提供一套可重複使用的基本結構，用來把語言資料組織成可運作、可搜尋、可治理、可推演、可進化的語言模型。

核心關係：

```text
LOC = Language Model Framework
LunaRunes = Symbolic Language Model implemented with LOC
```

LunaRunes 是 LOC 的第一個 reference implementation，但 LOC 不綁定 LunaRunes。其他作者可以定義自己的 symbolic vocabulary、grouping、context、algorithm、module 與 evolution，形成不同的 LOC implementation，例如 `LOC + SunRunes`。

---

## 2. Framework principle

LOC 的基本方法不是依賴大型語言模型猜測分類，而是先建立可治理的結構：

```text
Define vocabulary
  -> build context
  -> extend into systems / works
  -> define algorithms
  -> form language modules
  -> project and evolve recursively
```

因此 LOC 可以從 deterministic structure 開始，再視需要加入 semantic vector、embedding 或 LLM。這些 AI／向量能力是 enhancement layer，不是 LOC 成立的必要條件。

---

## 3. LOC1-8 framework

| LOC | Framework role | LunaRunes reference implementation |
|---|---|---|
| LOC1 | Vocabulary | 符文語彙 / Rune Symbolic Vocabulary：66 枚符文本身 |
| LOC2 | Context | 符文脈絡 / Rune Symbolic Context：2／3／5／11 組合與位置關係 |
| LOC3 | Extension I | 符文延伸體系：音樂 / Rune Symbolic Extension: Music |
| LOC4 | Extension II | 符文延伸體系：文學 / Rune Symbolic Extension: Literary |
| LOC5 | Extension III | 符文延伸體系：多媒體 / Rune Symbolic Extension: Multimedia |
| LOC6 | System Algorithm | 符文系統演算法 / Rune Symbolic System Algorithm：解牌與系統規則 |
| LOC7 | Language Module | 符文語言模組 / Rune Symbolic Language Module：固定符文群組與模組分類 |
| LOC8 | Evolution Engine | 符文進化推演引擎 / Rune Evolution Engine：遞迴推演與系統狀態進化 |

LOC1–8 是功能切分，不代表版本、成熟度或高低階級。

---

## 4. LunaRunes as reference implementation

LunaRunes 使用作者指定的 66 枚符文作為封閉且可治理的 symbolic vocabulary。

基本結構：

```text
1-8    靈魂群組
9-16   連結群組
17-24  生命群組
25-32  自然群組
33-40  礦物群組
41-48  元素群組
49-56  秩序群組
57-64  無序群組
65-66  特殊符文：玄、命
```

1–64 以 **8** 作為基本分組單位。這個 grouping 是 LunaRunes 的作者定義與符號系統結構，不是 embedding、clustering 或 AI 自動生成的結果。

Rune 0 德為作者／治理錨點，不列入 66 枚可抽取符文。

---

## 5. Deterministic base algorithm

LunaRunes 的基本分類可只依賴 canonical 66-rune data。

最小流程：

```text
JSON / structured record
  -> resolve rune id or exact rune name
  -> join canonical runes66.json
  -> retrieve canonical group
  -> assign LOC1 vocabulary
  -> assign LOC7 language module
  -> preserve provenance
```

因此基礎層可以 **No API Key / No Embedding / No Semantic Vector** 運作。

這不是主張所有語意分析永遠不需要 AI，而是明確區分：

- 已有固定結構的問題，優先使用 deterministic rule。
- 自由文字中的隱含語意、相似作品、潛在主題與模糊跨符文關係，可使用 semantic vector / LLM 作增強。
- AI 結果不得覆蓋 canonical authority；有衝突時進入 governance review。

---

## 6. Classification versus inference

LOC 要區分兩種不同工作：

### Classification

已知資料結構或明確符號時，依規則直接分類。

例如：

```text
空 -> rune id 55 -> 秩序 -> LOC1 符文語彙 + LOC7 符文語言模組｜秩序群組
```

這一層不需要語意向量。

### Semantic inference

當來源只有自由文字，沒有 rune id、rune name、group 或既有關聯欄位時，才需要分析該文字可能包含哪些 rune semantics。

推論結果應被視為 derived metadata，而不是新的 Canon。

---

## 7. Evolution engine

LOC8 的核心不是單純 timeline，而是可以把前一輪結構化結果重新作為下一輪輸入。

```text
source data
  -> classification
  -> context
  -> algorithm
  -> language module
  -> statistics / temporal comparison
  -> governed write-back
  -> new system state
  -> next projection
```

這個循環使語言系統可以反覆推演。理論上可持續遞迴；工程上則由資料變更、版本、事件或治理條件觸發。

因此 Evolution 不只是「分析資料如何變」，還包含：當推演結果被確認後，允許它反過來修正 taxonomy、module definition、search projection、relationship 或其他 system metadata。

---

## 8. Human authorship and AI role

LOC 的分類框架、LunaRunes 66-rune vocabulary、八組 grouping、LOC1–8 對應與 Evolution Engine 的方法論，屬於作者的系統分析與設計。

AI 可以：

- parse structured data
- execute deterministic mapping
- inspect consistency
- propose classifications under defined rules
- assist semantic inference when requested
- validate write-back against governance rules

AI 不應被描述為 LOC taxonomy 或 LunaRunes grouping 的原始設計者。

---

## 9. Generalization beyond LunaRunes

LOC 的可重用性來自「框架與實作分離」。

另一套 symbolic language model 可以使用不同數量、不同分組方式、不同符號與不同演算法，只要它建立自己的 canonical vocabulary 與治理規則即可。

例如：

```text
LOC + LunaRunes -> LunaRunes Symbolic Language Model
LOC + SunRunes  -> another Symbolic Language Model
```

SunRunes 不需要採用 LunaRunes 的 66 枚、8 枚一組或相同語意；那些是 LunaRunes implementation rules，不是 LOC framework 的硬性限制。

這一點使 LOC 能作為語言模型的基本框架，而 LunaRunes 則持續作為第一個完整的實作與驗證案例。
