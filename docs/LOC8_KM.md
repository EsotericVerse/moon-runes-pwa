# LOC8_KM — Context, ERA, Event & Relation

**Version:** 0.1  
**Status:** Working  
**Primary LOC:** LOC8 — Context Analysis  
**KM Owner:** LOC7_KM  
**Updated:** 2026-09-06

## 1. 定位

LOC8 負責把事件、時期、狀態、作品與跨 LOC 訊號放回時間與脈絡中，形成可追蹤的生活／創作軌跡。

LOC8 不把 ERA 視為單純的日期分段。ERA 是一段具有相對穩定語意狀態，且與前後期間存在可辨識差異的時間區間。

公開介面使用「時期」；stable machine ID 可使用 `ERA-...` 或既有 `ERA-P0`～`ERA-P8`。作者個人 P0–P8 是既有時間軸的一種實例，不要求一般使用者沿用相同命名。

## 2. ERA 核心定義

> **ERA = 一段具有相對穩定語意狀態，且與前後期間存在可辨識差異的時間區間。**

ERA 的成立依據不是「經過固定多久」，而是偵測到 change point，並確認新狀態具有持續性。

因此：

- 單一異常事件不等於新 ERA。
- 單篇文章、單首歌曲或單日情緒變化通常只形成 transition signal。
- 新特徵若在後續資料中持續存在，才形成 ERA candidate。
- 多來源同時支持同一轉折時，ERA candidate 的可信度提高。
- 最終 ERA 必須經使用者確認或治理流程接受，才能成為 Canonical ERA。

## 3. ERA 判定流程

```text
Signal Collection
      ↓
Change Detection
      ↓
Persistence Validation
      ↓
Cross-source Confirmation
      ↓
Human Governance
      ↓
Canonical ERA
```

### 3.1 Signal Collection

LOC8 不限定資料必須來自某一媒介，而是把來源視為不同的 temporal signal source。

作者目前主要來源：

| Signal class | LOC 來源 | 主要訊號 |
|---|---|---|
| Creative | LOC3 Suno | 歌曲主題、歌詞、曲風、歌名、創作密度、作品群聚 |
| Narrative | LOC4《月語者》等文字作品 | 敘事主題、角色、世界觀、長篇結構、核心命題 |
| Conceptual / Governance | LOC6 Threads／政德風 | 價值觀、治理語言、概念、邊界、身份、自我治理 |
| Reality / Event | LOC8 Event | 搬家、工作、身份、關係、專案、現實轉折與 State Before/After |

一般使用者可以用日記、照片、Calendar、專案紀錄、社群貼文、工作紀錄等來源替代；LOC8 只要求資料具有時間位置與可比較狀態。

### 3.2 Change Detection

可判定為 change signal 的變化包括：

- 高頻關鍵字或概念組成改變
- 新概念首次出現並增加
- 舊概念明顯消退
- 敘事視角、語氣或治理立場改變
- 創作媒介、風格、主題或作品群聚改變
- 現實事件造成長期狀態變動
- 多個 Relation edge 在短期內集中指向新的 State／Concept

Change Detection 只產生「可能轉折」，不直接切 ERA。

### 3.3 Persistence Validation

```text
瞬間異常 ≠ ERA
持續的新狀態 = ERA candidate
```

Persistence 可由下列方式判斷：

- 新特徵持續跨越多筆資料
- 新主題出現在多首作品／多篇文章
- 新狀態維持一段時間而非立即回復
- 後續 Event／Relation 仍沿同一方向發展

### 3.4 Cross-source Confirmation

若多個獨立來源同時出現相同方向的改變，ERA candidate 的可信度提高。

```text
LOC3 創作主題改變
+ LOC6 治理語言改變
+ LOC8 重大 Event / State 改變
= 高信心 ERA transition
```

跨 LOC 支持不是必要條件，但它可以防止把單一媒介的短期波動誤判為人生／系統 ERA。

### 3.5 Human Governance

系統只能提出 `ERA Candidate`，不能自動把推論升格為正式 ERA。

