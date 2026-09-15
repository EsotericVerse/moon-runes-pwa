# LOC Canon 1.2

**Status:** Current Canon  
**Date:** 2026-09-15  
**Supersedes:** LOC Canon 1.1 for module architecture and presentation governance. Historical Canon remains preserved.

## 1. Core identity

LOC（月典）是 Language Module Framework。LunaRunes（月之符文）是 Symbolic Language Module，也是 LOC 的起點與參考實作，但不是使用 LOC 的門檻。

母資料與 Base66 定義由既有 Canon／Spec 管理；本版不修改固定符文資料。

## 2. Current eight-module architecture

網站與架構圖不顯示 LOC1–LOC8 編號；以下順序只用於 Canon 定義與架構治理。

| Order | Module | 中文 | Responsibility |
|---|---|---|---|
| 1 | LunaRunes | 月之符文 | 語彙與符號式語言參考實作 |
| 2 | Context | 脈絡 | 關係、情境、事件與 Graph 分析環境 |
| 3 | Music | 音樂 | 聲音作品、歌詞與音樂語料 |
| 4 | Literary | 文字創作 | 原文、版本、敘事與文字資產 |
| 5 | MultiMedia | 多媒體 | 圖像、影音與跨媒介表達 |
| 6 | Algorithm | 演算法 | 方法論集合、規則與可重現處理 |
| 7 | Module | 模組 | 演算法、資料、知識與功能的封裝組合 |
| 8 | Culture | 文化 | 文字演化、時期、時間線、軌跡、趨勢與擺盪 |

## 3. Methodology → Algorithm → Module

Methodology 沒有退出 LOC，而是**整併進 Algorithm**。

分析方法、判讀程序、分類原則、比較規則、治理方法等 Methodologies，由 Algorithm 組織為可重現、可驗證的處理；Algorithm 可在 Context 提供的關係與情境上執行分析。Module 再把演算法與資料、KM、Search、RAG、Graph RAG 及其他功能封裝成可維護、可組合的系統單元。

**Methodologies → Algorithm → Module**

Context 提供分析所需的脈絡，不承擔 Methodology 的模組位置。自動分析屬於 Algorithm 對 Context 的運作關係。

## 4. Culture boundary

Culture 是文字的演化。它負責把語彙、作品、事件與治理版本放回 ERA／Timeline，觀察 Trajectory、Trend、Oscillation 與跨期變化。

架構圖中的箭頭表示資料、分析與模組組合關係，**不等於演化本身**。既有 `/evolution` 路由可作相容入口，但公開模組名稱使用 **Culture｜文化**。

## 5. Governance is cross-cutting

Governance 不是第九個功能模組，而是跨八模組的共同邊界：

**Identity · Schema · Ownership · Provenance · Versioning · Permission**

Canon／Base、來源紀錄、Registry、衍生 View 與功能模組各自保有責任邊界；跨模組透過資料契約交換。分析與推論可以新增可追溯關係，不得靜默覆寫上游事實或母資料。

## 6. Presentation Governance

LOC 採 Progressive Disclosure（漸進揭露），對外呈現以「一個淺、一個深」為基本治理規則：

- **淺層／入口層**：說明這是什麼、能做什麼、使用者如何開始。
- **深層／專業層**：說明系統責任、資料角色、處理邊界、模組關係、技術與治理證據。

同一功能名稱可以在不同深度出現，但不得直接複製相同文案。入口層以使用意圖為主；架構與治理層以責任、關係、技術與證據為主。

此原則適用於 LOC 首頁、LunaRunes 頁面與作者頁等主要對外介面。

## 7. Compatibility and history

歷史資料與舊版名稱可以保留於歷史文件，但現行 UI、Current UI Contract 與新文件應以本 Canon 的八模組名稱為準。不得因保留歷史而讓 `Evolution｜推演` 或 `演算模組` 回流成現行模組名稱。

既有路由、資料檔名或相容層可以暫時保留舊技術名稱，只要公開語意與 Canon 邊界清楚，且相容層不反向污染現行定義。
