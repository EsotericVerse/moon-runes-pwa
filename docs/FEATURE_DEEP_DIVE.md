# LOC／LunaRunes 深度功能說明

**定位：** 0.9 RC 已實作能力的分析型導覽；作為 1.0 功能介紹的維護基礎。  
**文件類型：** Feature Deep Dive，不是新手操作教學、發版驗收報告或第二份 Canon。  
**內容基準：** Current main，2026-10-09。正式可用性仍以實際部署與驗收紀錄為準。

## 一、LOC 是怎樣的分析框架

LOC／月典是語言架構框架（Language Architecture Framework），不只是把文章存進資料庫，也不把圖表當成文化結論。它的核心問題是：在作品、來源、時間與關係之間，出現過什麼變化；哪些變化值得被提出作為文化脈絡的候選解釋？

同一份 canonical data 可被四種不同視角觀察：

| 視角 | 回答的問題 | 主要輸出 | 不負責什麼 |
| --- | --- | --- | --- |
| Search／搜尋 | 有哪些確實存在的內容與關聯？ | 文字、metadata、來源與作品結果 | 不憑空補寫語義或人格判斷 |
| Statistics／統計 | 特定時段內數量、來源與分類如何分布？ | 趨勢、比例、排行與圖表 | 不將頻率直接宣告為事件意義 |
| Culture／文化 | 什麼時候發生密度、來源與風格變化？ | 時間長河、時期、作品、Anchor 候選 | 不替作者擅自確立文化轉折 |
| Governance／治理 | 誰定義規則、資料從哪裡來、誰能改？ | 權限、範圍、資料責任與編輯入口 | 不以顯示層取代資料權威 |

四項功能不是四份獨立資料。它們共享同一 Scope 的 canonical tables，差異在問題、篩選及呈現方式。分析的核心順序是「觀察 → 統計 → 比較 → 提示 → 使用者確認」。

## 二、資料建築：作品、媒體、時間、來源與關係

### 2.1 Galaxy：文字作品的身份與脈絡

Galaxy 以 uid 作為作品的 canonical identity。文章、創作文字與作品摘要等有實際文本的紀錄在此保存；標題、內容、建立時間、來源、外部 URL 與可見性也是檢索和分析的條件。

關係不是靠相似標題猜測。source_id、target_id、ref_id、galaxy_link 等欄位表示來源、目標、參照與媒體連結。關係欄位是否存在、如何呈現，由實際紀錄決定，不能由畫面暗自發明。

### 2.2 Galaxy Media：媒體作為獨立資料

圖片、歌曲、影片及其他媒體可擁有自己的 URL、來源、平台、日期與 meta_tags。純媒體不應被捏造成一篇空白 Galaxy 文章，也不應為了搜尋而保存重複的影音檔案。多媒體分析關注的是 metadata 與 Galaxy 的明確關聯，而不是把所有檔案下載到同一份 corpus。

**版本邊界：** Current 已有媒體 metadata 查詢與統計能力；「既有來源 image multimedia 完整整合及 provenance 驗證」仍列在 1.0 待驗收範圍，不能寫成已全部完成。

### 2.3 Time：時間不是單一日期欄位

Time 保存時期（Period）、事件／錨點等可用來理解作品的時間脈絡。Culture 將時間當成分析維度：一篇作品不只「發表在哪一天」，還可能位於某個時期、風格轉向或事件前後。

時間標籤由管理者維護。演算法可以提出值得觀察的區段，但不能僅以密度變化直接命名一個人生階段。

## 三、Search：從命中內容到理解來源關係

Search 是基於 PostgreSQL 的精準文字／metadata 檢索，兼顧 Scope、日期、可見性、來源及分頁。它不是把全部文章抓到瀏覽器再切割，也不是把 LunaRunes Canon 當成每個 Scope 的通用語意字典。

**主要能力與差異：**

