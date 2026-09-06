# LOC Governance Core — 中立語言治理核心

**Version:** 0.1  
**Status:** Working / Governance Baseline  
**Primary Owner:** LOC6 Governance  
**Structural Owner:** LOC7 Text Architecture  
**Temporal / Life Projection:** LOC8  
**Updated:** 2026-09-07

## 1. 定位

LOC 是語言系統框架，不是用來規定使用者應該相信什麼的思想體系。治理層的任務不是替語言裁定永恆真理，而是維持描述方法、資料權責、邊界、版本、來源與變更流程，使語言與文化即使持續變化，系統仍能穩定描述、比較與追溯。

> **穩定的是框架，不是語言。**

LOC 治理 representation、relationship、scope、lifecycle 與 provenance；不治理人的思想本身。

## 2. 核心原則

### 2.1 Neutrality — 中立
LOC 不預設政治、宗教、文化、道德或個人價值立場為唯一正解。不同觀點、解讀與 relation 可以並存，只要清楚標明來源、脈絡、證據與狀態。

### 2.2 Respect — 尊重
不同意見本身不是錯誤。治理不得因「不同意」直接刪除內容；異議應進入 review / dispute 流程。

### 2.3 Boundary / Domain — 域與界
治理不是無限制控制，而是畫清 responsibility、scope、permission 與 domain boundary。自由存在於界線內；不同主體可以有不同領域與責任。

### 2.4 Equal Standing — 身分平等
人的社會身分、職稱、階級或信仰不使其語言天然取得更高真值。權威只能來自明確 ownership、source authority、evidence 與治理程序。

### 2.5 Contextual Validity — 脈絡適用
語言與人生版本不以「舊＝錯、新＝對」排序。某個說法可以在特定時間、脈絡與目的下適用，之後再被修正或取代。

> **Self-governance is versioning, not moral judgment.**

### 2.6 Plurality — 多重描述
同一節點可以存在多個合理 relation 或 interpretation。LOC 應保存差異，而不是強迫單一答案。

### 2.7 Traceability — 可追溯
新增、修改、刪除、異議、發布、撤回與 supersede 都必須留下 governance history。

### 2.8 Evidence before Canon
AI 推論、semantic similarity、個人意見或單一資料點都不能直接升格 Canon。Canon / public relation 必須有 governed source 與 evidence。

## 3. 三原則：新增、修改、刪除

所有可治理物件至少支援 Create / Update / Delete。Delete 應採治理式刪除：從 active use 移除，但留下 tombstone / archived governance state 與歷史證據。後來的解釋不得把原始紀錄直接抹掉。

## 4. Governance Lifecycle

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

建議狀態：proposed、under_review、active、disputed、restricted、amended、superseded、withdrawn、rejected、tombstoned。

## 5. Relation Governance

1. semantic similarity 只能選 seed，不能創造 canonical edge。
2. relation 必須有 source、target、type、direction、source_refs、evidence status。
3. 不同 relation 可以並存。
4. 認為關係畫錯時，可以 modify relation type、redirect、add alternative、dispute、withdraw/delete。
5. 原 relation 與治理過程仍保留 history。
6. private relation 不因同步而自動公開。
7. public/canonical relation 必須經 publish governance。

## 6. Governance Event 最小模型

每個 governance event 至少保存 governance_id、object_type、object_id、action、before、after、reason、evidence_refs、submitted_at、review_status、replacement_id。這應成為各 LOC 共用控制平面，而不是每個模組各自發明流程。

## 7. Rights / Publication / Boundary Gate

Public Search 與 Graph 不得假定「在 repository 裡」就等於可以公開。公開最小條件是 ownership 已授權、visibility=public、rights_status=cleared。Private / restricted / review_required 必須停在相應 domain。

治理對觀點保持中立，但不對既定 rights、privacy、security 與 domain boundary 的越界失效保持中立。

## 8. Self-Governance — 治理自己

自我治理不是道德綁架，也不是把現在版本升格為永恆正解。

~~~text
回顧 → 比較 → 發現變化 → 理解當時脈絡 → 劃界 → 修正 → 留痕 → 選擇下一步
~~~

過去版本保留；現在版本可修改；未來版本保持可選擇。

## 9. 治理思想趨勢分析

依目前 LOC3、LOC6、Threads、政德風與 ERA evidence，可觀察到：

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

- **從外部控制轉為自我責任**：由處理外部話術、侵入與角色期待，轉向我的位置、責任與選擇。
- **界線從防衛工具變成日常架構**：逐漸成為 responsibility / domain / permission 的常態治理語彙。
- **自由從離開限制轉成管理選擇**：自由後期包含收尾、取捨、航向與承擔。
- **自我治理由價值句轉為系統方法**：尊重、選擇、責任、退出、風險、界線逐步映射到 CRUD、Graph、Rights、Provenance、ERA refinement。

## 10. Governance Audit Standard

任何功能要宣稱 governance complete，至少必須回答四層：Principle → Policy → Executable Control → Evidence / Audit Trail。

Audit 應檢查：中立與多重描述、domain / ownership、Create / Update / Delete、before/after/history、dispute/review、rights/publication gate、provenance、supersede、不把推論升格 Canon，以及使用者最後的第一人稱治理權。

## 11. LOC1–8 Governance Responsibility

- **LOC1**：符文與抽籤語義權威。
- **LOC2**：情境與遊戲規則的語意治理。
- **LOC3**：作品／歌曲 metadata 與創作 provenance。
- **LOC4**：文字作品與原始文本權威。
- **LOC5**：媒體 representation 與跨媒介映射。
- **LOC6**：價值、治理語言、原則與 interpretation authority。
- **LOC7**：schema、relationship、KM、Graph、validation 與治理結構。
- **LOC8**：時間、事件、ERA、生活脈絡與自我治理回饋。

各 LOC 保有 canonical ownership；跨 LOC 只能 reference / consume / propose change，不應直接覆寫其他 domain。

---

**LOC Governance principle:** describe fairly, preserve context, govern boundaries, keep history, and leave room for the next version.