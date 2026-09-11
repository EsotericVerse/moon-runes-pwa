# RC3｜Data-backed Release Candidate

RC3 的重點不是單純增加功能，而是讓 LOC 的主要公開功能開始由**正式資料**驅動。

在 RC3 之前，部分頁面已具備結構、入口與互動骨架，但資料仍偏展示或尚未完整接入。RC3 將現有 LunaRunes Canon 與既有資料鏈正式接入脈絡、統計與推演，使主要頁面不再只是空白框架。

## RC3 的核心意義

**RC3 = Data-backed release candidate.**

目前以 LunaRunes 為第一套完整資料來源，直接使用現有 Canon 與 `data/json/core/runes.json`，不建立第二套符文定義。

主要資料鏈：

```text
LunaRunes Canon
→ 正向／反向關鍵詞
→ 符文
→ 唯一群組
→ Graph
→ 統計／排行榜
→ 歷程／時間線／趨勢／軌跡
```

其中符文脈絡與符文分析核心可 **No API** 運作：直接讀取 repository 既有資料，不呼叫外部 API，也不重新掃描文章建立另一套關鍵詞。

## RC3 已資料化的功能

- **LunaRunes / Rune Graph**：由現有正向關鍵詞、反向關鍵詞、符文、唯一群組與既有規則建立符文脈絡。
- **Runes / 符文知識庫**：`runes.html` 是目前符文脈絡 Graph 的主要展示頁，直接呈現 LunaRunes 專屬知識與關係資料。
- **Context / 脈絡**：`context.html` 現階段允許顯示與 `runes.html` 相同的符文 Graph。這不是重複資料來源，而是共用同一套正式資料；因目前成熟的 Context 資料只有 LunaRunes，所以先以符文 Graph 作為第一個完整實例。未來新增其他脈絡資料來源後，`context.html` 再逐步擴展為跨資料來源的通用 Graph，而 `runes.html` 保持 LunaRunes 專屬展示。
- **Statistics / 統計**：加入符文關鍵詞排行榜與符文結構統計。
- **Evolution / 推演**：加入符文資料歷程、符文結構時間線、群組關鍵詞趨勢與群組軌跡。
- **PWA**：Graph 與 analytics runtime 已納入 Service Worker cache。

## 分類治理

符文脈絡沿用現行治理，不另造分類規則：

```text
預設群組 = 特殊
→ 詞類／句內語意角色
→ 群組主體性
→ 唯一群組
→ 個別符文
→ 正反面／衝突校準
```

群組為唯一值；尚未完成判定的語意初始統一標記為「特殊」。

## RC3 收斂原則

RC3 之後優先處理：

1. runtime 與 Render 效能
2. PWA / cache / responsive 實機驗證
3. 資料一致性與 fallback
4. 既有功能驗收與錯誤修正
5. 文件同步

不再為了填頁面而新增沒有資料支撐的功能。未來新增其他 Context／Evolution 資料來源時，沿用目前已建立的同一套底層架構。
