# Current UI Contract

**Version:** 0.8.5.1-RC

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

1. 符文 Reels
2. 四個主選項 line：單卡抽籤、符文圖鑑、符文遊戲、每日符文紀錄
3. 基本判讀程序
4. 選擇抽牌

「選擇抽牌」直接使用可點牌型卡片，不再另設「命運句基本結構」說明層，也不再重複印一排標準抽牌選項。雙卡／三卡／五卡只保留必要結構 1/1、1/1/1、2/1/2；每日仍由單卡抽籤頁內切換；4／6／7／8／9／10 張使用指定抽牌數量 select。

NAV URL 由 Current Scope registry 產生；實際 route 是否存在由 Next filesystem 決定。

## Scope presentation

- LOC 使用 loc.lo3rwang.cc。
- LunaRunes canonical domain 為 lrunes.lo3rwang.cc，並可由 loc.lo3rwang.cc/lrunes 進入。
- Author canonical mount 為 loc.lo3rwang.cc/lo3rwang。
- Admin 使用 admin.lo3rwang.cc。

一般 Scope 不因缺少設定而繼承 LunaRunes 的關鍵詞、Style、Canon 或特殊 route 定義。

## Analysis presentation

Homepage 與共用分析以 Culture、Statistics、Search 為主：

- Culture 顯示時間交會、密度、來源與 Anchor。
- LOC Statistics 固定最近一年，依 `scope_id` 顯示數量與密度；單 Scope 可選時間區間。
- Search 顯示精準文字／metadata 結果。
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

## Management visibility

管理頁必須能看到 canonical records，即使：

- Scope 的 public Search／Statistics／Culture flag 關閉；
- Galaxy searchable=false。

Public visibility 與 management visibility 是不同責任。
