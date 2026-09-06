# LOC Governance Core — 中立語言治理核心

**Version:** 0.2  
**Status:** Current / Governance Baseline  
**Primary Owner:** LOC6 Governance  
**Structural Owner:** LOC7 Text Architecture  
**Temporal / Life Projection:** LOC8  
**Updated:** 2026-09-07

## 1. 定位

LOC 是語言系統框架，不是教義、道德體系，也不是要求使用者接受特定人生觀的思想系統。治理層的任務，是維持描述方法、資料權責、邊界、版本、來源、異議與變更流程，使語言與文化即使持續改變，系統仍能穩定描述、比較、追溯與修正。

> **穩定的是框架，不是語言。**

LOC 治理 representation、relationship、scope、lifecycle、provenance 與 boundary；不治理人的思想本身。

這一點與早期 LOC 文件原則一致：文件只代表當前歷史位置，不構成終極真理；歷史應保留，後來的解釋可以改變，但不反向抹除原始事件與原始語句。

## 2. 兩層治理：System Governance 與 Personal Governance

### 2.1 LOC System Governance

LOC 系統層只規定：

- 資料由誰負責
- 來源如何標記
- 關係如何建立
- 邊界與權限如何定義
- 哪些內容可以公開
- 變更如何留下歷史
- 異議如何進入 review
- 推論何時可以升格為 stable / canonical

它不規定使用者應該相信哪一種人生哲學。

### 2.2 Personal Governance / 政德風

作者可用 LOC 記錄自己的價值觀、人生觀、界線、選擇、責任與語言變化；這是 LOC6 的個人治理 corpus，也是 LOC8 自我治理 feedback loop 的實際案例。

個人治理原則可以被分享、推薦、比較與搜尋，但不能因為是作者觀點而自動變成所有使用者必須採用的系統規則。

> **分享方法，不輸出服從。**

## 3. 核心原則

### 3.1 Neutrality — 中立

LOC 不預設政治、宗教、文化、道德或個人價值立場為唯一正解。不同觀點、解讀與 relation 可以並存，只要清楚標明來源、脈絡、證據與狀態。

### 3.2 Respect — 尊重

不同意見本身不是錯誤。治理不得因「不同意」直接刪除內容；異議應進入 review / dispute 流程。

尊重在 LOC 中不是要求所有人共享同一價值觀，而是要求治理行為承認他者的 domain、權利與描述資格。

### 3.3 Boundary / Domain — 界與域

現行 LOC 不以「固定普世底線」作為主要治理模型，而以 **framework boundary / domain boundary** 為主。

- **界**：分界、交界、接觸面、到哪裡為止。
- **域**：主體、資料、規則或責任可以存在與運作的範圍。
- **權責**：誰能修改、解讀、發布或決定。
- **交界**：跨域時必須協商、引用、授權或建立 governed relation。

因此：

> **LOC 對觀點保持中立，但對邊界不保持中立。**

中立不等於沒有 rights、privacy、security、ownership 或責任邊界。

### 3.4 Equal Standing — 身分平等

人的社會身分、職稱、階級、信仰或特殊角色，不使其語言天然取得更高真值。權威只能來自明確 ownership、source authority、evidence 與治理程序。

### 3.5 Contextual Validity — 脈絡適用

語言與人生版本不以「舊＝錯、新＝對」排序。某個說法可以在特定時間、脈絡與目的下適用，之後再被修正、重框或取代。

> **Self-governance is versioning, not moral judgment.**

### 3.6 Plurality — 多重描述

同一節點可以存在多個 relation、interpretation 或 competing description。LOC 應保存差異，而不是為了乾淨而強迫單一答案。

### 3.7 Traceability — 可追溯

新增、修改、刪除、異議、發布、撤回與 supersede 都必須留下 governance history。

### 3.8 Evidence before Canon

AI 推論、semantic similarity、單一意見或單一資料點都不能直接升格 Canon。Canonical / public relation 必須具有 governed source、evidence 與 authority。

### 3.9 First-person authority over lived context

對人生事件、ERA 邊界與個人狀態，演算法只能提出 candidate。使用者對自己實際經歷的第一人稱確認，優先於系統從作品日期或語義訊號推測出的時間。

## 4. 歷史完整性與版本治理

LOC 的歷史治理採近似 append-only 原則：

- 原始事件不因後來解釋而被回寫。
- 原始語句保留原文。
- 後期 interpretation 可以改變，但需建立新版本或新 relation。
- 舊 definition 可以 Historical / Superseded，但不靜默消失。
- AI rewrite 不得冒充歷史原文。
- Delete 預設為 governed removal：active 狀態移除，歷史留 tombstone。

最小模型：

~~~text
Original Record
   ↓ immutable evidence
Interpretation v1
   ↓
Interpretation v2 / dispute / supersede
   ↓
Current View
~~~

## 5. Create / Update / Delete

所有可治理物件至少支援 Create / Update / Delete，但三者都必須是治理行為。

### Create
保存建立者、時間、來源、權責與 initial status。

### Update
保存 before / after、reason、evidence、actor 與 version linkage。

### Delete
預設不等於歷史消失：

~~~text
Delete
→ remove from active use
→ tombstone / archived governance state
→ historical evidence retained
~~~

