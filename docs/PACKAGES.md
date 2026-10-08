# LOC Current Packages List

**基準：** `main` / `package.json`，2026-10-09  
**Package version：** `0.9.0-rc.1`（已發布的 RC1 標籤不因後續文件更新而改變）  
**直接宣告：** 21 項 runtime dependencies、2 項 devDependencies

本頁是**現行套件與模組責任對照**，不是第二份套件宣告、升級清單或安裝教學。版本範圍必須以根目錄 `package.json` 為權威，實際鎖定版本、完整相依樹以 `package-lock.json` 為權威；更新套件時應一起更新 Manifest／Lockfile，再同步此文件。CI 使用 `npm ci` 安裝。

## Runtime dependencies

### 應用程式與 React

| Package | package.json 宣告 | 目前責任 |
| --- | --- | --- |
| `next` | `16.3.5` | Next.js 應用、路由與靜態輸出 |
| `react` | `19.3.0` | UI 元件渲染 |
| `react-dom` | `19.3.0` | React DOM 執行層 |
| `@tanstack/react-query` | `5.103.1` | 資料請求狀態與快取控制 |
| `zod` | `4.6.0` | 資料結構與輸入 schema |

### 資料層

| Package | package.json 宣告 | 目前責任 |
| --- | --- | --- |
| `@supabase/supabase-js` | `2.117.2` | Supabase Auth 與資料 API |
| `@supabase/postgrest-js` | `2.79.0` | PostgREST 資料 API 客戶端 |

### 富文字／管理

| Package | package.json 宣告 | 目前責任 |
| --- | --- | --- |
| `@blocknote/core` | `0.55.0` | 區塊式文件資料模型 |
| `@blocknote/react` | `0.55.0` | React BlockNote 編輯器 |
| `@blocknote/mantine` | `0.55.0` | BlockNote 編輯器 UI |
| `react-select` | `^5.10.2` | 管理及遊戲局部選取介面 |

### 分析、時間長河與圖形

| Package | package.json 宣告 | 目前責任 |
| --- | --- | --- |
| `recharts` | `3.10.1` | Statistics 圖表 |
| `vis-timeline` | `8.5.4` | 時間長河與時間元件 |
| `vis-network` | `10.1.0` | 關鍵詞視覺圖譜及管理樹 |
| `karaul` | `0.1.0` | 文化河道密度分析 |

### 動畫與符文遊戲

| Package | package.json 宣告 | 目前責任 |
| --- | --- | --- |
| `motion` | `13.4.4` | 介面動態效果 |
| `boardgame.io` | `0.50.2` | 符文遊戲規則／執行 |
| `@mui/material` | `^7.3.0` | 符文遊戲 UI |
| `@emotion/react` | `^11.14.0` | MUI/Emotion 樣式基礎 |
| `@emotion/styled` | `^11.14.0` | MUI/Emotion styled 支援 |
| `@dnd-kit/core` | `^6.3.1` | 符文遊戲拖曳互動 |

## Development / test dependencies

| Package | package.json 宣告 | 目前責任 |
| --- | --- | --- |
| `@axe-core/playwright` | `4.13.0` | 以 axe-core 執行瀏覽器無障礙測試 |
| `@playwright/test` | `1.63.0` | Playwright 端到端／瀏覽器驗證 |

## 與架構版本相關的注意事項

- **並非舊八模組配置：** Current 共用功能為 Search、Statistics、Culture、Governance；LunaRunes 及符文遊戲保有專用功能與資料契約。
- **LOC 不等於一般 Scope Group：** LOC Culture／Statistics 仍提供跨 Scope 有界比較；其他新建 Group 採 Registry Overview／導引。
- **套件是實作依賴，不是資料權威：** PostgreSQL canonical tables 及既有 Scope、Auth、Provider 契約決定資料責任，不從套件名稱推導可用功能。
- **MUI／Emotion／dnd-kit／boardgame.io 用於符文遊戲：** 不因共用 repository 就套用到所有 LOC 頁面；BlockNote／React Select 的責任亦以實際引用為準。
- **本次只核對套件清單，未升級、移除或改變任何 package version。** 是否清退套件須另以實際引用、建置與測試證據決定。
