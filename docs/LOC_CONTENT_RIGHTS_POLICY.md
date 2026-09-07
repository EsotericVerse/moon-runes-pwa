# LOC Content Rights & Privacy Governance

**Status:** Current  
**Authority:** LOC8 governance / LOC7 KM enforcement  
**Applies to:** corpus import, export, public search, demo, download, archive migration

LOC 的 corpus 預設建立在第一方內容（first-party content）上：作者本人創作、本人發表，或具有明確整理與索引權利的資料。

## 1. Import Gate

任何 corpus 匯入介面都必須在實際寫入前顯示權利提示，並要求使用者確認：

> **匯入前確認內容權利**  
> LOC 預設只匯入你本人創作、本人發表或你有明確權利處理的內容。請勿匯入私訊、MSN／Messenger 對話、第三方文章、未取得同意的共同創作，或其他涉及他人隱私與著作權的資料。

必要確認：
- 我確認主要內容由我本人創作，或我有權進行整理與索引。
- 我確認此資料不包含未經同意的私人通訊或第三方敏感內容。
- 若包含共同作者、引用或他人內容，標記為 `review_required`，不直接公開。

預設拒絕類型：
- Messenger 私訊
- MSN 對話
- 私人聊天紀錄
- 未授權第三方文章

## 2. Export / Publication Gate

匯出、公開下載、Demo、履歷展示或公開搜尋結果之前，都必須再次檢查權利狀態。

公開條件：

```text
ownership_status = self_authored
visibility       = public
rights_status    = cleared
```

任何 `private`、`restricted`、`review_required` 或第三方內容都不得因「已經被匯入」而自動變成可公開內容。

提示文字：

> **匯出／公開前確認**  
> 匯出檔可能包含原文、時間、來源與分析標籤。只有權利已確認且允許公開的內容，才應進入公開下載、Demo 或對外搜尋結果。平台提供資料匯出，不代表匯出內容中的所有資料都具有再次公開的權利。

## 3. Rights Metadata

Corpus record 至少應保留：

- `author`
- `source_platform`
- `source_type`
- `ownership_status`
- `visibility`
- `rights_status`
- `rights_note`

建議值：

```text
ownership_status:
  self_authored
  co_authored
  third_party
  unknown

visibility:
  public
  private
  restricted

rights_status:
  cleared
  restricted
  review_required
```

## 4. Platform export is not a rights transfer

能從 Meta、Google、Pixnet、Suno 或其他平台下載 export，只代表資料可以被取得，不代表匯出內容中的所有文字、留言、對話、圖片與第三方資料都可再次公開或建立公開索引。

## 5. Historical integrity

原始歷史紀錄不因後來的正名、分類、ERA、Concept 或治理解讀而覆寫。

> Historical records are immutable evidence. Rights metadata and interpretation may evolve; the recorded past does not.

## 6. UX priority

Import/export 權利提示屬 **P0 safety / governance requirement**，優先級高於新增 corpus、進階搜尋與自動分類。任何新增匯入流程在沒有 rights gate 前，不應視為完成。


## 7. Public Search / Anti-bulk Extraction

公開搜尋不等於完整 corpus 下載入口。

治理規則：

- Catalog / Browse 只回傳有限長度 preview，不回傳整篇全文。
- Query Search 可以回傳少量與查詢直接相關的文本結果，但不得提供「一鍵取得全部原文」的公共 API。
- 公開 bulk export 預設停用。
- 若未來提供 Owner / Private Export，必須先有身分驗證與 Rights Gate。
- `robots.txt`、著作權聲明與 UI 警語只能作為告知，不應被視為真正的存取控制。
- 任何已在瀏覽器完整顯示的內容，技術上都可能被複製；因此真正需要保護的完整 corpus 不應透過匿名公開端點整批交付。

現行折衷：

```text
Public Browse  → preview only
Public Search  → 少量 query-driven results
Bulk full text → disabled
Private owner export → future authenticated flow
```

這一條的目的不是阻止正常閱讀，而是降低以分頁／爬蟲一次搬走整個個人創作 corpus 的風險。

## 8. Rights as Domain Boundary

Rights governance is treated as a domain boundary rather than a moral ranking of content.

A record can be valid historical evidence and still remain private. A third-party text can be meaningful to analysis and still remain non-public. Importability, analyzability and publishability are separate permissions.

~~~text
record exists
≠
may be analyzed publicly
≠
may be published
≠
may be bulk exported
~~~

Crossing from private / restricted / review_required into public / cleared requires an explicit governed action.

If authorship, attribution or publication rights are disputed, the content enters review/dispute state; the system should preserve the governance record while preventing silent promotion to public Canon.

This policy implements the boundary principles in [LOC_GOVERNANCE_CORE.md](./LOC_GOVERNANCE_CORE.md).


## 9. Public Text Display Policy

全文是否可被分析，與全文是否可被公開展示，是兩個不同權限。

公開搜尋與公開 API 使用 `display_policy` 控制正文暴露程度：

```text
snippet       = 只回傳與查詢相關的文字片段
full          = 可回傳全文
metadata_only = 只回傳標題、日期、作者、來源、標籤等 metadata，不回正文
```

治理優先序：

```text
record.display_policy
→ content_type.default_display_policy
→ registry default
```

現行預設：
- 歌詞作品（`lyrics_work`）：`snippet`
- 歌曲／音樂版本 metadata：`metadata_only`
- Threads／治理文章（`governance_article`）：`snippet`
- 小說、文章、散文、生活紀錄等長文：`snippet`
- FAQ、已核准公開的知識文件：可為 `full`
- 短治理片段：可為 `full`

重要限制：
- `snippet` 不只是 UI 截短；公開 API payload 也不得夾帶完整 `lyrics`、`text`、`full_text`、`transcript` 或其他等價全文欄位。
- 搜尋、分類、Graph、RAG 與趨勢分析仍可在授權範圍內使用完整原文。
- `full` 只代表展示層允許全文；仍必須同時通過 ownership / visibility / rights gate。
- 個別內容可覆寫類型預設，例如作者自己的 Threads 文章可明確設定為 `full`；未設定時維持類型預設。