Candidate 必須允許：

- Accept
- Adjust start/end
- Rename
- Merge
- Split
- Reject

只有經使用者接受後，才寫入正式 ERA registry。

## 4. ERA 判定維度

ERA candidate 至少由四個維度評估：

```text
Difference × Persistence × Cross-source Support × Significance
```

- **Difference**：與上一期間的語意／狀態差異程度。
- **Persistence**：新狀態持續多久、跨多少資料、是否穩定。
- **Cross-source Support**：有多少相互獨立的資料來源支持同一轉折。
- **Significance**：變化是否涉及身份、價值觀、主要作品方向、工作／關係／生活結構或其他高影響事件。

實作不要求一定使用乘法公式；四維模型是治理框架，演算法可使用規則、統計 change-point detection、embedding distance 或其他可解釋方法。

## 5. 作者現行 ERA 的推導原則

作者目前的 P0–P8 主要由 LOC3、LOC4、LOC6 與 LOC8 Event 交叉回顧而來。Suno 是重要 temporal signal source，但不是唯一 ERA authority。

```text
LOC3：作品主題／風格群聚改變
LOC4：核心作品與敘事框架出現
LOC6：價值觀／治理語言發生轉折
LOC8：現實 State / Event 改變
        ↓
判定 change point
        ↓
驗證後續是否持續
        ↓
形成 ERA
```

因此「從 Suno 分 ERA」應理解為：Suno 提供高密度創作訊號，再與其他 LOC 證據交叉確認。

## 6. ERA 邊界可修正與再分段

ERA 邊界不是第一次建立後就永久鎖死。當更完整的歷史語料被納入，例如 Threads 全量 corpus、舊對話、作品資料或新的 Event 證據，LOC8 應允許對既有 ERA 做**前後調整與細分**。

### 6.1 Refinement 原則

既有 ERA 可進行：

- **Boundary Shift**：起始／結束日期前後移動
- **Split**：一個 ERA 拆成兩個或更多子 ERA
- **Merge**：原本差異不足的相鄰 ERA 合併
- **Rename**：證據更完整後調整人類可讀名稱
- **Reclassify**：原本視為主要 ERA 的段落降為 transition phase，或反向升格

### 6.2 Threads 分析後的再治理

作者現行 P0–P8 應視為「目前最佳可用分段」，不是不可修改的歷史真理。

Threads 全量分析完成後，可依：

- 概念首次出現日期
- 概念高頻化／穩定化日期
- 代表文章群聚
- 治理語言轉折
- 與 LOC3／LOC4 同期作品的共振
- 重大 Event / State transition

重新檢查每個 ERA boundary。

若發現某段內部其實包含兩種長期且可區分的狀態，應允許把該 ERA 再切細；若前後差異其實只是短期波動，則應調整或合併。

### 6.3 Stable ID 與顯示編號分離

為避免未來細分 ERA 時破壞既有引用：

- 每個正式 ERA 應有 immutable `era_id`
- `P0 / P1 / P2` 只作顯示順序或作者現行命名
- 分割、改名、前後調整時，Relation / Event / Work 應引用 stable `era_id`
- 若 ERA 被拆分，舊 ID 可標記 `superseded`，並記錄 successor ERA IDs
- 不應用重新編號去靜默改寫歷史引用

### 6.4 Boundary confidence

ERA 邊界應允許標記：

- `exact`：有明確事件／作品日期可作 transition anchor
- `estimated`：可判斷區間，但無唯一精確日期
- `provisional`：仍待更多 corpus 驗證

證據不足時保留不確定性，比製造精確日期更符合治理原則。

## 7. 一般使用者的 ERA 建議模式

一般新使用者不應被要求先理解 P0／P1 或自行設計人生分期。預設應先記錄資料，再由 LOC8 提出 ERA 建議。

### Custom ERA
使用者自行定義名稱、日期、描述與狀態。

