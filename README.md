# 🌕 月之符文占卜系統 PWA

由 [月語之境工作室](mailto:esotericverse.xy@gmail.com) 製作的月之符文占卜系統，支援 GitHub Pages 部署，基於 HTML/CSS/JavaScript/python 架構的漸進式網頁應用程式 (PWA)。

---

## ✨ 主要特色

- 🎯 **多種占卜模式**：支援兩種不同的占卜界面和流程
- 🤖 **AI 建議生成**：整合 AI 模型提供個人化建議
- 📱 **PWA 支援**：支援離線使用和安裝到桌面
- 🎨 **響應式設計**：適配各種裝置螢幕尺寸
- 🎲 **豐富符文庫**：包含64張精美符文圖像及詳細解釋

---

## 📁 專案結構

```
moon-runes-pwa/
├── 🏠 首頁系統
│   ├── index.html              # 主要占卜首頁
│   ├── result.html             # 占卜結果展示頁
│   └── fate.html               # 替代占卜結果頁
├── 🤖 python on render
│   └── card_api
├── 🎨 樣式與資源
│   ├── css/
│   │   └── style.css           # 主要樣式檔
│   ├── 64images/               # 符文圖像庫
│   └── icons/                  # PWA 圖示
├── ⚙️ 應用邏輯
│   ├── js/
│   │   ├── main.js             # 首頁占卜邏輯
│   │   ├── result.js           # 結果頁處理邏輯
│   │   ├── daily.js            # 每日占卜抽牌邏輯
│   │   └── fate.js             # 原始單卡占卜邏輯
├── 📱 PWA 配置
│   ├── manifest.json           # PWA 應用清單
│   ├── service-worker.js       # 離線快取邏輯
│   └── favicon.ico             # 網站圖示
└── 📚 文檔
    └── README.md               # 專案說明文件
```

---

## 🚀 功能詳解

### 🎯 占卜系統

#### 1️⃣ 主要占卜流程 (index.html → result.html)
- **起始畫面**：顯示「玄之符文」卡牌
- **占卜啟動**：點擊卡牌開始占卜流程
- **洗牌動畫**：模擬真實占卜的洗牌過程
- **月相計算**：根據當日農曆自動推算月相
- **符文抽取**：隨機選擇符文編號與朝向
- **結果展示**：詳細顯示符文含義與解釋

#### 2️⃣ 替代占卜界面 (fate.html)
- 提供不同風格的占卜結果呈現
- 使用 `fate.js` 處理占卜邏輯
- 支援重新占卜功能

### 🤖 AI 建議功能 
python on render . testing

### 🌙 月相系統

#### 月相對照邏輯
```
農曆 1~7日   → 新月 🌑
農曆 8~14日  → 上弦 🌓
農曆 15~21日 → 滿月 🌕
農曆 22~28日 → 下弦 🌗
農曆 29~30日 → 空亡 ⚫
```

### 📱 PWA 功能

- **離線支援**：透過 Service Worker 實現關鍵資源快取
- **桌面安裝**：支援「新增至主畫面」功能
- **響應式圖示**：提供 192x192 和 512x512 尺寸圖示
- **獨立顯示**：以全螢幕模式運行，類似原生應用

---

## 📊 數據資源

### 圖像資源

- **64images/**: 64張高品質符文圖像
- **icons/**: PWA 應用圖示 (192px, 512px)

---


## 🛠️ 技術架構

### 前端技術棧

- **HTML5**：語義化標記結構
- **CSS3**：現代響應式樣式
- **原生 JavaScript**：無框架依賴的輕量實現
- **python**：占卜結果
- **PWA**：Service Worker + Web App Manifest

### 外部依賴

```javascript
// 農曆計算庫
'https://cdn.jsdelivr.net/npm/solarlunar@2.0.7/lib/solarlunar.min.js'


```

### 瀏覽器支援

- ✅ Chrome 60+
- ✅ Firefox 60+
- ✅ Safari 12+
- ✅ Edge 79+
- 📱 iOS Safari 12+
- 📱 Android Chrome 60+

---

## 🎨 自定義指南

### 新增符文

1. 在 `64images/` 目錄新增符文圖像
2. 更新 `data/runes64.json` 新增符文資料
3. 確保圖片檔名與 JSON 中的檔名對應

### 修改樣式

編輯 `css/style.css` 檔案：
- 調整色彩主題
- 修改布局結構
- 自定義動畫效果

### 擴展功能

- **新增占卜模式**：參考 `js/main.js` 實現邏輯


---
## 🙌 貢獻指南

歡迎任何形式的貢獻！若有新的想法或改進，請按照以下流程：
1. Fork 此倉庫並建立新的分支
2. 提交修改後發送 Pull Request
3. 共同討論並完成合併 🎉

## 📞 聯絡資訊

**月語之境工作室**
- ✉️ Email：[esotericverse.xy@gmail.com](mailto:esotericverse.xy@gmail.com)
- 🌐 專案首頁：透過 GitHub Pages 部署網址訪問

---

## 📄 授權資訊

本專案為開源項目，歡迎在遵循相關授權條款的前提下自由使用、修改和分發。

---

> *用月之頻率，與命運共鳴* 🌙✨
