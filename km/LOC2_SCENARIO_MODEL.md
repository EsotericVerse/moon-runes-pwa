# LOC2 Scenario Model — 情境語意模型

**Status:** Working  
**Owner:** LOC2 — Semantic Playground  
**Updated:** 2026-09-05

## 1. 定位

LOC2 不只是桌遊／電子卡牌規則。它同時是月之符文進入真實生活狀況的 **Scenario Model / Semantic Playground**。

核心工作不是替生活事件下唯一答案，而是把一個狀況轉成可描述、可比較、可回應的語意問題。

> **LOC1 提供符文；LOC2 提供情境。**

## 2. 雙卡：最小情境文法

LOC 的雙卡結構採 **A → B（因果）**。

放進 LOC2 時，雙卡可以用來描述：

- 哪個狀態或因素先出現；
- 它導向什麼結果；
- 兩個語意單元之間是什麼關係；
- 使用者／玩家可以從哪個位置介入或重新理解。

因此「雙卡事件」不是單純的遊戲效果，而是把真實狀況壓縮成最小因果敘述的方式。

## 3. Event 32：現行情境語料原型

LOC2 Alpha 目前已有 32 個 Event。它們不是 32 組固定雙符文配對；現行 Alpha Event 使用 SL／ML／NE／OC 組態需求作快速判定。

但這 32 個 Event 已經構成一批可用的 **Scenario Corpus / Event Corpus**，涵蓋：

- 記憶、自我懷疑、真實表達、內在映照
- 誤解、合作、切斷、重建關係
- 疾病、康復、愛、韻律
- 發芽、修剪、等待、豐收
- 建立基礎、資源不足、重建、結晶
- 火花、風向改變、洪流、平衡
- 選擇、時機、規則、定錨
- 偶然、幻象、空窗、未知來信

這些事件可被視為「真實生活狀況的語意題目」，而不是只服務遊戲勝負的卡牌效果。

## 4. 情境處理流程

```text
真實生活狀況
    ↓
LOC2 Event / Scenario
    ↓
雙卡因果或其他符文組合
    ↓
描述狀況 → 看見關係 → 建構回答 → 形成處理方向
```

「處理」不代表系統替使用者做決策，而是把原本模糊的狀況轉成可以被語言處理的結構。

## 5. 與 LOC1–8 的關係

- **LOC1**：提供符文本體、基本語意、方位與抽取。
- **LOC2**：提供情境，把符文放進真實狀況中測試與使用。
- **LOC3**：部分抽牌／情境結果可延伸為歌曲。
- **LOC4**：情境可延伸為對話、微型敘事、小說片段與其他文字作品。
- **LOC5**：情境與作品可進一步轉成圖像、聲音與影音。
- **LOC6**：處理牌組本身的符文文法與組合語意。
- **LOC7**：研究更高階的符文／文字建築、關係與結構。
- **LOC8**：把 Event 放回時間、生活與跨 LOC 軌跡。

## 6. KM 角色

在 Knowledge Management 中，LOC2 Event 應視為：

- `scenario_event`
- Scenario Corpus / Event Corpus
- LOC2 canonical ownership
- 可供 LOC4、LOC6、LOC7、LOC8 引用的共享語料

遊戲 UI、FAQ、RAG 或後續 AI 推論都不得把推導出的情境解答反向覆寫成 LOC2 原始 Event 定義。

## 7. 現況與限制

- Alpha Event 32：已有。
- 雙卡因果文法：已有既定 LOC 規律。
- Event 32 與特定符文雙卡的完整映射：尚未在現行資料中固定，不應由 KM 自動補造。
- 更完整的情境處理語料、真實案例與多卡 Event：可持續擴充。

---

**LOC2 principle:** Put the rune language into situations people actually encounter.
