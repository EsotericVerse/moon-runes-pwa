# Scope Home Page Composition

**Status:** Current  
**Updated:** 2026-09-18

## Scope Home Hero

所有 Current Scope 首頁共用同一個首頁 Hero 組成：

`第一欄：Primary Media Slot → 第二欄：Title / Copy / Primary Actions`

第一欄是 Scope Home 的唯一主要媒體槽位；不得在 Hero 再建立第二個並列或競爭性的媒體槽位。

## Single-media rule

每個 Scope Home Hero 最多只能有 **1 個 primary media item**。它可以是：

- 單一圖片
- 單一 Reels
- 單一 YouTube
- 其他單一多媒體 embed / link

不得同時放兩張主圖、兩支影片，或圖片與影片並列成多個主要媒體入口。

同一 primary media item 的 embed 與「觀看原始內容」連結視為同一媒體項目的呈現，不算第二個 media item。

其他示範影片、相關媒體、延伸作品應移到其所屬 Feature / content page，不占用 Scope Home 的 primary media slot。

## Shared layout

Current Scope Home 應使用共用 `scope-home-hero` / `scope-home-media` / `scope-home-copy` composition，而不是各 Scope 自行建立互不相容的 Hero 版型。

目前適用：

- LOC
- LunaRunes
- lo3rwang
- 未來新增的內容 Scope

Admin 是 Control Plane，不視為一般內容 Scope Home。

## Boundary

這條規則限制的是 **Scope Home 的 primary promotional / identity media**。頁面下方屬於 Feature 本身、資料說明、功能操作所必要的內容圖表或卡片，不因本規則被禁止；但不得把它們包裝成第二個 Scope Home 主媒體。
