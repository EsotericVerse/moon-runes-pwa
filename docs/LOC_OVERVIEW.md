# LOC／月典：語言系統框架介紹

**Primary:** LOC7 KM  
**Subject:** LOC／月典  
**Status:** Current public knowledge article

## LOC 是什麼？

LOC（中文名稱：**月典**）是一套語言系統框架。它不是單一資料庫、單一作品，也不是某一個網站頁面的名稱。

LOC 的用途，是把符文、情境、音樂、文字、多媒體、治理原則、文字結構與時間脈絡分成不同的功能責任，再讓它們可以被記錄、關聯、搜尋與重新使用。

因此，當使用者在 **LOC Search** 輸入「LOC」時，搜尋目標應該先回答「LOC 是什麼」，而不是把所有內含 LOC 字樣的作品全部列出來。

## LOC1–8

- **LOC1 · 符文語彙（token）**：月之符文基本語彙、語意種子、籤詩與解牌入口。
- **LOC2 · 脈絡**：關係、情境、Event、Scenario 與 Graph；月之符文沙盒是代表性實作。
- **LOC3 · 音樂**：文字與語意延伸為歌曲、歌詞與聲音。
- **LOC4 · 文字創作**：文章、小說、生活文字與敘事作品。
- **LOC5 · 多媒體**：文字、音樂、圖像、影音與跨媒介表達。
- **LOC6 · 方法論**：描述如何理解、判斷與處理；治理是其中一種方法。
- **LOC7 · 演算法（知識庫）**：把方法結構化為文字建築、KM、RAG、Search、Graph RAG 等可重複處理方式。
- **LOC8 · 推演**：加入時間、ERA、Event、Trajectory、Trend，觀察作品、語言、方法與風格如何演變。

Graph 的關係／脈絡 ownership 歸 LOC2；LOC7 提供處理 Graph 的演算法；LOC8 可在既有頁面顯示 Graph 的時間／演化 View。

## 月之符文與 LOC

月之符文是 LOC 的基本文字語彙（token）與語意種子。歷史上，LOC 是從月之符文的實際使用與延伸中逐步整理出的框架；結構上，月之符文又可被視為 LOC Framework 的完整實例／Reference Seed System。

2025-05-06 是月之符文開始形成日；之後符文逐步完成、進入小說與其他作品實作，再向 LOC1–8 的功能框架發展。

LOC 並不等於月之符文牌組本身。月之符文是基本參照，LOC 負責承接、分類、關聯、搜尋與追蹤它在不同內容與時間中的演化。使用者不必先懂符文或 LLM；會抽牌、會輸入自然語言、會看搜尋結果，就可以使用。

### 平行結構

```text
LOC：
LOC1 符文語彙（token） → LOC2 脈絡 → LOC3–5 表達 → LOC6 方法論 → LOC7 演算法（知識庫） → LOC8 推演

月之符文：
符文語彙（token） → 符文脈絡／Graph → 符文體系（文學／歌曲／影像／沙盒等延伸） → 符文演算 → 符文演化
```

## LOC Search 是什麼？

**LOC Search 是建立在 LOC 語言框架上的搜尋引擎。**

它搜尋的是 LOC 內已整理或已索引的資料，例如：

- 符文與籤詩
- 歌曲與歌詞
- 文字作品
- 圖像與影音
- 政德風與治理語句
- Threads 等公開文字 corpus
- 知識文件
- ERA、事件與關聯資料

因此，「LOC」是搜尋引擎與語言框架的名稱；真正被搜尋的是框架中的資料。

## 現行治理原則

LOC 的資料層與展示層分開：

- 原始紀錄保存歷史事實。
- Canon 可以更新，但不回寫抹除原始歷史。
- Markdown、JSON 與 Registry 可作為 KM 維護來源。
- 對外閱讀則使用 HTML、圖片或其他適合瀏覽器的 Public View。
- 搜尋結果依使用者意圖呈現，不因某個詞大量出現在作品 metadata 中，就把所有作品當作同等相關結果。

## 一句話介紹

**LOC／月典是一套把語言、作品、治理與時間脈絡整理成可搜尋、可關聯、可演化結構的語言系統框架。**

## Governance Layer

LOC 的治理層不是另一個獨立產品，而是橫跨 1–8 的控制方式。

核心原則見：

- [LOC Governance Core](./LOC_GOVERNANCE_CORE.md)
- [LOC Governance History & Trend Analysis](./LOC_GOVERNANCE_HISTORY_AND_TRENDS.md)
- [LunaRunes 66 Governance Design](./LUNA_RUNES_66_GOVERNANCE_DESIGN.md)
- [Content Rights & Privacy Governance](./LOC_CONTENT_RIGHTS_POLICY.md)

現行治理可以簡化為：

~~~text
框架穩定
＋
語言可變
＋
歷史保留
＋
異議可存在
＋
邊界可治理
＋
證據可追溯
~~~

LOC 不要求使用者接受作者的人生觀。作者的「政德風／自我治理」是 LOC6 與 LOC8 的一個完整實例：使用 Luna Codex 描述世界、用 LOC 拆分語言資料，再透過 Search、Trend、Relation 與 ERA 回看歷史語句並重新治理自己的選擇。

> **LOC 的終點不是答案，而是回饋。**
