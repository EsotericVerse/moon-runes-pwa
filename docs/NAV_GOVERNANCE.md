# LOC 導覽治理原則

**Status:** Current  
**Updated:** 2026-09-19

## 單一 NAV

全站只有一套正式 NAV。Current 的結構、文字、domain 與共用功能入口以 `app/site-registry.js` 為單一執行權威；`app/ScopeNav.jsx` 只負責依目前 Scope 渲染，不保存第二份 route map。

頁內目錄、快捷選單、抽牌模式選單與內容卡片連結都屬 Page / Feature Composition，不是第二套 NAV。

## Scope 與共用功能

Current Scope domain 固定為：

- LOC：`loc.lo3rwang.cc`
- LunaRunes：`lrunes.lo3rwang.cc`
- Author external alias：`dlwang.lo3rwang.cc`
- Author LOC mount：`loc.lo3rwang.cc/lo3rwang`
- Admin：`admin.lo3rwang.cc`

`context`、`statics`、`culture`、`governance` 與 `search` 是共用功能。功能名稱與版型共用，實際 domain、mount、資料來源、搜尋集合、首頁／角色入口與其他 Scope 差異全部由目前 Scope Registry 注入。

Author Scope 採雙入口：`dlwang.lo3rwang.cc` 是外部 alias；`loc.lo3rwang.cc/lo3rwang` 是明確註冊的 LOC mount。兩者只映射到同一個 `scope_id=lo3rwang`，不得使用 substring、遞迴或任意 path 名稱猜測 Scope。

因此修改共用 NAV renderer 或共用 CSS 時，所有 Scope 同步變更；修改單一 Scope Registry data 時，只改該 Scope 的名稱、domain、資料與必要例外。

## Authority

- Current Scope / NAV authority：`app/site-registry.js`
- Current renderer：`app/ScopeNav.jsx`
- 全站外殼：`app/GlobalNav.jsx`、`app/GlobalFooter.jsx`

舊 route-map JSON、平行 NAV runtime、legacy static CSS/HTML、`whoami`／`manage` domain 與 `evolution` route 不得重新成為 Current。歷史差異只由 Git 保存。
