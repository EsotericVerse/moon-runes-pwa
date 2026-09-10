# LOC Language Module Framework

## 1. Core concept

LOC（Luna Codex／月典）以 **Language Module Framework／語言模組框架** 作為核心框架概念。

這不是願景式命名，也不是事後替系統升格，而是把 LOC 與 LunaRunes 既有結構之間原本就存在、且可互相驗證的關係明文化。

語言像物質世界，語言系統像元素，Token 則更接近原子級的語彙單位。

符文是對這些「語言原子」進行分組與結構化的一種方式；LOC 則提供語言的模組化框架，用來組織這些細小單元。符文語言模組則進一步對符文所涵蓋的語言原子進行分類、建立關係，並定義其處理方式。

LOC 不直接宣稱自己包辦整個「語言世界」，而是提供一套將細小語言單元組織成可操作模組的方法。框架可以很小，但解析粒度可以很細。

語言模組框架的目的，不是取代語言系統，而是讓複雜語言系統的解析、分類、組織與重組變得更輕量、更清楚。

---

## 2. LOC and LunaRunes are mutually validating

LOC 與 LunaRunes 是相輔相成的關係，不是單向依附。

LOC 提供模組化的分析與組織方式；LunaRunes 則提供一套已存在的符號語彙、固定分組、脈絡結構、演算法、延伸資料與推演結果，讓 LOC 的模組化方法可以被實際檢驗。

同時，LOC 又能反過來把 LunaRunes 既有的語彙、群組、脈絡、演算法與演化關係整理成更清楚、可操作、可搜尋與可治理的結構。

因此這不是「理論證明實作」或「實作證明理論」的單向關係，而是：

```text
LOC framework
  <-> LunaRunes symbolic structure
  <-> structured data
  <-> algorithms
  <-> implementation
  <-> evolution results
```

彼此可以對照、互相驗證。

---

## 3. Rune definition in the framework

在這個框架裡，Token 可視為原子級語彙單位。

LunaRunes 的 rune 並不是單純把一個中文字直接等同於一個 Token，而是對相關語言原子進行分組、壓縮與結構化後形成的符號單位。

因此符文可以視為：

> 對語言原子進行分組與結構化後形成的可操作符號單位。

而符文語言模組則是：

> 對符文所涵蓋的語言原子與符號關係進一步分類、建立關係，並定義其處理方式。

這也是 LunaRunes 能夠從單一符文延伸到多符文脈絡、延伸作品、演算法與推演的基礎。

---

## 4. LunaRunes implementation structure

LunaRunes 使用作者定義的 66 枚符文作為 canonical symbolic vocabulary。

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

1–64 以 8 為基本分組單位。這套分組不是 embedding、clustering 或 AI 自動生成的結果，而是 LunaRunes 既有的作者定義與系統結構。

Rune 0 德為作者／治理錨點，不列入 66 枚可抽取符文。

---

## 5. LOC1–8 as an observable module path

LunaRunes 既有內容可以沿 LOC1–8 被拆解與對照：

| LOC | LunaRunes implementation |
|---|---|
| LOC1 | 符文語彙 / Rune Symbolic Vocabulary |
| LOC2 | 符文脈絡 / Rune Symbolic Context |
| LOC3 | 符文延伸體系：音樂 / Rune Symbolic Extension: Music |
| LOC4 | 符文延伸體系：文學 / Rune Symbolic Extension: Literary |
| LOC5 | 符文延伸體系：多媒體 / Rune Symbolic Extension: Multimedia |
| LOC6 | 符文系統演算法 / Rune Symbolic System Algorithm |
| LOC7 | 符文語言模組 / Rune Symbolic Language Module |
| LOC8 | 符文進化推演引擎 / Rune Evolution Engine |

這張對照表不是為 LunaRunes 事後硬套的新分類，而是把原本存在於資料與實作中的功能邊界明文化，並用 LOC 重新觀察 LunaRunes；同時 LunaRunes 的實際內容又反過來驗證 LOC 的模組化切分確實可以運作。

---

## 6. Deterministic base and fine-grained analysis

LunaRunes 的基本分類可以直接依賴 canonical rune data，不需要先使用 semantic vector、embedding 或外部 API。

最小流程：

```text
structured record
  -> resolve rune id / rune name
  -> match canonical rune
  -> read canonical group
  -> map rune vocabulary
  -> map rune language module
  -> preserve provenance
```

這個基礎層的價值在於：框架本身可以很小，但因為從原子級語彙單位、符文分組與明確模組開始，解析粒度可以很細。

語意向量、embedding 與 LLM 可以用來處理自由文字中的隱含語意、相似度或模糊關係，但它們是 enhancement layer，而不是符文模組化成立的前提。

---

## 7. Evolution as reciprocal verification

LOC8 的推演不是單純 timeline。既有資料經過分類、脈絡、演算法與模組分析後，可以產生新的結構化觀察；經治理確認後，再回寫為新的系統狀態。

```text
existing data
  -> module analysis
  -> context / algorithm relation
  -> projection
  -> governed write-back
  -> new system state
  -> next analysis
```

這個循環也構成 LOC 與 LunaRunes 的另一層互證：LunaRunes 提供真實資料與演化歷程，LOC 提供可重複的分析框架；每一輪結果都可以回頭檢查原有分組、關係與模組是否仍然成立。

---

## 8. Human authorship and AI role

LunaRunes 的 66-rune vocabulary、八組 grouping、符文語意、組合規則與相關系統分析均為作者既有設計。

LOC 對這些既有內容進行模組化整理，並使其能被更一致地分析與實作。

AI 可以協助 parse 資料、執行規則、檢查一致性、進行可選的語意推論與驗證，但不應把既有符文分組、語意或 LOC–LunaRunes 關係描述成 AI 所創造的 taxonomy。
