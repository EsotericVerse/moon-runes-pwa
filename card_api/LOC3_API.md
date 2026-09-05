# LOC3 歌詞語意搜尋 API v0.1

## 搜尋

`POST /loc3/search`

```json
{
  "query": "想離開消耗自己的關係，重新找回界線",
  "top_k": 8,
  "period": "",
  "era": "",
  "playlist": "",
  "category": "",
  "style": ""
}
```

排名單位是唯一歌詞作品。相同歌詞的不同旋律不會各佔一筆結果，而會分別出現在
`recommended_version` 與 `alternate_versions`。歌詞語意分數只負責選作品；作者偏好、
Suno 播放數與喜歡數只用於同詞版本內的推薦順序。

完整歌詞、末段原句及檢索文字不會寫入部署資料，也不會由 API 回傳。公開 JSON
只保存分析後的摘要、標籤、轉折欄位、分類與版本資料。

媒體連結另存於 `card_api/data/LOC3_MEDIA_LINKS_v0.1.json`。Instagram Reels
與 YouTube MV 都屬版本層的跨媒介完成度證據，不會寫進歌詞語意向量；但若版本已有
IG Reels，版本推薦分數加 20；已有 YouTube MV，加 30。兩者可累加。IG 點閱、
Suno 播放與 YouTube MV 觀看數仍維持為獨立指標。


### 作品治理與推薦

- 禁咒／符文詠唱類標記為 `hidden_exception`，不進一般 LOC3 搜尋、展示或推薦。
- 與 LOC4 有明確作品關聯的主題曲、角色曲、OP／求婚歌等，保存 `loc4_relation`，並以工作層級 `recommendation_bonus` 作小幅推薦加權。
- 現行 LOC4 關聯加權基準為 +40；搜尋端換算為有上限的小幅 prior，不會蓋過歌詞語意相似度。
- Reels／YouTube MV 仍屬版本層加權；LOC4 關聯屬作品層加權，兩者分開治理。

## 篩選值

`GET /loc3/facets`

回傳現有時期、ERA、播放清單、歌詞類型及曲風與各自筆數，供前端建立篩選器。

## 現行資料範圍

- 403 組唯一繁體中文歌詞作品
- 530 個公開 Suno 旋律版本
- 現行 ERA：P8「治理自己」（2026-09-01 起）
- P1 僅備份，不進公開搜尋
- 非繁體中文及繁簡待確認作品暫不進主索引
- 資料基準：`v0.3.2`

## 更新索引

取得最新版母資料後，在專案根目錄執行：

```bash
python card_api/scripts/build_loc3_dataset.py \
  path/to/Suno_500_公開歌詞作品主資料庫_繁中語意與留白v0.3.2.xlsx \
  card_api/data/LOC3_LYRICS_SEARCH_v0.1.json
```

這是離線建置步驟；Render 執行時不需要安裝 `openpyxl`。
建置器會產生一個索引 manifest 與兩個資料分片，三個檔案需一併提交。