### Event-based ERA
由重大 Event 與 State Before/After 找候選轉折，例如搬家、工作／職位變更、關係建立或結束、身份變化、專案啟動／結束。

### Trend-based ERA
由累積紀錄中的持續語意變化提出候選，例如關鍵字群、主題分布、活動類型、創作方向或長期狀態改變。

新手預設流程：

```text
先記 Event / Work / Note
      ↓
累積足夠時間序列
      ↓
系統偵測 change point
      ↓
提出「可能進入新時期」
      ↓
使用者確認／調整
      ↓
建立 ERA
```

## 8. ERA Template

ERA Template 是「判定訊號組」，不是預設人生劇本。

- Life：工作、搬家、關係、身份、重大決策
- Creative：作品主題、風格、媒介、創作方向
- Career：公司、職位、技能、專案、轉職
- Project：啟動、探索、原型、實作、發布、維護
- Relationship：認識、靠近、穩定、衝突、疏離、結束
- Learning：入門、探索、練習、熟練、應用

Template 只決定「哪些 signal 權重較高」，不硬套固定 ERA 名稱。

## 9. ERA Candidate 與 Canonical ERA

```text
Signal
  ↓
Change Point
  ↓
ERA Candidate
  ↓
Human Governance
  ↓
Canonical ERA
```

Candidate 建議欄位：

```json
{
  "candidate_id": "ERA-CAND-...",
  "start_date": "",
  "suggested_end_date": "",
  "suggested_name": "",
  "difference_score": null,
  "persistence_score": null,
  "cross_source_score": null,
  "significance_score": null,
  "supporting_sources": [],
  "supporting_events": [],
  "supporting_relations": [],
  "confidence": "low | medium | high",
  "status": "candidate | accepted | adjusted | split | merged | rejected"
}
```

## 10. ERA 與 Context / Relation 的關係

ERA 是 LOC8 關係圖中的時間聚合節點之一，不是整個圖本身。

```text
Event ─causes→ State
State ─transitions_to→ State
Concept ─reframes→ Concept
Work ─expresses→ Concept
Article ─extends→ Concept
Relation edges
      ↓
在時間上聚合
      ↓
ERA
```

因此：

- Timeline 回答「什麼時候發生什麼」。
- Trajectory 回答「狀態怎麼一路變」。
- Context 回答「節點彼此怎麼連」。
- ERA 回答「哪一段時間形成相對穩定的狀態」。

## 11. 設計治理規則

1. 不以固定月份／季度自動切 ERA。
2. 不因單一高衝擊事件就立即建立 ERA；需檢查事件後的持續狀態。
3. 不以單一媒介作唯一證據，除非該媒介本身已形成長期且高密度的時間序列。
4. 系統推論只能產生 Candidate。
5. Candidate 的來源與理由必須可追溯。
6. 使用者可覆寫演算法建議，但應保留調整紀錄。
7. ERA 名稱是人類可讀標籤；machine ID 必須穩定，不因改名而改變。
8. ERA 日期／名稱由 LOC8 管理；其他 LOC 可引用，不應各自重定義。
9. ERA 是「狀態分段」，不是價值判斷；不得把某時期預設為進步或退步。
10. 若證據不足，保留 uncertain boundary，而不是製造精確日期。
11. 新 corpus 可以修正舊 ERA；歷史分段必須允許 refinement，而不是用既有 ERA 反過來硬套新證據。

## 12. UI / CRUD 治理

LOC8 的主要資料物件應遵循「看得到，就能在同一工作區直接管理」的原則。對 ERA、Event、Relation、Daily Rune 等可維護資料，顯示層不應只提供 Read-only view，再要求使用者跳到另一頁處理。

最小互動模型：

```text
SELECT / Read
INSERT / Add
UPDATE / Edit
DELETE / Delete
```

介面規則：

