# Current Management Hierarchy

**Status:** Current  
**Updated:** 2026-09-18

管理層級固定為：

`Admin 總管理者 → 分頁管理者 → 各功能管理者`

這是管理責任的層級，不是在治理頁建立一個抽象的「Scope 管理」選單。

## 1. Admin 總管理者

Admin 是全站 Control Plane。

負責：
- 建立、停用、調整 Scope
- Scope domain identity / canonical host / route root
- 全站共用 registry / policy
- 8 組 Theme preset
- 預設語系與其他全站設定
- Audit / global override / freeze

Admin 不直接代替各功能管理者編輯內容。

## 2. 分頁管理者

分頁管理者負責一個 Scope / 分頁層級的共通呈現，不以「Scope 管理」作為使用者可見的總選單名稱。

負責：
- 首頁 / 分頁 composition
- Primary Media
- Theme / 預設色
- 固定主題 / 隨時間輪調 / 簡單自訂色
- 分頁共通視覺

Theme 與顏色屬分頁管理者。

## 3. 各功能管理者

每個功能必須拆成自己的 manager，不共用一個 generic manager。

例如：
- 月之符文管理者
- 符文脈絡管理者 / 脈絡管理者
- 文化管理者
- 時期管理者
- Source 管理者
- 其他 Feature Manager

各功能管理者只管理自己的資料 schema、內容、排序、來源與功能設定，不覆寫分頁 Theme。

## UI Naming Rule

治理頁與管理入口應顯示具體名稱：
- 分頁管理者
- 脈絡管理者
- 文化管理者
- ERA 管理者
- 月之符文管理者
- ...

不要顯示一個籠統的「Scope 管理」選單。

## Ownership Rule

- **Admin 總管理者**：決定有哪些 Scope，以及 Scope 如何掛到系統。
- **分頁管理者**：決定該分頁 / Scope 的共通呈現。
- **各功能管理者**：決定各功能自己的資料與行為。

各功能必須切開，不合併成單一 generic manager。


## Cross-branch Audit Rule

Audit 不只適用於新增／刪除節點。

只要變更會影響另一個管理分支、另一位管理者的權責、可見性、資料歸屬或頁面結構，就必須先建立待審核變更，再由受影響方確認。

### 可直接生效

- 管理者在自己已授權分支內修改內容
- 自己分支內不影響其他分支的排序、文字與功能設定
- 不改變 ownership、parent、visibility boundary 的一般內容更新

### 需要對方 Audit

- 新增／刪除會影響對方樹狀結構的節點
- reparent / 移動節點
- 合併到另一頁面或另一分支
- 改變另一分支的開放／關閉狀態
- 改 manager ownership / permission
- 跨分支移動或重新歸屬資料
- 讓另一分支開始／停止投影某項資料
- 任何會使對方既有 manager route、權限或可見性改變的操作

### 審核狀態

結構或跨權責變更使用：

`pending → approved / rejected → applied`

在 `pending` 狀態下不得先修改 Current Tree。

### 總管理者邊界

Admin 總管理者可以建立提案、指定管理者、檢視所有分支與處理平台層設定，但「可以設定」不等於「可以跳過對方 Audit」。

當變更牽涉已分配給其他管理者的分支時，仍由受影響方確認後才套用。
