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

Admin 具備所有分頁與功能的完整編輯權限；內容編輯仍沿用各功能原本的所見即所得介面，不另複製一套 Admin CRUD。

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
- 時期管理者
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


## Recursive Management Tree

管理結構採用可無限遞迴的 N-ary tree；節點可代表個人、分頁、功能、小組織、部門、分公司、總公司等。

- 管理樹深度不限制。
- 每個節點以 `parent_id` 建立治理關係。
- 上層統計必須遞迴彙總所有後代節點。
- 上層搜尋可取得允許投影的後代資料，但不得改寫來源 ownership。
- 原始資料保留 canonical resource id、source node 與 provenance，避免 projection 造成語意污染。
- 分支可以拒絕或收緊上層繼承；要求向上擴張能力時必須申請並經 Audit。

### Ranking / Search Roll-up

`parent = own + all descendants`

搜尋與排行榜只聚合 projection；不得把子節點原始資料複製進父節點資料表。重複投影必須以 canonical resource id 去重。

## Inline Management UI

一般功能頁就是主要管理介面。

- OAuth 登入且具權限後，在原列表直接顯示「新增／編輯」。
- Admin 總管理者：所有功能全開。
- 分頁管理者：可編輯該分頁所有功能，並指定各功能管理者與分頁設定。
- 功能管理者：只編輯被授權功能。
- 治理頁不再複製各功能 CRUD，避免功能重複與頁面過重。
- visibility 可存在於分頁層與功能層；功能層不得突破分頁層的公開上限。

權限判定基線：

`canEditFeature = isAdmin || isPageManager || isFeatureManager(feature)`

## URL Governance

網址解析遵守 Domain First：

`Node → Host Resolution → Path Resolution → Canonical URL`

- 管理樹與公開 route 解耦。
- 同一 host 下的公開 path **最多四層**，為 hard limit。
- 超過四層不得建立 canonical route；必須更換 host/subdomain、壓平 path 或重新掛載。
- 當 parent 與 child host 不同時，path depth 從新的 host boundary 重新計算。
- canonical host 與 alias 分開管理。
- Domain Alias Group 可讓同一品牌持有多個等價網址，例如 `e-v.cc`、`e-v.com`、`e-v.com.tw`。
- 更換 canonical host 不得搬動內容 ownership；舊 host 可保留為 alias / redirect。

## Separation / Hold / Cooldown

關係處置分為：

- **封**：待查看的暫停；資料與關聯保留。
- **斷**：解除關係／開除；預設進入 CD（cooldown），避免誤操作造成不可逆資料損失。
- CD 期間停止相關權限／投影／繼承，但不刪除原始資料。
- 真正資料刪除是獨立動作，不與「斷」綁死。
- 系統仍允許低風險範圍內的即時更新與即時刪除；是否進 CD 取決於風險、影響範圍、可逆性與是否跨管理邊界。

核心原則：**斷的是關係，不是資料本身。**