- ERA 在「時期」頁直接提供新增、修改、刪除。
- 修改 ERA 時，應直接在原顯示位置展開編輯，不強迫切換到另一管理頁。
- 刪除 ERA 必須提醒：刪除 ERA 本身不代表自動刪除既有 Event、Relation、Work；引用關係需另行治理。
- Event、Relation、Daily Rune 應維持相同 CRUD 心智模型，降低不同工作區之間的操作成本。
- 顯示與維護應盡量共位；只有高風險批次操作才需要獨立管理模式。

### 第一人稱真實優先

ERA suggestion、關鍵字趨勢、作品群聚與 change-point detection 都只是輔助訊號。系統負責提出可能的變化，但不決定使用者真實人生何時發生轉折。

> **系統負責發現變化的跡象；使用者負責確認真實發生的狀況與時間。**

因此：

- `signal_date` 可以早於或晚於真實轉折。
- 正式 ERA boundary 應以使用者確認的 lived reality 為最高優先。
- 作品、文章、聊天紀錄可能是事件前的預示，也可能是事件後的整理，不應把發布日直接等同人生轉折日。
- 系統建議可供 Adjust / Accept / Reject，但不能覆寫使用者的第一人稱確認。

## 14. 現行功能矩陣

| 功能 | 現況 | 作用 |
|---|---|---|
| Daily Rune | Implemented | 記錄每日符文與近期訊號 |
| ERA / 時期 | Implemented | 顯示、直接新增、修改、刪除時期；支援 boundary refinement |
| Event | Implemented | 新增、修改、刪除事件與保存 Current State |
| Event Timeline | Implemented | 依時間排序事件，回答「何時發生什麼」 |
| Relation Library | Implemented | 保存跨 Event／ERA／Concept／Work 等節點關係 |
| Trajectory | Implemented | 將 Relation／State 投影成有方向的演變軌跡 |
| Analysis | Implemented (LOC3 baseline) | 比較相鄰時期的 LOC3 關鍵字／語義家族比重升降，並顯示 transition summary |
| Context | Implemented | 整合 Relation、Trajectory 與 Analysis 的工作區 |
| Graph View | Planned | 由既有 Relation edge 產生網狀視圖；目前未上線 |
| Graph RAG | Implemented | Unified Search 已以 Canonical Graph RAG 做 bounded traversal；LOC8 Event／Daily Rune snapshot 已接入時間圖，並輸出 provenance |

### Graph RAG 現行整合（2026-09-06）

現行 `card_api/unified_search.py` 已把 Graph RAG 作為 Unified Search 的固定階段，而不是未來規劃：

```text
Search retrieval
      ↓
seed nodes
      ↓
Canonical Graph (bounded 1–3 hop)
      ↓
ERA / LOC / Work / Media / Knowledge / LOC8 temporal nodes
      ↓
Search Synthesis + Provenance
```

LOC8 目前額外接入兩個 repository-governed fallback snapshot：

- `LOC8_EVENT_SNAPSHOT.json`：Event／歷史里程碑與 ERA temporal evidence。
- `LOC8_DAILY_RUNE_SNAPSHOT.json`：Daily Rune observation，建立 `LOC8 observation → LOC1 rune → LOC8 ERA` 的跨 LOC 時間橋。

這兩份 snapshot 明確維持 **non-authoritative frontend fallback** 身分；Google Sheet 仍是 LOC8 live data source。

### Relation Library 與公開 Search 的權限邊界

`life.html` 的 Relation Library 目前直接使用 Google Sheet `Relation` 分頁，資料可標記 `visibility=private`。因此公開 `search.html` / Render Search API **不直接讀取 live Relation Sheet**。

規則：

1. private Relation 只供 LOC8 Life workspace 使用。
2. 要進公開 Graph RAG 的 Relation，必須先經治理，成為 repository 中可公開的 registry／snapshot。
3. Semantic similarity 只能選 seed，不能自行建立 canonical edge。
4. Search API 必須回傳 provenance，讓結果可追溯至 source_refs、edge evidence kind 與 evidence status。
5. Relation 公開化是治理動作，不是單純同步動作。
### Relation confidence 與時間圖治理

