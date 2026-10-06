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

多卡籤詩不另造第二份語義資料。每張卡仍精準取得該 Rune、direction、current_moon 的 Situation；組句層只做最低限度的語助詞與標點整理。

- Situation 原句若以「它」起首，籤詩輸出時只把首字替換成該 Rune 名稱，例如「它……」→「月……」。
- 同一段內以「，」並列，不改寫原句核心內容。
- 兩段結構以「故」銜接。
- 三段結構以「；」分段，末段以「遂」承接。
- 不由多卡籤詩額外判定愛情、事業、關係或健康；使用者自行將籤詩帶回自身情境閱讀。

### Single

使用該 Rune、該 direction 的結果。

### Two cards

結構：**1 / 1**。  
第一張為因，第二張為果；籤詩以「故」作薄連接。

### Three cards

結構：**1 / 1 / 1**。  
源 → 轉 → 合。

### Four cards

結構：**1 / 2 / 1**。  
前段一張，中段兩張變數，後段一張。

### Five cards

結構：**2 / 1 / 2**。  
雙因 + 一個變數 + 雙果。x/y 仍可作 runtime 統計或趨勢資料，但不得覆蓋籤詩本文。

### Six cards

結構：**2 / 2 / 2**。  
前段、變數、後段各兩張。

### Seven cards

結構：**2 / 3 / 2**。  
中段變數增加為三張。

### Eight cards

結構：**3 / 2 / 3**。  
前後各三張，中段兩張。

### Nine cards

結構：**3 / 3 / 3**。  
三段各三張。

### Ten cards

語義結構：**4 / 2 / 4**。  
畫面可依 **2 / 2 / 2 / 2 / 2** 顯示；前四張合為前段，中兩張為變數，後四張合為後段。

### OW3gs

11 cards：

- 1–6：因的描述層；1–2 為源、3–4 為轉、5–6 為合。
- 7–11：核心判定層；7–8 為過去成因、9 為意外變化、10–11 為現在狀況／結果。
- 先以 7–11 形成核心判定，再用 1–6 補足造成現況的背景與條件；不得把 11 張當成等權單卡相加。
- 11 張屬同一 Draw Session，因此 Rune 全部不重複。
- 組句層同樣只做薄連接，不另生成領域判語。

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

x／y 只保留為 runtime 的趨勢／統計判定，不改寫 Rune Canon、不取代 Situation 原文，也不直接生成領域判語。

每張卡的內部權重只使用已存在的 card_attr 與 direction：

- card_attr：正面 = +1；中平 = 0；負面 = -1；未知 = 0。
- direction：正位 = +1；半正位 = +0.5；半逆位 = -0.5；逆位 = -1。
- 單卡 guidance weight = card_attr × direction。
- 雙卡：1 / 1 → x = card 1；y = card 2。
- 三卡：1 / 1 / 1 → x = card 1；card 2 是變數；y = card 3。
- 四卡：1 / 2 / 1 → x = card 1；cards 2–3 是變數；y = card 4。
- 五卡：2 / 1 / 2 → x = cards 1–2 平均；card 3 是變數；y = cards 4–5 平均。
- 六卡：2 / 2 / 2 → x = cards 1–2 平均；cards 3–4 是變數；y = cards 5–6 平均。
- 七卡：2 / 3 / 2 → x = cards 1–2 平均；cards 3–5 是變數；y = cards 6–7 平均。
- 八卡：3 / 2 / 3 → x = cards 1–3 平均；cards 4–5 是變數；y = cards 6–8 平均。
- 九卡：3 / 3 / 3 → x = cards 1–3 平均；cards 4–6 是變數；y = cards 7–9 平均。
- 十卡：4 / 2 / 4 → x = cards 1–4 平均；cards 5–6 是變數；y = cards 7–10 平均。
- trend = y - x。
- sum = x + y；overall = sum / 2。

數值只在 runtime 內部分類成「轉強／持平／轉弱」與「偏正／中性／偏負」，UI 不需要顯示原始分數。多卡籤詩不再依這些數值分拆愛情／事業／關係／健康；統計與籤詩呈現分離。

OW3gs 暫不套用 x／y 引擎，保留既有結構，直到其組合規則另行確認。
