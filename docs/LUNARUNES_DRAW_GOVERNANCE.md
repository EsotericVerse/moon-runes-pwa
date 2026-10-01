# LunaRunes Draw Governance

## Authority

Rune identity 與 card fields：silver.runes。  
Directional lots／daily text：silver.runes_etc。

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

例如 lots 只查 type=lots；Daily 只查 type=daily。不得為當次結果載入同一 Rune 其他三個方向，也不得 select all 後在 JS slice。

多卡同樣逐張取得實際抽到的 direction text。

## Grammar

### Single

使用該 Rune、該 direction 的結果。

### Two cards

**因為 A，所以 B。**

A 與 B 各自只使用實際抽到的 direction data。

### Three cards

**因為 1，但會有 2 的改變，所以 3。**

### Five cards

**因為 1、2，但會有 3 的變化，所以 4、5。**

結構是雙因 + 一個變數 + 雙果。

### OW3gs

11 cards：

**因為（因為 1、2，變數 3、4，所以 5、6），所以（因為 7、8，變數 9，所以 10、11）。**

- 1–6：因的描述層。
- 7–11：核心判定層。
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

卡片月相與真實月相分開保存。真實月相只能作次要時間情境，不覆蓋 Rune meaning、direction 或 spread Grammar。

## No numeric semantic score

LunaRunes direction／spread reading 不以平均值、概率值或加權分數取代 Grammar。需要描述趨勢時，描述狀態變化與最後落點，不能把兩者壓成單一分數。
