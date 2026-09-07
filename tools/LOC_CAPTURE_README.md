# LOC Browser Capture

這支工具只負責「開瀏覽器 → 你自己登入／搜尋 → 抓目前頁面的可見文字＋URL → 存成 JSON」。

不做關鍵字解析，不做 embedding，不做 KM 分類。

## 安裝

```bash
pip install -r tools/requirements-capture.txt
python -m playwright install chromium
```

## 單頁抓取

```bash
python tools/loc_capture.py "https://www.threads.com/" --mode page
```

瀏覽器打開後，你可以自行登入、搜尋、切到想收的頁面。回終端機按 Enter，程式抓當前頁：

- title
- visible text
- current URL
- links
- source
- capture time
- content hash

## 整頁捲動後抓

適合 IG profile、Threads 搜尋結果等需要 lazy load 的頁面。

```bash
python tools/loc_capture.py "https://www.instagram.com/" --mode scroll --scrolls 12
```

## 分頁抓

```bash
python tools/loc_capture.py "https://example.com/list" --mode pages --next-selector "a[rel=next]" --max-pages 10
```

## 指定搜尋關鍵字

```bash
python tools/loc_capture.py "https://www.threads.com/" --mode page --keyword "人生月台"
```

這個 keyword 只會記錄「這次是因為什麼搜尋而抓到」，不會做任何內容分析。

## 輸出

預設：

```text
data/json/inbox/loc_capture.json
```

可改：

```bash
python tools/loc_capture.py "https://www.threads.com/" --out my_capture.json
```

同一個輸出檔會用 capture ID 去重。

## 登入狀態

預設使用：

```text
.loc-browser-profile
```

這是本機瀏覽器 profile。第一次登入後，下次可以沿用。不要把這個資料夾提交到 Git。
