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
→ 衍生詞／主體性轉移
→ 統計／排行榜
→ 歷程／時間線／趨勢／軌跡
```

其中符文脈絡與符文分析核心可 **No API** 運作：直接讀取 repository 既有資料，不呼叫外部 API，也不重新掃描文章建立另一套關鍵詞。

## 符號式語言模組的實作證明

RC3 不只把 66 枚符文畫成 Graph，而是把已經整理完成的治理原則轉成可執行資料關係。

正式關鍵詞維持窄而具有獨特性；需要額外判定的少數詞另外放入 `data/json/registries/LUNARUNE_DERIVED_LEXICON.json`，不回寫 Base66 Canon。

目前可直接觀察的關係包括：

```text
靈魂 → 魂          ownership shift
界域 → 域          ownership shift
暫斷 → 封          semantic override
潛意識 → 夢        semantic ownership
水土 → 地          AB → C 主體性轉移
花枝 → 特殊        詞類／固定名詞造成 lexicalized shift
光暗 → ambiguous   對等衝突，不強迫判定
鏡花水月 → 幻      ABCD → E 主體性轉移
```

Graph 將「表面構成」與「整體語意主體」分開：

```text
surface_component_of
resolved_to
ambiguous_with
remains_special
```

因此 `鏡／花／水／月` 可以同時是「鏡花水月」的表面構成，但整體語意仍唯一 `resolved_to → 幻`。這證明 LunaRunes 不只是關鍵詞對照表，而能表現語意主體性、依存、覆寫與衝突。

最高級衝突規則也被保留為治理條件：**只有同一語意單位同時出現兩個以上有效符文候選時才啟動；單一命中不得介入。** 未完成判定時仍維持「特殊」，不為了覆蓋率強迫分類。

## RC3 已資料化的功能

- **LunaRunes / Rune Graph**：由現有正向關鍵詞、反向關鍵詞、符文、唯一群組、Ownership 規則與高價值衍生詞建立符文脈絡。
- **Runes / 符文知識庫**：`runes.html` 是目前符文脈絡 Graph 的主要展示頁，直接呈現 LunaRunes 專屬知識、表面構成、主體性轉移與衝突關係。
- **Context / 脈絡**：`context.html` 現階段允許顯示與 `runes.html` 相同的符文 Graph。這不是重複資料來源，而是共用同一套正式資料；因目前成熟的 Context 資料只有 LunaRunes，所以先以符文 Graph 作為第一個完整實例。未來新增其他脈絡資料來源後，`context.html` 再逐步擴展為跨資料來源的通用 Graph，而 `runes.html` 保持 LunaRunes 專屬展示。
- **Statistics / 統計**：正式關鍵詞排行榜與高價值衍生關係分開呈現，避免衍生詞污染 Canon。
- **Evolution / 推演**：加入 `14 → 24 → 32 → 42 → 66` 系統演化線、治理規則演化、語意拆分／主體性轉移實例與演化軌跡。
- **PWA**：Graph、analytics runtime、衍生詞 registry 與演化 registry 已納入 Service Worker cache，並保持治理資料 freshness-first。

## 推演與演化

LunaRunes 的 Evolution 分成兩種，不混為一談。

**系統自身演化**：

```text
14 → 24 → 32 → 42 → 66
```

用來呈現符文集合擴充、語意拆分與治理成熟的歷程。「混沌三兄弟」屬於典型語意拆分／正名案例；歷史狀態保留在演化紀錄，Base66 只顯示現行正式定義。

**外部語言時間變化**：古義、近代義、現代義與文化轉移可以成為 LOC 的時間分析資料，但不直接修改 LunaRunes Base66。Canon 保持穩定，Evolution 負責觀察語意如何隨時間移動。

治理演化本身也是可觀察資料：

```text
分析資料
→ 發現衝突
→ 抽象治理原則
→ 新詞驗證
→ Graph 關係重組
→ 再次分析
```

這是 RC3 的 language system evolution 實例：不是宣稱「系統自己變聰明」，而是能指出哪個分析問題促成哪條規則，以及新規則如何改變後續判定。

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