LOC8 進入 Graph 的 Event、Daily Rune、ERA 與 Relation 不應因「存在」就具有相同強度。現行 Search Core 使用 LOC7 Graph Schema 的 edge quality policy，將 evidence source、status 與 relation type 分開計權。

LOC8 特別遵守：

- live Google Sheet private Relation 不直接進公開 Graph。
- repository snapshot 屬 recorded fallback evidence，權重低於 authority registry／直接 canonical metadata。
- ERA membership 為 `record → ERA` 單向投影，不能由 ERA 反向展開整個時期的所有事件。
- temporal query 應優先保持時間 precision；抽象概念 query 才允許跨 LOC 擴展。
- traversal score 太低的路徑直接停止，不因 hop 增加而擴散。

### Graph RAG 品質控制

LOC8 的 Event、ERA、Daily Rune 一旦進 Graph，不代表所有 traversal 都是正確的。現行加入固定 regression cases，至少驗證：

- 命名歷史能回到正確 Event 與 ERA。
- Daily Rune 能形成 LOC8 observation → LOC1 rune → LOC8 ERA 的治理路徑。
- ERA 查詢不應跳到無證據的時期。
- 公開 Graph 不依賴 private live Relation。
- 每次 Graph traversal 都保留 provenance。

品質工作因此從「繼續增加 edge」轉為「控制 edge precision、temporal correctness 與 provenance completeness」。
### Analysis 與 Context 的分工

- **Context**：回答「彼此怎麼連」。
- **Trajectory**：回答「一路怎麼變」。
- **Analysis**：回答「哪些語意比重變了、幅度多少、文字上如何解讀」。
- **ERA**：回答「哪一段時間形成相對穩定的狀態」。
- **Event Timeline**：回答「什麼時候發生了什麼」。

目前 Analysis 的第一個正式 baseline 使用 LOC3 時期關鍵字資料；LOC6 Threads 完成後，可在不改變這個介面責任的前提下加入概念／治理語言變化。

## 13. 現行一句定義

> **ERA 不是按時間切割，而是根據持續性的語意狀態變化，經多來源證據確認並由使用者治理後形成、且可隨新證據再細化的時間分段。**

---

**LOC8 ERA principle:** Detect change, verify persistence, cross-check evidence, govern the boundary, and refine it when better evidence arrives.

## 15. Self-Governance Feedback Loop

LOC8 位於 LOC 的時間／人生末端，因此除 Timeline、ERA、Relation、Trajectory 與 Analysis 外，也承擔「把檢索結果送回使用者進行自我治理」的 feedback responsibility。

~~~text
歷史語言／作品／事件
        ↓
Search / Graph / ERA
        ↓
Trend / Style / Relation Analysis
        ↓
比較不同時間點
        ↓
理解當時脈絡
        ↓
自我檢討／重新治理
        ↓
新的選擇、語言與事件
        ↓
再次進入 LOC
~~~

這個迴路不是用後期版本審判早期版本，而是讓使用者看見語言如何演化。

### Versioning, not moral ranking

LOC8 不應輸出：

~~~text
30歲版本 = 錯
46歲版本 = 對
~~~

而應輸出：

~~~text
當時 context / problem / style / boundary
→ 後續哪些條件改變
→ 哪些語言持續
→ 哪些 relation / value / boundary 被修正
→ 現在版本適合什麼情境
~~~

是否構成「進步」是使用者的治理判斷；系統本身只確認 change / continuity / divergence。

### 治理實作缺口

LOC8 功能核心目前已具備 Daily Rune、ERA、Event、Relation、Trajectory、Analysis、Context 與 Graph RAG。後續優先補的是治理控制，不再優先擴張功能：

- Governance audit log（before/after/reason/evidence）
- Dispute / Review
- Governed Delete / tombstone
- Relation publication pipeline
- Rights runtime enforcement
- ERA Candidate → Accept / Adjust / Split / Merge / Reject 的完整操作流

共用治理基準見 [LOC_GOVERNANCE_CORE.md](./LOC_GOVERNANCE_CORE.md)。
