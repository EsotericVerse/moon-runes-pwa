# moon-runes-pwa
MoonRunes PWA

# 🌕 月之符文占卜系統 PWA

由 [EsotericVerse](mailto:esotericverse.xy@gmail.com) 製作的純前端占卜系統，支援 GitHub Pages 部署，基於 HTML/CSS/JavaScript 架構。

---

## 📁 專案結構

```
moon-runes-pwa/
├── index.html          # 首頁（語之符文）
├── result.html         # 占卜結果畫面
├── css/
│   └── style.css       # 樣式設定
├── js/
│   ├── main.js         # 首頁邏輯（啟動占卜）
│   └── result.js       # 占卜結果處理邏輯
├── data/
│   └── runes.json      # 符文資料總表（由 Excel 匯出）
├── images/
│   └── 01_靈.png ～ 42_憶.png
└── README.md           # 本說明文件
```

---

## 🚀 功能說明

### 1️⃣ 首頁 index.html
- 顯示語之符文（語.png）
- 點擊圖卡進入占卜流程（切換為憶.png）
- 顯示洗牌動畫與說明文字
- 根據農曆日自動推算月相
- 模擬洗牌 → 抽出一張符文編號與方向 → 導向 result.html

### 2️⃣ 占卜結果 result.html
- 根據網址參數 (rune, facing, phase) 顯示對應符文資料
- 顯示圖片、圖騰、顯化形式、月相、方向說明
- 顯示靈魂咒語、分組說明、課題挑戰、符文歷史
- 提供「重新占卜」按鈕回首頁

---

## 🌙 月相對照邏輯

透過當日農曆日推斷月相：
- 農曆 1~7：新月
- 農曆 8~14：上弦
- 農曆 15~21：滿月
- 農曆 22~28：下弦
- 農曆 29~30：空亡

---

## 📦 資料來源

`data/runes.json` 是由 `LunaRune40.xlsx` 匯出整合而成，整合以下欄位：
- 編號、名稱、圖騰、顯化形式、分組、月相、靈魂咒語
- 靈魂課題、實踐挑戰、分組說明、符文變化歷史、圖片檔案名

---

## 🌐 部署方式（GitHub Pages）

1. 將整個專案上傳至 GitHub Repository
2. 進入專案頁面 → 設定（Settings）→ Pages → 選擇「main /root」
3. 點選部署 → 取得你的占卜 App 網址 🎉

---

## ⚙️ 本地測試

若要在本地端預覽 PWA，可於專案根目錄啟動簡易伺服器：

```bash
npx serve    # 或使用 python -m http.server
```

啟動後在瀏覽器開啟顯示的本地網址，即可進入 `index.html` 進行占卜流程。

---

## ✉️ 聯絡作者

📨 [esotericverse.xy@gmail.com](mailto:esotericverse.xy@gmail.com)

---

> 用月之頻率，與命運共鳴 🌙