## 6. Governance Lifecycle

~~~text
Propose / Create
      ↓
Review
      ↓
Rights / Evidence / Boundary Check
      ↓
Accept / Publish
      ↓
Active
      ↓
Dispute / Change Request
      ↓
Re-review
      ↓
Keep / Amend / Add Alternative / Restrict / Withdraw / Supersede / Tombstone
~~~

建議狀態：

- proposed
- under_review
- active
- disputed
- restricted
- amended
- superseded
- withdrawn
- rejected
- tombstoned

治理狀態描述的是 evidence / lifecycle，不是思想對錯。

## 7. Relation / Graph Governance

1. semantic similarity 只能選 seed，不能創造 canonical edge。
2. relation 必須有 source、target、type、direction、source_refs、evidence status。
3. 不同 relation 可以並存。
4. 認為關係畫錯時，可 modify relation type、redirect、add alternative、dispute、withdraw。
5. 原 relation 與治理過程仍保留 history。
6. private relation 不因同步而自動公開。
7. public / canonical relation 必須經 publish governance。
8. Graph node 是 authoritative record 的 reference，不應複製後反向取代原權威來源。

## 8. Rights / Publication / Boundary Gate

Public Search 與 Graph 不得假定「資料存在於 repository」就等於可以公開。

公開最小條件：

~~~text
ownership / permission = valid
visibility             = public
rights_status          = cleared
~~~

Private / restricted / review_required 必須停在相應 domain。

Public Search 不是 bulk corpus export endpoint；完整第一方 corpus 與私人資料必須維持不同的 exposure boundary。

## 9. Self-Governance — 治理自己

自我治理不是道德綁架，也不是把目前版本升格為永恆正解。

~~~text
回顧
→ 比較
→ 發現變化
→ 理解當時脈絡
→ 辨認自己的域與他人的域
→ 修正
→ 留痕
→ 承擔選擇
→ 前進
~~~

> **拿過去的自己當資料，不拿過去的自己當枷鎖。**

## 10. 治理思想趨勢分析

依 LOC3、LOC6、Threads、政德風、ERA 與歷史對話，可觀察到治理語言的主要轉移：

~~~text
外部劇本／防衛
→ 權責辨識
→ 界線與位置
→ 等待、重建與接受未知
→ 界線內化
→ 自由與選擇
→ 自我治理、收尾與航向
~~~

這不是「前期錯、後期對」，而是治理焦點改變。

### 10.1 外部防衛 → 自我責任

早期較常處理外部話術、角色期待、侵入與防衛；後期逐漸轉向「我的位置、我的責任、我的選擇」。

### 10.2 界線 → Domain Governance

界線從拒絕侵入的防衛語言，逐步演化成 responsibility / domain / permission 的日常治理結構。

### 10.3 自由 → 自由之後的治理

自由後期不只表示離開限制，而包含收尾、取捨、航向、資源與承擔。

### 10.4 自我治理 → 系統方法

人生文字中的尊重、選擇、責任、退出、風險、界線與修正，逐步映射到 CRUD、Graph、Rights、Provenance、ERA refinement、Dispute 與 Versioning。

## 11. Governance Audit Standard

任何功能要宣稱 governance complete，至少必須回答四層：

~~~text
Principle
↓
Policy
↓
Executable Control
↓
Evidence / Audit Trail
~~~

Audit 應檢查：

- 是否保持中立與多重描述
- 是否明確定義 domain / ownership
- 是否支援 Create / Update / Delete
- 是否保留 before / after / history
- 是否有 dispute / review
- 是否有 rights / publication gate
- 是否有 provenance
- 是否可 supersede 而不重寫歷史
- 是否把推論與 Canon 分離
- 是否讓使用者保留第一人稱人生治理權

## 12. LOC1–8 Governance Responsibility

- **LOC1**：符文本體、四向、Lots 與抽牌語義權威。
- **LOC2**：情境、遊戲規則與互動定義。
- **LOC3**：歌曲／歌詞 metadata、創作 provenance 與 reasoning annotation。
- **LOC4**：文字作品與原始文本權威。
- **LOC5**：媒體 representation 與跨媒介映射。
- **LOC6**：價值、治理語言、政德風、interpretation 與治理原則。
- **LOC7**：schema、relationship、KM、Graph、validation、retrieval 與治理控制結構。
- **LOC8**：時間、事件、ERA、生活脈絡、Trend 與自我治理 feedback。

各 LOC 保有 canonical ownership；跨 LOC 只能 reference / consume / propose change，不應直接覆寫另一 domain 的 authoritative record。

## 13. Canonical Governance Position

LOC 的治理層不要求使用者接受作者的人生觀。

作者可以使用 LunaRunes（月之符文）取得與描述語意種子，再使用 LOC（Luna Codex／月典）分拆、組織與治理自己的語言系統、再利用 Search / Trend / Analysis 回看過去語句並治理自己；其他使用者可以採用、修改或拒絕這套人生方法。

因此 LOC 提供的是：

> **可描述、可比較、可追溯、可反駁、可修正、可演化的語言治理框架。**

---

**LOC Governance principle:** describe fairly, preserve context, govern boundaries, keep history, and leave room for the next version.
