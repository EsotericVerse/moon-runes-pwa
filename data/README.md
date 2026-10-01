# Data Directory

data/ 保存 source workbook、provenance 與明確的 repository records；不是網站 runtime data store。

~~~text
data/
├─ lunarunes/
│  └─ source/
│     └─ LunaRune66.xlsx
├─ source/
│  └─ all.xlsx
└─ records/
   └─ rune-readings/
~~~

Current runtime content 由 Neon canonical tables 提供。

Rules：

- LunaRunes mother/source workbook 保留來源責任，不直接成為 browser runtime store。
- repository records 是 provenance／audit record，不是第二份 Current corpus authority。
- 不建立 runtime JSON snapshot、local corpus cache 或 copied projection 作 Neon fallback。
- 資料關係以 Current Neon schema 與 ID linkage 為準。
