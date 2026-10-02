# LunaRunes Draw Governance

## Authority

Rune identity 與 card fields：silver.runes。  
Directional lots、Situation 與 Daily text：silver.runes_etc。

Draw UI 不保存第二份 Rune Canon。

## Draw pool

- 一般抽牌使用 01–66。
- 第零符 德不進抽取池。
- 同一 Draw Session 內 Rune 不重複。
- 每抽一張執行一次 rune-selection random，抽出後從當次候選池移除。
- 不以一次 shuffle／batch random 取代逐張 random。
- direction random 與 rune-selection random 分離。
- 新 Draw Session 重新使用完整 66 Rune pool。

Current ritual 5 秒與逐次 random 是刻意行為，不因效能重構自行移除。

## Directions

方向固定為：

1. 正位
2. 半正位
3. 半逆位
4. 逆位

DB code 1–4 僅是儲存形式；UI 可以依 locale 顯示 label，但不得改寫 canonical meaning。

## Precise directional query

單卡解讀只讀當張：

- rune_id
- selected direction
- requested type

例如 lots 只查 type=lots。Situation／Daily 必須再帶 current_moon，直接命中當次實際候選；不得把五個月相一次載入後再由 JS 篩選。

Situation 候選固定以 (rune_id, dir, current_moon) 精準取得 sit_q／sit_a。64 Rune × 4 directions × 5 current moon = 1280 個候選組；Rune 自身 moon_phase 已隨 rune_id 固定，因此卡片月相與當前月相的交互由這個候選組承載。

Daily 同樣以 (rune_id, dir, current_moon) 精準取得 sit_q／sit_a／daily_r／daily_g／daily_b。玄、命若沒有原始 Situation／Daily 母資料，不生成替代內容。

多卡同樣只取得實際抽到的 Rune、direction 與當前月相資料。

## Grammar

### Single

使用該 Rune、該 direction 的結果。

### Two cards

**因為 A，所以 B。**

A 與 B 各自只使用實際抽到的 direction data。

### Three cards

**因為 1，但會有 2 的改變，所以 3。**

### Five cards

結構固定為雙因 + 一個變數 + 雙果。

1–2 是前段 x，4–5 是後段 y；第 3 張保留為變數卡，不硬塞進 x／y。五卡不強迫把五段 Situation 文字拼成一個假裝自然的長句。完整 Situation 原文保留展示，通用建議由 x／y 引擎判斷前後趨勢與總和。

### OW3gs

11 cards：

**因為（因為 1、2，變數 3、4，所以 5、6），所以（因為 7、8，變數 9，所以 10、11）。**

- 1–6：因的描述層；1–2 為源、3–4 為轉、5–6 為合。
- 7–11：核心判定層；7–8 為過去成因、9 為意外變化、10–11 為現在狀況／結果。
- 先以 7–11 形成核心判定，再用 1–6 補足造成現況的背景與條件；不得把 11 張當成等權單卡相加。
- 11 張屬同一 Draw Session，因此 Rune 全部不重複。
- 不把 11 張當成等權單卡相加。

## Daily

Daily 抽牌與 Daily record 分開：

- 抽牌本身不因已有 record 被禁止。
- Main 單張可以構成完整結果。
- Supplement 是使用者要求的補充，不預抽。
- Main + Supplement 若屬同一 session，兩張 Rune 不重複。
- 是否保存 record 由使用者決定。

## Moon phase

卡片月相與真實月相分開保存。Situation／Daily 的文字候選必須使用當次真實月相 current_moon 精準查詢；卡片月相由 Rune 本身 moon_phase 固定。月相交互不以額外生成文字替代原始母資料。

## X/Y guidance engine

x／y 只負責通用建議，不改寫 Rune Canon，也不取代 Situation 原文。

每張卡的內部權重只使用已存在的 card_attr 與 direction：

- card_attr：正面 = +1；中平 = 0；負面 = -1；未知 = 0。
- direction：正位 = +1；半正位 = +0.5；半逆位 = -0.5；逆位 = -1。
- 單卡 guidance weight = card_attr × direction。
- 雙卡：x = card 1；y = card 2。
- 三卡：x = card 1；card 2 是變數；y = card 3。
- 五卡：x = cards 1–2 平均；card 3 是變數；y = cards 4–5 平均。
- trend = y - x。
- sum = x + y；overall = sum / 2。

數值只在 runtime 內部分類成「轉強／持平／轉弱」與「偏正／中性／偏負」，UI 不需要顯示原始分數。愛情／事業／關係／健康只使用可重複的通用短建議，不假裝生成獨一無二的語意句。

OW3gs 暫不套用 x／y 引擎，保留既有結構，直到其組合規則另行確認。
