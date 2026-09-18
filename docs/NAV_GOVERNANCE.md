# LOC 導覽治理原則

**Status:** Current  
**Updated:** 2026-09-19

## 單一 NAV

全站只有一套正式 NAV。Current 的結構、文字、Scope type、alias、domain／mount 與共用功能入口以 `app/modular-v2/scope-registry.v2.js` 為單一執行權威；`app/modular-v2/ScopeNavV2.jsx` 只負責依目前 Scope 渲染，不保存第二份 route map。

頁內目錄、快捷選單、抽牌模式選單與內容卡片連結都屬 Page / Feature Composition，不是第二套 NAV。

## Scope 與共用功能

Current Scope domain 固定為：

- LOC：`loc.lo3rwang.cc`
- LunaRunes canonical domain：`lrunes.lo3rwang.cc`
- LunaRunes LOC mount：`loc.lo3rwang.cc/lrunes`
- Author external alias：`dlwang.lo3rwang.cc`
- Author LOC mount：`loc.lo3rwang.cc/lo3rwang`
- Admin：`admin.lo3rwang.cc`

`context`、`statics`、`culture`、`governance` 與 `search` 是共用功能。功能名稱與版型共用，實際 domain、mount、資料來源、搜尋集合、首頁／角色入口與其他 Scope 差異全部由目前 Scope Registry 注入。

Scope type 分為 `domain` 與 `directory`。`domain` 型的 canonical NAV／Feature URL 使用 domain；`directory` 型的 canonical NAV／Feature URL 使用明確 mount。`mount` 是一種 ingress 能力，不等於 alias，也不限於 directory Scope；因此 domain Scope 仍可同時擁有可用的 directory mount。resolver 必須同時辨識已註冊的 domain 與 mount，但產生正式連結時只服從 `scopeType`。LunaRunes 是 domain 型展示例：canonical 為 `lrunes.lo3rwang.cc`，同一 Scope 亦可由 `loc.lo3rwang.cc/lrunes` 進入，且 `lrunes` 不是 alias。Author 是 directory 型展示例：canonical 為 `loc.lo3rwang.cc/lo3rwang`，`dlwang.lo3rwang.cc` 才是外部 alias。

因此修改共用 NAV renderer 或共用 CSS 時，所有 Scope 同步變更；修改單一 Scope Registry data 時，只改該 Scope 的名稱、domain、資料與必要例外。

## Authority

- Current Scope / NAV authority：`app/modular-v2/scope-registry.v2.js`
- Current renderer：`app/modular-v2/ScopeNavV2.jsx`
- 全站外殼：`app/GlobalNav.jsx`、`app/GlobalFooter.jsx`

舊 route-map JSON、平行 NAV runtime、legacy static CSS/HTML、`whoami`／`manage` domain 與 `evolution` route 不得重新成為 Current。歷史差異只由 Git 保存。
