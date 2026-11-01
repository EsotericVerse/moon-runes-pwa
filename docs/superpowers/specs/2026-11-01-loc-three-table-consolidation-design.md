# LOC Scope / Group 三表整併設計
日期：2026-11-01。狀態：實作規格；正式 DB 尚未切換。

## 目標與邊界
個人 Scope 的正式主表 silver.lo3rwang 管文章；silver.lo3rwang_anchor 管 Time、Trace、Keywords、Media；silver.loc 是唯一 Group／Scope 設定與共用管理資料表。Clerk 與 silver.manage 屬更上層的身分和授權邊界，不得把敏感欄位塞進公開文章。其他 Scope（lrunes）不能誤併到 lo3rwang，未來依可設定的資料庫及表名套用同一讀寫契約。

不中斷使用者查詢、不雙寫舊表、不動 Neon、不重匯 Facebook/Threads。UID 大小寫保留，文章 UID 與 media_link 的對象不改。每張 Anchor 表最多一個 JSONB 和一個關聯 Array，不增加未授權的索引。

## 當前正式資料庫（2026-11-01 查證）
| 舊表 | 筆數 | 整併後的用途 |
|---|---:|---|
| silver.lo3rwang（目前是 Scope 設定，非文章） | 1 | silver.loc 的 scope 設定紀錄 |
| silver.lo3rwang_galaxy | 54,196 | silver.lo3rwang 文章 |
| silver.lo3rwang_time | 888 | anchor kind=time |
| silver.lo3rwang_trace | 569 | anchor kind=trace |
| silver.lo3rwang_keywords | 166 | anchor kind=keywords |
| silver.lo3rwang_galaxy_media | 13,073 | anchor kind=media |
| silver.lo3rwang_blocks | 9 | loc scope=lo3rwang, kind=block |
| silver.lo3rwang_search_terms | 655 | loc scope=lo3rwang, kind=search_term |
| silver.lo3rwang_place | 0 | 相依清查後退休 |
| silver.loc（Group 根設定） | 1 | loc kind=group |
| silver.loc_blocks | 34 | loc kind=block |
| silver.loc_dblists | 2 | loc kind=database_target |
| silver.loc_keywords | 1 | loc kind=keyword_catalog |
| silver.loc_runtime_config | 1 | loc kind=runtime |
| silver.loc_theme | 8 | loc kind=theme |

四類 Anchor 共 14,696 筆，當前跨類 UID 無衝突；未來寫入仍須共用 UID 唯一性檢查。現有 Scope/Group 的兩個實體設定表是命名衝突，不得直接改名覆蓋。

## silver.lo3rwang_anchor 正式列契約
| 欄位 | 型別 | 原資料與意義 |
|---|---|---|
| uid | varchar(8) PK，大小寫敏感 | 四碼 Time/Trace/Keywords；八碼 Media |
| kind | text 非空 | time、trace、keywords、media |
| type | text 非空 | 各模組既有次類型 |
| title | text | 原 title 或 Keywords.name |
| description | text | 原 description 或 Keywords.desc |
| url | text | Media URL |
| meta_tags | text | 原媒體標籤、Rune 抽牌內容 |
| createtime | timestamptz | Media 時間 |
| date | date | Time 定錨 address |
| location | text | Media 地點 |
| invisible | boolean | 原可見性 |
| links | text[] | Time.anchor_ids；Trace.anchor_list；Keywords.lists；Media 空 |
| attrs | jsonb | Time.range；Trace.route_list/address/times；Keywords.uid_lists；Media 空 |

以 kind + type 恢復舊 API 欄位語意；JSONB 命名空間不混合不同類型，不複製長篇文章。不把 Facebook site_id 放入 Galaxy source_id/target_id。

## silver.loc 單表
保留 Group 根紀錄，新增可區分 kind、scope_id、key 的紀錄，用一個命名空間化屬性物件保全原來各子表所有資料。原有 loc.keyword_meta 與 loc.autocomplete_current 要收斂而非重複 JSONB。原 silver.lo3rwang 的 Scope 設定移至 loc scope 記錄；其他 Scope 的設定可用相同模型。頁面 Blocks、Theme、資料庫連線清單、Keyword catalog、Runtime、Search terms 必須逐類保留更新語義和私密／公開邊界。

## 切換／TTL
1. 寫失敗測試，建立可逆的欄位轉換與同 Scope 全域 UID 碰撞測試。
2. 先盤點全部 API、RPC、RLS、Trigger、Gateway、LOC MCP 與後台讀寫，列出每個待變更物件完整定義。
3. 新舊資料映射逐筆 COUNT 與 UID 核對後，以可回滾交易建立最終表；舊表正式服務不中斷，不長期雙寫。
4. 一次切換 Scope 表路由、文章、Anchor、Group、Worker、MCP，完整驗證之後才刪舊表。
5. 過渡欄位和暫存物件 TTL = 該次交易；若為回滾保留舊表，必須事先寫明事件性到期點和負責清理機制，禁止無期限保留。
6. GitHub main 的 npm run check:syntax、測試及 Cloudflare Production 成功才算部署；LOC MCP 需另外實測有權讀取、寫入與管理，不能用 OAuth connected 取代能力驗收。

安全約束：RLS 不可將私密文章公開；Clerk 權限不可被 public loc 設定覆蓋；不靠 DROP CASCADE 清依賴；只保留必要 UID PK B-tree，額外索引逐項論證。

## 排除的錯誤捷徑
- 不能直接把文章塞進今天已有一筆 Scope 設定的 silver.lo3rwang。
- 不能漏掉 lo3rwang_blocks、search_terms 或 Group 的五張輔助表。
- 不以大筆重匯代替關聯映射，不改 UID 大小寫。
- LOC MCP 現況僅顯示 Clerk 已連接及 Galaxy 公開讀取，尚未驗證任何管理寫入能力。

正式資料庫的新增/刪除/回填、欄位、RLS、RPC、索引必須逐項核對再實作；本文件僅固定設計，不代表已在正式庫執行。