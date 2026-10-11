# Assets

assets/ 保存 Current runtime/domain assets；是否公開由 build/staging 決定。

Current structure：

~~~text
assets/
  lunarunes/
    cards/
    reference/
~~~

Rules：

- LunaRunes card/runtime assets 放在 assets/lunarunes/。
- pics/ 是現有核准來源圖目錄，與 assets/ 責任不同，不因 assets/ 存在而搬移或複製全部內容。
- build 只公開實際需要的 assets。
- 不為同一 canonical asset 建立第二套 runtime path。

### LunaRunes card image identity
The only canonical card art files are `assets/lunarunes/cards/01.png` through `66.png`.
The 2-digit Rune ID is the entire filename. Chinese Rune names stay in Canon/DB/UI,
never in filenames or image URLs. Web and iOS share the exact same original files.
All runtime card images must use `runeImage(card)` from `app/lrunes/rune-directory.mjs`.
`npm run verify:rune-assets` and postbuild validation fail on legacy paths;
the native asset script is verification-only, never a filename converter.
