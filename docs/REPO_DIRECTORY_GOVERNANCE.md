# Repository Directory Governance

## Current structure

~~~text
app/        Next.js routes, UI, clients and feature modules
assets/     governed runtime/domain assets
pics/       approved source/site images currently referenced by the app
data/       source workbooks and explicit repository records
docs/       Current governance and architecture documentation
scripts/    verification/build utilities
skills/     explicit agent skills
.github/    CI and repository automation
governance/ repository governance state such as frozen branches
~~~

## Source files

Root canonical/production source files that are intentionally kept in place：

- LunaRune66.xlsx
- LunarRunesCardCut.pdf

它們不因 data/ 或 docs/ 內存在 copy 就失去來源責任。

## Runtime data boundary

Repository directory 不是 Current runtime corpus authority。Website runtime content 由 Neon canonical tables 提供。

不要新增：

- runtime JSON corpus
- copied Neon projection 作 fallback
- root generic JS data registry
- 第二套 Scope data registry
- materialized content snapshot 作 Current authority

## Module ownership

Application JavaScript 跟隨 owning feature 放在 app/。共用 module 必須有明確責任，不因方便而建立新的 generic root runtime layer。

## Assets

- assets/lunarunes/cards 保存 Rune card runtime images。
- pics/ 保存目前仍被正式頁面使用的核准圖。
- physical-card PDF 與 runtime card image 是不同責任，不互相替代。

## Documentation

docs/ 只保存 Current 正文與必要 governance。Migration、patch、RC snapshot、lineage memo 不得以額外 Markdown 留在 Current tree；有價值的內容必須整併進既有正本，否則刪除。Current repo 不建立「暫存規格文件」或「等待整併文件」。