- 以文字、metadata、來源與明確的作品關係定位內容；作品列表和全文顯示是不同資料讀取階段。
- Scope 名稱或別名精確命中時，提供對應 Scope 入口，而不是偽造一篇搜尋文章。
- 時期的風格詞精確命中時，可先呈現該時期既有的簡介，再繼續查詢相關作品。
- 多媒體結果利用 URL、類型、來源與標籤查詢；曲風等 media metadata 不等同普通正文關鍵字。
- 公開搜尋遵守 searchable；有授權的管理視角可以檢視 canonical records，不能把「不公開」誤認為「資料不存在」。

**分析意義：** Search 先確立證據的存在與出處；Culture 和 Statistics 才能在相同資料責任下比較。搜尋結果本身不是對作者、事件或文化的最終定義。

## 四、Statistics：即時分布與固定分類結果並存

Statistics 關注在選定日期範圍中，作品數量、來源、時間趨勢及媒體 metadata 如何分布；畫面有折線、長條與圓餅等表示方式。一般 Scope 的資料查詢仍限定自己的 canonical tables；LOC 另可跨受管理 Scope 比較總數、比例與趨勢，但每個來源仍獨立查詢，不另存 work_count、排名快照或合併 corpus。

### 4.1 兩種不同的計算責任

**一般統計**依資料庫即時計算。其條件包含日期、Scope、statistics_able、來源與其他有效篩選；必須先以資料庫計數及 bounded pagination 限制工作量。

**關鍵詞分類統計**則刻意採「設定規則 → 明確批次分析 → 寫入文章 Attr → 公開頁直接讀取 Attr」。分類規則不會因訪客每打開一張圖而重新掃描全文。

這種分層使文化解釋可調整，卻不讓同一次統計因隱含的背景重新分類而改變結果。

### 4.2 關鍵詞庫的 Class／Group／Item

Keyword Library 是獨立的分類資源，不必依賴 Rune Canon 才能建立、編輯或複製。

- **Class**：一整套以 UUID 辨識的分類規則，可獨立複製、分享、啟用與選為目前採用版本。
- **Group**：Class 底下的群組歸屬，提供組織與排行維度。
- **Item**：具體項目、判別原理、關鍵詞與是否參與分類的設定。
- **分類結果**：Galaxy 的 class_id 表示經確認的分類編號，group_lists 表示命中項目及次數；不是把整份詞庫複製到每篇文章。
- **分析定錨**：明確執行批次後記錄 staticstime；往後的 Culture／Statistics 根據現存 Attr 顯示。

文字長度與文件數的最低門檻由 Scope 自己管理；目前預設 keyword_min_chars 為 32（須嚴格大於），keyword_min_documents 為 100（符合資格文章須嚴格大於）。不足門檻時不應製造看似完整的分類結論。

Current main 已合併 Attr SQL 批次修正及即時百分比進度；這代表實作變更已入主線，**不等同已替所有真實資料量取得完整性能驗收**。

## 五、Culture：時間長河與文化轉折如何被分析

Culture 不只是把作品按日期排成清單；單 Scope 可用時間、密度、來源、風格／分類與作品列表觀察自身脈絡，LOC 另外提供多位 Scope 成員在**時期交會與來源類別**上的有限度共同分析。

**Time River** 可以從 Period／Anchor 所定義的範圍出發，查看不同日期區段出現的作品、來源與密度。先處理時間區間，再查相應的 Galaxy／Galaxy Media；作品詳情採增量讀取，不在畫河道時載入所有正文。

**Anchor** 是文化敘事的定錨。系統可提出建議，但只有足夠資料才應建議；Current 的自動候選門檻為至少 20 筆符合資格資料。候選不是正式事件，必須由人確認後才能成為既定 Anchor。

**交會與比較**只在有明確資料條件的範圍內進行。LOC 先對多個受管理 Scope 各自的 Time 取目前開放時期，交會起點是有效開始日期中的最晚者；交會時段的作品／媒體類別日分布仍從各 Scope 的 canonical tables 分別取得，再呈現「交會時間長河」、各 Scope 數量與「綜合來源時間長河」。同為 Facebook／Threads／IG／Others 等來源分類，只代表來源類別的可比較性，不代表不同人的紀錄或作品是同一筆。缺少開放時期的 Scope 不應被憑空納入交會，交會不等於 union 或全文混合。

