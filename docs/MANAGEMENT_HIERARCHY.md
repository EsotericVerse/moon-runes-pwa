# Current Management Hierarchy

**Status:** Current  
**Updated:** 2026-09-18

管理層級固定為三層：

`Admin → Scope 管理 → 分支管理`

## 1. Admin

Admin 是全站 Control Plane。

負責：
- 建立、停用、調整 Scope
- Scope 的 domain identity / canonical host / route root
- 全站共用 registry / policy
- 8 組 Theme preset
- 預設語系與其他全站設定
- Audit / global override / freeze

Admin 不直接負責各分支內容編輯。

## 2. Scope 管理

Scope 管理負責該 Scope 的共通呈現與共用設定。

例如：
- LOC
- LunaRunes
- lo3rwang

Scope 層負責：
- Scope Home composition 設定
- Scope Primary Media
- Scope Theme / 預設色
- Theme 固定／隨時間輪調／簡單自訂
- Scope 共通視覺設定

Theme 與顏色屬 Scope 層，不由各分支自行覆寫。

## 3. 分支管理

分支管理負責 Scope 內更細的功能、資料與頁面內容。

例如：
- 月之符文管理
- 符文脈絡管理
- ERA 管理
- Culture 管理
- Source 管理
- 其他 Feature / Branch manager

分支管理可以管理自己的資料 schema、內容、排序、來源與功能設定，但不取得 Scope Theme ownership。

## Ownership Rule

- **Admin** 決定「有哪些 Scope、Scope 怎麼掛到系統」。
- **Scope 管理** 決定「這個 Scope 整體怎麼呈現」。
- **分支管理** 決定「這個 Scope 裡某一分支的內容與功能怎麼管理」。

不要把三者合併成單一 generic manager，也不要讓分支設定反向覆蓋 Scope identity。
