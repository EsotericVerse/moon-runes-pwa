from pathlib import Path

p=Path('README.md')
s=p.read_text(encoding='utf-8')

s=s.replace('- **Web Build：0.5**','- **Web Build：1.0-RC3**',1)
s=s.replace('## 目前進度｜2026-09-11','## 目前進度｜2026-09-12',1)
old='目前已進入 **Demo 收斂與功能驗收階段**。核心骨架不再擴張，優先處理功能完整性、資料一致性與公開入口。'
new='目前已進入 **RC3（Data-backed Release Candidate）收斂與功能驗收階段**。RC3 的關鍵不是再增加骨架，而是主要公開功能已開始由正式資料驅動：LunaRunes Canon 現在直接支援符文脈絡、Graph、統計、排行榜與推演資料。核心骨架不再擴張，優先處理效能、資料一致性、runtime 穩定性與公開入口。'
assert old in s
s=s.replace(old,new,1)

anchor='### Demo 前目前優先順序\n'
block='''### RC3｜正式資料開始進入系統\n\n**RC3 = Data-backed release candidate。**\n\n目前以 LunaRunes 作為第一套完整資料來源，主要資料鏈已實際成立：\n\n```text\nLunaRunes Canon\n→ 正向／反向關鍵詞\n→ 符文\n→ 唯一群組\n→ Graph\n→ 統計／排行榜\n→ 歷程／時間線／趨勢／軌跡\n```\n\n符文脈絡與符文分析核心採 **No API**：直接使用 repository 既有 `runes.json` 與現行規則，不呼叫外部 API、不重掃文章建立第二套關鍵詞，也不建立第二套 Canon。\n\nRC3 已讓 `runes.html`、`context.html`、`statics.html`、`evolution.html` 有實際資料可展示與分析；完整 RC3 說明見 [`docs/RC3.md`](docs/RC3.md)。\n\n'''
assert anchor in s
if '### RC3｜正式資料開始進入系統' not in s:
    s=s.replace(anchor,block+anchor,1)

s=s.replace('| 月之符文 | [runes.html](https://loc.lo3rwang.cc/runes.html) | 66 符、抽牌、每日抽、雙卡／三卡／五卡／OW3gs |','| 月之符文 | [lots.html](https://loc.lo3rwang.cc/lots.html) | LunaRunes 主頁、66 符資料、圖鑑與抽牌 |',1)
context_row='| 脈絡 | [context.html](https://loc.lo3rwang.cc/context.html) | 節點、關係式、Event、Graph、沙盒 |'
s=s.replace(context_row,'| 脈絡 | [context.html](https://loc.lo3rwang.cc/context.html) | 符文脈絡 Graph · No API、節點、關係式與 Event |',1)
evo_row='| 推演 | [evolution.html](https://loc.lo3rwang.cc/evolution.html) | 時期、Timeline、Trend、Trajectory |'
s=s.replace(evo_row,'| 推演 | [evolution.html](https://loc.lo3rwang.cc/evolution.html) | 時期、Timeline、Trend、Trajectory 與符文資料歷程 |',1)
marker='| 月之符文 | [lots.html](https://loc.lo3rwang.cc/lots.html) | LunaRunes 主頁、66 符資料、圖鑑與抽牌 |\n'
extra='| 符文知識庫 | [runes.html](https://loc.lo3rwang.cc/runes.html) | 判讀規則、案例與符文脈絡 Graph · No API |\n| 統計 | [statics.html](https://loc.lo3rwang.cc/statics.html) | 排行榜、符文關鍵詞排行榜、符文統計與每日符文 |\n'
assert marker in s
if '| 符文知識庫 |' not in s:
    s=s.replace(marker,marker+extra,1)

# Update Context/Evolution sections with RC3 data-backed note.
ctx='''現行功能包含：\n\n- 節點\n- 關係式\n- Event\n- Graph\n- Graph RAG\n- 沙盒遊戲\n'''
ctx_new='''現行功能包含：\n\n- 符文脈絡 Graph · No API（由現有 LunaRunes 關鍵詞、符文、唯一群組與規則直接建立）\n- 節點\n- 關係式\n- Event\n- Graph\n- Graph RAG\n- 沙盒遊戲\n'''
if ctx in s:
    s=s.replace(ctx,ctx_new,1)

evo='''現行 `evolution.html` 已提供：\n\n- 時期\n- Timeline\n- Trend\n- Trajectory\n- 時期資料由 Search → 時期設定統一管理\n- Event 新增／編輯／刪除\n'''
evo_new='''現行 `evolution.html` 已提供：\n\n- 時期\n- Timeline\n- Trend\n- Trajectory\n- 符文資料歷程 · No API\n- 符文結構時間線\n- 符文關鍵詞趨勢\n- 符文群組軌跡\n- 時期資料由 Search → 時期設定統一管理\n- Event 新增／編輯／刪除\n'''
if evo in s:
    s=s.replace(evo,evo_new,1)

assert '**Web Build：1.0-RC3**' in s
assert 'Data-backed Release Candidate' in s
assert 'docs/RC3.md' in s
assert '符文脈絡 Graph · No API' in s
assert '[lots.html](https://loc.lo3rwang.cc/lots.html)' in s
p.write_text(s,encoding='utf-8')
print('README RC3 finalized')