**文化與統計的根本差別：** 統計回答「分布怎麼變」，文化回答「哪些時間、來源及作品共同形成值得觀察的轉折」。兩者互補，但都不直接裁決文化意義。

## 六、Scope／Scope Group：可擴張而不混用資料

Scope 定義獨立的資料與治理範圍；Scope Group 定義成員的組織關係。兩者不能因為畫面看起來相似而混合。

| 責任 | Authority | 能做的事 |
| --- | --- | --- |
| Route | Next filesystem 與固定 generic shell | 既有具名路由及新 Scope 的共用功能入口 |
| Deployment／Group | silver.scope_registry | Domain、Directory、Parent、Active、排序與 Scope Group 成員關係 |
| Data mapping | silver.manage | 對應資料 Scope 及 Galaxy／Time 職責 |
| Content | 各 Scope canonical tables | 真正的作品、媒體、時間及關鍵詞資料 |
| Auth／write | `silver.manage` 的 `scope`／`admin` 兩種 role，加上既有 OAuth 與 DB policies | `scope` 只管理獲授權 Scope；`admin` 可全域管理；RLS 仍是寫入最終防線 |

**必須區分 LOC 與一般新建 Scope Group。** LOC (`loc`) 本身的 Statistics／Culture 是原有的跨 Scope 簡易比較工作台：Statistics 比較多 Scope 合併數量、占比與時間趨勢；Culture 對照各 Scope 的交會時期與相同來源類別的作品／媒體分布。其他 DB 新建 Scope Group 的 Statistics／Culture／Search 仍以 Registry Overview 與導引為主。**包括 LOC 在內的 Group Search 目前均不跨所有子 Scope 執行全文搜尋。** 這些區別不建立混合 Galaxy corpus、不複製任何 Scope 的 Canon，也不合併權限。

一般 Scope 建立時使用固定 Config／Galaxy／Galaxy Media／Time／Keywords 五件套，並以新的 UUID 取得獨立 Keyword Class 副本。後續分類、文字與治理修改都只影響新 Scope，不反向修改來源 Scope；LunaRunes 的特殊語義更不能被當成一般 Scope 預設值。

### 6.1 管理功能的實際狀態

Current 的正式管理 role **只有 `scope` 與 `admin`**：Scope 管理員依 `silver.manage` 的授權對應管理自己的 Scope，Admin 管理全域 Registry／Group／Mapping。Scope Group 是階層資料，不是第三種權限；登入狀態、public flag 與 searchable 也不是 role。Current Admin 已有 Registry 階層、群組建立、Parent 調整、Scope mapping、Theme 與權限相關功能。各 Scope 的 Governance／Manage 另有基本設定、發表文章、資料匯入等入口。

但**整合成完整且易操作的 Scope 管理工作台，仍是 0.9 收尾的主要工作**。本文件介紹已存在的責任與能力，不把尚未完成的管理介面包裝成正式交付。

## 七、Import／Source Refresh：來源可追溯、重複資料可辨識

來源整合要回答三個問題：原始資料是誰、是否已匯入、再匯入時究竟變更了什麼。

**JSON Import** 是現行需要進階處理的管理操作，提供 JSON 資料陣列路徑與欄位格式設定（可指定巢狀路徑）、逐檔預覽和有效／無效資料摘要，再以可選擇的 25／50／100／200 筆批次寫入。每批成功後才更新實際完成筆數及百分比；同批及既有資料以 UID 或「來源＋平台原生 ID」檢查重複。若來源沒有穩定 UID／原生 ID，重新選檔時無法保證重複辨識。單一 JSON 檔案目前仍由瀏覽器一次解析成物件，並非大檔的串流 JSON parser；因此建議將極大來源拆成多檔處理。**這是 Current 程式設計，尚未完成真實資料庫端匯入驗收**。

