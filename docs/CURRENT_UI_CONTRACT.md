# Current UI Contract

**Version:** 0.8.6-RC

## Identity

Homepage title: LOC月典  
Homepage explanation: 語言架構框架（Language Architecture Framework）  
LunaRunes explanation: 符號式語言（Symbolic Language）

## Navigation

全站只有一套正式 NAV。GlobalNav 使用 ScopeNav；Page 內的選單、抽牌模式、圖鑑分類與管理選單都屬局部 UI，不建立第二套全站 NAV。

Current 共用功能固定為：

- Statistics
- Culture
- Governance
- Search

LunaRunes 首頁主流程固定為：

1. Hero 主視覺：LunaRunes artwork、單卡抽籤與每日符文主入口。
2. 次要功能列：符文圖鑑、符文遊戲、每日符文紀錄。
3. 月之符文籤詩系統介紹。
4. 基本判讀順序。
5. 其他指定張數抽牌。
6. 判讀與回測結果。

Hero、功能列與內容段落依層級分工，不重複建立同一組主入口。雙卡／三卡／五卡保留既有牌陣結構；4／6／7／8／9／10 張使用指定抽牌數量 select；11 張維持 OW3gs。

NAV URL 由 Current Scope registry 產生；實際 route 是否存在由 Next filesystem 決定。

## Scope presentation

- LOC 使用 loc.lo3rwang.cc。
- LunaRunes canonical domain 為 lrunes.lo3rwang.cc，並可由 loc.lo3rwang.cc/lrunes 進入。
- Author canonical mount 為 loc.lo3rwang.cc/lo3rwang。
- Admin 使用 admin.lo3rwang.cc。

一般 Scope 不因缺少設定而繼承 LunaRunes 的關鍵詞、Style、Canon 或特殊 route 定義。

## Analysis presentation

Homepage 與共用分析以 Culture、Statistics、Search 為主：

- 單 Scope Culture 顯示時間、密度、來源與 Anchor；Scope Group Culture 只顯示 Registry Overview 與各 Scope 文化入口。
- 單 Scope Statistics 顯示自己的數量、來源、時間趨勢與圖表；LOC Scope Group Statistics 只做 Overview／導引，不跨 Scope 計算合併總數或占比。
- 單 Scope Search 顯示精準文字／metadata 結果；Scope Group Search 只做 Scope Overview／導引，不同時搜尋所有子 Scope。Scope ID／中文名／英文名精確命中時只顯示對應 Scope 首頁入口並停止；風格關鍵詞精確命中時，先顯示時期設定中的短介紹，再列出一般相關結果。
- Governance 說明規則與管理責任。

不再以固定八模組圖作為 Current UI 架構定義。

## Theme

八組 Theme 必須各自提供完整 palette。切換 Theme 時不得從上一組或其他 Theme 繼承缺少的 palette token。共用 geometry 與 typography 可以共用；palette、surface、state、background 與 shadow 由 Theme 自己負責。

## Localization boundary

固定 UI copy 可集中管理，但下列內容不得因 UI localization 被改寫：

- Galaxy／作品正文
- 歌詞、文章與創作文字
- LunaRunes rune name／English name
- LunaRunes Canon 語意
- 抽牌方向與籤詩 canonical data

## Keyword Library

lo3rwang Manage 的關鍵詞庫以 Class 為第一層。每個 Class 自己保存 Group、是否參與 Class 判定、項目名稱、判別原理與關鍵詞；整套 Class 可以複製成另一套獨立分類庫。Keyword Library UI 不依賴 LunaRunes Canon 才能顯示或編輯分類結構。

關鍵詞分析門檻屬於 Scope 自己的設定，不是 Admin 全域設定。lo3rwang 的 `keyword_min_chars` 預設為 32；正文去除空白後必須 **大於** 此值才進入關鍵詞分析。小於等於門檻的作品不分析，也不列入未分類母數。符合資格文章必須 **大於** `keyword_min_documents`（預設 100）才啟用關鍵詞統計。

每套 Keyword Class 使用 UUID，Scope 以 `current_keyword_class_id` 指向目前採用版本，並以 `keyword_class_share_enabled` 控制分享授權。規則修改後不即時計算；Scope 管理者明確執行一次批次分析，系統依時間順序完成分類並把結果寫入 Galaxy Attr：`class_id` 保存唯一 1–8 Class，`group_lists` 保存命中項目與次數；`false` 表示不參與分析，空 object 表示有參與但未命中。完全平手只在候選 Class 間依當下累積文章數動態分配，最後不保留 tie 狀態。

批次完成後以 `staticstime` 定錨；Statistics／Culture 只讀文章 Attr 與定錨 metadata，不重新讀全文或關鍵詞庫跑分類器。

## Management visibility

管理頁必須能看到 canonical records，即使：

- Scope 的 public Search／Statistics／Culture flag 關閉；
- Galaxy searchable=false。

Public visibility 與 management visibility 是不同責任。