**Source Refresh** 與一般匯入不同：沿用相同欄位格式設定，以 source_name + source_native_id 精準識別來源原生紀錄，先用 bounded delta 比較新增、更新及未變更項目，再由管理者確認。新增資料依設定筆數分批寫入，更新採逐筆確認，顯示實際完成進度；中途錯誤須重新分析差異後才能再次套用，以降低重複寫入風險。來源 OAuth 可以是 adapter，但不應改寫資料刷新契約。

Media URL／provenance 與作品關係須保持獨立明確。系統不應為一則只有圖片或影片 URL 的記錄製造假正文，也不應因來源變更失去可追溯的 native ID。

**1.0 gate：** Import 實際資料回合測試、權限、重複處理、部分失敗及 provenance 驗證尚須完成；這是發版品質要求，不是已通過的功能宣稱。

## 八、LunaRunes：獨立符號語言，不是通用關鍵詞模組

LunaRunes／月之符文具有自己的 Canon 與資料權威。01–64 為八個核心群組，65 玄、66 命為特別符，第零符德是作者基準，不進一般抽牌池。九組結構、四方向與卡片／當前月相的語義責任不能被一般 LOC Scope 改寫。

抽牌從選中的 Rune、方向、當前月相及所需文字型別精準取得資料；多卡語句以既有 Situation 描述薄連接，不任意加上不存在的愛情、健康或職業領域判語。

- **抽牌**：單卡、每日、雙卡、三卡、五卡及指定張數，共用逐張隨機、不重複的 session 原則。
- **OW3gs**：11 張中第 7–11 張為核心判定區，第 1–6 張補足成因與背景，不能當成 11 張等權單卡。
- **每日紀錄**：主抽、補抽與紀錄保存是不同責任，不能因抽牌結果存在就假定已寫入紀錄。
- **符文圖鑑**：由符文本身的 canonical data 呈現；圖像是表達層，不是重新定義字義的資料來源。
- **符文遊戲**：在產品定位上是獨立創作，現階段仍與 LunaRunes 共用部分路由／runtime；進階平衡不屬 0.9 公開 Demo 的阻擋條件。

LunaRunes 可以成為 LOC 研究、分類及文化觀察的對象，但不能讓 LOC 代替 LunaRunes 產生第二份 Canon。

## 九、跨功能分析：系統的深度來自關聯，不是按鈕數量

以一組跨年份的文章、歌曲與影像紀錄為例：

1. **Search** 先確認作品存在、來源平台、原文 URL 與明確的上下層關聯。
2. **Statistics** 比較作品量、來源分布、媒體曲風 metadata，以及已經批次定錨的分類 Attr。
3. **Culture** 將變化放進 Period、Time River、事件與 Anchor 的時間脈絡，定位值得回顧的轉折。
4. **Governance** 決定何種資料可公開、何人可編輯、Anchor 是否正式成立，以及哪套 Keyword Class 可以被採用。

這不是系統自動寫出「你是什麼樣的人」，而是把不同層級的證據放回可追溯的時間與語言架構之中。使用者有權反駁分析，也有權選擇不為某段變化命名。

## 十、1.0 文件與驗收界線

本文件負責說明**深度能力、機制、關聯、適用情境與邊界**。不重複寫「第一步點哪裡」的新手教學，不把網站已校閱的文案覆寫成文件版本，也不取代下列維護權威：

- Canon／字義與定義：docs/LOC_CANON.md、docs/LUNARUNES_DRAW_GOVERNANCE.md。
- 結構與 UI 契約：docs/CURRENT_UI_CONTRACT.md、docs/DOMAIN_ARCHITECTURE.md。
- 詳細分析責任：docs/LOC-AUTOMATIC-ANALYSIS.md。
- 發版與未完成驗收：docs/RELEASE_ROADMAP.md、docs/TODO.md。

**1.0 前應再核對** Scope 管理工作台最後的 UI、Import 真實 round-trip、媒體來源整合、行動裝置及 failure state，並依最終 main 更新本文件的能力狀態；不得因說明文件已撰寫就勾選產品驗收完成。
